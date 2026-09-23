/* =========================================================
   Next Move · rng.js
   Deterministic pseudo-random numbers.

   Every scenario builds its candles from a seed derived from its id,
   so a given scenario always renders the exact same chart — on any
   device, in any session. That matters for a teaching game: the
   explanation has to describe the chart the player actually saw.
   ========================================================= */
(function (NM) {
  'use strict';

  /* mulberry32 — small, fast, good enough for chart texture */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* FNV-1a — turns a scenario id into a stable 32-bit seed */
  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function create(seed) {
    const next = mulberry32(typeof seed === 'string' ? hash(seed) : (seed | 0) || 1);
    const api = {
      next,
      /* uniform in [a, b) */
      range: (a, b) => a + next() * (b - a),
      int: (a, b) => Math.floor(a + next() * (b - a + 1)),
      /* roughly normal, mean 0, sd ~1 (sum of three uniforms) */
      gauss: () => (next() + next() + next() - 1.5) * 1.1547,
      /* -1 or 1 */
      sign: () => (next() < 0.5 ? -1 : 1),
      chance: (p) => next() < p,
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      },
    };
    return api;
  }

  NM.Rng = { create, hash, mulberry32 };
})(window.NM = window.NM || {});
