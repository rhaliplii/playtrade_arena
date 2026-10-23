// A minimal test harness that runs in the browser (tests/index.html) and in
// JavaScriptCore on the command line (tests/run.sh). No dependencies.
(function (root) {
  "use strict";
  const results = [];
  let current = "";

  const describe = (name, fn) => { const prev = current; current = current ? `${current} › ${name}` : name; fn(); current = prev; };
  const test = (name, fn) => {
    const full = current ? `${current} › ${name}` : name;
    try { fn(); results.push({ name: full, ok: true }); }
    catch (e) { results.push({ name: full, ok: false, message: e && e.message ? e.message : String(e) }); }
  };

  const fail = (msg) => { throw new Error(msg); };
  const show = (v) => (typeof v === "string" ? JSON.stringify(v) : String(v));

  const expect = {
    // numbers equal within an absolute tolerance (default: a hundredth of a cent)
    close(actual, expected, tol = 1e-4, label = "") {
      if (typeof actual !== "number" || !Number.isFinite(actual)) fail(`${label} expected ${expected}, got ${show(actual)}`);
      if (Math.abs(actual - expected) > tol) fail(`${label} expected ${expected} ±${tol}, got ${actual}`);
    },
    equal(actual, expected, label = "") {
      if (actual !== expected) fail(`${label} expected ${show(expected)}, got ${show(actual)}`);
    },
    ok(r) { if (!r || r.ok !== true) fail(`expected ok, got errors ${JSON.stringify(r && r.errors)}`); },
    // a failed result carrying an error on `field`
    error(r, field) {
      if (!r || r.ok !== false) fail(`expected an error on "${field}", got ok`);
      if (field && !r.errors.some((e) => e.field === field)) fail(`expected an error on "${field}", got ${JSON.stringify(r.errors)}`);
    },
    // no NaN / Infinity anywhere in an object
    finiteDeep(o, path = "result") {
      if (typeof o === "number" && !Number.isFinite(o)) fail(`${path} is ${o}`);
      if (o && typeof o === "object") for (const k of Object.keys(o)) expect.finiteDeep(o[k], `${path}.${k}`);
    },
  };

  root.T = { describe, test, expect, results };
})(typeof globalThis !== "undefined" ? globalThis : this);
