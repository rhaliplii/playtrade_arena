// Trading margin calculator — pure calculation module (stocks).
//
// Conventions (also stated on the page):
//   - Initial margin = the share of the position you fund yourself (Reg T: 50%).
//   - Maintenance margin = the minimum equity / position value before a margin call
//     (FINRA 4210 minimums: 25% for longs; 30% for most shorts. Brokers often set more).
//   - Long:  loan = value × (1 − initial). Equity at price S = S × shares − loan.
//            Call when equity < maintenance × S × shares
//            → call price = loan / (shares × (1 − maintenance)).
//   - Short: the account holds the sale proceeds plus your deposit (value × initial).
//            Equity at S = proceeds + deposit − S × shares.
//            → call price = (proceeds + deposit) / (shares × (1 + maintenance)).
//   - Covering a call: deposit the shortfall in cash, or sell (long) / buy back (short)
//     enough shares that the remaining position meets maintenance again. Some brokers
//     demand more than that; this shows the minimum.
//   - Interest (long) and borrow fees (short) are simple interest on the starting loan
//     or position value: amount × rate × days / 365.
(function (root) {
  "use strict";
  const { checker, finite } = root.CalcLib.core;

  const DEFAULT_MAINT = { long: 25, short: 30 };

  function calculate(i) {
    const c = checker();
    if (i.side !== "long" && i.side !== "short") c.add("side", "Choose long or short.");
    c.positive("price", i.price, "the share price");
    c.positive("shares", i.shares, "the number of shares");
    let im = 0, mm = 0;
    if (c.positive("initial", i.initial, "the initial margin")) {
      if (i.initial > 100) c.add("initial", "Initial margin can't be more than 100%; at 100% you are not borrowing at all.");
      else im = i.initial / 100;
    }
    const maintRaw = i.maint === null || i.maint === undefined || i.maint === "" ? DEFAULT_MAINT[i.side] || 25 : i.maint;
    if (!Number.isFinite(maintRaw) || maintRaw < 0) c.add("maint", "Maintenance margin can't be negative.");
    else if (maintRaw >= 100) c.add("maint", "Maintenance margin must be below 100%.");
    else mm = maintRaw / 100;
    if (!c.errors.length && ((i.side === "long" && im < 1 && mm >= im) || (i.side === "short" && mm > im))) {
      c.add("maint", "Maintenance margin must be lower than the initial margin, or the position starts in a margin call.");
    }
    const rate = c.optionalNonNegative("rate", i.rate, "the interest rate");
    const days = c.optionalNonNegative("days", i.days, "the number of days");
    const cash = c.optionalNonNegative("cash", i.cash, "the cash amount");
    let whatIf = null;
    if (i.whatIf !== null && i.whatIf !== undefined && i.whatIf !== "") {
      if (c.positive("whatIf", i.whatIf, "the what-if price")) whatIf = i.whatIf;
    }
    if (c.errors.length) return c.fail();

    const P = i.price, Q = i.shares, V = P * Q;
    const deposit = V * im;
    const long = i.side === "long";
    const loan = long ? V - deposit : 0;
    const credit = long ? 0 : V + deposit;     // short: proceeds + deposit held in the account

    let callPrice = null, callMove = null, noCall = false;
    if (long) {
      if (loan <= 0) noCall = true;            // fully paid: no borrowed money, no margin call
      else { callPrice = loan / (Q * (1 - mm)); callMove = callPrice / P - 1; }
    } else {
      callPrice = credit / (Q * (1 + mm));
      callMove = callPrice / P - 1;
    }

    const equityAt = (S) => (long ? S * Q - loan : credit - S * Q);
    let scenario = null;
    if (whatIf !== null) {
      const S = whatIf, mv = S * Q, E = equityAt(S), need = mm * mv;
      const inCall = !noCall && E < need;
      let cover = null;
      if (inCall) {
        const deficit = need - E;
        // shares to sell (long) or buy back (short) so the rest meets maintenance;
        // impossible once equity is gone (and with zero maintenance a call never comes)
        const units = E > 0 && mm > 0 ? Math.min(Q, Math.ceil(Q - E / (mm * S) - 1e-9)) : null;
        cover = { deposit: deficit, units, unitsValue: units === null ? null : units * S };
      }
      scenario = { price: S, marketValue: mv, equity: E, equityPct: E / mv, required: need, inCall, cover,
        profit: long ? (S - P) * Q : (P - S) * Q };
    }

    const yearly = (amount, pct) => (amount * pct * days) / 100 / 365;
    const carry = long ? yearly(loan, rate) : yearly(V, rate);
    const breakEven = long ? P + carry / Q : P - carry / Q;

    const bp = cash > 0 && im > 0 ? cash / im : null;
    return finite({
      ok: true,
      side: i.side,
      positionValue: V,
      deposit,
      loan,
      credit,
      leverage: im > 0 ? 1 / im : null,
      maintenance: mm * 100,
      noCall,
      callPrice,
      callMove,                   // long: negative (a fall); short: positive (a rise)
      cushion: callPrice === null ? null : Math.abs(P - callPrice) * Q,
      carry,
      carryLabel: long ? "Margin interest" : "Borrow fee",
      breakEven,
      buyingPower: bp,
      maxShares: bp === null ? null : Math.floor(bp / P + 1e-9),
      scenario,
    });
  }

  root.CalcLib.margin = { calculate, DEFAULT_MAINT };
})(typeof globalThis !== "undefined" ? globalThis : this);
