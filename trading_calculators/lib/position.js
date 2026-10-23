// Position size calculator — pure calculation module.
//
// Conventions (also stated on the page):
//   - Risk budget = account × risk % (or a fixed amount). It is the most you lose if the
//     stop fills: units × (|entry − stop| + slippage) + round-trip fees.
//   - Units = (risk budget − fees) / (|entry − stop| + slippage), rounded DOWN to the
//     instrument's step (1 for whole shares, 0.00000001 for most crypto), so the real
//     risk never exceeds the budget.
//   - The position is capped at account × max leverage (1 = cash account). When the cap
//     binds, the position is smaller and the real risk is lower than the budget.
//   - Stops are assumed to fill at the stop price plus slippage; gaps can fill worse.
(function (root) {
  "use strict";
  const { checker, finite, floorToStep } = root.CalcLib.core;

  function calculate(i) {
    const c = checker();
    if (i.side !== "long" && i.side !== "short") c.add("side", "Choose long or short.");
    const accOk = c.positive("account", i.account, "the account size");
    let budget = null;
    if (i.riskMode === "amount") {
      if (c.positive("riskAmount", i.riskAmount, "the amount to risk")) budget = i.riskAmount;
    } else if (c.positive("riskPct", i.riskPct, "the risk %")) {
      if (i.riskPct > 100) c.add("riskPct", "Risk can't be more than 100% of the account.");
      else if (accOk) budget = (i.account * i.riskPct) / 100;
    }
    if (accOk && budget !== null && budget > i.account) c.add("riskAmount", "You can't risk more than the account size.");
    const entryOk = c.positive("entry", i.entry, "the entry price");

    let stop = null;
    if (i.stopMode === "pct") {
      if (c.positive("stopPct", i.stopPct, "the stop distance")) {
        if (i.side === "long" && i.stopPct >= 100) c.add("stopPct", "A long stop must be less than 100% below the entry.");
        else if (entryOk) stop = i.side === "long" ? i.entry * (1 - i.stopPct / 100) : i.entry * (1 + i.stopPct / 100);
      }
    } else if (c.positive("stop", i.stop, "the stop price")) {
      stop = i.stop;
      if (entryOk) {
        if (i.stop === i.entry) c.add("stop", "The stop must differ from the entry price.");
        else if (i.side === "long" && i.stop > i.entry) c.add("stop", "For a long, the stop goes below the entry.");
        else if (i.side === "short" && i.stop < i.entry) c.add("stop", "For a short, the stop goes above the entry.");
      }
    }
    const fees = c.optionalNonNegative("fees", i.fees, "fees");
    const slip = c.optionalNonNegative("slippage", i.slippage, "slippage");
    const lev = i.leverage === null || i.leverage === undefined || i.leverage === "" ? 1 : i.leverage;
    if (!Number.isFinite(lev) || lev < 1) c.add("leverage", "Max leverage must be 1 or more.");
    const step = i.step > 0 ? i.step : 0;
    let target = null;
    if (i.target !== null && i.target !== undefined && i.target !== "") {
      if (c.positive("target", i.target, "the target price") && entryOk) {
        if (i.side === "long" && i.target <= i.entry) c.add("target", "For a long, the target goes above the entry.");
        else if (i.side === "short" && i.target >= i.entry) c.add("target", "For a short, the target goes below the entry.");
        else target = i.target;
      }
    }
    if (c.errors.length) return c.fail();

    if (budget <= fees) return { ok: false, errors: [{ field: "fees", message: "Fees use up the whole risk budget; there is nothing left to size a position with." }] };
    const perUnit = Math.abs(i.entry - stop) + slip;
    const raw = (budget - fees) / perUnit;
    const cap = (i.account * lev) / i.entry;
    const capped = raw > cap;
    const units = floorToStep(Math.min(raw, cap), step);
    if (!(units > 0)) {
      return { ok: false, errors: [{ field: step ? "step" : "riskPct", message: capped
        ? "Your account can't buy a single unit at this price with this leverage."
        : "The risk budget is too small for one unit at this stop distance. Widen the budget, tighten the stop, or allow fractional units." }] };
    }
    const value = units * i.entry;
    const risk = units * perUnit + fees;
    const dist = Math.abs(i.entry - stop);
    const dir = i.side === "long" ? 1 : -1;
    const out = {
      ok: true,
      side: i.side,
      units,
      unitsUnrounded: Math.min(raw, cap),
      positionValue: value,
      pctOfAccount: value / i.account,
      leverageUsed: value / i.account,
      budget,
      risk,
      riskPct: risk / i.account,
      stop,
      stopDistance: dist,
      stopDistancePct: dist / i.entry,
      perUnitRisk: perUnit,
      capped,
      maxUnits: cap,
      rTargets: [1, 2, 3].map((r) => ({ r, price: i.entry + dir * r * dist, profit: units * r * dist - fees })),
      target: null,
    };
    if (target !== null) {
      const reward = units * Math.abs(target - i.entry) - fees;
      out.target = { price: target, reward, rewardPct: reward / i.account, rr: reward / risk };
    }
    return finite(out);
  }

  root.CalcLib.position = { calculate };
})(typeof globalThis !== "undefined" ? globalThis : this);
