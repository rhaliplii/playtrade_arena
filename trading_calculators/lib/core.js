// Profit.com trading calculators — shared helpers for the pure calculation modules.
//
// Every module in lib/ is UI-free: plain numbers in, a plain result object out, no DOM.
// A result is either { ok: true, ... } or { ok: false, errors: [{ field, message }] },
// and an ok result never contains NaN or ±Infinity (finite() guards every output).
// Modules attach themselves to globalThis.CalcLib so they load the same way in the
// browser (<script>) and in the command-line test runner (JavaScriptCore `load()`).
(function (root) {
  "use strict";
  const CalcLib = (root.CalcLib = root.CalcLib || {});

  const isNum = (v) => typeof v === "number" && Number.isFinite(v);

  // Collects field errors while a module validates its inputs.
  const checker = () => {
    const errors = [];
    const add = (field, message) => { if (!errors.some((e) => e.field === field)) errors.push({ field, message }); };
    return {
      errors,
      add,
      required(field, v, label) {
        if (v === null || v === undefined || v === "") { add(field, `Enter ${label}.`); return false; }
        if (!isNum(v)) { add(field, `${cap(label)} must be a number.`); return false; }
        return true;
      },
      positive(field, v, label) {
        if (!this.required(field, v, label)) return false;
        if (v <= 0) { add(field, `${cap(label)} must be greater than zero.`); return false; }
        return true;
      },
      nonNegative(field, v, label) {
        if (!this.required(field, v, label)) return false;
        if (v < 0) { add(field, `${cap(label)} can't be negative.`); return false; }
        return true;
      },
      // optional numbers default to 0 when empty, but are still checked when given
      optionalNonNegative(field, v, label) {
        if (v === null || v === undefined || v === "") return 0;
        if (!isNum(v)) { add(field, `${cap(label)} must be a number.`); return 0; }
        if (v < 0) { add(field, `${cap(label)} can't be negative.`); return 0; }
        return v;
      },
      percent(field, v, label, { allowEmpty = true, max = 100, maxInclusive = false } = {}) {
        if (v === null || v === undefined || v === "") {
          if (allowEmpty) return 0;
          add(field, `Enter ${label}.`); return 0;
        }
        if (!isNum(v)) { add(field, `${cap(label)} must be a number.`); return 0; }
        if (v < 0) { add(field, `${cap(label)} can't be negative.`); return 0; }
        if (maxInclusive ? v > max : v >= max) { add(field, `${cap(label)} must be ${maxInclusive ? "at most" : "below"} ${max}%.`); return 0; }
        return v;
      },
      fail() { return { ok: false, errors }; },
    };
  };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // Replace any non-finite number in a result with null, recursively, so a bug can never
  // surface as NaN or Infinity on the page. (Callers treat null as "not applicable".)
  const finite = (o) => {
    if (typeof o === "number") return Number.isFinite(o) ? o : null;
    if (Array.isArray(o)) return o.map(finite);
    if (o && typeof o === "object") {
      const out = {};
      for (const k of Object.keys(o)) out[k] = finite(o[k]);
      return out;
    }
    return o;
  };

  // Fee as a flat amount or a percentage of the trade value.
  const fee = (f, tradeValue) => {
    if (!f || !f.value) return 0;
    return f.type === "pct" ? (tradeValue * f.value) / 100 : f.value;
  };

  // Round toward zero to a step (whole shares = 1, crypto = 0.00000001 …).
  // Works on the decimal string to avoid 0.1 + 0.2 style drift at the boundary.
  const floorToStep = (x, step) => {
    if (!(step > 0)) return x;
    const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    const units = Math.floor(x / step + 1e-9);
    return Number((units * step).toFixed(decimals));
  };

  CalcLib.core = { isNum, checker, finite, fee, floorToStep };
})(typeof globalThis !== "undefined" ? globalThis : this);
