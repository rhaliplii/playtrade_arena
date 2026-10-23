// Options profit calculator — pure calculation module.
//
// Conventions (also stated on the page):
//   - Values at EXPIRATION only: each option is worth its intrinsic value
//     (call max(S − K, 0), put max(K − S, 0)). No time value, no early exercise.
//   - Premiums are quoted per share; one contract = `multiplier` shares (100 for US
//     equity options). P/L per leg = ±(value at expiry − premium) × multiplier × contracts.
//   - A stock leg is a number of shares bought or sold short at `price`.
//   - Fees are per option contract, charged once (to open). Assignment/exercise fees,
//     dividends and early assignment are not modelled.
//   - "Value today" (todayAt, todayCurve): each option priced with Black-Scholes for European
//     options, no dividends: d1 = (ln(S/K) + (r + σ²/2)T) / (σ√T), d2 = d1 − σ√T,
//     call = S·N(d1) − K·e^(−rT)·N(d2), put = K·e^(−rT)·N(−d2) − S·N(−d1). One volatility
//     for every leg. American early exercise and dividends are not modelled.
//   - P/L at expiry is piecewise-linear in the stock price, with kinks only at strikes,
//     so max profit/loss and break-evens are exact: we evaluate at 0 and at every strike,
//     and use the slope beyond the highest strike to detect unlimited profit or loss.
(function (root) {
  "use strict";
  const { checker, finite } = root.CalcLib.core;

  // Preset strategies, as strike offsets in "steps" from the money (0 = at the money).
  const PRESETS = {
    "long-call":   { name: "Long call",          legs: [{ type: "call", side: "long",  k: 0 }] },
    "long-put":    { name: "Long put",           legs: [{ type: "put",  side: "long",  k: 0 }] },
    "covered-call":{ name: "Covered call",       legs: [{ type: "stock", side: "long" }, { type: "call", side: "short", k: 1 }] },
    "cash-secured-put": { name: "Cash-secured put", legs: [{ type: "put", side: "short", k: -1 }] },
    "protective-put": { name: "Protective put",  legs: [{ type: "stock", side: "long" }, { type: "put", side: "long", k: -1 }] },
    "bull-call-spread": { name: "Bull call spread", legs: [{ type: "call", side: "long", k: 0 }, { type: "call", side: "short", k: 2 }] },
    "bear-put-spread":  { name: "Bear put spread",  legs: [{ type: "put", side: "long", k: 0 }, { type: "put", side: "short", k: -2 }] },
    "long-straddle":  { name: "Long straddle",   legs: [{ type: "call", side: "long", k: 0 }, { type: "put", side: "long", k: 0 }] },
    "long-strangle":  { name: "Long strangle",   legs: [{ type: "call", side: "long", k: 1 }, { type: "put", side: "long", k: -1 }] },
    "short-straddle": { name: "Short straddle",  legs: [{ type: "call", side: "short", k: 0 }, { type: "put", side: "short", k: 0 }] },
    "short-strangle": { name: "Short strangle",  legs: [{ type: "call", side: "short", k: 1 }, { type: "put", side: "short", k: -1 }] },
    "iron-condor":    { name: "Iron condor",     legs: [
      { type: "put", side: "long", k: -3 }, { type: "put", side: "short", k: -1 },
      { type: "call", side: "short", k: 1 }, { type: "call", side: "long", k: 3 }] },
  };
  const MAX_LEGS = 4;

  function validate(i) {
    const c = checker();
    const legs = Array.isArray(i.legs) ? i.legs : [];
    if (!legs.length) c.add("legs", "Add at least one leg.");
    if (legs.length > MAX_LEGS) c.add("legs", `Use at most ${MAX_LEGS} legs.`);
    legs.forEach((l, n) => {
      if (!["call", "put", "stock"].includes(l.type)) c.add(`legs.${n}.type`, "Choose call, put or stock.");
      if (l.side !== "long" && l.side !== "short") c.add(`legs.${n}.side`, "Choose buy or sell.");
      c.positive(`legs.${n}.qty`, l.qty, l.type === "stock" ? "the number of shares" : "the number of contracts");
      if (l.type === "stock") c.positive(`legs.${n}.price`, l.price, "the share price");
      else {
        c.positive(`legs.${n}.strike`, l.strike, "the strike");
        c.nonNegative(`legs.${n}.premium`, l.premium, "the premium");
      }
    });
    const mult = i.multiplier === null || i.multiplier === undefined || i.multiplier === "" ? 100 : i.multiplier;
    if (!Number.isFinite(mult) || mult <= 0) c.add("multiplier", "The contract multiplier must be greater than zero.");
    c.optionalNonNegative("feePerContract", i.feePerContract, "the fee per contract");
    return { c, legs, mult };
  }

  // P/L of one leg at expiry price s, before fees.
  function legPL(l, s, mult) {
    const dir = l.side === "long" ? 1 : -1;
    if (l.type === "stock") return dir * (s - l.price) * l.qty;
    const intrinsic = l.type === "call" ? Math.max(s - l.strike, 0) : Math.max(l.strike - s, 0);
    return dir * (intrinsic - l.premium) * mult * l.qty;
  }

  function build(i) {
    const { c, legs, mult } = validate(i);
    if (c.errors.length) return { fail: c.fail() };
    const fees = (i.feePerContract || 0) * legs.filter((l) => l.type !== "stock").reduce((a, l) => a + l.qty, 0);
    const pl = (s) => legs.reduce((a, l) => a + legPL(l, s, mult), 0) - fees;
    // slope of P/L as the stock price → ∞ (only calls and stock matter up there)
    const slopeInf = legs.reduce((a, l) => {
      const dir = l.side === "long" ? 1 : -1;
      if (l.type === "call") return a + dir * mult * l.qty;
      if (l.type === "stock") return a + dir * l.qty;
      return a;
    }, 0);
    const kinks = [...new Set(legs.filter((l) => l.type !== "stock").map((l) => l.strike))].sort((a, b) => a - b);
    const points = [0, ...kinks.filter((k) => k > 0)];
    return { legs, mult, fees, pl, slopeInf, points };
  }

  function breakEvens(pl, points, slopeInf) {
    const out = [];
    const push = (x) => { if (x >= 0 && !out.some((y) => Math.abs(y - x) < 1e-9)) out.push(x); };
    for (let n = 0; n < points.length; n++) {
      const a = points[n], fa = pl(a);
      if (Math.abs(fa) < 1e-9) push(a);
      if (n + 1 < points.length) {
        const b = points[n + 1], fb = pl(b);
        if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) push(a + ((b - a) * -fa) / (fb - fa));
      }
    }
    const last = points[points.length - 1], fl = pl(last);
    if ((fl < 0 && slopeInf > 0) || (fl > 0 && slopeInf < 0)) push(last - fl / slopeInf);
    return out.sort((a, b) => a - b);
  }

  function calculate(i) {
    const b = build(i);
    if (b.fail) return b.fail;
    const { legs, mult, fees, pl, slopeInf, points } = b;
    const values = points.map(pl);
    const maxP = slopeInf > 0 ? null : Math.max(...values);
    const maxL = slopeInf < 0 ? null : Math.min(...values);
    // net premium: positive = debit paid to open the options, negative = credit received
    const optionCash = legs.filter((l) => l.type !== "stock")
      .reduce((a, l) => a + (l.side === "long" ? 1 : -1) * l.premium * mult * l.qty, 0);
    const stockCash = legs.filter((l) => l.type === "stock")
      .reduce((a, l) => a + (l.side === "long" ? 1 : -1) * l.price * l.qty, 0);
    const expiry = i.expiryPrice !== null && i.expiryPrice !== undefined && i.expiryPrice !== "" && Number.isFinite(i.expiryPrice) && i.expiryPrice >= 0
      ? { price: i.expiryPrice, profit: pl(i.expiryPrice) } : null;
    return finite({
      ok: true,
      multiplier: mult,
      fees,
      netPremium: optionCash,           // >0 debit, <0 credit
      stockCost: stockCash,
      maxProfit: maxP,                  // null = unlimited
      maxProfitUnlimited: slopeInf > 0,
      maxLoss: maxL,                    // null = unlimited
      maxLossUnlimited: slopeInf < 0,
      breakEvens: breakEvens(pl, points, slopeInf),
      atExpiry: expiry,
      kinks: points.slice(1),
    });
  }

  // P/L samples for a chart over [lo, hi]; always includes every strike so kinks are sharp.
  function curve(i, lo, hi, n = 120) {
    const b = build(i);
    if (b.fail || !(hi > lo) || lo < 0) return [];
    const xs = new Set();
    for (let k = 0; k <= n; k++) xs.add(lo + ((hi - lo) * k) / n);
    b.points.forEach((p) => { if (p >= lo && p <= hi) xs.add(p); });
    return [...xs].sort((a, c) => a - c).map((x) => ({ price: x, profit: finite(b.pl(x)) }));
  }

  function profitAt(i, s) {
    const b = build(i);
    return b.fail || !(s >= 0) ? null : finite(b.pl(s));
  }

  // ---- value today (Black-Scholes)
  // standard normal CDF (Abramowitz & Stegun 7.1.26 via erf; |error| < 1.5e-7)
  function ncdf(x) {
    const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
    return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
  }
  // price per share of a European option; T in years, sigma and r as decimals
  function bs(type, S, K, T, sigma, r) {
    if (!(T > 0) || !(sigma > 0)) return type === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
    if (!(S > 0)) return type === "call" ? 0 : K * Math.exp(-r * T);
    const v = sigma * Math.sqrt(T);
    const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / v, d2 = d1 - v;
    return type === "call" ? S * ncdf(d1) - K * Math.exp(-r * T) * ncdf(d2) : K * Math.exp(-r * T) * ncdf(-d2) - S * ncdf(-d1);
  }
  // P/L if the position were closed at stock price s with `days` left to expiry
  function todayBuilder(i, days, ivPct, ratePct) {
    const b = build(i);
    if (b.fail) return null;
    const T = Math.max(days, 0) / 365, sigma = (ivPct || 0) / 100, r = (ratePct || 0) / 100;
    return (s) => b.legs.reduce((a, l) => {
      const dir = l.side === "long" ? 1 : -1;
      if (l.type === "stock") return a + dir * (s - l.price) * l.qty;
      return a + dir * (bs(l.type, s, l.strike, T, sigma, r) - l.premium) * b.mult * l.qty;
    }, 0) - b.fees;
  }
  function todayAt(i, s, days, ivPct, ratePct) {
    const f = todayBuilder(i, days, ivPct, ratePct);
    return f && s >= 0 ? finite(f(s)) : null;
  }
  function todayCurve(i, lo, hi, days, ivPct, ratePct, n = 120) {
    const f = todayBuilder(i, days, ivPct, ratePct);
    if (!f || !(hi > lo) || lo < 0) return [];
    return Array.from({ length: n + 1 }, (_, k) => { const x = lo + ((hi - lo) * k) / n; return { price: x, profit: finite(f(x)) }; });
  }

  root.CalcLib.options = { calculate, curve, profitAt, todayAt, todayCurve, bs, PRESETS, MAX_LEGS };
})(typeof globalThis !== "undefined" ? globalThis : this);
