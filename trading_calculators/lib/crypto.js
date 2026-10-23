// Crypto profit calculator — pure calculation module.
//
// Conventions (also stated on the page):
//   - Exchange fees are a % of the order value, as on spot exchanges (maker or taker rate).
//   - The amount spent is before fees, as "Amount invested" on the stock calculator; the buy
//     fee is added on top: coins = amount ÷ price; cash spent = amount × (1 + buy fee).
//   - In "coins" mode you enter the coins bought; the buy fee is added on top too:
//     cash spent = coins × price × (1 + buy fee).
//   - Several buys at different prices are combined into one position with an average
//     entry price (dollar-cost averaging). Sells are modelled as one sale of every coin.
//   - Other costs (network, withdrawal or deposit fees) are a flat amount.
//   - Return is measured against everything spent: buys incl. fees + other costs.
//   - Tax is applied to a positive profit only.
//   - Short (side "short"): each row is a sale of borrowed coins. In "amount" mode the amount
//     is the position value sold, with the sell fee charged on top; the exit is a buy-back,
//     its fee added to the cost. Return is measured against the position value plus opening
//     fee and other costs. Borrow interest and funding rates are not included.
(function (root) {
  "use strict";
  const { checker, finite } = root.CalcLib.core;

  const SCENARIO_MOVES = [-75, -50, -25, -10, 0, 10, 25, 50, 100, 200, 400, 900];

  function validate(i) {
    const c = checker();
    const buys = Array.isArray(i.buys) ? i.buys : [];
    if (i.side !== undefined && i.side !== "long" && i.side !== "short") c.add("side", "Choose long or short.");
    if (!buys.length) c.add("buys", "Add at least one buy.");
    buys.forEach((b, n) => {
      c.positive(`buys.${n}.price`, b.price, i.side === "short" ? "the sell price" : "the buy price");
      if (i.sizeMode === "coins") c.positive(`buys.${n}.coins`, b.coins, "the number of coins");
      else c.positive(`buys.${n}.amount`, b.amount, "the amount");
    });
    c.percent("buyFee", i.buyFee, "the buy fee");
    c.percent("sellFee", i.sellFee, "the sell fee");
    c.optionalNonNegative("otherCosts", i.otherCosts, "other costs");
    c.percent("taxRate", i.taxRate, "the tax rate");
    return c;
  }

  const isShort = (i) => i.side === "short";

  function position(i) {
    const fb = (i.buyFee || 0) / 100;
    if (isShort(i)) {
      // opening sales: fee on top of the position value; "spent" is what the position commits
      let coins = 0, value = 0;
      const legs = i.buys.map((b) => {
        const v = i.sizeMode === "coins" ? b.coins * b.price : b.amount;
        const q = v / b.price;
        coins += q; value += v;
        return { price: b.price, coins: q, spent: v * (1 + fb), fee: v * fb };
      });
      return { legs, coins, value, spent: value * (1 + fb), buyFees: value * fb, avgPrice: value / coins, avgCost: value * (1 - fb) / coins };
    }
    let coins = 0, spent = 0, value = 0;
    const legs = i.buys.map((b) => {
      let v, s;
      v = i.sizeMode === "coins" ? b.coins * b.price : b.amount;   // the order value, before fees
      s = v * (1 + fb);
      const q = v / b.price;
      coins += q; spent += s; value += v;
      return { price: b.price, coins: q, spent: s, fee: s - v };
    });
    return { legs, coins, spent, buyFees: spent - value, avgPrice: value / coins, avgCost: spent / coins };
  }

  function at(i, pos, exit) {
    const fs = (i.sellFee || 0) / 100, t = (i.taxRate || 0) / 100;
    const other = i.otherCosts || 0;
    const gross = pos.coins * exit;
    const sellFee = gross * fs;
    const net = isShort(i)
      ? pos.value - pos.buyFees - gross - sellFee - other   // sold for value − fee, bought back for gross + fee
      : gross - sellFee - pos.spent - other;
    const tax = net > 0 ? net * t : 0;
    const invested = pos.spent + other;
    return { gross, sellFee, net, tax, profit: net - tax, roi: (net - tax) / invested, invested };
  }

  // exit price that leaves `need` profit before tax
  function solve(i, pos, need) {
    const fs = (i.sellFee || 0) / 100;
    if (isShort(i)) {
      const y = (pos.value - pos.buyFees - (i.otherCosts || 0) - need) / (pos.coins * (1 + fs));
      return y >= 0 && Number.isFinite(y) ? y : null;
    }
    const x = (pos.spent + (i.otherCosts || 0) + need) / (pos.coins * (1 - fs));
    return x >= 0 && Number.isFinite(x) ? x : null;
  }

  function calculate(i) {
    const c = validate(i);
    c.nonNegative("exit", i.exit, isShort(i) ? "the buy-back price" : "the sell price");
    if (c.errors.length) return c.fail();
    const pos = position(i);
    const r = at(i, pos, i.exit);
    const scenarios = SCENARIO_MOVES.map((m) => {
      const price = pos.avgPrice * (1 + m / 100);
      const s = at(i, pos, price);
      return { move: m, price, profit: s.profit, roi: s.roi };
    });
    return finite({
      ok: true,
      legs: pos.legs,
      coins: pos.coins,
      spent: pos.spent,
      invested: r.invested,
      buyFees: pos.buyFees,
      sellFee: r.sellFee,
      totalFees: pos.buyFees + r.sellFee,
      otherCosts: i.otherCosts || 0,
      avgPrice: pos.avgPrice,
      avgCost: pos.avgCost,
      side: isShort(i) ? "short" : "long",
      proceeds: isShort(i) ? pos.value - pos.buyFees : r.gross - r.sellFee,
      buyBackCost: isShort(i) ? r.gross + r.sellFee : null,
      profitBeforeTax: r.net,
      tax: r.tax,
      profit: r.profit,
      roi: r.roi,
      multiple: (r.invested + r.net) / r.invested,   // before tax, as the old proceeds ÷ invested
      breakEven: solve(i, pos, 0),
      scenarios,
    });
  }

  // Reverse mode: the sell price for a target profit after tax (amount, or % of invested).
  function targetExit(i, target) {
    const c = validate(i);
    if (!target || target.value === null || target.value === undefined || target.value === "") c.add("target", "Enter a target profit.");
    else if (!Number.isFinite(target.value)) c.add("target", "Target profit must be a number.");
    if (c.errors.length) return c.fail();
    const pos = position(i);
    const t = (i.taxRate || 0) / 100;
    const invested = pos.spent + (i.otherCosts || 0);
    const after = target.type === "pct" ? (invested * target.value) / 100 : target.value;
    if (!isShort(i) && after < -invested) return { ok: false, errors: [{ field: "target", message: "You can't lose more than you put in on a spot position." }] };
    const x = solve(i, pos, after > 0 ? after / (1 - t) : after);
    if (x === null) return { ok: false, errors: [{ field: "target", message: isShort(i)
      ? "No buy-back price can reach that target: a short makes at most what you sold for, less fees."
      : "No sell price can reach that target." }] };
    return finite({ ok: true, exit: x, move: x / pos.avgPrice - 1, profit: after, invested });
  }

  root.CalcLib.crypto = { calculate, targetExit, SCENARIO_MOVES };
})(typeof globalThis !== "undefined" ? globalThis : this);
