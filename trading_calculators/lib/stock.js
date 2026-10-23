// Stock profit calculator — pure calculation module.
//
// Conventions (also stated on the page):
//   - Long: profit = (exit − entry) × shares − entry fee − exit fee + dividends received.
//   - Short: profit = (entry − exit) × shares − entry fee − exit fee − dividends owed.
//     An optional stock-borrow fee on a short: entry value × rate (a year) × days ÷ 365, the days
//     from borrowDays or else the buy and sell dates. Margin interest is not included.
//   - In "amount" mode the amount is the value of the shares at the entry price;
//     fees are charged on top of it, never taken out of it. Fractional shares allowed.
//   - Each fee is either a flat amount or a % of that side's trade value.
//   - Return on investment (ROI) is measured against the cost basis: entry value + entry fee.
//   - Tax is applied to a positive profit only; a loss creates no tax credit here.
//   - Break-even is the exit price at which profit before tax is exactly zero.
(function (root) {
  "use strict";
  const { checker, finite, fee } = root.CalcLib.core;

  const SCENARIO_MOVES = [-50, -25, -10, -5, 0, 5, 10, 25, 50, 100];

  function validate(i) {
    const c = checker();
    if (i.side !== "long" && i.side !== "short") c.add("side", "Choose long or short.");
    const entryOk = c.positive("entry", i.entry, "the entry price");
    if (i.sizeMode === "amount") c.positive("amount", i.amount, "the amount");
    else c.positive("shares", i.shares, "the number of shares");
    c.nonNegative("exit", i.exit, "the exit price");
    for (const [field, f, label] of [["entryFee", i.entryFee, "the entry fee"], ["exitFee", i.exitFee, "the exit fee"]]) {
      if (!f) continue;
      if (f.type === "pct") c.percent(field, f.value, label);
      else c.optionalNonNegative(field, f.value, label);
    }
    c.optionalNonNegative("dividends", i.dividends, "dividends");
    c.optionalNonNegative("borrowRate", i.borrowRate, "the borrow fee");
    c.optionalNonNegative("borrowDays", i.borrowDays, "the days held");
    c.percent("taxRate", i.taxRate, "the tax rate");
    if (i.startDate && i.endDate) {
      const a = Date.parse(i.startDate), b = Date.parse(i.endDate);
      if (Number.isNaN(a) || Number.isNaN(b)) c.add("endDate", "Enter valid dates.");
      else if (b < a) c.add("endDate", "The sell date is before the buy date.");
    }
    return { c, entryOk };
  }

  function shareCount(i) {
    return i.sizeMode === "amount" ? i.amount / i.entry : i.shares;
  }

  // the stock-borrow fee on a short (0 on a long, or with no rate or no days)
  function borrowCost(i, sh) {
    if (i.side !== "short" || !(i.borrowRate > 0)) return 0;
    let days = i.borrowDays;
    if (!(days > 0) && i.startDate && i.endDate) days = (Date.parse(i.endDate) - Date.parse(i.startDate)) / 86400000;
    return days > 0 ? i.entry * sh * (i.borrowRate / 100) * (days / 365) : 0;
  }

  // Profit before tax for a given exit price — the single formula everything else uses.
  function netBeforeTax(i, sh, exit) {
    const entryValue = i.entry * sh, exitValue = exit * sh;
    const eFee = fee(i.entryFee, entryValue), xFee = fee(i.exitFee, exitValue);
    const div = i.dividends || 0;
    const gross = i.side === "long" ? exitValue - entryValue : entryValue - exitValue;
    const borrow = borrowCost(i, sh);
    return { gross, eFee, xFee, borrow, net: gross - eFee - xFee + (i.side === "long" ? div : -div) - borrow };
  }

  // The exit price at which profit before tax equals `need`. null when no price can do it.
  function solveExit(i, sh, need) {
    const entryValue = i.entry * sh;
    const eFee = fee(i.entryFee, entryValue);
    const div = i.dividends || 0;
    const xf = i.exitFee || { type: "flat", value: 0 };
    const p = xf.type === "pct" ? (xf.value || 0) / 100 : 0;
    const F = xf.type === "pct" ? 0 : xf.value || 0;
    let exit;
    if (i.side === "long") exit = (entryValue + eFee - div + need + F) / (sh * (1 - p));
    else exit = (entryValue - eFee - div - need - F - borrowCost(i, sh)) / (sh * (1 + p));
    return exit >= 0 && Number.isFinite(exit) ? exit : null;
  }

  function annualised(roi, startDate, endDate) {
    if (!startDate || !endDate) return { days: null, annualised: null };
    const days = (Date.parse(endDate) - Date.parse(startDate)) / 86400000;
    if (!(days >= 1)) return { days: days >= 0 ? days : null, annualised: null };
    const growth = 1 + roi;
    return { days, annualised: growth <= 0 ? -1 : Math.pow(growth, 365 / days) - 1 };
  }

  function calculate(i) {
    const { c } = validate(i);
    if (c.errors.length) return c.fail();
    const sh = shareCount(i);
    const t = (i.taxRate || 0) / 100;
    const { gross, eFee, xFee, borrow, net } = netBeforeTax(i, sh, i.exit);
    const tax = net > 0 ? net * t : 0;
    const profit = net - tax;
    const costBasis = i.entry * sh + eFee;
    const roi = profit / costBasis;
    const { days, annualised: annual } = annualised(roi, i.startDate, i.endDate);
    const at = (exit) => {
      const n = netBeforeTax(i, sh, exit).net;
      const p = n - (n > 0 ? n * t : 0);
      return { price: exit, profit: p, roi: p / costBasis };
    };
    const scenarios = SCENARIO_MOVES.map((m) => Object.assign({ move: m }, at(i.entry * (1 + m / 100))));
    const warnings = [];
    if (days !== null && days >= 1 && days < 30) warnings.push("Annualised returns over less than a month swing wildly; treat that figure with care.");
    if (i.side === "short") warnings.push(borrow > 0 ? "Short P/L excludes margin interest." : "Short P/L excludes stock-borrow fees (add one under More options) and margin interest.");
    return finite({
      ok: true,
      side: i.side,
      shares: sh,
      entryValue: i.entry * sh,
      exitValue: i.exit * sh,
      costBasis,
      grossProfit: gross,
      entryFee: eFee,
      exitFee: xFee,
      totalFees: eFee + xFee,
      dividends: i.dividends || 0,
      borrowFee: borrow,
      profitBeforeTax: net,
      tax,
      profit,
      roi,
      breakEven: solveExit(i, sh, 0),
      days,
      annualised: annual,
      scenarios,
      warnings,
    });
  }

  // Reverse mode: the exit price needed for a target profit after tax,
  // given as an amount ({ type: "amount" }) or a % of the cost basis ({ type: "pct" }).
  function targetExit(i, target) {
    const base = Object.assign({}, i, { exit: i.entry });   // exit is not an input here
    const { c } = validate(base);
    if (!target || target.value === null || target.value === undefined || target.value === "") c.add("target", "Enter a target profit.");
    else if (!Number.isFinite(target.value)) c.add("target", "Target profit must be a number.");
    if (c.errors.length) return c.fail();
    const sh = shareCount(base);
    const t = (base.taxRate || 0) / 100;
    const costBasis = base.entry * sh + fee(base.entryFee, base.entry * sh);
    const after = target.type === "pct" ? (costBasis * target.value) / 100 : target.value;
    const need = after > 0 ? after / (1 - t) : after;    // gross up for tax on a gain
    const exit = solveExit(base, sh, need);
    if (exit === null) {
      return { ok: false, errors: [{ field: "target", message: base.side === "short"
        ? "No exit price can reach that profit: a short can make at most the entry value."
        : "No exit price can reach that target." }] };
    }
    return finite({ ok: true, exit, move: exit / base.entry - 1, profit: after, costBasis });
  }

  root.CalcLib.stock = { calculate, targetExit, SCENARIO_MOVES };
})(typeof globalThis !== "undefined" ? globalThis : this);
