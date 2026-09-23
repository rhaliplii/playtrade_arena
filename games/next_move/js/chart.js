/* =========================================================
   Next Move · chart.js
   Modular canvas chart.

   There is no fixed chart template. A scenario declares the analysis
   tools its lesson needs and this renderer builds exactly that chart:

     indicators: { ma: [20, 50] }          price + two averages
     indicators: { volume: true }          price + a volume pane
     indicators: { rsi: true }             price + an RSI pane
     indicators: { macd: true }            price + a MACD pane
     indicators: { bb: true }              price + Bollinger Bands
     indicators: {}                        candles alone

   plus a `draw` list of overlays — horizontal levels, diagonal
   trendlines, zones and pattern labels — anchored either to the price
   pane or to an indicator pane, so an RSI divergence can be drawn
   across the RSI itself.

   The design rule: show only what the lesson needs. A support-and-
   resistance chart carries no moving averages, because they would be
   noise on that particular question.

   One rule drives the scale logic: the y-axis is computed from the
   VISIBLE candles only. If it accounted for the hidden bars, the empty
   space on the right would quietly give the answer away.
   ========================================================= */
(function (NM) {
  'use strict';

  const C = {
    up: '#1fc47a',
    upDim: 'rgba(31,196,122,.55)',
    down: '#f2456f',
    downDim: 'rgba(242,69,111,.55)',
    grid: 'rgba(255,255,255,.05)',
    axis: '#6f7680',
    ma20: '#ffc700',
    ma50: '#87bfff',
    ma200: '#b39ddb',
    bb: '#9d8ff0',
    bbFill: 'rgba(157,143,240,.07)',
    macdLine: '#87bfff',
    macdSignal: '#ff9100',
    rsiLine: '#4dd0e1',
    stochK: '#4dd0e1',
    stochD: '#ff9100',
    atrLine: '#f0a6ca',
    fib: '#d8b24a',
    fibKey: '#ffc700',
    support: '#17b26a',
    resistance: '#e31b54',
    neutral: '#c3c8ce',
    cut: 'rgba(255,255,255,.3)',
    futureBg: 'rgba(255,255,255,.022)',
    volAvg: 'rgba(255,255,255,.45)',
  };

  const MA_COLOR = { 20: C.ma20, 50: C.ma50, 200: C.ma200 };
  const KIND_COLOR = { support: C.support, resistance: C.resistance, neutral: C.neutral };

  /* Reveal pacing. The spec's window is 100-250ms per candle (§19); this
     sits near the slow end so each candle is read as it lands rather than
     ticking past, while the whole reveal still fits the ~2s budget.
     game.js needs the same number for its watchdog, so it is exported. */
  const MS_PER_CANDLE = 170;

  /*
   * Reduced motion tones the reveal down; it does not delete it. Watching
   * the hidden candles arrive one at a time IS the lesson, so removing it
   * leaves the player staring at an answer with no idea how it got there.
   * Each candle still eases into place in both modes — a candle growing
   * out of its own open is small, local motion, not the vestibular kind
   * the preference is about. What reduced motion drops is the gliding
   * price axis, the drifting background and the panel transitions, and it
   * runs the sequence a touch quicker.
   */
  const revealDurationFor = (n, reduced) =>
    Math.min(1900, Math.max(950, n * MS_PER_CANDLE)) * (reduced ? 0.75 : 1);

  const FONT = "600 10px 'Montserrat', system-ui, sans-serif";
  const FONT_SM = "700 9px 'Montserrat', system-ui, sans-serif";

  function create(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;

    const st = {
      scn: null,
      revealed: 0,
      revealT: 0,
      animating: false,
      raf: 0,
      dirty: true,
      reduced: !!opts.reducedMotion,
      outcome: null,
      lo: 0, hi: 1, loT: 0, hiT: 1,
      revealStart: 0,
      revealDur: 0,
      onDone: null,
    };

    /* ---------- sizing ---------- */
    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      W = Math.max(240, Math.round(r.width));
      H = Math.max(180, Math.round(r.height));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.dirty = true;
      /* Setting canvas.width wipes the bitmap. Repaint now rather than
         waiting for a frame — requestAnimationFrame is throttled in
         background tabs, and a blank chart is worse than a stale one. */
      if (st.scn) draw();
      schedule();
    }

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas);
    else window.addEventListener('resize', resize);

    /* ---------- helpers ---------- */
    const ind = () => (st.scn && st.scn.indicators) || {};
    const maList = () => (Array.isArray(ind().ma) ? ind().ma : []);
    /** Index one past the last candle currently drawn. */
    const drawnTo = () => st.scn.cutIndex + st.revealed + (st.revealT > 0 ? 1 : 0);

    const slots = () => NM.Scenarios.VIEW_BARS + NM.Scenarios.FUTURE_SLOTS;
    const slotW = (box) => box.w / slots();
    const slotX = (box, k) => box.x + (k + 0.5) * slotW(box);
    const barX = (box, i) => slotX(box, i - st.scn.viewFrom);

    /* ---------- layout: price pane plus whatever panes the lesson needs ---------- */
    /* Height each pane type needs to be readable. Volume is a bar chart
       and survives being short; RSI and MACD are the lesson when they are
       on screen, and a squashed line reads as decoration. */
    const PANE_SHARE = { volume: 0.24, rsi: 0.33, macd: 0.34, stoch: 0.33, atr: 0.26 };

    function paneSpec() {
      const i = ind();
      const list = [];
      if (i.volume) list.push({ key: 'volume', weight: PANE_SHARE.volume });
      if (i.rsi) list.push({ key: 'rsi', weight: PANE_SHARE.rsi });
      if (i.macd) list.push({ key: 'macd', weight: PANE_SHARE.macd });
      if (i.showStochastic) list.push({ key: 'stoch', weight: PANE_SHARE.stoch });
      if (i.showATR) list.push({ key: 'atr', weight: PANE_SHARE.atr });
      return list;
    }

    function layout() {
      const padR = 54, padL = 6, padT = 8, padB = 4;
      const gap = 8;
      const innerH = H - padT - padB;
      const lower = paneSpec();

      /* Sum what the panes need, capped so the candles keep half the panel. */
      const share = Math.min(0.5, lower.reduce((a, p) => a + p.weight, 0));
      const lowerTotal = innerH * share;
      const priceH = innerH - lowerTotal;

      const price = { x: padL, y: padT, w: W - padL - padR, h: priceH - (lower.length ? gap : 0) };
      const boxes = { price };
      const totalWeight = lower.reduce((a, p) => a + p.weight, 0) || 1;

      let y = price.y + price.h + gap;
      lower.forEach((p) => {
        const h = Math.max(10, (lowerTotal / totalWeight) * p.weight - gap);
        boxes[p.key] = { x: padL, y, w: price.w, h };
        y += h + gap;
      });

      boxes._bottom = y - gap;
      return boxes;
    }

    /* ---------- scale ---------- */
    function targetRange() {
      const s = st.scn;
      let lo = Infinity, hi = -Infinity;

      for (let i = s.viewFrom; i < drawnTo(); i++) {
        const b = s.bars[i];
        if (!b) break;
        if (b.h > hi) hi = b.h;
        if (b.l < lo) lo = b.l;
      }

      /* Bands are part of the price picture, so keep them on screen. */
      if (ind().bb) {
        for (let i = s.viewFrom; i < drawnTo(); i++) {
          if (s.ind.bbUpper[i] != null) {
            hi = Math.max(hi, s.ind.bbUpper[i]);
            lo = Math.min(lo, s.ind.bbLower[i]);
          }
        }
      }

      /* So are any levels or zones the scenario draws. */
      (s.draw || []).forEach((d) => {
        if (d.pane && d.pane !== 'price') return;
        if (d.type === 'level') { hi = Math.max(hi, d.price); lo = Math.min(lo, d.price); }
        else if (d.type === 'zone') { hi = Math.max(hi, d.hi); lo = Math.min(lo, d.lo); }
        else if (d.type === 'fib') { hi = Math.max(hi, d.hi); lo = Math.min(lo, d.lo); }
      });

      const pad = (hi - lo) * 0.09 || hi * 0.02;
      return { lo: lo - pad, hi: hi + pad };
    }

    const yOf = (box, p) => box.y + box.h * (1 - (p - st.lo) / (st.hi - st.lo || 1));

    /**
     * Value-to-pixel mapper for every pane on screen, so an overlay can be
     * anchored to price, to RSI or to MACD with the same syntax.
     */
    function paneMappers(boxes) {
      const s = st.scn;
      const m = { price: { box: boxes.price, y: (v) => yOf(boxes.price, v) } };

      if (boxes.rsi) m.rsi = { box: boxes.rsi, y: (v) => boxes.rsi.y + boxes.rsi.h * (1 - v / 100) };

      if (boxes.macd) {
        /* Fit the values actually on screen rather than scaling symmetrically
           around zero — a MACD that never goes negative would otherwise waste
           half the pane and look flat. Zero is always included so the zero
           line stays meaningful. */
        let lo = 0, hi = 0;
        for (let i = s.viewFrom; i < drawnTo(); i++) {
          [s.ind.macd[i], s.ind.macdSignal[i], s.ind.macdHist[i]].forEach((v) => {
            if (v == null) return;
            if (v < lo) lo = v;
            if (v > hi) hi = v;
          });
        }
        const pad = (hi - lo) * 0.12 || 1;
        lo -= pad; hi += pad;
        m.macd = { box: boxes.macd, y: (v) => boxes.macd.y + boxes.macd.h * (1 - (v - lo) / ((hi - lo) || 1)) };
      }

      if (boxes.stoch) m.stoch = { box: boxes.stoch, y: (v) => boxes.stoch.y + boxes.stoch.h * (1 - v / 100) };

      if (boxes.atr) {
        /* Fit the visible ATR, anchored at zero so "half the volatility"
           reads as half the height. */
        let hi = 0;
        for (let i = s.viewFrom; i < drawnTo(); i++) {
          const v = s.ind.atrPct[i];
          if (v != null && v > hi) hi = v;
        }
        hi = hi * 1.15 || 1;
        m.atr = { box: boxes.atr, hi, y: (v) => boxes.atr.y + boxes.atr.h * (1 - v / hi) };
      }

      if (boxes.volume) {
        let max = 0;
        for (let i = s.viewFrom; i < drawnTo(); i++) if (s.bars[i]) max = Math.max(max, s.bars[i].v);
        max *= 1.12;
        m.volume = { box: boxes.volume, max, y: (v) => boxes.volume.y + boxes.volume.h * (1 - v / (max || 1)) };
      }
      return m;
    }

    /* ---------- primitives ---------- */
    function drawGrid(box, lo, hi, fmt, ticks = 5) {
      ctx.save();
      ctx.font = FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const step = (hi - lo) / (ticks - 1);
      for (let i = 0; i < ticks; i++) {
        const v = lo + step * i;
        const y = Math.round(box.y + box.h * (1 - (v - lo) / (hi - lo || 1))) + 0.5;
        ctx.strokeStyle = C.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(box.x, y);
        ctx.lineTo(box.x + box.w, y);
        ctx.stroke();
        ctx.fillStyle = C.axis;
        ctx.fillText(fmt(v), box.x + box.w + 7, y);
      }
      ctx.restore();
    }

    /* What a level IS matters as much as where it is, so the annotation is
       sized to be read rather than squinted at. */
    function tag(box, y, text, color) {
      ctx.save();
      ctx.font = "800 12px 'Montserrat', system-ui, sans-serif";
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(text).width;
      const h = 19, x = box.x + 4, top = y - h - 3;
      ctx.fillStyle = 'rgba(10,12,16,.92)';
      ctx.fillRect(x, top, tw + 20, h);
      /* A colour flash on the leading edge ties the label to its line. */
      ctx.fillStyle = color;
      ctx.fillRect(x, top, 3, h);
      ctx.fillStyle = color;
      ctx.fillText(text, x + 11, top + h / 2 + 0.5);
      ctx.restore();
    }

    function drawSeries(box, arr, color, o = {}) {
      const s = st.scn;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = o.width || 1.4;
      ctx.lineJoin = 'round';
      ctx.globalAlpha = o.alpha != null ? o.alpha : 0.85;
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath();
      let started = false;
      for (let i = s.viewFrom; i < drawnTo(); i++) {
        const v = arr[i];
        if (v == null) { started = false; continue; }
        const x = barX(box, i);
        const y = o.y ? o.y(v) : yOf(box, v);
        /* Keep a far-away average from stretching the pane. */
        if (y < box.y - box.h || y > box.y + box.h * 2) { started = false; continue; }
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    /* ---------- overlays ---------- */

    /** Resolve a trendline endpoint: [barIndex, price | 'high' | 'low' | 'close' | indicator]. */
    function endpoint(pt) {
      const s = st.scn;
      const [bar, val] = pt;
      if (typeof val === 'number') return { bar, value: val };
      const b = s.bars[bar];
      if (!b) return null;
      if (val === 'high') return { bar, value: b.h };
      if (val === 'low') return { bar, value: b.l };
      if (val === 'close') return { bar, value: b.c };
      const arr = s.ind[val];
      return arr && arr[bar] != null ? { bar, value: arr[bar] } : null;
    }

    function drawOverlays(mappers, layer) {
      const s = st.scn;
      (s.draw || []).forEach((d) => {
        const m = mappers[d.pane || 'price'];
        if (!m) return;
        const box = m.box;
        const color = KIND_COLOR[d.kind] || C.neutral;

        if (d.type === 'zone' && layer === 'under') {
          const y1 = m.y(d.hi), y2 = m.y(d.lo);
          ctx.save();
          ctx.globalAlpha = 0.1;
          ctx.fillStyle = color;
          ctx.fillRect(box.x, Math.min(y1, y2), box.w, Math.abs(y2 - y1));
          ctx.globalAlpha = 0.62;
          ctx.strokeStyle = color;
          ctx.setLineDash([6, 4]);
          ctx.lineWidth = 1.5;
          [y1, y2].forEach((y) => {
            ctx.beginPath();
            ctx.moveTo(box.x, Math.round(y) + 0.5);
            ctx.lineTo(box.x + box.w, Math.round(y) + 0.5);
            ctx.stroke();
          });
          ctx.setLineDash([]);
          ctx.restore();
          if (d.label) tag(box, Math.min(y1, y2), d.label, color);
          return;
        }

        if (d.type === 'fib' && layer === 'under') {
          if (!ind().showFibonacci) return;
          const ratios = ind().fibonacciLevels || d.levels;
          const span = d.hi - d.lo;
          ctx.save();
          ctx.font = FONT_SM;
          ctx.textBaseline = 'middle';
          /* 0% and 100% anchor the swing; the ratios sit between them. */
          [0].concat(ratios, [1]).forEach((r) => {
            /* A retracement of a rally measures down from the high; of a
               decline, up from the low. */
            const price = d.dir === 'down' ? d.lo + span * r : d.hi - span * r;
            const y = Math.round(m.y(price)) + 0.5;
            if (y < box.y - 2 || y > box.y + box.h + 2) return;
            const key = r === 0.5 || r === 0.618;
            ctx.strokeStyle = key ? C.fibKey : C.fib;
            ctx.globalAlpha = key ? 0.6 : 0.34;
            ctx.lineWidth = key ? 1.4 : 1;
            ctx.setLineDash(r === 0 || r === 1 ? [] : [3, 4]);
            ctx.beginPath();
            ctx.moveTo(box.x, y);
            ctx.lineTo(box.x + box.w, y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = key ? 1 : 0.75;
            ctx.fillStyle = key ? C.fibKey : C.fib;
            ctx.textAlign = 'right';
            ctx.font = key ? "800 11px 'Montserrat', system-ui, sans-serif" : "700 10px 'Montserrat', system-ui, sans-serif";
            ctx.fillText((r * 100).toFixed(1).replace('.0', '') + '%', box.x + box.w - 5, y - 6);
          });
          ctx.restore();
          if (d.label) tag(box, m.y(d.hi), d.label, C.fibKey);
          return;
        }

        if (d.type === 'level' && layer === 'under') {
          const y = Math.round(m.y(d.price)) + 0.5;
          if (y < box.y - 2 || y > box.y + box.h + 2) return;
          ctx.save();
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.78;
          ctx.lineWidth = 1.8;
          ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(box.x, y);
          ctx.lineTo(box.x + box.w, y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
          if (d.label) tag(box, y, d.label, color);
          return;
        }

        if (d.type === 'trendline' && layer === 'under') {
          const a = endpoint(d.a), c = endpoint(d.b);
          if (!a || !c) return;
          let x1 = barX(box, a.bar), y1 = m.y(a.value);
          let x2 = barX(box, c.bar), y2 = m.y(c.value);

          /* Extend to the cut, the way the line would be drawn on a real
             chart — that is what makes it a usable reference. */
          if (d.extend && x2 !== x1) {
            const cutX = box.x + (s.cutIndex - s.viewFrom) * slotW(box);
            if (cutX > x2) {
              const slope = (y2 - y1) / (x2 - x1);
              y2 += slope * (cutX - x2);
              x2 = cutX;
            }
          }
          ctx.save();
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.75;
          ctx.lineWidth = 1.7;
          ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
          if (d.label) {
            ctx.save();
            ctx.font = "800 11px 'Montserrat', system-ui, sans-serif";
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.95;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(d.label, Math.min(x2 - 4, box.x + box.w - 4), y2 - 10);
            ctx.restore();
          }
          return;
        }

        /* Pattern labels sit over the candles so they stay readable. */
        if (d.type === 'note' && layer === 'over') {
          const b = s.bars[d.bar];
          if (!b) return;
          const value = typeof d.value === 'number' ? d.value : (d.place === 'below' ? b.l : b.h);
          const x = barX(box, d.bar);
          const y = Math.max(box.y + 8, Math.min(box.y + box.h - 8, m.y(value) + (d.place === 'below' ? 15 : -9)));
          ctx.save();
          ctx.font = "800 11px 'Montserrat', system-ui, sans-serif";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const tw = ctx.measureText(d.text).width;
          ctx.fillStyle = 'rgba(10,12,16,.92)';
          ctx.fillRect(x - tw / 2 - 6, y - 9, tw + 12, 17);
          ctx.fillStyle = 'rgba(255,255,255,.88)';
          ctx.fillText(d.text, x, y + 0.5);
          ctx.restore();
        }
      });
    }

    function drawBollinger(box) {
      const s = st.scn;
      ctx.save();
      ctx.fillStyle = C.bbFill;
      ctx.beginPath();
      let started = false;
      for (let i = s.viewFrom; i < drawnTo(); i++) {
        if (s.ind.bbUpper[i] == null) continue;
        const x = barX(box, i), y = yOf(box, s.ind.bbUpper[i]);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      for (let i = drawnTo() - 1; i >= s.viewFrom; i--) {
        if (s.ind.bbLower[i] == null) continue;
        ctx.lineTo(barX(box, i), yOf(box, s.ind.bbLower[i]));
      }
      if (started) { ctx.closePath(); ctx.fill(); }
      ctx.restore();

      drawSeries(box, s.ind.bbUpper, C.bb, { alpha: 0.75, width: 1.2 });
      drawSeries(box, s.ind.bbLower, C.bb, { alpha: 0.75, width: 1.2 });
      drawSeries(box, s.ind.bbMid, C.bb, { alpha: 0.45, width: 1, dash: [4, 4] });
    }

    /** progress 0..1 grows the candle out of its open price. */
    function drawCandle(box, b, k, progress) {
      const w = slotW(box);
      const bw = Math.max(1.5, Math.min(11, w * 0.62));
      const x = slotX(box, k);
      const up = b.c >= b.o;

      let o = b.o, c = b.c, h = b.h, l = b.l;
      if (progress < 1) {
        c = b.o + (b.c - b.o) * progress;
        h = b.o + (b.h - b.o) * progress;
        l = b.o + (b.l - b.o) * progress;
      }

      const yO = yOf(box, o), yC = yOf(box, c), yH = yOf(box, h), yL = yOf(box, l);
      const col = up ? C.up : C.down;

      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = Math.max(1, Math.min(1.6, w * 0.1));
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, Math.min(yH, yL));
      ctx.lineTo(Math.round(x) + 0.5, Math.max(yH, yL));
      ctx.stroke();

      const top = Math.min(yO, yC);
      const bh = Math.max(1, Math.abs(yC - yO));
      ctx.fillRect(Math.round(x - bw / 2), Math.round(top), Math.round(bw), Math.round(bh));
    }

    /* ---------- lower panes ---------- */
    function drawVolume(box, map) {
      const s = st.scn;
      if (!map.max) return;
      const w = slotW(box);
      const bw = Math.max(1.5, Math.min(11, w * 0.62));

      for (let i = s.viewFrom; i < drawnTo(); i++) {
        const b = s.bars[i];
        if (!b) break;
        let p = 1;
        if (i >= s.cutIndex) {
          const fi = i - s.cutIndex;
          p = fi < st.revealed ? 1 : st.revealT;
        }
        const hgt = (b.v / map.max) * box.h * p;
        ctx.fillStyle = b.c >= b.o ? C.upDim : C.downDim;
        ctx.fillRect(Math.round(barX(box, i) - bw / 2), Math.round(box.y + box.h - hgt), Math.round(bw), Math.max(1, Math.round(hgt)));
      }

      /* The 20-bar average is what makes "heavy volume" a fact, not a vibe. */
      drawSeries(box, s.ind.volAvg, C.volAvg, { alpha: 0.8, width: 1, dash: [3, 3], y: map.y });
      paneLabel(box, 'VOL');
    }

    function drawRsi(box, map) {
      const s = st.scn;
      ctx.save();

      /* Shade the extremes so overbought and oversold read at a glance. */
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = C.up;
      ctx.fillRect(box.x, box.y, box.w, map.y(70) - box.y);
      ctx.fillStyle = C.down;
      ctx.fillRect(box.x, map.y(30), box.w, box.y + box.h - map.y(30));
      ctx.globalAlpha = 1;

      /* 50 is the line that separates bullish from bearish momentum, so it
         is drawn as a real reference rather than left implicit. */
      [[30, C.grid], [50, 'rgba(255,255,255,.16)'], [70, C.grid]].forEach((pair) => {
        const lvl = pair[0];
        ctx.strokeStyle = pair[1];
        ctx.setLineDash(lvl === 50 ? [2, 3] : [3, 3]);
        ctx.beginPath();
        ctx.moveTo(box.x, Math.round(map.y(lvl)) + 0.5);
        ctx.lineTo(box.x + box.w, Math.round(map.y(lvl)) + 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = FONT_SM;
        ctx.fillStyle = C.axis;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(lvl), box.x + box.w + 7, map.y(lvl));
      });
      ctx.restore();

      drawSeries(box, s.ind.rsi, C.rsiLine, { width: 1.6, alpha: 1, y: map.y });
      paneLabel(box, 'RSI 14');
    }

    function drawMacd(box, map) {
      const s = st.scn;
      const w = slotW(box);
      const bw = Math.max(1.2, Math.min(9, w * 0.5));
      const zero = map.y(0);

      for (let i = s.viewFrom; i < drawnTo(); i++) {
        const v = s.ind.macdHist[i];
        if (v == null) continue;
        const y = map.y(v);
        ctx.fillStyle = v >= 0 ? C.upDim : C.downDim;
        ctx.fillRect(Math.round(barX(box, i) - bw / 2), Math.round(Math.min(y, zero)), Math.round(bw), Math.max(1, Math.abs(y - zero)));
      }

      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(box.x, Math.round(zero) + 0.5);
      ctx.lineTo(box.x + box.w, Math.round(zero) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      drawSeries(box, s.ind.macd, C.macdLine, { width: 1.6, alpha: 1, y: map.y });
      drawSeries(box, s.ind.macdSignal, C.macdSignal, { width: 1.4, alpha: 0.95, y: map.y });
      paneLabel(box, 'MACD 12·26·9');
    }

    function drawStoch(box, map) {
      const s = st.scn;
      ctx.save();
      /* 80 / 20 are the conventional stochastic bands. */
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = C.up;
      ctx.fillRect(box.x, box.y, box.w, map.y(80) - box.y);
      ctx.fillStyle = C.down;
      ctx.fillRect(box.x, map.y(20), box.w, box.y + box.h - map.y(20));
      ctx.globalAlpha = 1;
      [[20, C.grid], [50, 'rgba(255,255,255,.14)'], [80, C.grid]].forEach((p) => {
        ctx.strokeStyle = p[1];
        ctx.setLineDash(p[0] === 50 ? [2, 3] : [3, 3]);
        ctx.beginPath();
        ctx.moveTo(box.x, Math.round(map.y(p[0])) + 0.5);
        ctx.lineTo(box.x + box.w, Math.round(map.y(p[0])) + 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = FONT_SM;
        ctx.fillStyle = C.axis;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(p[0]), box.x + box.w + 7, map.y(p[0]));
      });
      ctx.restore();
      drawSeries(box, s.ind.stochD, C.stochD, { width: 1.3, alpha: 0.9, y: map.y, dash: [4, 3] });
      drawSeries(box, s.ind.stochK, C.stochK, { width: 1.6, alpha: 1, y: map.y });
      paneLabel(box, 'STOCH 14·3·3');
    }

    function drawAtr(box, map) {
      const s = st.scn;
      /* Filled area: volatility reads as "how much", not "which way". */
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = C.atrLine;
      ctx.beginPath();
      let started = false;
      for (let i = s.viewFrom; i < drawnTo(); i++) {
        const v = s.ind.atrPct[i];
        if (v == null) continue;
        const x = barX(box, i);
        if (!started) { ctx.moveTo(x, box.y + box.h); started = true; }
        ctx.lineTo(x, map.y(v));
      }
      if (started) {
        ctx.lineTo(barX(box, drawnTo() - 1), box.y + box.h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      drawSeries(box, s.ind.atrPct, C.atrLine, { width: 1.5, alpha: 1, y: map.y });

      ctx.font = FONT_SM;
      ctx.fillStyle = C.axis;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(map.hi.toFixed(1) + '%', box.x + box.w + 7, box.y + 6);
      paneLabel(box, 'ATR 14');
    }

    function paneLabel(box, text) {
      ctx.font = FONT_SM;
      ctx.fillStyle = C.axis;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text, box.x + 4, box.y + 2);
    }

    /* ---------- chrome ---------- */
    function drawCutLine(boxes) {
      const s = st.scn;
      const box = boxes.price;
      const x = Math.round(box.x + (s.cutIndex - s.viewFrom) * slotW(box)) + 0.5;

      ctx.fillStyle = C.futureBg;
      ctx.fillRect(x, box.y, box.x + box.w - x, boxes._bottom - box.y);

      ctx.save();
      ctx.strokeStyle = C.cut;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, box.y);
      ctx.lineTo(x, boxes._bottom);
      ctx.stroke();
      ctx.restore();

      ctx.font = FONT_SM;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ctx.fillText('NOW', x + 4, box.y + 2);
    }

    function drawPriceTag(box) {
      const s = st.scn;
      const n = st.revealed + (st.revealT > 0 ? 1 : 0);
      const b = s.bars[Math.min(s.cutIndex - 1 + n, s.bars.length - 1)];
      if (!b) return;
      const y = Math.round(yOf(box, b.c)) + 0.5;
      if (y < box.y || y > box.y + box.h) return;
      const up = n === 0 ? b.c >= b.o : b.c >= s.bars[s.cutIndex - 1].c;
      const txt = fmtPrice(b.c);

      ctx.save();
      ctx.font = FONT;
      const tw = ctx.measureText(txt).width;
      ctx.strokeStyle = up ? C.up : C.down;
      ctx.globalAlpha = 0.35;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(box.x, y);
      ctx.lineTo(box.x + box.w, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = up ? C.up : C.down;
      ctx.fillRect(box.x + box.w + 3, y - 7, tw + 8, 14);
      ctx.fillStyle = '#0b0d11';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, box.x + box.w + 7, y);
      ctx.restore();
    }

    function drawOutcome(box) {
      const s = st.scn;
      if (!st.outcome || st.revealed < s.futureCount) return;
      const from = s.bars[s.cutIndex - 1].c;
      const last = s.bars[s.bars.length - 1].c;
      const up = last >= from;
      const x0 = box.x + (s.cutIndex - s.viewFrom) * slotW(box);
      const x1 = barX(box, s.bars.length - 1);

      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = up ? C.up : C.down;
      const yA = yOf(box, from), yB = yOf(box, last);
      ctx.fillRect(x0, Math.min(yA, yB), x1 - x0, Math.abs(yB - yA));
      ctx.restore();

      const label = s.outcomeLabel;
      ctx.save();
      ctx.font = "800 11px 'Montserrat', system-ui, sans-serif";
      const tw = ctx.measureText(label).width;
      const bx = Math.min(x1 + 6, box.x + box.w - tw - 10);
      const by = Math.max(box.y + 10, Math.min(yB, box.y + box.h - 10));
      ctx.fillStyle = up ? C.up : C.down;
      ctx.globalAlpha = 0.92;
      ctx.fillRect(bx - 5, by - 9, tw + 10, 18);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0b0d11';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx, by);
      ctx.restore();
    }

    /** The legend names only the tools this scenario actually put on screen. */
    function drawLegend(box) {
      const items = maList().map((p) => ['MA' + p, MA_COLOR[p] || C.neutral]);
      if (ind().bb) items.push(['BB 20·2', C.bb]);
      if (ind().showFibonacci) items.push(['FIB', C.fibKey]);
      if (!items.length) return;
      ctx.save();
      ctx.font = FONT_SM;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      let x = box.x + 4;
      const y = box.y + 2;
      items.forEach(([label, col]) => {
        ctx.fillStyle = col;
        ctx.fillRect(x, y + 4, 8, 2);
        x += 11;
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.fillText(label, x, y);
        x += ctx.measureText(label).width + 9;
      });
      ctx.restore();
    }

    /* One formatter across equities, crypto, metals and FX. */
    function fmtPrice(v) {
      if (v >= 10000) return Math.round(v).toLocaleString('en-US');
      if (v >= 1000) return v.toFixed(1);
      if (v >= 10) return v.toFixed(2);
      if (v >= 1) return v.toFixed(4);
      return v.toFixed(5);
    }

    /* ---------- frame ---------- */
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const s = st.scn;
      if (!s) return;

      const boxes = layout();
      const mappers = paneMappers(boxes);
      const price = boxes.price;

      drawGrid(price, st.lo, st.hi, fmtPrice);
      drawCutLine(boxes);
      drawOverlays(mappers, 'under');

      if (ind().bb) drawBollinger(price);
      /* Longest average first, so the fastest one sits on top. */
      maList().slice().sort((a, b) => b - a).forEach((p) => {
        const arr = s.ind['ma' + p];
        if (arr) drawSeries(price, arr, MA_COLOR[p] || C.neutral, { alpha: 0.85 });
      });

      for (let i = s.viewFrom; i < drawnTo(); i++) {
        const b = s.bars[i];
        if (!b) break;
        let p = 1;
        if (i >= s.cutIndex) {
          const fi = i - s.cutIndex;
          p = fi < st.revealed ? 1 : st.revealT;
        }
        if (p > 0) drawCandle(price, b, i - s.viewFrom, p);
      }

      drawOutcome(price);
      drawPriceTag(price);
      drawLegend(price);

      if (boxes.volume) drawVolume(boxes.volume, mappers.volume);
      if (boxes.rsi) drawRsi(boxes.rsi, mappers.rsi);
      if (boxes.macd) drawMacd(boxes.macd, mappers.macd);
      if (boxes.stoch) drawStoch(boxes.stoch, mappers.stoch);
      if (boxes.atr) drawAtr(boxes.atr, mappers.atr);

      drawOverlays(mappers, 'over');
    }

    function frame(now) {
      st.raf = 0;
      /* The canvas is sized on creation, before any scenario exists. */
      if (!st.scn) { ctx.clearRect(0, 0, W, H); return; }
      const t = targetRange();
      st.loT = t.lo; st.hiT = t.hi;

      /* Reduced motion settles the axis faster, but never snaps it. */
      const k = st.reduced ? 0.3 : 0.18;
      const span = st.hiT - st.loT;
      const moved = Math.abs(st.lo - st.loT) > span * 0.0008 || Math.abs(st.hi - st.hiT) > span * 0.0008;
      st.lo += (st.loT - st.lo) * k;
      st.hi += (st.hiT - st.hi) * k;

      let revealing = false;
      if (st.animating) {
        const s = st.scn;
        const elapsed = now - st.revealStart;
        const per = st.revealDur / s.futureCount;
        const full = Math.floor(elapsed / per);
        const done = Math.min(full, s.futureCount);
        st.revealed = done;
        /* Ease-out within the slot: the candle shoots up then settles,
           which reads as a print rather than a linear stretch. Using most
           of the slot keeps something moving at all times. */
        /* Ease-out across almost the whole slot, so one candle is still
           settling as the next starts and the sequence never stutters. */
        const raw = done >= s.futureCount ? 0 : Math.min(1, (elapsed - full * per) / (per * 0.95));
        st.revealT = raw === 0 ? 0 : 1 - Math.pow(1 - raw, 1.7);
        if (done >= s.futureCount) finishReveal();
        else revealing = true;
      }

      draw();
      if (revealing || moved || st.dirty) {
        st.dirty = false;
        schedule();
      }
    }

    function schedule() {
      if (!st.raf) st.raf = requestAnimationFrame(frame);
    }

    /**
     * Snap the reveal to finished and fire the callback exactly once.
     * The frame loop calls this normally; game.js also calls it from a
     * watchdog, because requestAnimationFrame is throttled to a stop in
     * background tabs and the player must never be stranded mid-reveal.
     */
    function finishReveal() {
      if (!st.scn) return;
      st.revealed = st.scn.futureCount;
      st.revealT = 0;
      st.animating = false;
      st.dirty = true;
      schedule();
      const cb = st.onDone;
      st.onDone = null;
      if (cb) cb();
    }

    /* ---------- public API ---------- */
    const api = {
      load(scn) {
        st.scn = scn;
        st.revealed = 0;
        st.revealT = 0;
        st.animating = false;
        st.outcome = null;
        st.onDone = null;
        const t = targetRange();
        st.lo = t.lo; st.hi = t.hi;
        st.dirty = true;
        if (!W) resize();
        else { draw(); schedule(); }   // first paint is immediate
        return api;
      },

      /** Paint synchronously. Used on resize and by the test harness. */
      redraw() { draw(); return api; },

      /**
       * Drop the current scenario and wipe the canvas.
       * Without this a new run shows the previous run's chart — revealed
       * candles and outcome label included — behind the 3-2-1 countdown.
       */
      clear() {
        st.scn = null;
        st.revealed = 0;
        st.revealT = 0;
        st.animating = false;
        st.outcome = null;
        st.onDone = null;
        if (st.raf) cancelAnimationFrame(st.raf);
        st.raf = 0;
        ctx.clearRect(0, 0, W, H);
        return api;
      },

      /** Animate the hidden candles in, one at a time. */
      reveal(onDone) {
        if (!st.scn) return api;
        st.revealDur = revealDurationFor(st.scn.futureCount, st.reduced);
        st.revealStart = performance.now();
        st.animating = true;
        st.onDone = onDone || null;
        schedule();
        return api;
      },

      showOutcome(res) {
        st.outcome = res;
        st.dirty = true;
        schedule();
        return api;
      },

      /** Force the reveal to completion (watchdog / page hidden). */
      finishReveal,
      /** How many hidden candles are currently drawn — for tests. */
      revealedCount: () => st.revealed,
      setReducedMotion(v) { st.reduced = !!v; return api; },
      resize,
      isRevealing: () => st.animating,

      destroy() {
        if (st.raf) cancelAnimationFrame(st.raf);
        st.raf = 0;
        if (ro) ro.disconnect();
        else window.removeEventListener('resize', resize);
        st.scn = null;
      },
    };

    resize();
    return api;
  }

  NM.Chart = { create, COLORS: C, revealDurationFor };
})(window.NM = window.NM || {});
