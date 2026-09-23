/* =========================================================
   Next Move · series.js
   The price-action story engine.

   Scenario charts are AUTHORED, not randomised. A scenario describes
   its technical story as a sequence of moves — "rally to 118", "three
   quiet bars pulling back", "poke above resistance and close back
   inside" — and this builder turns that into candles that actually
   look like a market doing that thing.

   The rule (spec §16): the visible chart must support the concept, and
   the hidden candles must genuinely demonstrate the outcome. No chart
   is ever generated randomly and then assigned an answer.
   ========================================================= */
(function (NM) {
  'use strict';

  function create(seed, opts = {}) {
    const rng = NM.Rng.create(seed);

    const b = {
      bars: [],
      price: 100,
      vol: opts.vol || 0.013,      // per-bar volatility, as a fraction of price
      baseVol: opts.baseVol || 100, // volume units
      cutIndex: null,
      /* Everything drawn on top of the candles: levels, trendlines,
         zones and pattern labels. One list, so a scenario shows exactly
         the analysis tools its lesson needs and nothing else. */
      draw: [],
      rng,
    };

    /* ---------- core: push one realistic candle ---------- */
    function push(close, o = {}) {
      const open = o.gap ? b.price * (1 + o.gap) : b.price;
      const c = close;
      const atr = open * b.vol * (o.volaMul || 1);
      const top = Math.max(open, c);
      const bot = Math.min(open, c);

      // Wicks scale with the bar's own volatility, not its body, so a
      // doji still gets a believable range.
      const uw = (o.upWick != null ? o.upWick : rng.range(0.12, 0.85)) * atr;
      const dw = (o.dnWick != null ? o.dnWick : rng.range(0.12, 0.85)) * atr;

      const bar = {
        o: open,
        h: Math.max(top + uw, top),
        l: Math.min(bot - dw, bot),
        c,
        v: Math.max(4, b.baseVol * (o.volMul != null ? o.volMul : 1) * rng.range(0.78, 1.22)),
      };
      b.bars.push(bar);
      b.price = c;
      return bar;
    }
    b.push = push;

    /* ---------- authoring primitives ---------- */

    /** Set the starting price without emitting a candle. */
    b.at = function (p) { b.price = p; return b; };

    /** Set per-bar volatility (fraction of price). */
    b.vola = function (v) { b.vol = v; return b; };

    /**
     * Move to an exact target price over n bars.
     * The last bar closes precisely at `target`, which is what makes
     * support/resistance levels land where the scenario says they do.
     */
    b.to = function (target, n, o = {}) {
      const start = b.price;
      const noise = o.noise != null ? o.noise : 0.55;
      const curve = o.curve || 'linear'; // 'linear' | 'ease' (slows into target) | 'accel'
      const v0 = o.volMul != null ? o.volMul : 1;
      const v1 = o.volEnd != null ? o.volEnd : v0;

      for (let i = 1; i <= n; i++) {
        let t = i / n;
        if (curve === 'ease') t = 1 - Math.pow(1 - t, 1.9);
        else if (curve === 'accel') t = Math.pow(t, 1.9);

        const ideal = start + (target - start) * t;
        // Wobble around the path, but never on the final bar — that one
        // has to land exactly on the level.
        const wob = i === n ? 0 : rng.gauss() * b.vol * start * noise;
        const close = i === n ? target : ideal + wob;

        push(close, {
          volMul: v0 + (v1 - v0) * t,
          upWick: o.upWick,
          dnWick: o.dnWick,
          volaMul: o.volaMul,
          gap: i === 1 ? o.gap : 0,
        });
      }
      return b;
    };

    /** A sequence of [target, bars, opts] moves — the swing structure of a trend. */
    b.zig = function (seq) {
      seq.forEach(([target, n, o]) => b.to(target, n, o || {}));
      return b;
    };

    /** Quiet drift around the current price. `amp` is a fraction of price. */
    b.flat = function (n, o = {}) {
      const mid = o.mid != null ? o.mid : b.price;
      const amp = (o.amp != null ? o.amp : 0.006) * mid;
      for (let i = 0; i < n; i++) {
        // Pull back toward the middle so it reads as balance, not drift.
        const pullToMid = (mid - b.price) * 0.45;
        const close = b.price + pullToMid + rng.gauss() * amp;
        push(close, { volMul: o.volMul != null ? o.volMul : 0.75, volaMul: o.volaMul || 0.8 });
      }
      return b;
    };

    /** Directionless but violent — the classic "stay out" tape. */
    b.chop = function (n, o = {}) {
      const mid = o.mid != null ? o.mid : b.price;
      const amp = (o.amp != null ? o.amp : 0.02) * mid;
      let dir = rng.sign();
      for (let i = 0; i < n; i++) {
        dir = -dir; // alternate: big green, big red, big green…
        const close = b.price + dir * amp * rng.range(0.55, 1.25) + (mid - b.price) * 0.3;
        push(close, { volMul: o.volMul != null ? o.volMul : 1, volaMul: 1.15 });
      }
      return b;
    };

    /** Oscillate between two levels — a range, with real touches at the edges. */
    b.range = function (n, lo, hi, o = {}) {
      const touches = o.touches || Math.max(2, Math.round(n / 6));
      const per = Math.max(2, Math.floor(n / touches));
      let up = o.startUp != null ? o.startUp : b.price < (lo + hi) / 2;
      let left = n;
      while (left > 0) {
        const bars = Math.min(per, left);
        const edge = up ? hi : lo;
        // Don't hit the edge dead-on every time — real ranges are sloppy.
        const target = edge - (up ? 1 : -1) * (hi - lo) * rng.range(0, 0.16);
        b.to(target, bars, {
          volMul: o.volMul != null ? o.volMul : 0.85,
          upWick: up ? rng.range(0.7, 1.5) : undefined,
          dnWick: up ? undefined : rng.range(0.7, 1.5),
        });
        up = !up;
        left -= bars;
      }
      return b;
    };

    /** Volatility compression — a coil, a pennant, a squeeze. */
    b.taper = function (n, o = {}) {
      const mid = o.mid != null ? o.mid : b.price;
      const a0 = (o.from != null ? o.from : 0.018) * mid;
      const a1 = (o.to != null ? o.to : 0.004) * mid;
      const v0 = o.volMul != null ? o.volMul : 1;
      const v1 = o.volEnd != null ? o.volEnd : 0.45;
      let dir = rng.sign();
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 1 : i / (n - 1);
        const amp = a0 + (a1 - a0) * t;
        dir = -dir;
        const close = b.price + dir * amp * rng.range(0.5, 1) + (mid - b.price) * 0.35;
        push(close, { volMul: v0 + (v1 - v0) * t, volaMul: 0.5 + (1 - t) * 0.7 });
      }
      return b;
    };

    /**
     * A smooth arc from the current price to `to`, bowing through
     * `extreme` at the halfway point. This is what makes a rounded bottom
     * actually look rounded instead of like three straight legs.
     */
    b.arc = function (n, o = {}) {
      const start = b.price;
      const end = o.to != null ? o.to : start;
      const mid = (start + end) / 2;
      const depth = (o.extreme != null ? o.extreme : mid) - mid;
      const v0 = o.volMul != null ? o.volMul : 1;
      const v1 = o.volEnd != null ? o.volEnd : v0;
      const noise = o.noise != null ? o.noise : 0.4;
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const ideal = start + (end - start) * t + Math.sin(Math.PI * t) * depth;
        const wob = i === n ? 0 : rng.gauss() * b.vol * start * noise;
        push(ideal + wob, { volMul: v0 + (v1 - v0) * t });
      }
      return b;
    };

    /**
     * One bar that trades through a level and closes back on the other
     * side — the failed breakout / bear trap / stop run.
     */
    b.poke = function (level, o = {}) {
      const above = o.above !== false;
      const overshoot = (o.overshoot != null ? o.overshoot : 0.012) * level;
      const close = o.closeAt != null ? o.closeAt : b.price * (above ? 0.997 : 1.003);
      const reach = above ? level + overshoot : level - overshoot;
      const atr = b.price * b.vol;
      push(close, {
        volMul: o.volMul != null ? o.volMul : 1.6,
        upWick: above ? Math.max(0.3, (reach - Math.max(b.price, close)) / atr) : 0.2,
        dnWick: above ? 0.2 : Math.max(0.3, (Math.min(b.price, close) - reach) / atr),
      });
      return b;
    };

    /** Named candlestick shapes. Context still decides the meaning (§43). */
    b.pattern = function (name, o = {}) {
      const p = b.price;
      const atr = p * b.vol;
      const vm = o.volMul != null ? o.volMul : 1;
      const prev = b.bars[b.bars.length - 1];

      switch (name) {
        case 'hammer':
          // Small body at the top, long lower wick: sellers pushed, buyers took it back.
          push(p * (1 + rng.range(0.001, 0.004)), { volMul: vm, upWick: rng.range(0.1, 0.3), dnWick: rng.range(2.6, 3.6) });
          break;
        case 'shootingStar':
          push(p * (1 - rng.range(0.001, 0.004)), { volMul: vm, upWick: rng.range(2.6, 3.6), dnWick: rng.range(0.1, 0.3) });
          break;
        case 'doji':
          push(p * (1 + rng.range(-0.0008, 0.0008)), { volMul: vm * 0.8, upWick: rng.range(1.2, 1.9), dnWick: rng.range(1.2, 1.9) });
          break;
        case 'spinningTop':
          push(p * (1 + rng.range(-0.003, 0.003)), { volMul: vm * 0.8, upWick: rng.range(1.1, 1.7), dnWick: rng.range(1.1, 1.7) });
          break;
        case 'engulfBull': {
          // Must actually engulf the previous body to be worth the name.
          const need = prev ? Math.max(prev.o, prev.c) : p * 1.01;
          const down = prev ? Math.min(prev.o, prev.c) : p * 0.99;
          b.price = down * (1 - rng.range(0.001, 0.003)); // opens below prior body
          push(need * (1 + rng.range(0.004, 0.011)), { volMul: vm * 1.5, upWick: rng.range(0.2, 0.6), dnWick: rng.range(0.2, 0.5) });
          break;
        }
        case 'engulfBear': {
          const need = prev ? Math.min(prev.o, prev.c) : p * 0.99;
          const up = prev ? Math.max(prev.o, prev.c) : p * 1.01;
          b.price = up * (1 + rng.range(0.001, 0.003));
          push(need * (1 - rng.range(0.004, 0.011)), { volMul: vm * 1.5, upWick: rng.range(0.2, 0.5), dnWick: rng.range(0.2, 0.6) });
          break;
        }
        case 'inside': {
          const hi = prev ? prev.h : p * 1.01;
          const lo = prev ? prev.l : p * 0.99;
          const span = hi - lo;
          b.price = lo + span * rng.range(0.35, 0.55);
          const bar = push(lo + span * rng.range(0.45, 0.65), { volMul: vm * 0.6, upWick: 0.3, dnWick: 0.3 });
          bar.h = Math.min(bar.h, hi - span * 0.06);
          bar.l = Math.max(bar.l, lo + span * 0.06);
          break;
        }
        case 'marubozuUp':
          push(p * (1 + (o.body != null ? o.body : rng.range(0.022, 0.034))), { volMul: vm * 1.8, upWick: rng.range(0.05, 0.18), dnWick: rng.range(0.05, 0.15) });
          break;
        case 'marubozuDown':
          push(p * (1 - (o.body != null ? o.body : rng.range(0.022, 0.034))), { volMul: vm * 1.8, upWick: rng.range(0.05, 0.15), dnWick: rng.range(0.05, 0.18) });
          break;
        case 'climaxDown':
          // Capitulation: huge range, heavy volume, closes well off the low.
          push(p * (1 - rng.range(0.03, 0.045)), { volMul: vm * 3.6, upWick: rng.range(0.2, 0.5), dnWick: rng.range(3.2, 4.4), volaMul: 1.6 });
          break;
        case 'climaxUp':
          push(p * (1 + rng.range(0.03, 0.045)), { volMul: vm * 3.6, upWick: rng.range(3.2, 4.4), dnWick: rng.range(0.2, 0.5), volaMul: 1.6 });
          break;
        default:
          push(p, { volMul: vm });
      }
      return b;
    };

    /**
     * Plausible backdrop leading into the setup. Ends exactly on `endPrice`
     * so the authored story starts from a known place. This exists mostly
     * so MA50 / MA200 are computed from real history rather than faked.
     */
    b.backdrop = function (n, endPrice, o = {}) {
      const swings = o.swings || 7;
      const start = b.price;
      const per = Math.floor(n / swings);
      let used = 0;
      for (let i = 1; i <= swings; i++) {
        const bars = i === swings ? n - used : per;
        used += bars;
        const t = i / swings;
        const base = start + (endPrice - start) * t;
        // Alternating over/undershoot gives the backdrop swing structure
        // instead of a straight ramp.
        const wobble = (i % 2 ? 1 : -1) * Math.abs(endPrice - start || start * 0.08) * rng.range(0.06, 0.2);
        const target = i === swings ? endPrice : base + wobble;
        b.to(target, bars, { noise: 0.7, volMul: rng.range(0.7, 1.1) });
      }
      return b;
    };

    /* ---------- levels & the reveal boundary ---------- */

    /* ---- overlays ---- */

    b.support = function (price, label) { b.draw.push({ type: 'level', kind: 'support', price, label }); return b; };
    b.resistance = function (price, label) { b.draw.push({ type: 'level', kind: 'resistance', price, label }); return b; };
    /** A level with no directional meaning — a neckline, a midpoint, a pivot. */
    b.level = function (price, label) { b.draw.push({ type: 'level', kind: 'neutral', price, label }); return b; };

    /**
     * A diagonal line between two bars. Each endpoint is [barIndex, value],
     * where value is a price or one of 'high' | 'low' | 'close' — letting a
     * trendline sit exactly on the swings it is drawn from.
     * `pane` may be 'price' (default) or an indicator pane such as 'rsi'.
     */
    b.trendline = function (a, c, o = {}) {
      b.draw.push({
        type: 'trendline', a, b: c,
        kind: o.kind || 'neutral', label: o.label || null,
        pane: o.pane || 'price', extend: o.extend !== false,
      });
      return b;
    };

    /** A horizontal band — a supply or demand zone rather than a single price. */
    b.zone = function (lo, hi, o = {}) {
      b.draw.push({ type: 'zone', lo, hi, kind: o.kind || 'neutral', label: o.label || null });
      return b;
    };

    /**
     * Fibonacci retracement between a swing low and high. The levels are
     * derived from the swing the scenario actually drew, so they land on
     * the price action rather than being placed by hand.
     */
    b.fib = function (lo, hi, o = {}) {
      b.draw.push({
        type: 'fib', lo, hi,
        levels: o.levels || [0.236, 0.382, 0.5, 0.618, 0.786],
        /* 'up' retraces a rally (levels act as support), 'down' retraces a
           decline (levels act as resistance). */
        dir: o.dir || 'up',
        label: o.label || null,
      });
      return b;
    };

    /** A small label pinned to one bar, for naming the parts of a pattern. */
    b.note = function (bar, value, text, o = {}) {
      b.draw.push({ type: 'note', bar, value, text, place: o.place || 'above', pane: o.pane || 'price' });
      return b;
    };

    /** Index of the next bar to be pushed — for anchoring overlays while authoring. */
    b.mark = function () { return b.bars.length; };

    /** Everything after this point is hidden until the player answers. */
    b.cut = function () { b.cutIndex = b.bars.length; return b; };

    /* ---------- readouts, for authoring convenience ---------- */
    b.high = (from = 0) => Math.max(...b.bars.slice(from).map((x) => x.h));
    b.low = (from = 0) => Math.min(...b.bars.slice(from).map((x) => x.l));
    b.len = () => b.bars.length;
    b.lastBar = () => b.bars[b.bars.length - 1];

    /**
     * Live moving average while authoring.
     * A scenario that says "price pulled back to the rising 50-day
     * average" can target `b.ma(50)` directly, so the words and the
     * pixels can't drift apart.
     */
    b.ma = function (period) {
      const n = b.bars.length;
      if (n < period) return b.price;
      let s = 0;
      for (let i = n - period; i < n; i++) s += b.bars[i].c;
      return s / period;
    };

    /** Average volume of the last `period` bars — for authoring volume stories. */
    b.volAvg = function (period = 20) {
      const n = b.bars.length;
      if (!n) return b.baseVol;
      const from = Math.max(0, n - period);
      let s = 0;
      for (let i = from; i < n; i++) s += b.bars[i].v;
      return s / (n - from);
    };

    return b;
  }

  /** Net move across the hidden section, as a fraction. */
  function outcomeMove(bars, cutIndex) {
    if (cutIndex == null || cutIndex < 1 || cutIndex >= bars.length) return 0;
    const from = bars[cutIndex - 1].c;
    const to = bars[bars.length - 1].c;
    return (to - from) / from;
  }

  NM.Series = { create, outcomeMove };
})(window.NM = window.NM || {});
