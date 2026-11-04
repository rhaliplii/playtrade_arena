/* Profit.com Academy · card visuals. Every chart and diagram is data (content/schema/visual.schema.json).
   AC.visual(spec, {explore}) → HTML string · AC.visual.el(spec) → Element
   AC.visual.mount(root, {onProgress}) wires the interactive parts and reports exploration progress:
     tiles (tap to open) · slider (drag; both ends) · bars with `sub` (tap to reveal) ·
     explore mode for walk-throughs: chart zones / order lines / book rows to tap, or ▶ Play for a sequence.
   Colours come from tone classes (.ac-tone--up …) that set --tone / --tone-ink from tokens.css. No hex here. */
(function () {
  "use strict";
  var AC = (window.AC = window.AC || {});
  var esc = function (s) { return AC.esc(s); };
  var TONES = ["up", "down", "gold", "sky", "muted", "white", "primary", "pro", "coral", "amber", "blue"];
  /* A glossary link is a <button> (an inline box): the line may break right after it, leaving its period alone on the
     next line ("shares\n."). Glue punctuation that follows a term (bold or not) to it. */
  if (AC.rich && !AC.rich.glued) {
    var rich0 = AC.rich;
    AC.rich = function (s) {
      // wrap the term (with its bold, when the bold is just the term) and the punctuation in a no-wrap span
      return rich0(s).replace(/(<b>)?(<button type="button" class="ac-term"[^>]*>[^<]*<\/button>)(<\/b>)?([.,;:!?)\u2019\u201d\u2026]+)/g, function (m, b0, btn, b1, p) {
        if (b0 && b1) return '<span class="ac-nb">' + b0 + btn + b1 + p + "</span>";
        if (!b0 && !b1) return '<span class="ac-nb">' + btn + p + "</span>";
        if (b0) return b0 + '<span class="ac-nb">' + btn + p + "</span>";   // the bold goes on past the punctuation
        return m.replace(/(<\/b>)([.,;:!?)\u2019\u201d\u2026]+)$/, "$1\u2060$2");   // bold started earlier: a word joiner at least
      });
    };
    AC.rich.glued = true;
  }
  function tone(t, fb) { return "ac-tone--" + (TONES.indexOf(t) >= 0 ? t : (fb || "muted")); }
  function r1(n) { return Math.round(n * 10) / 10; }
  var uid = 0;

  function T(x, y, s, o) {
    o = o || {};
    var cls = "ac-v__t" + (o.tone ? " " + tone(o.tone) + " ac-v__t--tone" : "") + (o.cls ? " " + o.cls : "");
    return '<text x="' + r1(x) + '" y="' + r1(y) + '" class="' + cls + '" font-size="' + (o.fs || 11) + '" font-weight="' + (o.w || 700) +
      '" text-anchor="' + (o.anchor || "start") + '">' + esc(s) + "</text>";
  }
  function num(v, d) { return AC.fmt.num(v, { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function money(v, d) { return AC.fmt.money(v, "USD", d == null ? (Math.abs(v % 1) > 1e-9 ? 2 : 0) : d); }
  function signed(v, d) { return (v > 0 ? "+" : v < 0 ? "−" : "") + money(Math.abs(v), d); }
  function pctS(v) { return (v > 0 ? "+" : v < 0 ? "−" : "") + AC.fmt.num(Math.abs(v), { maximumFractionDigits: 1 }) + "%"; }

  var ICONS = {
    fund: '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/>',
    robot: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
    // asset classes (Ch1 L3)
    bond: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 17l5-6"/><circle cx="10.5" cy="11.5" r=".9"/><circle cx="14.5" cy="16.5" r=".9"/>',
    basket: '<path d="M4 14h16M4 9.5h16M4 19h16"/><circle cx="7" cy="5" r="1.4"/><circle cx="12" cy="5" r="1.4"/><circle cx="17" cy="5" r="1.4"/>',
    stock: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
    commodity: '<path d="M4 18h16l-2.5-6h-11z"/><path d="M8 12l1.5-5h5L16 12"/>',
    forex: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    crypto: '<circle cx="12" cy="12" r="9"/><path d="M10 7.5v9M10 8h3.2a2 2 0 0 1 0 4H10h3.6a2 2 0 0 1 0 4.3H10M11.5 6v2M11.5 16.3v1.7"/>',
  };
  function icon(name) {
    return ICONS[name] ? '<svg class="ac-v__icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + "</svg>" : "";
  }

  /** Gridline values between lo and hi: about `want` + 1 lines on a round step (1, 2 or 5 × 10^n). */
  function niceTicks(lo, hi, want) {
    var raw = (hi - lo) / (want + 1), p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), best = p, bestD = Infinity;
    [1, 2, 5, 10].forEach(function (m) { var d = Math.abs(Math.log(raw / (m * p))); if (d < bestD) { bestD = d; best = m * p; } });
    var start = Math.ceil(lo / best - 1e-9), end = Math.floor(hi / best + 1e-9);
    if (end - start + 1 > want + 3) { best *= 2; start = Math.ceil(lo / best - 1e-9); end = Math.floor(hi / best + 1e-9); }
    var values = [];
    for (var i = start; i <= end; i++) values.push(Math.round(i * best * 1e6) / 1e6);
    var dig = 0;
    while (dig < 4 && Math.abs(Math.round(best * Math.pow(10, dig)) - best * Math.pow(10, dig)) > 1e-6) dig++;
    return { values: values, dig: dig };
  }

  // ------------------------------------------------------------------ chart maths (Chapters 3–10)
  /** Seeded random (mulberry32): the same path draws the same candles every time. */
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function rnd2(v) { return Math.round(v * 100) / 100; }
  /** chart.path [[i, close], …] → OHLC. Closes pass exactly through every waypoint; between them a seeded wiggle (noise)
      and wicks (wick). n = candles (default: last waypoint + 1). */
  function genPath(c) {
    var pts = (c.path || []).slice().sort(function (a, b) { return a[0] - b[0]; });
    if (!pts.length) return [];
    var n = c.n || pts[pts.length - 1][0] + 1, r = rng(c.seed || 7);
    var plo = Math.min.apply(null, pts.map(function (p) { return p[1]; })), phi = Math.max.apply(null, pts.map(function (p) { return p[1]; }));
    var range = (phi - plo) || Math.abs(phi) * 0.05 || 1;
    var amp = (c.noise != null ? c.noise : 0.5) * range * 0.06, wick = (c.wick != null ? c.wick : 0.5) * range * 0.05 + range * 0.004;
    var closes = [], fixed = {};
    pts.forEach(function (p) { fixed[p[0]] = true; });
    for (var i = 0; i < n; i++) {
      var k = 0;
      while (k < pts.length - 1 && pts[k + 1][0] < i) k++;
      var a = pts[k], b = pts[Math.min(k + 1, pts.length - 1)], base;
      if (i <= pts[0][0]) base = pts[0][1];
      else if (i >= pts[pts.length - 1][0]) base = pts[pts.length - 1][1];
      else base = a[1] + (b[1] - a[1]) * (i - a[0]) / ((b[0] - a[0]) || 1);
      var jit = (r() - 0.5) * 2 * amp;
      closes.push(fixed[i] ? base : base + jit);
    }
    return closes.map(function (cl, i) {
      var op = i ? closes[i - 1] + (r() - 0.5) * amp * 0.5 : cl - (closes[1] != null ? closes[1] - cl : 0) * 0.6 + (r() - 0.5) * amp;
      var hi = Math.max(op, cl) + r() * wick, lo = Math.min(op, cl) - r() * wick;
      return [rnd2(op), rnd2(hi), rnd2(lo), rnd2(cl)];
    });
  }
  /** a series aligned to n candles: shorter arrays are right-aligned (they end on the last candle); null = no value */
  function align(arr, n) {
    arr = arr || [];
    if (arr.length >= n) return arr.slice(arr.length - n);
    var pad = []; for (var i = arr.length; i < n; i++) pad.push(null);
    return pad.concat(arr);
  }
  function sma(xs, p) { return xs.map(function (x, i) { if (i < p - 1) return null; var s = 0; for (var k = i - p + 1; k <= i; k++) s += xs[k]; return s / p; }); }
  function ema(xs, p) { var k = 2 / (p + 1), out = [], prev = null; xs.forEach(function (x) { if (x == null) { out.push(null); return; } prev = prev == null ? x : x * k + prev * (1 - k); out.push(prev); }); return out; }
  function rsiOf(xs, p) {
    var out = xs.map(function () { return null; }), g = 0, l = 0;
    if (xs.length <= p) return out;
    for (var i = 1; i <= p; i++) { var d = xs[i] - xs[i - 1]; if (d > 0) g += d; else l -= d; }
    g /= p; l /= p; out[p] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
    for (var j = p + 1; j < xs.length; j++) { var e = xs[j] - xs[j - 1]; g = (g * (p - 1) + Math.max(0, e)) / p; l = (l * (p - 1) + Math.max(0, -e)) / p; out[j] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
    return out;
  }
  /** overlay values: explicit `values` (right-aligned) or a simple moving average of the closes (`period`) */
  function ovValues(o, data) {
    if (o.values) return align(o.values, data.length);
    return sma(data.map(function (d) { return d[3]; }), o.period || 20);
  }
  /** indicator panel series → {lines:[{v, tone, dashed}], hist, lo, hi, levels} */
  function panelSeries(p, data) {
    var n = data.length, closes = data.map(function (d) { return d[3]; });
    // computed indicators need a warm-up; extend the trend backwards (illustrative history) so their lines start at the left
    var lead = 0;
    if (!p.values && !p.macd && (p.type === "rsi" || p.type === "macd") && n > 3) {
      lead = p.type === "rsi" ? (p.period || 14) + 2 : (p.slow || 26) + (p.period || 9);
      var m0 = Math.min(10, n - 1), slope = (closes[m0] - closes[0]) / m0, sd = Math.abs(slope) * 0.6 + Math.abs(closes[0]) * 0.002;
      var pre = []; for (var k = lead; k > 0; k--) pre.push(closes[0] - slope * k + (k % 2 ? sd : -sd));
      closes = pre.concat(closes);
    }
    var cut = function (arr) { return lead ? arr.slice(lead) : arr; };
    if (p.type === "rsi") {
      // authored values shorter than the chart: mirror their start leftwards so the line spans the whole panel
      var pv = p.values && p.values.length < n ? p.values.slice(0, n - p.values.length).reverse().concat(p.values) : p.values;
      while (pv && pv.length < n) pv = [pv[0]].concat(pv);
      var v = pv ? align(pv, n) : cut(rsiOf(closes, p.period || 14));
      return { lines: [{ v: v, tone: p.tone || "gold" }], lo: 0, hi: 100, levels: p.levels || [30, 70] };
    }
    if (p.type === "macd") {
      var m, s, hst;
      if (p.macd) { m = align(p.macd, n); s = align(p.signal || [], n); hst = p.hist ? align(p.hist, n) : m.map(function (x, i) { return x == null || s[i] == null ? null : x - s[i]; }); }
      else {
        var f = ema(closes, p.fast || 12), sl = ema(closes, p.slow || 26);
        m = f.map(function (x, i) { return i < (p.slow || 26) - 1 ? null : x - sl[i]; });
        s = ema(m, p.period || 9);
        hst = m.map(function (x, i) { return x == null || s[i] == null ? null : x - s[i]; });
        m = cut(m); s = cut(s); hst = cut(hst);
      }
      var show = p.show || ["hist", "lines"], all = [].concat(m, s, hst).filter(function (x) { return x != null; });
      var mx = Math.max.apply(null, all.map(Math.abs).concat([1e-9]));
      return { lines: show.indexOf("lines") >= 0 ? [{ v: m, tone: p.tone || "gold" }, { v: s, tone: p.signalTone || "down" }] : [], hist: show.indexOf("hist") >= 0 ? hst : null, lo: -mx * 1.1, hi: mx * 1.1, levels: [0], zero: true };
    }
    var vals = align(p.values || [], n), ok = vals.filter(function (x) { return x != null; });
    return { lines: [{ v: vals, tone: p.tone || "blue" }], lo: p.lo != null ? p.lo : Math.min.apply(null, ok), hi: p.hi != null ? p.hi : Math.max.apply(null, ok), levels: p.levels || [] };
  }
  /** "M x,y L …" through [x, y|null] points, breaking at nulls */
  function pathOf(xy) {
    var d = "", pen = false;
    xy.forEach(function (q) { if (q[1] == null || isNaN(q[1])) { pen = false; return; } d += (pen ? " L" : (d ? " M" : "M")) + r1(q[0]) + "," + r1(q[1]); pen = true; });
    return d;
  }
  function drawLine(d, cls, dashed) { return d ? '<path d="' + d + '" class="' + cls + (dashed ? " is-dashed" : " ac-v__drawq") + '"' + (dashed ? "" : ' pathLength="1"') + "/>" : ""; }

  // ------------------------------------------------------------------ candles (port of p1/charts.py candles())
  /** c: chart spec. opt: {w, h, noAxis, explore: "zones" | "hlines" | "swings" | "play", revealFrom, geo(fn)}
      chart.height is in a 330-wide viewBox; other widths scale it, unless opt.h fixes the height (a tile's own
      canvas, so a chart in a half- or third-width tile keeps its height). Volume and indicator panels add height below. */
  function candles(c, opt) {
    opt = opt || {};
    var data = c.ohlc || (c.path ? genPath(c) : []);
    var w = opt.w || 330, h = opt.h || Math.round((c.height || 150) * w / 330), sc = w / 330;
    // a question's chart on a phone gets the height the tighter answer options free (about +45px), full-width charts only
    // a question's chart (Calls, checks, Chapter Challenges) is the thing to read: at least 150 tall, never a flat strip
    if (questionChart && !opt.h && w === 330) {
      h = Math.max(h, 150);
      if (window.matchMedia && matchMedia("(max-width: 860px)").matches) h = Math.round(Math.min(h + Math.min(48, h * 0.3), Math.max(h, 190)));
    }
    var panels = c.panels || [], hasVol = !!(c.volume && c.volume.length);
    var axis = c.axis !== false && !opt.noAxis;
    var ticks = c.ticks != null ? c.ticks : (axis ? 4 : 2);
    var dig = c.fmt || 0;
    var n = data.length;
    var axisW = axis ? 44 : ((panels.length || c.axisRoom) ? 24 : 0);
    var fut = c.forecast ? c.forecast.dx : 0;
    if (c.ghost && c.ghost.length) fut = Math.max(fut, Math.max.apply(null, c.ghost.map(function (g) { return g[0]; })) - n + 1);
    if (c.future) fut = Math.max(fut, c.future);
    var plotW = w - axisW - 8;
    var step = plotW / (n + fut + 0.5);
    var cw = Math.max(questionChart ? 4 : 3, step * (questionChart ? 0.7 : 0.62));   // question charts: slightly fuller candles
    var lo = c.lo != null ? c.lo : Math.min.apply(null, data.map(function (d) { return d[2]; }));
    var hi = c.hi != null ? c.hi : Math.max.apply(null, data.map(function (d) { return d[1]; }));
    (c.hlines || []).forEach(function (l) { lo = Math.min(lo, l.price); hi = Math.max(hi, l.price); });
    if (c.forecast) { lo = Math.min(lo, c.forecast.to); hi = Math.max(hi, c.forecast.to); }
    (c.ghost || []).forEach(function (g) { lo = Math.min(lo, g[1]); hi = Math.max(hi, g[1]); });
    var ovs = (c.overlays || []).map(function (o) { return ovValues(o, data); });
    if (c.lo == null || c.hi == null) {
      ovs.forEach(function (vs) { vs.forEach(function (v) { if (v != null) { if (c.lo == null) lo = Math.min(lo, v); if (c.hi == null) hi = Math.max(hi, v); } }); });
      (c.swings || []).concat(c.extra || []).forEach(function (s) { if (c.lo == null) lo = Math.min(lo, s.price); if (c.hi == null) hi = Math.max(hi, s.price); });
      (c.trendlines || []).forEach(function (t) { [t.from[1], t.to[1]].forEach(function (p) { if (c.lo == null) lo = Math.min(lo, p); if (c.hi == null) hi = Math.max(hi, p); }); });
    }
    var span = (hi - lo) || Math.abs(hi) * 0.02 || 1;
    lo -= span * 0.1; hi += span * 0.14;
    var top = 10 + (c.priceLabel ? 14 : 0), bot = h - 10, R = w - axisW;
    function Y(v) { return bot - (v - lo) / (hi - lo) * (bot - top); }
    function X(i) { return 8 + step * (i + 0.5); }
    if (opt.geo) opt.geo({ X: X, Y: Y, step: step, n: n, w: w, h: h, top: top, bot: bot, R: R, lo: lo, hi: hi, data: data, inv: function (y) { return lo + (bot - y) / (bot - top) * (hi - lo); } });

    // explore layers: which overlay belongs to which tap
    var ex = opt.explore, zones = c.zones || [], hl = c.hlines || [], marks = c.marks || [], swings = c.swings || [];
    var firstMark = marks.length ? marks[0].i : -1;
    function markLayer(m, k) {
      if (!ex) return null;
      if (ex === "zones") { for (var z = 0; z < zones.length; z++) if (m.i >= zones[z].from && m.i <= zones[z].to) return "z" + z; return "end"; }
      if (ex === "hlines") { var best = 0; hl.forEach(function (l, j) { if (Math.abs(l.price - m.price) < Math.abs(hl[best].price - m.price)) best = j; }); return "h" + best; }
      if (ex === "swings") return "end";
      return k === 0 ? null : "end";
    }
    var layers = {};
    function add(layer, svg) { if (!layer) return svg; layers[layer] = (layers[layer] || "") + svg; return ""; }

    var s = "";
    if (c.priceLabel) s += T(8, 12, c.priceLabel, { fs: 10, w: 800, cls: "ac-v__t--muted" });
    if (ticks) {
      // round steps (1, 2 or 5 × 10^n) so a gridline sits exactly on its printed value (a $48 stop on the 48 line)
      var tk = niceTicks(lo, hi, ticks), tdig = Math.max(dig, tk.dig);
      var tagY = c.lastTag !== false && axis && n ? Y(data[n - 1][3]) : null;   // don't print a tick under the last-price tag
      tk.values.forEach(function (v) {
        var y = Y(v);
        s += '<line x1="8" x2="' + R + '" y1="' + r1(y) + '" y2="' + r1(y) + '" class="ac-v__grid"/>' + (axis && (tagY == null || Math.abs(y - tagY) > 18) ? T(R + 8, y + 4, num(v, tdig), { fs: 10, w: 600, cls: "ac-v__axis" }) : "");
      });
    }
    zones.forEach(function (z, i) {
      var x1 = X(z.from) - step / 2, x2 = X(z.to) + step / 2;
      var g = '<rect x="' + r1(x1) + '" y="' + top + '" width="' + r1(x2 - x1) + '" height="' + (bot - top) + '" rx="6" class="' + tone(z.tone) + ' ac-v__zone"/>' +
        (z.label ? T((x1 + x2) / 2, top + 14, z.label, { tone: z.tone, fs: 10, w: 800, anchor: "middle" }) : "") +
        (z.sub ? T((x1 + x2) / 2, top + 30, z.sub, { fs: 10.5, w: 700, anchor: "middle" }) : "");
      s += add(ex === "zones" ? "z" + i : null, g);
    });
    hl.forEach(function (l, i) {
      var y = Y(l.price), g = '<line x1="8" x2="' + R + '" y1="' + r1(y) + '" y2="' + r1(y) + '" class="' + tone(l.tone) + ' ac-v__hline"/>';
      if (l.label && (l.style === "pill" || l.style === "left")) {
        var tw = l.label.length * 6.2 + 16, px = l.style === "left" ? 10 : Math.max(10, R - tw - 2);
        g += '<rect x="' + r1(px) + '" y="' + r1(y - 10) + '" width="' + r1(tw) + '" height="20" rx="10" class="' + tone(l.tone) + ' ac-v__fill"/>' + T(px + tw / 2, y + 4, l.label, { fs: 10.5, w: 800, anchor: "middle", cls: "ac-v__t--inv" });
      } else if (l.label && l.style === "below") {
        g += T(R - 4, y + 14, l.label, { tone: l.tone, fs: 10.5, w: 800, anchor: "end" });
      } else if (l.label) {
        g += T(R - 4, y - 6, l.label, { tone: l.tone, fs: 10.5, w: 800, anchor: "end" });
      }
      s += add(ex === "hlines" ? "h" + i : null, g);
    });
    (c.vlines || []).forEach(function (v) {
      var x = X(v.i);
      s += '<line x1="' + r1(x) + '" x2="' + r1(x) + '" y1="' + top + '" y2="' + bot + '" class="' + tone(v.tone || "gold") + ' ac-v__vline"/>' +
        (v.label ? T(x + (v.anchor === "end" ? -4 : 4), top + 10, v.label, { tone: v.tone || "gold", fs: 10, w: 800, anchor: v.anchor === "end" ? "end" : "start" }) : "");
    });
    (c.trendlines || []).forEach(function (t) {
      var i1 = t.from[0], p1 = t.from[1], i2 = t.to[0], p2 = t.to[1], sl = (p2 - p1) / ((i2 - i1) || 1);
      var ext = t.extend || "right", a = i1, b = i2;
      if (ext === "right" || ext === "both") b = Math.max(i2, n - 1 + fut + 0.45);
      if (ext === "left" || ext === "both") a = Math.min(i1, -0.45);
      var ya = Y(p1 + sl * (a - i1)), yb = Y(p1 + sl * (b - i1));
      s += '<line x1="' + r1(X(a)) + '" y1="' + r1(ya) + '" x2="' + r1(X(b)) + '" y2="' + r1(yb) + '" class="' + tone(t.tone || "gold") + " ac-v__tline" + (t.dashed ? " is-dashed" : " ac-v__drawq") + '"' + (t.dashed ? "" : ' pathLength="1"') + "/>";
      (t.touches || []).forEach(function (ti, k) {
        var tx = X(ti), ty = Y(p1 + sl * (ti - i1));
        s += '<circle cx="' + r1(tx) + '" cy="' + r1(ty) + '" r="4.5" class="' + tone(t.tone || "gold") + ' ac-v__ring"/>' + T(tx, ty + 17, String(k + 1), { tone: t.tone || "gold", fs: 10, w: 800, anchor: "middle" });
      });
      if (t.label) s += T(X(b) - 2, yb - 7, t.label, { tone: t.tone || "gold", fs: 10, w: 800, anchor: "end" });
    });
    ovs.forEach(function (vs, k) {
      var o = c.overlays[k], pa = [], pb = [];
      vs.forEach(function (v, i) { var q = [X(i), v == null ? null : Y(v)]; if (ex === "play" && i > firstMark) { if (!pb.length && pa.length) pb.push(pa[pa.length - 1]); pb.push(q); } else pa.push(q); });
      s += drawLine(pathOf(pa), tone(o.tone || "gold") + " ac-v__ovl", o.dashed);
      if (pb.length) s += '<g class="ac-v__later" style="--i:' + Math.max(0, n - firstMark - 2) + '">' + drawLine(pathOf(pb), tone(o.tone || "gold") + " ac-v__ovl", o.dashed) + "</g>";
      if (o.label) { var li = vs.length - 1; while (li > 0 && vs[li] == null) li--; s += T(X(li) + 4, Y(vs[li]) + (o.labelPos === "below" ? 14 : -6), o.label, { tone: o.tone || "gold", fs: 10, w: 800, anchor: "end" }); }
    });
    if (c.ghost && c.ghost.length) s += add(ex ? "end" : null, '<polyline points="' + c.ghost.map(function (g) { return r1(X(g[0])) + "," + r1(Y(g[1])); }).join(" ") + '" class="ac-v__ghost"/>');
    var later = 0, laterOf = {};
    data.forEach(function (d, i) {
      var up = d[3] >= d[0], x = X(i), cls = up ? "ac-tone--up" : "ac-tone--down";
      if (c.dim && c.dim.indexOf(i) >= 0) cls += " ac-v__dim";
      var y1 = Y(Math.max(d[0], d[3])), y2 = Y(Math.min(d[0], d[3]));
      var isLater = (ex === "play" && i > firstMark) || (opt.revealFrom != null && i >= opt.revealFrom);
      if (isLater) laterOf[i] = later;
      s += '<g class="' + cls + (isLater ? ' ac-v__later" style="--i:' + (later++) : " ac-v__cdl") + '"><line x1="' + r1(x) + '" x2="' + r1(x) + '" y1="' + r1(Y(d[1])) + '" y2="' + r1(Y(d[2])) + '" class="ac-v__wick"/>' +
        '<rect x="' + r1(x - cw / 2) + '" y="' + r1(y1) + '" width="' + r1(cw) + '" height="' + r1(Math.max(1.5, y2 - y1)) + '" rx="1" class="ac-v__fill"/></g>';
    });
    if (swings.length) {
      var srt = swings.slice().sort(function (a, b) { return a.i - b.i; });
      if (c.zigzag) s += '<polyline points="' + srt.map(function (q) { return r1(X(q.i)) + "," + r1(Y(q.price)); }).join(" ") + '" class="' + tone(typeof c.zigzag === "string" ? c.zigzag : "blue") + ' ac-v__zz ac-v__drawq" pathLength="1"/>';
      swings.forEach(function (q, k) {
        var j = srt.indexOf(q), pv = srt[j - 1], nx = srt[j + 1];
        var above = q.pos ? q.pos === "above" : ((!pv || q.price >= pv.price) && (!nx || q.price >= nx.price));
        var x = X(q.i), y = Y(q.price), t = q.tone || "gold";
        var g = '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="3.5" class="' + tone(t) + ' ac-v__dot"/>' + (q.label ? T(x, above ? y - 8 : y + 16, q.label, { tone: t, fs: 10, w: 800, anchor: "middle" }) : "");
        s += add(ex === "swings" ? "s" + k : null, g);
      });
    }
    var last = n ? data[n - 1][3] : 0;
    if (c.forecast && n) {
      var f = c.forecast, mid = "acfc" + (++uid);
      var fx1 = X(n - 1) + cw, fy1 = Y(last), fx2 = X(n - 1 + f.dx), fy2 = Y(f.to);
      s += add(ex ? "end" : null, '<defs><marker id="' + mid + '" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10z" class="' + tone(f.tone) + ' ac-v__fill"/></marker></defs>' +
        '<line x1="' + r1(fx1) + '" y1="' + r1(fy1) + '" x2="' + r1(fx2) + '" y2="' + r1(fy2) + '" class="' + tone(f.tone) + ' ac-v__forecast" marker-end="url(#' + mid + ')"/>');
    }
    marks.forEach(function (m, k) {
      var x = X(m.i), y = Y(m.price);
      var g = '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="9" class="' + tone(m.tone) + ' ac-v__halo"/><circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="4.5" class="' + tone(m.tone) + ' ac-v__dot"/>';
      if (m.label) {
        var tw = m.label.length * 6.3 + 16, ty = m.pos === "below" ? y + 12 : m.pos === "above" ? y - 30 : (y > top + 34 ? y - 30 : y + 12), tx = Math.min(Math.max(x - tw / 2, 8), R - tw);
        if (ty + 21 > h) ty = y - 30; if (ty < 1) ty = y + 12;   // keep the tag inside the chart
        g += '<rect x="' + r1(tx) + '" y="' + r1(ty) + '" width="' + r1(tw) + '" height="20" rx="10" class="' + tone(m.tone) + ' ac-v__tag"/>' + T(tx + tw / 2, ty + 14, m.label, { tone: m.tone, fs: 10.5, w: 800, anchor: "middle" });
      }
      s += add(markLayer(m, k), g);
    });
    if (c.lastTag !== false && axis && n) {
      var lc = data[n - 1][3] >= data[n - 1][0] ? "ac-tone--up" : "ac-tone--down", ly = Y(last);
      s += add(ex === "play" ? "end" : null, '<line x1="8" x2="' + R + '" y1="' + r1(ly) + '" y2="' + r1(ly) + '" class="' + lc + ' ac-v__lastline"/>' +
        '<rect x="' + (R + 2) + '" y="' + r1(ly - 10) + '" width="' + (axisW - 4) + '" height="20" rx="4" class="' + lc + ' ac-v__fill"/>' + T(R + axisW / 2, ly + 4, num(last, dig), { fs: 10.5, w: 800, anchor: "middle", cls: "ac-v__t--inv" }));
    }

    // ---- panels under the price: volume, then indicators (RSI, MACD, any oscillator)
    var H = h;
    function isLate(i) { return laterOf[i] != null; }
    if (hasVol) {
      var vol = align(c.volume, n), vh = Math.round((c.volHeight || 34) * sc), vtop = H + (c.volLabel ? 16 : 6);
      var vmax = Math.max.apply(null, vol.filter(function (x) { return x != null; }).concat([c.volAvg || 0, 1e-9]));
      var vs = '<line x1="8" x2="' + R + '" y1="' + r1(H + 1) + '" y2="' + r1(H + 1) + '" class="ac-v__grid"/>' + (c.volLabel ? T(8, H + 12, c.volLabel, { fs: 10, w: 800, cls: "ac-v__t--muted" }) : "");
      vol.forEach(function (v, i) {
        if (v == null || !data[i]) return;
        var bh = Math.max(1, v / vmax * vh), up = data[i][3] >= data[i][0];
        var bar = '<rect x="' + r1(X(i) - cw / 2) + '" y="' + r1(vtop + vh - bh) + '" width="' + r1(cw) + '" height="' + r1(bh) + '" rx="1" class="' + (up ? "ac-tone--up" : "ac-tone--down") + ' ac-v__vbar"/>';
        vs += isLate(i) ? '<g class="ac-v__later" style="--i:' + laterOf[i] + '">' + bar + "</g>" : bar;
      });
      if (c.volAvg) { var ay = vtop + vh - c.volAvg / vmax * vh; vs += '<line x1="8" x2="' + R + '" y1="' + r1(ay) + '" y2="' + r1(ay) + '" class="ac-tone--muted ac-v__hline ac-v__hline--thin"/>' + (c.volAvgLabel ? T(R - 2, ay - 4, c.volAvgLabel, { fs: 9.5, w: 700, anchor: "end", cls: "ac-v__t--muted" }) : ""); }
      s += vs; H = vtop + vh + 4;
    }
    panels.forEach(function (p) {
      var ps = panelSeries(p, data), ph = Math.round((p.height || 58) * sc * (questionChart ? 1.6 : 1)), ptop = H + (p.label ? 18 : 8), pbot = ptop + ph;
      var plo = ps.lo, phi = ps.hi; if (!(phi > plo)) { phi = plo + 1; }
      function PY(v) { return pbot - (v - plo) / (phi - plo) * ph; }
      var g = '<line x1="8" x2="' + R + '" y1="' + r1(H + 2) + '" y2="' + r1(H + 2) + '" class="ac-v__grid"/>' + (p.label ? T(8, H + 14, p.label, { fs: 10, w: 800, cls: "ac-v__t--muted" }) : "");
      if (p.type === "rsi") {
        var lv = ps.levels, lo2 = Math.min.apply(null, lv), hi2 = Math.max.apply(null, lv);
        g += '<rect x="8" y="' + r1(PY(100)) + '" width="' + r1(R - 8) + '" height="' + r1(PY(hi2) - PY(100)) + '" class="ac-tone--down ac-v__pband"/>' +
          '<rect x="8" y="' + r1(PY(lo2)) + '" width="' + r1(R - 8) + '" height="' + r1(PY(0) - PY(lo2)) + '" class="ac-tone--blue ac-v__pband"/>';
        if (p.mid !== false) g += '<line x1="8" x2="' + R + '" y1="' + r1(PY(50)) + '" y2="' + r1(PY(50)) + '" class="ac-v__grid"/>' + T(R + 4, PY(50) + 3.5, "50", { fs: 9, w: 700, cls: "ac-v__axis" });
        lv.forEach(function (L) { var tt = L >= 50 ? "down" : "blue"; g += '<line x1="8" x2="' + R + '" y1="' + r1(PY(L)) + '" y2="' + r1(PY(L)) + '" class="' + tone(tt) + ' ac-v__hline ac-v__hline--thin"/>' + T(R + 4, PY(L) + 3.5, num(L), { tone: tt, fs: 9.5, w: 800 }); });
      } else {
        ps.levels.forEach(function (L) { g += '<line x1="8" x2="' + R + '" y1="' + r1(PY(L)) + '" y2="' + r1(PY(L)) + '" class="ac-tone--muted ac-v__hline ac-v__hline--thin"/>' + T(R + 4, PY(L) + 3.5, num(L, Math.abs(L) < 10 && L % 1 ? 1 : 0), { fs: 9.5, w: 700, cls: "ac-v__axis" }); });
      }
      if (ps.hist) ps.hist.forEach(function (v, i) {
        if (v == null) return;
        var y0 = PY(0), y1v = PY(v), bw = Math.max(1.5, Math.min(cw, step * 0.7));
        var bar = '<rect x="' + r1(X(i) - bw / 2) + '" y="' + r1(Math.min(y0, y1v)) + '" width="' + r1(bw) + '" height="' + r1(Math.max(0.8, Math.abs(y1v - y0))) + '" class="' + (v >= 0 ? "ac-tone--up" : "ac-tone--down") + ' ac-v__hbar' + (v >= 0 ? "" : " is-neg") + '"/>';
        g += isLate(i) ? '<g class="ac-v__later" style="--i:' + laterOf[i] + '">' + bar + "</g>" : bar;
      });
      ps.lines.forEach(function (L) {
        var split = ex === "play" ? firstMark : -2, a = [], b = [];
        L.v.forEach(function (v, i) { var q = [X(i), v == null ? null : PY(v)]; if (split >= -1 && i > split) { if (!b.length && a.length) b.push(a[a.length - 1]); b.push(q); } else a.push(q); });
        g += drawLine(pathOf(a), tone(L.tone) + " ac-v__iline");
        if (b.length) g += '<g class="ac-v__later" style="--i:' + Math.round(later / 2) + '">' + drawLine(pathOf(b), tone(L.tone) + " ac-v__iline") + "</g>";
      });
      (p.marks || []).forEach(function (m) {
        var L0 = ps.lines[0], v = m.value != null ? m.value : (L0 && L0.v[m.i]);
        if (v == null) return;
        var x = X(m.i), y = PY(v), t = m.tone || "gold";
        var mk = '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="3.5" class="' + tone(t) + ' ac-v__dot"/>' + (m.label ? T(x, m.pos === "above" ? y - 7 : y + 14, m.label, { tone: t, fs: 10, w: 800, anchor: "middle" }) : "");
        g += isLate(m.i) ? '<g class="ac-v__later" style="--i:' + laterOf[m.i] + '">' + mk + "</g>" : mk;
      });
      s += g; H = pbot + 6;
    });

    Object.keys(layers).forEach(function (k) { s += '<g class="ac-v__layer" data-layer="' + k + '">' + layers[k] + "</g>"; });
    var label = c.label ? ' aria-label="' + esc(c.label) + '"' : ' aria-hidden="true"';
    return '<svg class="ac-v__svg" viewBox="0 0 ' + w + " " + H + '" role="img"' + label + ">" + s + "</svg>";
  }

  // ------------------------------------------------------------------ html helpers
  function box(inner, cls) { return '<div class="ac-v__box' + (cls ? " " + cls : "") + '">' + inner + "</div>"; }
  function head(s) { return s ? '<div class="ac-v__head">' + AC.rich(s) + "</div>" : ""; }
  function foot(s, hidden) { return s ? '<div class="ac-v__foot"' + (hidden ? " data-vfoot hidden" : "") + ">" + AC.rich(s) + "</div>" : ""; }
  /** Header row of a chart box (canvas-p1): title left, then an aside (muted) or a legend (coloured labels) on the right. */
  function legendHtml(items) {
    return (items || []).map(function (l) { return '<span class="ac-v__lg ' + tone(l.tone || "muted") + (l.dashed ? " is-dashed" : "") + (l.dot ? " is-dot" : "") + '"><i aria-hidden="true"></i><span class="ac-v__ink">' + esc(l.label) + "</span></span>"; }).join("");
  }
  function hdr(v, cls) {
    if (!v.title && !v.aside && !(v.legend && v.legend.length)) return "";
    return '<div class="ac-v__hdr' + (cls ? " " + cls : "") + '">' + (v.title ? "<b>" + AC.rich(v.title) + "</b>" : "<span></span>") +
      (v.legend && v.legend.length ? '<span class="ac-v__legend">' + legendHtml(v.legend) + "</span>" : v.aside ? '<span class="ac-v__aside' + (v.asideTone ? " " + tone(v.asideTone) + " ac-v__ink" : "") + '">' + AC.rich(v.aside) + "</span>" : "") + "</div>";
  }
  function revealBtn(layer, text, cls) { return '<button type="button" class="ac-v__reveal ' + (cls || "") + '" data-reveal="' + layer + '" aria-pressed="false">' + esc(text) + "</button>"; }
  function playBtn() { return revealBtn("all", "▶ " + AC.t("cards.v.play"), "ac-v__reveal--play"); }

  var R = {};
  R.candles = function (v, o) {
    var c = v.chart, ex = null, btns = "";
    if (o.explore && c.explore !== "none") {
      var mode = c.explore || ((c.zones || []).length ? "zones" : (c.swings || []).length ? "swings" : (c.hlines || []).length >= 2 ? "hlines" : "play");
      if (mode === "zones" && (c.zones || []).length) { ex = "zones"; btns = c.zones.map(function (z, i) { return revealBtn("z" + i, z.label || AC.t("cards.v.zone", { n: i + 1 }), tone(z.tone)); }).join(""); }
      else if (mode === "swings" && (c.swings || []).length) { ex = "swings"; btns = c.swings.map(function (q, i) { return revealBtn("s" + i, (q.label || AC.t("cards.v.zone", { n: i + 1 })) + (q.chip ? " · " + q.chip : ""), tone(q.tone || "gold")); }).join(""); }
      else if (mode === "hlines" && (c.hlines || []).length) { ex = "hlines"; btns = c.hlines.map(function (l, i) { return revealBtn("h" + i, l.label || num(l.price), tone(l.tone)); }).join(""); }
      else { ex = "play"; btns = playBtn(); }
    }
    var svg = candles(c, o.tile ? { explore: ex, w: 150, h: TILE_H } : { explore: ex });
    var plot = '<div class="ac-v__plot">' + svg + "</div>" + (btns ? '<div class="ac-v__reveals">' + btns + "</div>" : "");
    var wrapA = ex ? ' data-explore="' + ex + '"' : "";
    if (v.card) {
      var cd = v.card;
      return '<div class="ac-v__box ac-v__box--chart"' + wrapA + '><div class="ac-v__ticker"><span class="ac-v__sym" aria-hidden="true">' + esc((cd.sym || "").slice(0, 2)) + '</span><span class="ac-v__name"><b>' + esc(cd.sym || "") + "</b><span>" + esc(cd.name || "") + "</span></span>" +
        (cd.badge ? '<span class="ac-v__badge">' + esc(cd.badge) + "</span>" : "") +
        '<span class="ac-v__px"><b class="ac-num">' + esc(cd.price || "") + '</b><span class="' + tone(cd.tone || "up") + ' ac-v__ink ac-num">' + esc(cd.change || "") + "</span></span></div>" +
        plot + foot(v.foot, !!ex) + "</div>";
    }
    return '<div class="ac-v__box ac-v__box--chart"' + wrapA + ">" + head(v.head) + hdr(v, "ac-v__hdr--chart") + plot + foot(v.foot, !!ex) + "</div>";
  };
  R["chart-pair"] = function (v) {
    return '<div class="ac-v__pair">' + v.items.map(function (it) {
      return '<div class="ac-v__tile ' + tone(it.tone || "muted") + '">' + (it.aside ? '<div class="ac-v__tlrow"><b class="ac-v__ink ac-v__tlabel">' + esc(it.label) + '</b><span class="ac-v__tlaside">' + esc(it.aside) + "</span></div>" : '<b class="ac-v__ink ac-v__tlabel">' + esc(it.label) + "</b>") + (it.sub ? '<span class="ac-v__sub">' + esc(it.sub) + "</span>" : "") +
        candles(it.chart, { w: 150, h: TILE_H, noAxis: it.chart.axis !== true }) + "</div>";
    }).join("") + "</div>";
  };
  var TILE_H = 90;   // a tile's chart canvas: 150 × 90, as the design boards draw them
  var CICON = { ok: "✓", wait: "…", no: "✕" }, CTONE = { ok: "up", wait: "gold", no: "down" };
  R.compare = function (v) {
    return '<div class="ac-v__pair ac-v__pair--' + v.items.length + '">' + v.items.map(function (it) {
      return '<div class="ac-v__tile ac-v__cmp">' +
        '<div class="ac-v__cmp-h">' + (it.icon ? '<span class="ac-v__ico ' + tone(CTONE[it.icon]) + '" aria-hidden="true">' + CICON[it.icon] + "</span>" : "") + "<b>" + esc(it.title) + "</b></div>" +
        (it.chart ? candles(it.chart, { w: 150, h: TILE_H, noAxis: it.chart.axis !== true }) : "") +
        '<b class="ac-v__result ' + tone(it.tone || "white") + ' ac-v__ink">' + AC.rich(it.result) + "</b>" + (it.sub ? '<span class="ac-v__sub">' + AC.rich(it.sub) + "</span>" : "") + "</div>";
    }).join("") + "</div>";
  };
  /** zoom: a timeframe switcher that works (Ch3 "Zoom out first"): tabs on top, one chart at a time, a line per
      timeframe that builds the story. items: [{tab, title, aside, line, chart (candles spec)}]; start: the first tab shown. */
  R.zoom = function (v) {
    var st = v.start || 0;
    var tabs = v.items.map(function (it, i) {
      return '<button type="button" role="tab" class="ac-v__ztab' + (i === st ? " is-on is-seen" : "") + '" aria-selected="' + (i === st) + '" data-ztab="' + i + '">' + esc(it.tab) + '<span class="ac-v__ztick" aria-hidden="true">✓</span></button>';
    }).join("");
    var panes = v.items.map(function (it, i) {
      return '<div class="ac-v__zpane" data-zpane="' + i + '"' + (i === st ? "" : " hidden") + ">" +
        '<div class="ac-v__dhead"><b>' + esc(it.title) + "</b><span>" + esc(it.aside || "") + "</span></div>" +
        candles(it.chart, {}) + (it.line ? '<p class="ac-v__zline">' + AC.rich(it.line) + "</p>" : "") + "</div>";
    }).join("");
    return '<div class="ac-v__zoom" data-interactive="zoom"><div class="ac-v__ztabs" role="tablist" aria-label="' + esc(v.label || "Timeframe") + '">' + tabs + '</div><div class="ac-v__box ac-v__zbox">' + panes + "</div></div>";
  };
  /** stacks: money as stacked bars, a dashed arrow (with a mark) from one stack to the next (design P1-Ch02 L3 Call:
      "You: $1,000" → ? → "Trade: $10,000"). items: [{label, n (bars), tone}], mark: text over the arrow. */
  R.stacks = function (v) {
    var W = 360, H = 130, base = 108, bw = 54, bh = 8, gap = 1, cols = v.items.length, x0 = 50, x1 = W - 50 - bw;
    var xs = v.items.map(function (_, i) { return cols === 1 ? (W - bw) / 2 : x0 + (x1 - x0) * i / (cols - 1); });
    var s = "";
    v.items.forEach(function (it, i) {
      var x = xs[i];
      for (var k = 0; k < it.n; k++) s += '<rect x="' + r1(x) + '" y="' + r1(base - (k + 1) * (bh + gap)) + '" width="' + bw + '" height="' + bh + '" rx="4" class="' + tone(it.tone || "gold") + ' ac-v__fill" fill-opacity="' + (k % 2 ? 0.6 : 0.5) + '"/>';
      s += T(x + bw / 2, 124, it.label, { fs: 12, w: 800, anchor: "middle" });
      if (i < cols - 1) {
        var a = x + bw + 16, b = xs[i + 1] - 16, y = 80;
        s += '<path d="M' + r1(a) + " " + y + " H" + r1(b) + '" class="' + tone(it.tone || "gold") + ' ac-v__stroke" stroke-width="2" stroke-dasharray="4 4" fill="none"/>' +
          '<path d="M' + r1(b - 4) + " " + (y - 6) + " l8 6 -8 6" + '" class="' + tone(it.tone || "gold") + ' ac-v__stroke" stroke-width="2" fill="none"/>' +
          (v.mark ? T((a + b) / 2, y - 14, v.mark, { tone: it.tone || "gold", fs: 26, w: 800, anchor: "middle" }) : "");
      }
    });
    return '<div class="ac-v__box ac-v__box--svg"><svg class="ac-v__svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(v.label || "") + '">' + s + "</svg></div>";
  };
  /** crowd: buyers against sellers at one price, counted as people (Ch1 "Ten buyers, one seller"). sides: [{label, n,
      tone, tag (e.g. "you")}]; price: the last trade, shown between them. */
  R.crowd = function (v) {
    var PERSON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0z"/></svg>';
    var side = function (s) {
      var people = "";
      for (var i = 0; i < s.n; i++) people += PERSON;
      return '<div class="ac-v__cside ' + tone(s.tone || "up") + '"><span class="ac-v__chead"><b class="ac-v__ink ac-num">' + s.n + "</b><span>" + esc(s.label) + "</span></span>" +
        '<span class="ac-v__cpeople ac-v__ink">' + people + "</span>" + (s.tag ? '<span class="ac-v__ctag ac-v__ink">' + esc(s.tag) + "</span>" : "") + "</div>";
    };
    return '<div class="ac-v__box ac-v__crowd" role="img" aria-label="' + esc(v.label || "") + '">' + side(v.sides[0]) +
      '<div class="ac-v__cmid"><span>' + esc(v.priceLabel || "") + '</span><b class="ac-num">' + esc(v.price || "") + "</b></div>" + side(v.sides[1]) + "</div>";
  };
  /** sessions: when markets trade, on one 24-hour day (book p.9 "When markets are open"). rows: [{label, days, tone,
      note, bands: [{from, to (hours 0–24), soft, text}]}]; busy: {from, to, label} shaded across every row; now: true
      draws the current time (in v.tz, an IANA zone) as a line. Times are approximate, as in the book. */
  R.sessions = function (v) {
    var pct = function (h) { return (h / 24 * 100).toFixed(2) + "%"; };
    var busy = v.busy ? '<span class="ac-v__sbusy" style="left:' + pct(v.busy.from) + ";width:" + pct(v.busy.to - v.busy.from) + '">' + (v.now ? "" : "<span>" + esc(v.busy.label) + "</span>") + "</span>" : "";
    var rows = v.rows.map(function (r) {
      return '<div class="ac-v__srow ' + tone(r.tone || "sky") + (r.days ? "" : " is-slim") + '"><span class="ac-v__slabel"><b>' + esc(r.label) + "</b>" + (r.days ? "<span>" + esc(r.days) + "</span>" : "") + "</span>" +
        '<span class="ac-v__strack">' + r.bands.map(function (b) {
          return '<span class="ac-v__sband' + (b.soft ? " is-soft" : "") + '" style="left:' + pct(b.from) + ";width:" + pct(b.to - b.from) + '">' + (b.text ? "<i>" + esc(b.text) + "</i>" : "") + "</span>";
        }).join("") + "</span></div>";
    }).join("");
    // the key under the chart: each market's line, then the busy window
    var key = v.rows.filter(function (r) { return r.note; }).map(function (r) {
      return '<li class="' + tone(r.tone || "sky") + '"><i class="ac-v__skey"></i><span><b>' + esc(r.label) + "</b> " + AC.rich(r.note) + "</span></li>";
    }).join("") + (v.busy ? '<li><i class="ac-v__skey ac-v__skey--busy"></i><span><b>' + esc(v.busy.label) + "</b> " + AC.rich(v.busy.note || "") + "</span></li>" : "");
    var ticks = (v.ticks || [0, 6, 12, 18, 24]).map(function (h) {
      var t = v.clock24 !== false && !v.tz ? (h < 10 ? "0" : "") + h + ":00" : h % 12 === 0 ? (h % 24 === 0 ? "12am" : "12pm") : (h % 12) + (h < 12 ? "am" : "pm");   // a UTC day reads 00:00…24:00, as in the book
      return '<span style="left:' + pct(h) + '">' + t + "</span>";
    }).join("");
    var now = "";
    if (v.now && v.tz) {
      try {
        var parts = new Intl.DateTimeFormat("en-US", { timeZone: v.tz, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
        var hh = +parts.filter(function (p) { return p.type === "hour"; })[0].value, mm = +parts.filter(function (p) { return p.type === "minute"; })[0].value;
        now = '<span class="ac-v__snow" style="left:' + pct(hh + mm / 60) + '"><span>' + esc(AC.t("cards.v.now")) + "</span></span>";
      } catch (e) { now = ""; }
    }
    return '<div class="ac-v__box ac-v__sessions" role="img" aria-label="' + esc(v.label || v.title || "") + '">' +
      (v.title || v.tz ? '<div class="ac-v__dhead"><b>' + esc(v.title || "") + "</b><span>" + esc(v.zone || "") + "</span></div>" : "") +
      '<div class="ac-v__sgrid"><div class="ac-v__sover">' + busy + now + "</div>" + rows + '<div class="ac-v__saxis">' + ticks + "</div></div>" +
      (key ? '<ul class="ac-v__slist">' + key + "</ul>" : "") +
      (v.foot ? '<p class="ac-v__sfoot">' + esc(v.foot) + "</p>" : "") + "</div>";
  };
  /** depth: a compact order book as on the design board (P1-Ch01 Challenge Q4): title + aside, then a row per price
      (price · $ of orders · a bar · ask / bid on the best levels), a dashed line between the asks and the bids.
      rows: [{side: "ask"|"bid", price, size (display), value (number for the bar), best}] asks first, top-down. */
  R.depth = function (v) {
    var max = Math.max.apply(null, v.rows.map(function (r) { return r.value || 0; }).concat([1]));
    var scale = v.max || max * 1.25;
    var rows = v.rows.map(function (r, i) {
      var sep = i > 0 && v.rows[i - 1].side === "ask" && r.side === "bid" ? '<span class="ac-v__dsep" aria-hidden="true"></span>' : "";
      return sep + '<div class="ac-v__drow ' + tone(r.side === "ask" ? "down" : "up") + '"><b class="ac-v__dprice ac-v__ink ac-num">' + esc(r.price) + '</b><span class="ac-v__dsize ac-num">' + esc(r.size) + "</span>" +
        '<span class="ac-v__dbar"><i style="width:' + Math.round(Math.min(1, (r.value || 0) / scale) * 100) + '%"></i></span><span class="ac-v__dside ac-v__ink">' + (r.best ? esc(AC.t("cards.v.side." + r.side)) : "") + "</span></div>";
    }).join("");
    return '<div class="ac-v__box ac-v__depthbox" role="img" aria-label="' + esc(v.label || v.title || "") + '"><div class="ac-v__dhead"><b>' + esc(v.title || "") + "</b><span>" + esc(v.aside || "") + "</span></div>" + rows + "</div>";
  };
  R.book = function (v, o) {
    var ex = o.explore;
    var tabs = v.tabs && v.tabs.length ? '<div class="ac-v__tabs" aria-hidden="true">' + v.tabs.map(function (t, i) { return '<span class="' + (i === (v.tab || 0) ? "is-on" : "") + '">' + esc(t) + "</span>"; }).join("") + "</div>" : "";
    var hd = v.head && v.head.length ? '<div class="ac-v__bookh">' + v.head.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</div>" : "";
    var rows = v.rows.map(function (r, i) {
      var t = r.side === "ask" ? "down" : "up", tag = "ac-v__brow " + tone(t) + (r.label ? " has-label" : "");
      var inner = (r.depth != null ? '<span class="ac-v__depth" style="width:' + Math.round(Math.max(0, Math.min(1, r.depth)) * 100) + '%"></span>' : "") +
        (r.label ? '<span class="ac-v__blabel">' + esc(r.label) + "</span>" : "") +
        '<b class="ac-v__bprice ac-num">' + esc(r.price) + "</b>" + (r.size ? '<span class="ac-v__bsize ac-num">' + esc(r.size) + "</span>" : "") +
        (r.tag ? '<span class="ac-v__btag ac-v__layer" data-layer="r' + i + '">' + esc(r.tag) + "</span>" : "");
      return ex ? '<button type="button" class="' + tag + '" data-reveal="r' + i + '" aria-pressed="false">' + inner + "</button>" : '<div class="' + tag + '">' + inner.replace(' ac-v__layer"', '"') + "</div>";
    }).join("");
    return '<div class="ac-v__box ac-v__box--book"' + (ex ? ' data-explore="book"' : "") + ">" + tabs + hd + '<div class="ac-v__book">' + rows + "</div>" +
      (v.foot ? '<div class="ac-v__bookf"' + (ex ? " data-vfoot hidden" : "") + ">" + AC.rich(v.foot) + "</div>" : "") + foot(v.note) + "</div>";
  };
  R.rows = function (v) {
    if (v.style === "levels") {   // toned price rows (Target / Entry / Stop): one filled pill per row
      return '<div class="ac-v__levels">' + (v.title ? '<span class="ac-v__title">' + esc(v.title) + "</span>" : "") + v.rows.map(function (r) {
        return '<div class="ac-v__lvl ' + tone(r.tone || "muted") + '"><span class="ac-v__ink">' + AC.rich(r.label) + '</span><b class="ac-num">' + esc(r.value) + "</b></div>";
      }).join("") + foot(v.foot) + "</div>";
    }
    var head0 = v.aside || v.icon ? '<div class="ac-v__rhead">' + (v.icon === "journal" ? '<svg class="ac-v__ricon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>' : "") +
      "<b>" + esc(v.title || "") + "</b>" + (v.aside ? "<span>" + esc(v.aside) + "</span>" : "") + "</div>" : "";
    return box((head0 || (v.title ? '<span class="ac-v__title' + (v.tone ? " ac-v__ink" : "") + '">' + esc(v.title) + "</span>" : "")) + v.rows.map(function (r) {
      return '<div class="ac-v__row' + (r.strong ? " is-strong" : "") + '"><span>' + AC.rich(r.label) + '</span><b class="ac-num ' + (r.tone ? tone(r.tone) + " ac-v__ink" : "") + '">' + esc(r.value) + "</b></div>";
    }).join("") + foot(v.foot), "ac-v__box--rows" + (head0 ? " ac-v__box--rhead" : "") + (v.tone ? " ac-v__box--toned " + tone(v.tone) : ""));
  };

  // ------------------------------------------------------------------ Chapter 1 v2 visuals (canvas-ch1v2)
  var ARROW_UP = '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>', ARROW_DOWN = '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>';
  var TREND = { up: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>', down: '<path d="M3 7l6 6 4-4 8 8"/><path d="M14 17h7v-7"/>', flat: '<path d="M4 12h16"/>' };
  function svgIcon(paths, size, cls) {
    return '<svg class="' + (cls || "") + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + "</svg>";
  }
  function trendIcon(dir, size) { return TREND[dir] ? svgIcon(TREND[dir], size || 18) : ""; }
  /** points → "M x,y L …" in a box; o: {x0, x1, top, bot, lo, hi} */
  function linePath(points, o) {
    var n = points.length, lo = o.lo != null ? o.lo : Math.min.apply(null, points), hi = o.hi != null ? o.hi : Math.max.apply(null, points);
    var span = (hi - lo) || 1;
    var xy = points.map(function (p, i) { return [o.x0 + (o.x1 - o.x0) * i / Math.max(1, n - 1), o.bot - (p - lo) / span * (o.bot - o.top)]; });
    return { xy: xy, d: xy.map(function (q, i) { return (i ? "L" : "M") + r1(q[0]) + "," + r1(q[1]); }).join(" ") };
  }
  /** One line chart in a card (L1 Call): title + change, the line with start/end labels, a tag row. */
  R.line = function (v) {
    if (v.ohlc) {   // candlestick version: same card (title + change, tag row), the chart is real candles with a price axis
      var csvg = candles({ ohlc: v.ohlc, height: v.height || 130, fmt: v.fmt || 0, ticks: v.ticks != null ? v.ticks : 3, lastTag: v.lastTag !== false, label: v.label }, {});
      return '<div class="ac-v__box ac-v__line ac-v__line--candles ' + tone(v.tone || "down") + '">' +
        (v.title || v.change ? '<div class="ac-v__lhead"><b>' + esc(v.title || "") + '</b><b class="ac-v__ink">' + esc(v.change || "") + "</b></div>" : "") +
        '<div class="ac-v__lplot">' + csvg + "</div>" +
        (v.from || v.to ? '<div class="ac-v__lends"><span>' + esc(v.from || "") + "</span><span>" + esc(v.to || "") + "</span></div>" : "") +
        (v.tag ? '<div class="ac-v__ltag"><span class="ac-v__ltag-k">' + esc(v.tag.label) + "</span><b>" + esc(v.tag.text) + "</b></div>" : "") + "</div>";
    }
    // drop: the move drawn on the chart (a dashed line at the start level and a bracket down to the end, labelled);
    // days: labels under the points (the first point is the open, the rest one a day)
    var W = 340, top = 34, bot = v.drop ? 150 : 96, H = (v.drop ? 180 : 120) + (v.days ? 26 : 0), x1 = v.drop ? 268 : 320;
    var p = linePath(v.points, { x0: 20, x1: x1, top: top, bot: bot });
    var a = p.xy[0], b = p.xy[p.xy.length - 1], gid = "acLg" + (++uid);
    var drop = "";
    if (v.drop) {
      var bx = x1 + 22;
      drop = '<line x1="' + r1(a[0]) + '" x2="' + bx + '" y1="' + r1(a[1]) + '" y2="' + r1(a[1]) + '" class="ac-v__ldash"/>' +
        '<path d="M' + (bx - 5) + "," + r1(a[1]) + " H" + bx + " V" + r1(b[1]) + " H" + (bx - 5) + '" class="ac-v__lbracket"/>' +
        T(bx + 8, (a[1] + b[1]) / 2 + 5, v.drop, { fs: 15, w: 800, cls: "ac-v__t--tone" });
    }
    var days = v.days ? v.days.map(function (dname, i) { var q = p.xy[i + 1] || p.xy[i]; return T(q[0], H - 4, dname, { fs: 11, w: 600, anchor: "middle", cls: "ac-v__t--sub" }); }).join("") : "";
    var svg = '<svg class="ac-v__svg ac-v__lsvg" viewBox="0 0 ' + W + " " + H + '" role="img"' + (v.label ? ' aria-label="' + esc(v.label) + '"' : ' aria-hidden="true"') + ">" +
      '<defs><linearGradient id="' + gid + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="ac-v__gstop" stop-opacity=".32"/><stop offset="1" class="ac-v__gstop" stop-opacity="0"/></linearGradient></defs>' +
      '<line x1="10" x2="330" y1="' + top + '" y2="' + top + '" class="ac-v__grid"/><line x1="10" x2="330" y1="' + bot + '" y2="' + bot + '" class="ac-v__grid"/>' +
      '<path d="' + p.d + " L" + r1(b[0]) + "," + (bot + 14) + " L" + r1(a[0]) + "," + (bot + 14) + ' Z" fill="url(#' + gid + ')"/>' + drop +
      '<path d="' + p.d + '" class="ac-v__lline ac-v__draw" pathLength="1"/>' +
      '<circle cx="' + r1(a[0]) + '" cy="' + r1(a[1]) + '" r="4.5" class="ac-v__lstart"/><circle cx="' + r1(b[0]) + '" cy="' + r1(b[1]) + '" r="4.5" class="ac-v__fill ac-v__lend"/>' +
      (v.from ? T(a[0] + 4, a[1] - 10, v.from, { fs: 12, w: 700, cls: "ac-v__t--sub" }) : "") +
      (v.to ? T(b[0] - (v.drop ? 0 : 8), b[1] + (v.drop ? 20 : -12), v.to, { fs: 12, w: 800, anchor: v.drop ? "middle" : "end" }) : "") + days + "</svg>";
    return '<div class="ac-v__box ac-v__line ' + tone(v.tone || "down") + '">' +
      (v.title || v.change ? '<div class="ac-v__lhead"><b>' + esc(v.title || "") + '</b><b class="ac-v__ink">' + esc(v.change || "") + "</b></div>" : "") + svg +
      (v.tag ? '<div class="ac-v__ltag"><span class="ac-v__ltag-k">' + esc(v.tag.label) + "</span><b>" + esc(v.tag.text) + "</b></div>" : "") + "</div>";
  };
  /** Two small line charts: layout stack (big tone label + sub, filled) or pair (two tiles, dashed midline). */
  R.lines = function (v) {
    var pair = v.layout === "pair";
    var lo = v.lo, hi = v.hi;
    // scale "own": each item fills its own box (the shape matters, not comparing levels); else one shared scale
    if (v.scale !== "own" && (lo == null || hi == null) && v.items.every(function (it) { return it.points; })) {
      var all = [].concat.apply([], v.items.map(function (it) { return it.points; }));
      lo = lo != null ? lo : Math.min.apply(null, all); hi = hi != null ? hi : Math.max.apply(null, all);
    }
    return '<div class="ac-v__lines ac-v__lines--' + (pair ? "pair" : "stack") + '">' + v.items.map(function (it) {
      var t = tone(it.tone || "up");
      if (it.ohlc) {   // candlestick version; a shared lo/hi keeps the items on one honest scale
        var cc = { ohlc: it.ohlc, axis: false, lastTag: false, ticks: 0, lo: v.lo, hi: v.hi, height: pair ? 190 : 120, label: it.label + (it.sub ? ": " + it.sub : "") };
        if (pair && v.mid != null) cc.hlines = [{ price: v.mid, tone: "muted" }];
        var csv = candles(cc, { w: pair ? 300 : 330 });
        if (pair) return '<div class="ac-v__box ac-v__ltile ' + t + '"><b class="ac-v__ltitle">' + esc(it.label) + "</b>" + (it.sub ? '<span class="ac-v__sub">' + esc(it.sub) + "</span>" : "") + '<div class="ac-v__lcandles">' + csv + "</div></div>";
        return '<div class="ac-v__box ac-v__lcard ' + t + '"><div class="ac-v__lcard-h"><b class="ac-v__ink">' + esc(it.label) + "</b>" + (it.sub ? "<span>" + esc(it.sub) + "</span>" : "") + "</div>" +
          '<div class="ac-v__lcandles">' + csv + "</div></div>";
      }
      if (pair) {
        var p = linePath(it.points, { x0: 6, x1: 296, top: 0, bot: 80, lo: lo, hi: hi });
        return '<div class="ac-v__box ac-v__ltile ' + t + '"><b class="ac-v__ltitle">' + esc(it.label) + "</b>" + (it.sub ? '<span class="ac-v__sub">' + esc(it.sub) + "</span>" : "") +
          '<svg class="ac-v__lmini" viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden="true">' + (v.mid != null ? '<line x1="0" x2="300" y1="' + r1(80 - (v.mid - lo) / ((hi - lo) || 1) * 80) + '" y2="' + r1(80 - (v.mid - lo) / ((hi - lo) || 1) * 80) + '" class="ac-v__lmid"/>' : "") +
          '<path d="' + p.d + '" class="ac-v__lline ac-v__draw" pathLength="1"/></svg></div>';
      }
      var own = v.scale === "own";
      var q = linePath(it.points, { x0: 8, x1: 322, top: own ? 10 : 0, bot: own ? 104 : 120, lo: own ? null : lo, hi: own ? null : hi }), e = q.xy[q.xy.length - 1], s0 = q.xy[0];
      return '<div class="ac-v__box ac-v__lcard ' + t + '"><div class="ac-v__lcard-h"><b class="ac-v__ink">' + esc(it.label) + "</b>" + (it.sub ? "<span>" + esc(it.sub) + "</span>" : "") + "</div>" +
        '<svg class="ac-v__lstack" viewBox="0 0 330 120" preserveAspectRatio="none" role="img" aria-label="' + esc(it.label + (it.sub ? ": " + it.sub : "")) + '">' +
        '<defs><linearGradient id="acLg' + (++uid) + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="ac-v__gstop" stop-opacity=".3"/><stop offset="1" class="ac-v__gstop" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="' + q.d + " L" + r1(e[0]) + ",120 L" + r1(s0[0]) + ',120 Z" fill="url(#acLg' + uid + ')"/><path d="' + q.d + '" class="ac-v__lline ac-v__draw" pathLength="1"/></svg></div>';
    }).join("") + "</div>";
  };
  /** An order ticket (L2 Call): BUY · what · when · Seller ? */
  R.ticket = function (v) {
    return '<div class="ac-v__box ac-v__ticket"><span class="ac-v__tside">' + esc(v.side) + '</span><span class="ac-v__tmain"><b>' + esc(v.title) + "</b>" + (v.sub ? "<span>" + esc(v.sub) + "</span>" : "") + "</span>" +
      (v.aside ? '<span class="ac-v__taside"><span>' + esc(v.aside) + '</span><b class="ac-v__tmark">' + esc(v.mark || "?") + "</b></span>" : "") + "</div>";
  };
  /** A position line (L4 Call). */
  R.position = function (v) {
    return '<div class="ac-v__box ac-v__position"><span class="ac-v__pmain">' + (v.label ? "<span>" + esc(v.label) + "</span>" : "") + "<b>" + esc(v.title) + "</b></span>" +
      '<span class="ac-v__pval"><b class="ac-num">' + esc(v.value) + "</b>" + (v.change ? '<span class="ac-num ' + tone(v.tone || "down") + ' ac-v__ink">' + esc(v.change) + "</span>" : "") + "</span></div>";
  };
  /** The two camps (L1): image cards with name, tag and one line. */
  R.bullbear = function (v) {
    return '<div class="ac-v__bb">' + v.items.map(function (it) {
      var t = tone(it.tone);
      return '<div class="ac-v__bbcard ' + t + '">' + (it.badge ? '<span class="ac-v__bbbadge">' + esc(it.badge) + "</span>" : "") +
        (it.chart ? '<div class="ac-v__bbimg ac-v__bbimg--chart">' + candles(it.chart, { w: 160, noAxis: true }) + "</div>"
          : '<div class="ac-v__bbimg"><img class="ac-v__bbpic ac-v__bbpic--' + esc(it.tone) + '" src="' + esc(AC.base + "static/img/" + it.img + ".webp") + '" alt="' + esc(it.alt) + '" loading="lazy"></div>') +
        '<b class="ac-v__bbname ac-v__ink">' + esc(it.name) + "</b>" +
        '<span class="ac-v__bbtag">' + svgIcon(it.tone === "up" ? ARROW_UP : ARROW_DOWN, 14) + esc(it.tag) + "</span>" +
        '<span class="ac-v__bbtext">' + AC.rich(it.text) + "</span></div>";
    }).join("") + "</div>";
  };
  /** Lower → higher scale and one row per tier (L3). */
  R.ladder = function (v) {
    return '<div class="ac-v__ladder">' + (v.from || v.to ? '<div class="ac-v__lscale"><span>' + esc(v.from || "") + '</span><span class="ac-v__lgrad" aria-hidden="true"></span><span>' + esc(v.to || "") + "</span></div>" : "") +
      v.rows.map(function (r, i) { return '<div class="ac-v__lrow ' + tone(r.tone || "muted") + ' ac-v__seq" style="--i:' + i + '"><b class="ac-v__ink">' + esc(r.label) + "</b><span>" + esc(r.text) + "</span></div>"; }).join("") + "</div>";
  };
  /** Bid · Spread · Ask boxes, optional head (L4). */
  R.quotes = function (v) {
    var row = '<div class="ac-v__quotes">' + v.items.map(function (q) {
      return '<div class="ac-v__qbox"><span class="ac-v__qk ' + tone(q.tone || "muted") + ' ac-v__ink">' + esc(q.label) + '</span><b class="ac-num">' + esc(q.value) + "</b>" + (q.sub ? '<span class="ac-v__qs">' + esc(q.sub) + "</span>" : "") + "</div>";
    }).join("") + "</div>";
    if (!v.head) return row;
    var h = v.head;
    return '<div class="ac-v__box ac-v__qcard"><div class="ac-v__qhead"><b>' + esc(h.title) + "</b>" + (h.badge ? '<span class="ac-v__qbadge ' + tone(h.tone || "muted") + '">' + esc(h.badge) + "</span>" : "") + "</div>" +
      (h.sub ? '<span class="ac-v__sub">' + esc(h.sub) + "</span>" : "") + row + "</div>";
  };
  /** B —— Last trade —— S (L4). */
  /** The last trade: a buyer (green, left, like the bid below) and a seller (red, right, like the ask) meeting at one
      price, the two sides named in words. */
  R.handshake = function (v) {
    return '<div class="ac-v__box ac-v__shake"><span class="ac-v__shk ac-tone--up">' + esc(v.left || AC.t("cards.v.buyer")) + '</span><span class="ac-v__shline" aria-hidden="true"></span><b>' + esc(v.text) +
      '</b><span class="ac-v__shline" aria-hidden="true"></span><span class="ac-v__shk ac-tone--down">' + esc(v.right || AC.t("cards.v.seller")) + "</span></div>";
  };
  R.columns = function (v) {
    return '<div class="ac-v__cols ac-v__cols--' + v.cols.length + '">' + v.cols.map(function (c) {
      // arrow: "up" | "down" (design P1-Ch02 L2 long / short): the two rows become an arrow from step 1 to step 2
      if (c.arrow && c.rows.length === 2) {
        var up = c.arrow === "up", a = c.rows[0], b = c.rows[1], id = "acAr" + (++uid);
        var x1 = 36, x2 = 132, y1 = up ? 84 : 30, y2 = up ? 30 : 84;
        var svg = '<svg class="ac-v__colarrow" viewBox="0 0 168 112" role="img" aria-label="' + esc(a.label + " " + a.value + ", then " + b.label + " " + b.value) + '">' +
          '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10z" class="' + tone(c.arrowTone || c.tone || "up") + ' ac-v__fill"/></marker></defs>' +
          '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="' + tone(c.arrowTone || c.tone || "up") + ' ac-v__stroke" stroke-width="3" stroke-linecap="round" marker-end="url(#' + id + ')"/>' +
          T(up ? 8 : 8, up ? 104 : 16, a.label + " " + a.value, { fs: 11.5, w: 700, cls: "ac-v__t--sub" }) +
          T(160, up ? 16 : 104, b.label + " " + b.value, { fs: 11.5, w: 700, anchor: "end", cls: "ac-v__t--sub" }) + "</svg>";
        return '<div class="ac-v__tile ac-v__coltile ' + tone(c.tone || "white") + '"><b class="ac-v__ink ac-v__coltitle">' + esc(c.title) + "</b>" + svg +
          (c.result ? '<b class="ac-v__colres ac-v__ink">' + AC.rich(c.result) + "</b>" : "") + "</div>";
      }
      return '<div class="ac-v__tile ' + tone(c.tone || "white") + (c.tint ? " is-tinted" : "") + '"><b class="ac-v__ink ac-v__coltitle">' + esc(c.title) + "</b>" + c.rows.map(function (r) {
        return '<div class="ac-v__row ac-v__row--sm"><span>' + esc(r.label) + '</span><b class="ac-num ' + (r.tone ? tone(r.tone) + " ac-v__ink" : "") + '">' + esc(r.value) + "</b></div>";
      }).join("") + (c.result ? '<b class="ac-v__colres ac-v__ink">' + AC.rich(c.result) + "</b>" : "") + "</div>";
    }).join("") + "</div>";
  };
  R.tiles = function (v) {
    var cols = v.cols || 1;
    // 1–2 columns with icons: "cards" (icon in a toned square, a "Tap to see" hint until opened, the open card tinted)
    var cards = cols < 3 && v.items.some(function (it) { return it.icon; });
    return '<div class="ac-v__tiles' + (cols >= 3 ? " ac-v__tiles--icons" : cards ? " ac-v__tiles--cards" : "") + '" data-interactive="tiles" style="--cols:' + cols + '">' +
      (v.prompt ? '<p class="ac-v__prompt">' + esc(v.prompt) + "</p>" : "") +
      '<div class="ac-v__tgrid">' + v.items.map(function (it, i) {
        var body = (it.text ? '<span class="ac-v__ttext">' + AC.rich(it.text) + "</span>" : "") + (it.more ? '<span class="ac-v__tmore ac-v__ink">' + AC.rich(it.more) + "</span>" : "");
        return '<button type="button" class="ac-v__tbtn ' + tone(it.tone || "primary") + '" aria-expanded="false" data-i="' + i + '">' + icon(it.icon) +
          '<span class="ac-v__tline"><span class="ac-v__ttitle">' + esc(it.title) + '</span><span class="ac-v__tick" aria-hidden="true">✓</span></span>' +
          (cards ? '<span class="ac-v__thint">' + esc(AC.t("cards.v.tapSee")) + "</span>" : "") +
          (body ? '<span class="ac-v__tbody">' + body + "</span>" : "") + "</button>";
      }).join("") + "</div></div>";
  };
  R.flow = function (v) {
    var rows = v.rows && v.rows.length ? v.rows.map(function (r) { return Array.isArray(r) ? r : (r.items || []); }) : [v.items];
    return box(rows.map(function (items) {
      return '<div class="ac-v__flow">' + items.map(function (it, i) {
        return (i ? '<span class="ac-v__arrow ac-v__seq" style="--i:' + (i * 2 - 1) + '" aria-hidden="true">→</span>' : "") +
          '<div class="ac-v__step ac-v__seq ' + tone(it.tone || (it.active ? "primary" : "muted")) + (it.active ? " is-active" : "") + '" style="--i:' + (i * 2) + '">' +
          (it.top ? '<span class="ac-v__stop">' + esc(it.top) + "</span>" : "") + (it.value ? '<b class="ac-num">' + esc(it.value) + "</b>" : "") + (it.sub ? '<span class="ac-v__sub">' + esc(it.sub) + "</span>" : "") + "</div>";
      }).join("") + "</div>";
    }).join("") + foot(v.foot), "ac-v__box--flow");
  };
  R.bars = function (v) {
    var bars = v.bars, n = bars.length, tap = bars.some(function (b) { return b.sub; });
    var max = v.max || Math.max.apply(null, bars.map(function (b) { return Math.abs(b.value); })) || 1;
    // layout "rows" (design P1-Ch02 L3 "wipe-out rule"): a horizontal bar a row, its value beside it, tap for the working
    if (v.layout === "rows") {
      return '<div class="ac-v__box ac-v__box--brows"' + (tap ? ' data-interactive="bars"' : "") + ">" + (v.caption ? '<span class="ac-v__title">' + esc(v.caption) + "</span>" : "") +
        bars.map(function (b, bi) {
          var tag = tap && b.sub ? "button" : "div", pct = Math.max(1.5, Math.abs(b.value) / max * 100);
          return "<" + tag + (tag === "button" ? ' type="button" aria-expanded="' + (bi === v.open ? "true" : "false") + '" data-bar' : "") + ' class="ac-v__brow2 ' + tone(b.tone || "primary") + '"><b class="ac-v__brlab">' + esc(b.label) + "</b>" +
            '<span class="ac-v__brtrack"><span class="ac-v__brbar" style="width:' + r1(pct) + '%"></span><span class="ac-v__brval ac-num">' + esc(b.display != null ? b.display : num(b.value)) + "</span>" +
            (b.sub ? '<span class="ac-v__bsub ac-v__brsub">' + esc(b.sub) + "</span>" : "") + "</span></" + tag + ">";
        }).join("") + "</div>";
    }
    var bands = (v.bands || []).map(function (b) {
      return '<span class="ac-v__band ' + tone(b.tone) + '" style="grid-column:' + (b.from + 1) + " / " + (b.to + 2) + '"><span class="ac-v__ink">' + esc(b.label) + "</span></span>";
    }).join("");
    var cols = bars.map(function (b, i) {
      var tag = tap && b.sub ? "button" : "div";
      var pct = Math.max(2, Math.abs(b.value) / max * 100);
      return "<" + tag + (tag === "button" ? ' type="button" aria-expanded="false" data-bar' : "") + ' class="ac-v__bcol ' + tone(b.tone || "primary") + (b.dashed ? " is-dashed" : "") + '" style="grid-column:' + (i + 1) + '">' +
        '<span class="ac-v__bwrap"><span class="ac-v__bval ac-num">' + esc(b.display != null ? b.display : num(b.value)) + '</span><span class="ac-v__bar" style="height:' + r1(pct) + '%"></span></span>' +
        '<span class="ac-v__blab">' + esc(b.label) + "</span>" + (b.sub ? '<span class="ac-v__bsub ac-v__ink">' + esc(b.sub) + "</span>" : "") +
        (tag === "button" ? '<span class="ac-v__bplus" aria-hidden="true">+</span>' : "") + "</" + tag + ">";
    }).join("");
    return '<div class="ac-v__box ac-v__box--bars"' + (tap ? ' data-interactive="bars"' : "") + ">" + (v.caption ? '<span class="ac-v__title">' + esc(v.caption) + "</span>" : "") +
      '<div class="ac-v__bars' + (bands ? " has-bands" : "") + '" style="--n:' + n + '">' + bands + cols + "</div>" + foot(v.foot) + "</div>";
  };
  R.timeline = function (v) {
    var n = v.points.length, b = v.badge;
    return box('<div class="ac-v__tl" style="--n:' + n + '">' +
      (b ? '<span class="ac-v__tlbadge ' + tone(b.tone || "gold") + '" style="grid-column:' + ((b.from || 0) + 1) + " / " + ((b.to != null ? b.to : n - 1) + 2) + '"><span class="ac-v__ink">' + esc(b.text || "") + "</span></span>" : "") +
      v.points.map(function (p, i) {
        return '<div class="ac-v__tlp ' + tone(p.tone || "primary") + '" style="grid-column:' + (i + 1) + '"><span class="ac-v__tldot" aria-hidden="true"></span><b class="ac-v__ink">' + esc(p.label) + "</b>" + (p.sub ? '<span class="ac-v__sub">' + esc(p.sub) + "</span>" : "") + "</div>";
      }).join("") + "</div>", "ac-v__box--tl");
  };
  R.equation = function (v) {
    return box('<div class="ac-v__eq">' + v.terms.map(function (t) {
      if (t.op && !t.value) return '<span class="ac-v__op" aria-hidden="true">' + esc(t.op) + "</span>";
      return (t.op ? '<span class="ac-v__op">' + esc(t.op) + "</span>" : "") + '<span class="ac-v__term ' + tone(t.tone || "white") + '"><b class="ac-v__ink ac-num">' + esc(t.value) + "</b>" + (t.label ? "<span>" + esc(t.label) + "</span>" : "") + "</span>";
    }).join("") + "</div>" + foot(v.foot), "ac-v__box--eq");
  };
  R.spread = function (v) {
    var s = '<line x1="30" y1="70" x2="330" y2="70" class="ac-v__base"/>' +
      '<circle cx="110" cy="70" r="9" class="ac-tone--up ac-v__fill"/>' + T(110, 48, AC.t("cards.v.bid", { x: v.bid }), { tone: "up", fs: 12, w: 800, anchor: "middle" }) + T(110, 100, v.bidSub || AC.t("cards.v.bidSub"), { fs: 11, w: 600, anchor: "middle", cls: "ac-v__t--muted" }) +
      '<circle cx="250" cy="70" r="9" class="ac-tone--down ac-v__fill"/>' + T(250, 48, AC.t("cards.v.ask", { x: v.ask }), { tone: "down", fs: 12, w: 800, anchor: "middle" }) + T(250, 100, v.askSub || AC.t("cards.v.askSub"), { fs: 11, w: 600, anchor: "middle", cls: "ac-v__t--muted" }) +
      (v.spread ? '<path d="M110 114 L110 122 L250 122 L250 114" class="ac-tone--gold ac-v__bracket"/>' + T(180, 146, AC.t("cards.v.spread", { x: v.spread }), { tone: "gold", fs: 13, w: 800, anchor: "middle" }) : "");
    return '<div class="ac-v__box ac-v__box--svg"><svg class="ac-v__svg" viewBox="0 10 360 ' + (v.spread ? 150 : 110) + '" role="img" aria-label="' + esc(AC.t("cards.v.bid", { x: v.bid }) + ", " + AC.t("cards.v.ask", { x: v.ask }) + (v.spread ? ", " + AC.t("cards.v.spread", { x: v.spread }) : "")) + '">' + s + "</svg></div>";
  };
  R.counter = function (v) {
    var dots = "";
    for (var i = 0; i < v.count; i++) dots += '<span class="ac-v__cdot ac-v__seq" style="--i:' + i + '"></span>';
    return box('<div class="ac-v__counter ' + tone(v.tone || "gold") + '">' + '<div class="ac-v__jar" aria-hidden="true">' + dots + "</div>" +
      '<div class="ac-v__ctext">' + (v.jar ? '<span class="ac-v__sub">' + esc(v.jar) + "</span>" : "") + '<b class="ac-v__ink ac-num">' + esc(v.total) + "</b>" + (v.label ? "<span>" + esc(v.label) + "</span>" : "") + "</div></div>", "ac-v__box--counter");
  };
  R.ad = function (v) {
    return '<div class="ac-v__ad"><div class="ac-v__phone">' + (v.mark ? '<span class="ac-v__mark" aria-hidden="true">' + esc(v.mark) + "</span>" : "") +
      '<div class="ac-v__adbadge"><b>' + esc(v.badge) + "</b>" + (v.badgeSub ? "<span>" + esc(v.badgeSub) + "</span>" : "") + "</div>" +
      '<b class="ac-v__adtitle">' + esc(v.title) + "</b>" + (v.sub ? '<span class="ac-v__sub">' + esc(v.sub) + "</span>" : "") + "</div></div>";
  };
  R.quote = function (v) {
    function cell(lab, p, t) { return '<div class="ac-v__qcell ' + tone(t) + '"><span class="ac-v__ink">' + esc(lab) + '</span><b class="ac-num">' + esc(p) + "</b></div>"; }
    return '<div class="ac-v__quote"><div class="ac-v__qrow">' + cell(AC.t("cards.v.sell"), v.sell, "down") + cell(AC.t("cards.v.buy"), v.buy, "up") + "</div>" + (v.note ? '<span class="ac-v__qnote">' + AC.rich(v.note) + "</span>" : "") + "</div>";
  };
  var CHK = { ok: ["✓", "up", "cards.v.yes"], no: ["✕", "down", "cards.v.no"], warn: ["!", "down", "cards.v.warn"] };
  R.checks = function (v) {
    return box(v.items.map(function (it) {
      var k = it.icon || (it.ok !== false ? "ok" : "no"), c = CHK[k] || CHK.ok, ok = k === "ok";
      return '<div class="ac-v__check ' + tone(c[1]) + (it.icon ? " ac-v__check--card" : "") + '"><span class="ac-v__ico" aria-hidden="true">' + c[0] + '</span><span class="ac-v__ctx"><b>' + AC.rich(it.title) + "</b>" + (it.sub ? '<span class="ac-v__sub">' + AC.rich(it.sub) + "</span>" : "") + "</span>" +
        '<span class="ac-visually-hidden">' + esc(AC.t(c[2])) + "</span></div>";
    }).join(""), "ac-v__box--checks" + (v.items.some(function (it) { return it.icon; }) ? " ac-v__box--chkcards" : ""));
  };
  R.fields = function (v) {
    return '<div class="ac-v__fields" style="--n:' + v.items.length + '">' + v.items.map(function (f) { return '<div class="ac-v__field' + (f.tone ? " " + tone(f.tone) : "") + '"><span>' + esc(f.label) + '</span><b class="ac-num' + (f.tone ? " ac-v__ink" : "") + '">' + esc(f.value) + "</b></div>"; }).join("") + "</div>";
  };
  R.stack = function (v, o) {
    var cls = "ac-v__stack" + (v.layout === "row" ? " ac-v__stack--row" : "");
    // a stack with something to tap passes explore on to its parts; otherwise ▶ Play reveals it
    if (o.explore && (v.items || []).some(tappable)) return '<div class="' + cls + '">' + v.items.map(function (x) { return render(x, { explore: x.kind === "checklist" }); }).join("") + "</div>";
    var inner = v.items.map(function (x) { return render(x, { tile: v.layout === "row" }); }).join("");
    // ▶ Play sits under the stack (a row stack keeps its items in a row of their own, never the button as a column)
    if (o.explore) return '<div class="ac-v__stack ac-v__playwrap is-idle" data-explore="play">' + (v.layout === "row" ? '<div class="' + cls + '">' + inner + "</div>" : inner) + '<div class="ac-v__reveals">' + playBtn() + "</div></div>";
    return '<div class="' + cls + '">' + inner + "</div>";
  };

  // ------------------------------------------------------------------ Chapters 3–10 components (canvas-p1 boards). See _source/VISUALS.md.
  /** value → text for chart axes and labels. y: {unit: "$" | "%" | "x" | "", digits, compact (12,000 → 12k), signed} */
  function fmtV(v, y) {
    y = y || {};
    var d = y.digits || 0, a = Math.abs(v), sign = v < 0 ? "−" : (y.signed && v > 0 ? "+" : ""), body;
    if (y.unit === "$") body = y.compact && a >= 1000 ? AC.fmt.money(a / 1000, "USD", a >= 100000 ? 0 : (y.digits != null ? y.digits : 1)).replace(/\.0(?=\D*$)/, "") + "k" : AC.fmt.money(a, "USD", d);
    else body = (y.compact && a >= 1000 ? AC.fmt.num(a / 1000, { maximumFractionDigits: 1 }) + "k" : AC.fmt.num(a, { minimumFractionDigits: d, maximumFractionDigits: d })) + (y.unit === "%" ? "%" : y.unit === "x" ? "×" : (y.unit || ""));
    return sign + body;
  }
  function svgWrap(W, H, s, label) {
    return '<svg class="ac-v__svg" viewBox="0 0 ' + W + " " + r1(H) + '" role="img"' + (label ? ' aria-label="' + esc(label) + '"' : ' aria-hidden="true"') + ">" + s + "</svg>";
  }
  /** spread labels apart vertically (min gap), keeping their order: [{y, …}] → same objects with y moved */
  function declutter(items, gap, lo, hi) {
    var s = items.slice().sort(function (a, b) { return a.y - b.y; });
    for (var i = 1; i < s.length; i++) if (s[i].y - s[i - 1].y < gap) s[i].y = s[i - 1].y + gap;
    if (hi != null && s.length && s[s.length - 1].y > hi) { var sh = s[s.length - 1].y - hi; s.forEach(function (x) { x.y -= sh; }); }
    if (lo != null) for (var k = 0; k < s.length; k++) if (s[k].y < lo) s[k].y = lo + gap * k;
    return items;
  }

  /** series: line chart of money, %, a portfolio or an account (not prices: prices are candles). */
  R.series = function (v, o) {
    // in a row tile: the tile's own 150 × 90 canvas (as the design draws it), not a 330-wide one shrunk to fit
    var tl = !!(o && o.tile), W = tl ? 150 : 330, H = tl ? TILE_H : (v.height || 140), ss = v.series || [], y = v.y || {};
    var n = Math.max.apply(null, ss.map(function (s) { return s.values.length; }).concat([2]));
    var ends = ss.some(function (s) { return s.end !== false && (s.end || s.label); }) && v.ends !== false;
    var xl = v.x && v.x.labels, yAxis = !!y.axis;
    var rlab = (v.hlines || []).some(function (l) { return l.label && l.pos !== "left"; });
    // a point labelled above the line needs room over the top value (Ch9 L7: "$12,000" over the peak line)
    var upLab = (v.points || []).some(function (p) { return p.label && p.pos !== "below"; });
    var x0 = yAxis ? 40 : 10, x1 = W - (ends ? (v.endWidth || 64) : rlab ? (v.endWidth || 40) : 12), top = upLab ? 24 : 14, bot = H - (xl ? 22 : 10);
    var all = [];
    ss.forEach(function (s) { s.values.forEach(function (q) { if (q != null) all.push(q); }); });
    (v.hlines || []).forEach(function (l) { all.push(l.value); });
    var lo = v.lo != null ? v.lo : Math.min.apply(null, all), hi = v.hi != null ? v.hi : Math.max.apply(null, all), sp = (hi - lo) || Math.abs(hi) * 0.1 || 1;
    if (v.lo == null) lo -= sp * 0.08; if (v.hi == null) hi += sp * 0.1;
    function X(i) { return x0 + (x1 - x0) * i / Math.max(1, n - 1); }
    function Y(q) { return bot - (q - lo) / ((hi - lo) || 1) * (bot - top); }
    var s = "";
    if (yAxis) niceTicks(lo, hi, y.ticks || 3).values.forEach(function (t) { s += '<line x1="' + x0 + '" x2="' + x1 + '" y1="' + r1(Y(t)) + '" y2="' + r1(Y(t)) + '" class="ac-v__grid"/>' + T(x0 - 6, Y(t) + 3.5, fmtV(t, y), { fs: 9.5, w: 600, anchor: "end", cls: "ac-v__axis" }); });
    else if (v.grid !== false) s += '<line x1="' + x0 + '" x2="' + x1 + '" y1="' + r1(bot) + '" y2="' + r1(bot) + '" class="ac-v__grid"/>';
    (v.hlines || []).forEach(function (l) {
      var yy = Y(l.value);
      s += '<line x1="' + x0 + '" x2="' + x1 + '" y1="' + r1(yy) + '" y2="' + r1(yy) + '" class="' + tone(l.tone || "muted") + ' ac-v__hline ac-v__hline--thin"/>' +
        (l.label ? T(l.pos === "left" ? x0 + 2 : x1 + 4, l.pos === "left" ? yy - 5 : yy + 3.5, l.label, { tone: l.tone || "muted", fs: 9.5, w: 800 }) : "");
    });
    (v.vlines || []).forEach(function (l) {
      var xx = X(l.i);
      s += '<line x1="' + r1(xx) + '" x2="' + r1(xx) + '" y1="' + top + '" y2="' + r1(bot) + '" class="' + tone(l.tone || "gold") + ' ac-v__vline"/>' + (l.label ? T(xx + 4, top + 6, l.label, { tone: l.tone || "gold", fs: 9.5, w: 800 }) : "");
    });
    var endLabels = [];
    ss.forEach(function (sr, k) {
      var t = sr.tone || ["blue", "down", "gold", "up"][k % 4];
      var pts = sr.values.map(function (q, i) { return [X(i), q == null ? null : Y(q)]; });
      var d = pathOf(pts);
      if (sr.area) {
        var fi = sr.values.findIndex(function (q) { return q != null; }), la = sr.values.length - 1;
        while (la > 0 && sr.values[la] == null) la--;
        s += '<path d="' + d + " L" + r1(X(la)) + "," + r1(bot) + " L" + r1(X(fi)) + "," + r1(bot) + ' Z" class="' + tone(t) + ' ac-v__sarea ac-v__fade"/>';
      }
      s += drawLine(d, tone(t) + " ac-v__sline", sr.dashed);
      if (sr.dots) pts.forEach(function (q) { if (q[1] != null) s += '<circle cx="' + r1(q[0]) + '" cy="' + r1(q[1]) + '" r="3" class="' + tone(t) + ' ac-v__dot"/>'; });
      var li = sr.values.length - 1; while (li > 0 && sr.values[li] == null) li--;
      if (ends && sr.end !== false && (sr.end || sr.label)) endLabels.push({ y: Y(sr.values[li]) + 3.5, text: sr.end || sr.label, tone: t, x: X(li) + 6 });
    });
    declutter(endLabels, 12, top, bot + 4).forEach(function (e) { s += T(e.x, e.y, e.text, { tone: e.tone, fs: 10, w: 800 }); });
    (v.points || []).forEach(function (p) {
      var sr = ss[p.s || 0], q = sr && sr.values[p.i]; if (q == null) return;
      var xx = X(p.i), yy = Y(q), t = p.tone || "gold", pos = p.pos || (yy - 12 < 4 ? "below" : "above");
      s += '<circle cx="' + r1(xx) + '" cy="' + r1(yy) + '" r="3.5" class="' + tone(t) + ' ac-v__dot"/>' +
        (p.label ? T(Math.min(Math.max(xx, x0 + 14), x1 - 6), pos === "below" ? yy + 15 : yy - 8, p.label, { tone: t, fs: 10, w: 800, anchor: p.anchor || "middle" }) : "");
    });
    if (xl) {
      var k2 = xl.length;
      xl.forEach(function (lab, j) { var xi = typeof lab === "object" ? X(lab.i) : X(j * (n - 1) / Math.max(1, k2 - 1)); s += T(xi, H - 5, typeof lab === "object" ? lab.label : lab, { fs: 9.5, w: 600, anchor: j === 0 && typeof lab !== "object" ? "start" : j === k2 - 1 && typeof lab !== "object" ? "end" : "middle", cls: "ac-v__axis" }); });
    }
    return '<div class="ac-v__box ac-v__box--chart ac-v__box--series">' + hdr(v) + '<div class="ac-v__plot">' + svgWrap(W, H, s, v.label) + "</div>" + foot(v.foot) + "</div>";
  };

  /** trades: one bar per trade around a zero line (wins up, losses down). */
  R.trades = function (v) {
    var vals = v.values || [], n = vals.length, W = 330, H = v.height || 110, labels = v.labels !== false;
    var mxp = Math.max(0, Math.max.apply(null, vals)), mxn = Math.max(0, -Math.min.apply(null, vals)), tot = (mxp + mxn) || 1;
    var top = labels ? 16 : 6, bot = H - (labels ? 16 : 6), y0 = top + (bot - top) * mxp / tot, step = (W - 16) / n, bw = Math.min(22, step * 0.56);
    var s = '<line x1="8" x2="' + (W - 8) + '" y1="' + r1(y0) + '" y2="' + r1(y0) + '" class="ac-v__axisline"/>';
    vals.forEach(function (q, i) {
      var x = 8 + step * (i + 0.5), yv = y0 - q / tot * (bot - top), up = q >= 0, t = up ? "up" : "down";
      s += '<rect x="' + r1(x - bw / 2) + '" y="' + r1(Math.min(y0, yv)) + '" width="' + r1(bw) + '" height="' + r1(Math.max(1.5, Math.abs(yv - y0))) + '" rx="2" class="' + tone(t) + ' ac-v__fill ac-v__gy' + (up ? "" : " is-neg") + '"/>';
      if (labels) s += T(x, up ? yv - 5 : yv + 12, v.displays ? v.displays[i] : fmtV(q, { unit: v.unit, signed: true }), { tone: t, fs: 9.5, w: 800, anchor: "middle" });
    });
    return '<div class="ac-v__box ac-v__box--chart">' + hdr(v) + '<div class="ac-v__plot">' + svgWrap(W, H, s, v.label) + "</div>" + foot(v.foot) + "</div>";
  };

  /** barchart: grouped columns with negatives (revenue · profit by year, P/E of three firms, returns). Tap a group with a note. */
  R.barchart = function (v) {
    var series = v.series || [{ tone: "primary" }], groups = v.groups || [], H = v.height || 120;
    var all = [0]; groups.forEach(function (g) { g.values.forEach(function (q) { if (q != null) all.push(q); }); });
    var mx = Math.max.apply(null, all), mn = Math.min.apply(null, all), rg = (mx - mn) || 1, zero = mx / rg * 100;
    var tap = groups.some(function (g) { return g.note; });
    var legend = v.legend || (series.length > 1 && series.some(function (s) { return s.label; }) ? series.map(function (s) { return { label: s.label, tone: s.tone, dot: true }; }) : null);
    var cols = groups.map(function (g, gi) {
      var tag = g.note ? "button" : "div";
      var bars = g.values.map(function (q, k) {
        if (q == null) return '<span class="ac-v__bcw"></span>';
        var t = (g.tones && g.tones[k]) || (series[k] || series[0]).tone || "primary", neg = q < 0;
        var tp = neg ? zero : (mx - q) / rg * 100, ht = Math.abs(q) / rg * 100;
        var disp = g.displays ? g.displays[k] : fmtV(q, { unit: v.unit, digits: v.digits });
        return '<span class="ac-v__bcw"><span class="ac-v__bcb ' + tone(t) + (neg ? " is-neg" : "") + (g.dim && g.dim.indexOf(k) >= 0 ? " is-dim" : "") + '" style="top:' + r1(tp) + "%;height:" + r1(Math.max(0.8, ht)) + '%"><i class="ac-v__gy' + (neg ? " is-neg" : "") + '"></i>' +
          (disp ? '<b class="ac-v__bcv ac-v__ink ac-num">' + esc(disp) + "</b>" : "") + "</span></span>";
      }).join("");
      return "<" + tag + (tag === "button" ? ' type="button" data-bcg aria-expanded="false"' : "") + ' class="ac-v__bcg">' +
        '<span class="ac-v__bcplot" style="height:' + H + 'px"><span class="ac-v__bcin"><span class="ac-v__bczero" style="top:' + r1(zero) + '%"></span>' + bars + "</span></span>" +
        (g.label ? '<span class="ac-v__bcl">' + esc(g.label) + "</span>" : "") + (g.sub ? '<span class="ac-v__bcs ' + (g.subTone ? tone(g.subTone) + " ac-v__ink" : "") + '">' + esc(g.sub) + "</span>" : "") +
        (g.note ? '<span class="ac-v__bcn">' + AC.rich(g.note) + '</span><span class="ac-v__bplus" aria-hidden="true">+</span>' : "") + "</" + tag + ">";
    }).join("");
    return '<div class="ac-v__box ac-v__box--barchart"' + (tap ? ' data-interactive="bcg"' : "") + ">" + hdr({ title: v.title, aside: v.aside, asideTone: v.asideTone, legend: legend }) +
      '<div class="ac-v__bc" style="--n:' + groups.length + '">' + cols + "</div>" + foot(v.foot) + "</div>";
  };

  /** hbars: horizontal bars (gain needed to recover, savings vs inflation); value2 adds a second bar per row (fall | gain back). */
  R.hbars = function (v) {
    var rows = v.rows || [], pair = rows.some(function (r) { return r.value2 != null; }), st = v.layout === "stacked";
    var mx = v.max || Math.max.apply(null, rows.map(function (r) { return Math.abs(r.value); }).concat([1e-9]));
    var mx2 = v.max2 || Math.max.apply(null, rows.map(function (r) { return Math.abs(r.value2 || 0); }).concat([1e-9]));
    function bar(q, m, t) { return '<span class="ac-v__hbt"><i class="' + tone(t) + ' ac-v__gx" style="width:' + r1(Math.max(1.5, Math.abs(q) / m * 100)) + '%"></i></span>'; }
    var body = rows.map(function (r) {
      var t = r.tone || "primary", disp = r.display != null ? r.display : fmtV(r.value, { unit: v.unit });
      if (pair) return '<div class="ac-v__hbr ac-v__hbr--pair"><b class="ac-v__hbl ' + tone(r.labelTone || t) + ' ac-v__ink ac-num">' + esc(r.label) + "</b>" + bar(r.value, mx, t) + bar(r.value2, mx2, r.tone2 || "up") +
        '<b class="ac-num ' + tone(r.tone2 || "up") + ' ac-v__ink">' + esc(r.display2 != null ? r.display2 : fmtV(r.value2, { unit: v.unit })) + "</b></div>";
      if (st) return '<div class="ac-v__hbr ac-v__hbr--st"><span class="ac-v__hbl">' + AC.rich(r.label) + '</span><b class="ac-num ' + tone(t) + ' ac-v__ink">' + esc(disp) + "</b>" + bar(r.value, mx, t) + "</div>";
      // inner: a part drawn at the start of the bar (design P1-Ch02 Challenge: your margin inside the position)
      var bb = bar(r.value, mx, t);
      if (r.inner) bb = bb.replace("</span>", '<i class="' + tone(r.inner.tone || "gold") + ' ac-v__hbin" style="width:' + r1(Math.max(1.5, Math.abs(r.inner.value) / mx * 100)) + '%"></i></span>');
      return '<div class="ac-v__hbr"><span class="ac-v__hbl' + (r.labelTone ? " " + tone(r.labelTone) + " ac-v__ink" : "") + '">' + AC.rich(r.label) + "</span>" + bb + (disp ? '<b class="ac-num ' + tone(t) + ' ac-v__ink">' + esc(disp) + "</b>" : "") + "</div>";
    }).join("");
    var heads = v.heads ? '<div class="ac-v__hbh"><span>' + esc(v.heads[0] || "") + "</span><span>" + esc(v.heads[1] || "") + "</span></div>" : "";
    return '<div class="ac-v__box ac-v__box--hbars">' + hdr(v) + heads + '<div class="ac-v__hb' + (pair ? " ac-v__hb--pair" : st ? " ac-v__hb--st" : "") + '">' + body + "</div>" + foot(v.foot) + "</div>";
  };

  /** split: 100% bars (an allocation, a portfolio, costs vs profit). One row per bar; segments carry their own label. */
  R.split = function (v) {
    var rows = (v.rows || []).map(function (r) {
      var tot = r.segments.reduce(function (a, g) { return a + g.value; }, 0) || 1;
      var segs = r.segments.map(function (g) {
        var share = g.value / tot * 100;
        return '<span class="ac-v__sps ' + tone(g.tone || "primary") + '" style="flex:' + g.value + ' 1 0">' + (g.label && share >= (v.minLabel || 9) ? "<b>" + esc(g.label) + "</b>" : "") + "</span>";
      }).join("");
      var head0 = r.label || r.aside ? '<div class="ac-v__sph"><b>' + esc(r.label || "") + '</b><span class="' + (r.asideTone ? tone(r.asideTone) + " ac-v__ink" : "") + '">' + esc(r.aside || "") + "</span></div>" : "";
      return '<div class="ac-v__spr">' + head0 + '<div class="ac-v__sp ac-v__gx">' + segs + "</div>" + (r.under ? '<div class="ac-v__spu"><span>' + esc(r.under[0] || "") + "</span><span>" + esc(r.under[1] || "") + "</span></div>" : "") + "</div>";
    }).join("");
    return '<div class="ac-v__box ac-v__box--split">' + hdr({ title: v.title, aside: v.aside, asideTone: v.asideTone }) + rows + (v.legend ? '<div class="ac-v__legend ac-v__legend--foot">' + legendHtml(v.legend.map(function (l) { return { label: l.label, tone: l.tone, dot: true }; })) + "</div>" : "") + foot(v.foot) + "</div>";
  };

  /** donut: an allocation ring with a legend (Stocks · 60%, Bonds · 30%, Cash · 10%). */
  R.donut = function (v) {
    var segs = v.segments || [], tot = segs.reduce(function (a, g) { return a + g.value; }, 0) || 1, at = 0, gap = segs.length > 1 ? 1.2 : 0;
    var arcs = segs.map(function (g) {
      var len = g.value / tot * 100, a0 = at; at += len;
      return '<circle cx="60" cy="60" r="46" pathLength="100" class="' + tone(g.tone || "primary") + ' ac-v__arc" stroke-dasharray="' + r1(Math.max(0.1, len - gap)) + " " + r1(100 - len + gap) + '" stroke-dashoffset="' + r1(-a0) + '"/>';
    }).join("");
    var svg = '<svg class="ac-v__donut" viewBox="0 0 120 120" role="img" aria-label="' + esc(v.label || segs.map(function (g) { return g.label; }).join(", ")) + '"><g transform="rotate(-90 60 60)" class="ac-v__fade">' + arcs + "</g>" +
      (v.center ? T(60, v.centerSub ? 62 : 65, v.center, { fs: v.center.length > 6 ? 12.5 : 15, w: 800, anchor: "middle" }) : "") + (v.centerSub ? T(60, 79, v.centerSub, { fs: 9.5, w: 700, anchor: "middle", cls: "ac-v__t--muted" }) : "") + "</svg>";
    var leg = '<ul class="ac-v__dleg">' + segs.map(function (g) {
      return '<li class="' + tone(g.tone || "primary") + '"><i aria-hidden="true"></i><span><b>' + esc(g.label) + "</b>" + (g.sub ? "<span>" + esc(g.sub) + "</span>" : "") + "</span></li>";
    }).join("") + "</ul>";
    return '<div class="ac-v__box ac-v__box--donut">' + hdr(v) + '<div class="ac-v__dn">' + svg + leg + "</div>" + foot(v.foot) + "</div>";
  };

  /** table: header + rows of cells (an earnings report, a losing-streak table, a weekly review). Rows with a note can be tapped. */
  R.table = function (v) {
    var cols = v.cols || [], nc = cols.length || ((v.rows[0] || {}).cells || []).length;
    var tpl = (cols.length ? cols : new Array(nc).fill({})).map(function (c, i) { return "minmax(0, " + (c.w || (i === 0 ? 1.4 : 1)) + "fr)"; }).join(" ");
    function al(i) { var c = cols[i] || {}; return c.align || (i === 0 ? "left" : "right"); }
    function cell(x, i) {
      var o = typeof x === "object" && x ? x : { text: x };
      var t = o.tone ? tone(o.tone) + " ac-v__ink" : "";
      var inner = o.badge ? '<span class="ac-v__badge2 ' + tone(o.tone || "muted") + '">' + esc(o.text) + "</span>" : AC.rich(o.text == null ? "" : String(o.text));
      return '<span class="ac-v__td ac-v__td--' + al(i) + (o.strong ? " is-strong" : "") + (o.sub ? " has-sub" : "") + " " + t + '">' + inner + (o.sub ? "<small>" + esc(o.sub) + "</small>" : "") + "</span>";
    }
    var tap = v.rows.some(function (r) { return r.note; });
    var head0 = cols.some(function (c) { return c.label; }) ? '<div class="ac-v__th" style="grid-template-columns:' + tpl + '">' + cols.map(function (c, i) { return '<span class="ac-v__td ac-v__td--' + al(i) + (c.tone ? " " + tone(c.tone) + " ac-v__ink" : "") + '">' + esc(c.label || "") + "</span>"; }).join("") + "</div>" : "";
    var body = v.rows.map(function (r) {
      var cls = "ac-v__trw" + (r.strong ? " is-strong" : "") + (r.tone ? " " + tone(r.tone) + " is-toned" : "");
      var inner = '<span class="ac-v__tcells" style="grid-template-columns:' + tpl + '">' + r.cells.map(cell).join("") + "</span>" + (r.note ? '<span class="ac-v__tnote">' + AC.rich(r.note) + "</span>" : "");
      return r.note ? '<button type="button" class="' + cls + '" data-trow aria-expanded="false">' + inner + "</button>" : '<div class="' + cls + '">' + inner + "</div>";
    }).join("");
    return '<div class="ac-v__box ac-v__box--table"' + (tap ? ' data-interactive="trows"' : "") + ">" + hdr(v) + head0 + '<div class="ac-v__tbl">' + body + "</div>" + foot(v.foot) + "</div>";
  };

  /** gauge: a scale with bands (RSI 0–30–70–100) as a bar, or a half dial (fear · calm · greed). */
  R.gauge = function (v) {
    var mn = v.min != null ? v.min : 0, mx = v.max != null ? v.max : 100, bands = v.bands || [], val = v.value;
    function pc(q) { return Math.max(0, Math.min(100, (q - mn) / ((mx - mn) || 1) * 100)); }
    if (v.style === "arc") {
      var cx = 165, cy = 112, rr = 92, s = "", from = mn;
      bands.forEach(function (b) {
        var a0 = Math.PI * (1 - pc(from) / 100), a1 = Math.PI * (1 - pc(b.to) / 100);
        s += '<path d="M' + r1(cx + rr * Math.cos(a0)) + "," + r1(cy - rr * Math.sin(a0)) + " A" + rr + "," + rr + " 0 0 1 " + r1(cx + rr * Math.cos(a1)) + "," + r1(cy - rr * Math.sin(a1)) + '" class="' + tone(b.tone || "muted") + ' ac-v__garc"/>';
        from = b.to;
      });
      var an = Math.PI * (1 - pc(val != null ? val : (mn + mx) / 2) / 100);
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + r1(cx + (rr - 18) * Math.cos(an)) + '" y2="' + r1(cy - (rr - 18) * Math.sin(an)) + '" class="ac-v__needle"/><circle cx="' + cx + '" cy="' + cy + '" r="6" class="ac-v__needle-dot"/>';
      (v.labels || []).forEach(function (l, i, arr) {
        var x = arr.length === 1 ? cx : i === 0 ? cx - rr : i === arr.length - 1 ? cx + rr : cx;
        s += T(x, cy + 22, l.text || l, { tone: l.tone || (i === 0 ? "down" : i === arr.length - 1 ? "gold" : null), fs: 11, w: 800, anchor: "middle", cls: l.tone || i === 0 || i === arr.length - 1 ? "" : "ac-v__t--muted" });
      });
      return '<div class="ac-v__box ac-v__box--gauge">' + hdr(v) + svgWrap(330, 140, s, v.label) + foot(v.foot) + "</div>";
    }
    var from2 = mn, segs = bands.map(function (b) {
      var wdt = pc(b.to) - pc(from2); from2 = b.to;
      return '<span class="ac-v__gseg ' + tone(b.tone || "muted") + (b.on ? " is-on" : "") + '" style="flex:' + r1(wdt) + ' 1 0"><span class="ac-v__ink">' + esc(b.label || "") + "</span></span>";
    }).join("");
    var tks = (v.ticks || []).map(function (t) { return '<span style="left:' + r1(pc(t)) + '%">' + esc(num(t)) + "</span>"; }).join("");
    return '<div class="ac-v__box ac-v__box--gauge">' + hdr(v) + '<div class="ac-v__gbar">' + segs + (val != null ? '<span class="ac-v__gmark" style="left:' + r1(pc(val)) + '%"><b>' + esc(v.valueLabel || "") + "</b></span>" : "") + "</div>" +
      (tks ? '<div class="ac-v__gticks">' + tks + "</div>" : "") + foot(v.foot) + "</div>";
  };

  /** cycle: a smooth wave with labelled points (the market's emotion cycle, the economic cycle). */
  var CURVES = {
    wave: [[0, 0.06], [0.25, 0.5], [0.5, 0.94], [0.75, 0.5], [1, 0.06]],
    sentiment: [[0, 0.02], [0.14, 0.3], [0.27, 0.68], [0.4, 0.98], [0.5, 0.86], [0.6, 0.6], [0.7, 0.34], [0.8, 0.12], [0.88, 0.04], [1, 0.07]],
  };
  function curveSamples(ctrl) {
    var out = [];
    for (var i = 0; i < ctrl.length - 1; i++) {
      var p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
      for (var k = 0; k < 20; k++) {
        var t = k / 20, t2 = t * t, t3 = t2 * t;
        function cr(a, b, c2, d) { return 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3); }
        out.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(ctrl[ctrl.length - 1]);
    return out;
  }
  R.cycle = function (v) {
    var W = 330, H = v.height || 150, ctrl = Array.isArray(v.curve) ? v.curve.map(function (q, i, a) { return [i / (a.length - 1), q]; }) : CURVES[v.curve || "wave"];
    var sm = curveSamples(ctrl), x0 = 16, x1 = W - 16, top = 22, bot = H - 22;
    function X(t) { return x0 + (x1 - x0) * t; }
    function Yv(q) { return bot - q * (bot - top); }
    function at(t) { for (var i = 1; i < sm.length; i++) if (sm[i][0] >= t) { var a = sm[i - 1], b = sm[i], f = (t - a[0]) / ((b[0] - a[0]) || 1); return a[1] + (b[1] - a[1]) * f; } return sm[sm.length - 1][1]; }
    var d = sm.map(function (p, i) { return (i ? "L" : "M") + r1(X(p[0])) + "," + r1(Yv(p[1])); }).join(" ");
    var s = '<path d="' + d + '" class="' + tone(v.tone || "white") + ' ac-v__cyc ac-v__drawq" pathLength="1"/>';
    (v.callouts || []).forEach(function (c) {
      var lines = String(c.text).split("\n"), bw = Math.max.apply(null, lines.map(function (l) { return l.length; })) * 6 + 18, bh = lines.length * 13 + 9;
      var cx = X(c.t), cyv = c.y != null ? Yv(c.y) : (at(c.t) > 0.5 ? Yv(at(c.t)) + 34 : Yv(at(c.t)) - 34 - bh);
      var bx = Math.min(Math.max(cx - bw / 2, 4), W - bw - 4);
      if (c.from != null) s += '<line x1="' + r1(X(c.from)) + '" y1="' + r1(Yv(at(c.from))) + '" x2="' + r1(X(c.from)) + '" y2="' + r1(cyv + (cyv > Yv(at(c.from)) ? 0 : bh)) + '" class="' + tone(c.tone || "down") + ' ac-v__vline"/>';
      s += '<rect x="' + r1(bx) + '" y="' + r1(cyv) + '" width="' + r1(bw) + '" height="' + bh + '" rx="7" class="' + tone(c.tone || "down") + ' ac-v__callout"/>' +
        lines.map(function (l, i) { return T(bx + bw / 2, cyv + 15 + i * 13, l, { tone: c.tone || "down", fs: 10, w: 800, anchor: "middle" }); }).join("");
    });
    (v.points || []).forEach(function (p) {
      var q = at(p.t), x = X(p.t), y = Yv(q), slope = at(Math.min(1, p.t + 0.02)) - at(Math.max(0, p.t - 0.02)), t = p.tone || "gold";
      var pos = p.pos || (Math.abs(slope) < 0.02 ? (q > 0.5 ? "above" : "below") : slope > 0 ? "left" : "right");
      var lx = pos === "left" ? x - 7 : pos === "right" ? x + 7 : x, ly = pos === "above" ? y - 9 : pos === "below" ? y + 16 : y + 4;
      s += '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + (p.big ? 5.5 : 4) + '" class="' + tone(t) + ' ac-v__dot"/>' + (p.label ? T(lx, ly, p.label, { tone: t, fs: 10.5, w: 800, anchor: pos === "left" ? "end" : pos === "right" ? "start" : "middle" }) : "");
    });
    return '<div class="ac-v__box ac-v__box--chart">' + hdr(v) + '<div class="ac-v__plot">' + svgWrap(W, H, s, v.label) + "</div>" + foot(v.foot) + "</div>";
  };

  /** units: a grid of small squares (a company in 100 shares, 40 markets). */
  R.units = function (v) {
    var tot = Math.min(400, v.total || 100), on = v.on || 0, tones = v.tones, sq = "";
    for (var i = 0; i < tot; i++) sq += '<i class="' + tone(tones ? tones[i % tones.length] : i < on ? (v.tone || "gold") : "muted") + (tones || i < on ? " is-on" : "") + '"></i>';
    var grid = '<div class="ac-v__ugrid" style="--cols:' + (v.cols || 10) + '" aria-hidden="true">' + sq + "</div>";
    var txt = v.title || v.sub || v.mark ? '<div class="ac-v__utext">' + (v.title ? "<b>" + esc(v.title) + "</b>" : "") + (v.sub ? "<span>" + esc(v.sub) + "</span>" : "") + (v.mark ? '<b class="' + tone(v.tone || "gold") + ' ac-v__ink">' + esc(v.mark) + "</b>" : "") + "</div>" : "";
    return '<div class="ac-v__box ac-v__box--units' + (v.layout === "stack" ? " is-stack" : "") + '" role="img" aria-label="' + esc(v.label || [v.title, v.sub, v.mark].filter(Boolean).join(", ")) + '">' + hdr({ title: v.heading, aside: v.aside }) + '<div class="ac-v__un">' + grid + txt + "</div>" + foot(v.foot) + "</div>";
  };

  /** rr: a trade plan as reward (green, entry → target) over risk (red, stop → entry). compact: for side-by-side tiles. */
  R.rr = function (v) {
    var cp = !!v.compact, W = cp ? 160 : 330, H = v.height || (cp ? 104 : 130), lv = v.levels || [];
    var ps = [v.entry, v.stop, v.target].concat(lv.map(function (l) { return l.price; })), lo = Math.min.apply(null, ps), hi = Math.max.apply(null, ps), sp = (hi - lo) || 1;
    lo -= sp * 0.12; hi += sp * 0.12;
    var top = 8, bot = H - 8, bx0 = cp ? 18 : (v.labelsWidth || 118), bx1 = W - (cp ? 52 : 70);
    function Y(q) { return bot - (q - lo) / (hi - lo) * (bot - top); }
    var lab = v.labels || {}, dg = v.fmt;
    function L(k, q) { return lab[k] != null ? lab[k] : AC.t("cards.v.rr." + k, { x: money(q, dg) }); }
    var ye = Y(v.entry), yt = Y(v.target), ys = Y(v.stop), s = "";
    s += '<rect x="' + bx0 + '" y="' + r1(Math.min(yt, ye)) + '" width="' + (bx1 - bx0) + '" height="' + r1(Math.abs(ye - yt)) + '" class="ac-tone--up ac-v__rrbox ac-v__fade"/>' +
      '<rect x="' + bx0 + '" y="' + r1(Math.min(ye, ys)) + '" width="' + (bx1 - bx0) + '" height="' + r1(Math.abs(ys - ye)) + '" class="ac-tone--down ac-v__rrbox ac-v__fade"/>';
    lv.forEach(function (l) { var y = Y(l.price); s += '<line x1="' + (cp ? bx0 : 8) + '" x2="' + bx1 + '" y1="' + r1(y) + '" y2="' + r1(y) + '" class="' + tone(l.tone || "muted") + ' ac-v__hline ac-v__hline--thin"/>' + (l.label && !cp ? T(bx1 + 6, y + 3.5, l.label, { tone: l.tone || "muted", fs: 10, w: 800 }) : ""); });
    [["target", yt, "up"], ["entry", ye, "blue"], ["stop", ys, "down"]].forEach(function (k) {
      s += '<line x1="' + bx0 + '" x2="' + bx1 + '" y1="' + r1(k[1]) + '" y2="' + r1(k[1]) + '" class="' + tone(k[2]) + ' ac-v__rrline"/>';
      if (!cp) s += T(bx0 - 8, k[1] + 4, L(k[0], v[k[0]]), { tone: k[2], fs: 11, w: 800, anchor: "end" });
    });
    var rw = v.reward != null ? v.reward : "+" + money(Math.abs(v.target - v.entry), dg), rk = v.risk != null ? v.risk : "−" + money(Math.abs(v.entry - v.stop), dg);
    s += T(bx1 + 6, (yt + ye) / 2 + 4, rw, { tone: "up", fs: cp ? 11 : 12, w: 800 }) + T(bx1 + 6, (ye + ys) / 2 + 4, rk, { tone: "down", fs: cp ? 11 : 12, w: 800 });
    return '<div class="ac-v__box ac-v__box--chart' + (cp ? " ac-v__box--rrc" : "") + '">' + hdr(v) + '<div class="ac-v__plot">' + svgWrap(W, H, s, v.label || L("target", v.target) + ", " + L("entry", v.entry) + ", " + L("stop", v.stop)) + "</div>" + foot(v.foot) + "</div>";
  };

  /** calendar: an economic calendar (day · time · event · impact badge). */
  R.calendar = function (v) {
    return '<div class="ac-v__box ac-v__box--cal">' + hdr(v) + v.items.map(function (it) {
      var imp = it.impact || "low", t = it.tone || { low: "muted", medium: "gold", high: "down" }[imp];
      return '<div class="ac-v__cal' + (it.on ? " is-on" : "") + '">' + (it.day || it.time ? '<span class="ac-v__cald"><b>' + esc(it.day || "") + "</b><span>" + esc(it.time || "") + "</span></span>" : "") +
        '<span class="ac-v__calt"><b>' + esc(it.title) + "</b>" + (it.sub ? "<span>" + AC.rich(it.sub) + "</span>" : "") + "</span>" +
        '<span class="ac-v__badge2 ' + tone(t) + '">' + esc(it.badge || AC.t("cards.v.impact." + imp)) + "</span></div>";
    }).join("") + foot(v.foot) + "</div>";
  };

  /** headline: a news headline chip. */
  R.headline = function (v) {
    return '<div class="ac-v__box ac-v__headline"><span class="ac-v__htag">' + esc(v.tag || AC.t("cards.v.headline")) + '</span><b>“' + esc(v.text) + "”</b></div>";
  };

  /** list: numbered rules / steps. style numbers (one box), cards (a box each), chain (toned boxes joined by arrows). */
  R.list = function (v) {
    var st = v.style || "numbers";
    var items = v.items.map(function (it, i) {
      var t = it.tone || (st === "chain" ? ["down", "gold", "blue", "up"][i % 4] : "gold");
      return '<div class="ac-v__li ' + tone(t) + '"><span class="ac-v__lin" aria-hidden="true">' + esc(it.n != null ? it.n : String(i + 1)) + '</span><span class="ac-v__lit"><b>' + AC.rich(it.title) + "</b>" + (it.text ? "<span>" + AC.rich(it.text) + "</span>" : "") + "</span>" + (it.value ? '<b class="ac-v__liv ac-num' + (it.tone ? " ac-v__ink" : "") + '">' + esc(it.value) + "</b>" : "") + "</div>";
    });
    if (st === "chain") items = items.map(function (h, i) { return (i ? '<span class="ac-v__lia" aria-hidden="true">↓</span>' : "") + h; });
    return '<div class="ac-v__list ac-v__list--' + st + (st === "numbers" ? " ac-v__box" : "") + '"' + (st === "numbers" ? "" : ' role="list"') + ">" + hdr(v) + items.join("") + "</div>";
  };

  /** checklist: yes / no checks. In a walk-through each check is tapped to show its answer. */
  R.checklist = function (v, o) {
    var ex = o && o.explore;
    var rows = v.items.map(function (it) {
      var stt = it.state || "none", mark = stt === "yes" ? "✓" : stt === "no" ? "✕" : "";
      var inner = '<span class="ac-v__cbx" aria-hidden="true">' + mark + '</span><span class="ac-v__ctt">' + AC.rich(it.text) + "</span>" + (stt !== "none" ? '<span class="ac-visually-hidden">' + esc(AC.t(stt === "yes" ? "cards.v.yes" : "cards.v.no")) + "</span>" : "");
      return ex && stt !== "none" ? '<button type="button" class="ac-v__chk is-' + stt + '" data-chk aria-pressed="false">' + inner + "</button>" : '<div class="ac-v__chk is-' + stt + (ex ? "" : " is-seen") + '">' + inner + "</div>";
    }).join("");
    return '<div class="ac-v__box ac-v__box--chk"' + (ex ? ' data-interactive="chk"' : "") + ">" + hdr(v) + rows + foot(v.foot) + "</div>";
  };

  /** planbar: My Trading Plan, section n of 5 (done green, current gold). */
  R.planbar = function (v) {
    var secs = v.sections || [], cur = v.current || 0;
    return '<div class="ac-v__box ac-v__plan">' + hdr({ title: v.title || AC.t("cards.v.plan"), aside: v.aside || AC.t("cards.v.section", { n: cur + 1, total: secs.length }), asideTone: "gold" }) +
      '<div class="ac-v__planr" style="--n:' + secs.length + '">' + secs.map(function (x, i) { return '<span class="' + (i < cur ? "is-done" : i === cur ? "is-now" : "") + '"><i></i>' + esc(x) + "</span>"; }).join("") + "</div></div>";
  };

  /** stats: tiles with a label, a big value and a sub line (profit vs cash, heads/tails, sector cards). */
  R.stats = function (v) {
    var cols = v.cols || Math.min(v.items.length, 2);
    var tiles = v.items.map(function (it, i) {
      var t = it.tone || "white";
      return (v.arrow && i ? '<span class="ac-v__sarrow" aria-hidden="true">→</span>' : "") + '<div class="ac-v__stat ' + tone(t) + (it.tint ? " is-tint" : "") + '">' + (it.label ? '<span class="ac-v__stl">' + (it.dot ? '<i aria-hidden="true"></i>' : "") + esc(it.label) + "</span>" : "") +
        (it.value ? '<b class="ac-v__stv ac-num' + (it.tone ? " ac-v__ink" : "") + '">' + esc(it.value) + "</b>" : "") + (it.sub ? '<span class="ac-v__sts">' + AC.rich(it.sub) + "</span>" : "") + (it.text ? '<span class="ac-v__stt">' + AC.rich(it.text) + "</span>" : "") + "</div>";
    }).join("");
    return '<div class="ac-v__stats' + (v.arrow ? " ac-v__stats--arrow ac-v__box" : "") + '" style="--cols:' + cols + '">' + tiles + (v.foot ? '<div class="ac-v__stfoot">' + AC.rich(v.foot) + "</div>" : "") + "</div>";
  };

  /** formula: chips joined by operators (Shares = Account × Risk % ÷ Entry − Stop). */
  R.formula = function (v) {
    return '<div class="ac-v__box ac-v__formula"><div class="ac-v__fx">' + v.terms.map(function (t) {
      return t.op ? '<span class="ac-v__fop" aria-hidden="' + (t.say ? "false" : "true") + '">' + esc(t.op) + "</span>" : '<span class="ac-v__fchip ' + tone(t.tone || "white") + '">' + esc(t.text) + "</span>";
    }).join("") + "</div>" + (v.foot ? '<p class="ac-v__fxfoot">' + AC.rich(v.foot) + "</p>" : "") + "</div>";
  };

  /** candle: one or two big candles with Open / High / Low / Close callouts ("?" asks for one). */
  R.candle = function (v) {
    var items = v.items || [], share = items.length > 1 && v.shared !== false;
    var glo = Math.min.apply(null, items.map(function (it) { return it.ohlc[2]; })), ghi = Math.max.apply(null, items.map(function (it) { return it.ohlc[1]; }));
    var cells = items.map(function (it) {
      var o = it.ohlc, up = o[3] >= o[0], t = up ? "up" : "down", ax = !!v.axis;
      var lo = share ? glo : o[2], hi = share ? ghi : o[1], sp = (hi - lo) || 1; lo -= sp * 0.08; hi += sp * 0.08;
      var W = ax ? 200 : 160, H = 190, top = 12, bot = H - 12, cx = ax ? 112 : 46, bw = ax ? 30 : 34;
      function Y(q) { return bot - (q - lo) / (hi - lo) * (bot - top); }
      var s = "";
      // one candle: label only its own four prices (a dollar grid labels prices it never touched); several: a nice grid
      var tv = v.items.length === 1 ? o.filter(function (q, i, a) { return a.indexOf(q) === i; }) : niceTicks(lo, hi, 5).values;
      // one candle: its prices are what the question is about, so they read at body-text size, not as faint axis ticks
      if (ax) tv.forEach(function (q) { s += '<line x1="44" x2="' + (W - 6) + '" y1="' + r1(Y(q)) + '" y2="' + r1(Y(q)) + '" class="ac-v__grid"/>' + T(38, Y(q) + 5, money(q, v.fmt), { fs: v.items.length === 1 ? 16 : 10, w: v.items.length === 1 ? 800 : 700, anchor: "end", cls: v.items.length === 1 ? "ac-v__axis ac-v__axis--strong" : "ac-v__axis" }); });
      var y1 = Y(Math.max(o[0], o[3])), y2 = Y(Math.min(o[0], o[3]));
      s += '<g class="' + tone(t) + ' ac-v__cdl"><line x1="' + cx + '" x2="' + cx + '" y1="' + r1(Y(o[1])) + '" y2="' + r1(Y(o[2])) + '" class="ac-v__wick ac-v__wick--big"/><rect x="' + (cx - bw / 2) + '" y="' + r1(y1) + '" width="' + bw + '" height="' + r1(Math.max(2, y2 - y1)) + '" rx="3" class="ac-v__fill"/></g>';
      if (!ax && it.labels !== false) {
        var lab = it.labels || {}, keys = ["high", "open", "close", "low"], idx = { open: 0, high: 1, low: 2, close: 3 };
        var ls = keys.filter(function (k) { return lab[k] !== false; }).map(function (k) { var q = o[idx[k]]; return { k: k, y0: Y(q), y: Y(q) + 4, text: lab[k] != null ? lab[k] : AC.t("cards.v.ohlc." + k, { x: money(q, v.fmt) }) }; });
        declutter(ls, 15, 10, H - 4);
        ls.forEach(function (l) {
          var q = l.text === "?";
          s += '<line x1="' + (cx + bw / 2 + 6) + '" x2="' + (cx + bw / 2 + 14) + '" y1="' + r1(l.y - 4) + '" y2="' + r1(l.y - 4) + '" class="ac-v__tickline"/>' +
            T(cx + bw / 2 + 18, l.y, l.text, { fs: 12, w: 800, tone: q ? "gold" : null });
        });
      }
      return '<div class="ac-v__cdlc">' + svgWrap(W, H, s, it.label || AC.t("cards.v.ohlc.all", { o: money(o[0], v.fmt), h: money(o[1], v.fmt), l: money(o[2], v.fmt), c: money(o[3], v.fmt) })) + (it.caption ? '<b class="' + tone(it.tone || t) + ' ac-v__ink ac-v__cdcap">' + esc(it.caption) + "</b>" : "") + "</div>";
    }).join("");
    return '<div class="ac-v__box ac-v__box--candle">' + hdr(v) + '<div class="ac-v__cdls">' + cells + "</div>" + foot(v.foot) + "</div>";
  };
  /** a small candle glyph (svg) from one or more [o,h,l,c], scaled to its own range */
  function glyph(cs, w, h) {
    w = w || 30; h = h || 46;
    var lo = Math.min.apply(null, cs.map(function (c) { return c[2]; })), hi = Math.max.apply(null, cs.map(function (c) { return c[1]; })), sp = (hi - lo) || 1, n = cs.length, stp = w / n;
    function Y(q) { return h - 3 - (q - lo) / sp * (h - 6); }
    return '<svg class="ac-v__glyph" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">' + cs.map(function (c, i) {
      var x = stp * (i + 0.5), bw = Math.min(12, stp * 0.62), y1 = Y(Math.max(c[0], c[3])), y2 = Y(Math.min(c[0], c[3]));
      return '<g class="' + (c[3] >= c[0] ? "ac-tone--up" : "ac-tone--down") + '"><line x1="' + r1(x) + '" x2="' + r1(x) + '" y1="' + r1(Y(c[1])) + '" y2="' + r1(Y(c[2])) + '" class="ac-v__wick ac-v__wick--g"/><rect x="' + r1(x - bw / 2) + '" y="' + r1(y1) + '" width="' + r1(bw) + '" height="' + r1(Math.max(2, y2 - y1)) + '" rx="1" class="ac-v__fill"/></g>';
    }).join("") + "</svg>";
  }
  /** shapes: candle patterns side by side (hammer · doji · engulfing). */
  /** lineshapes: price shapes drawn as one simple line per tile, its name in the line's colour below (design boards
      P1-Ch04-L1 "Three kinds of market", P1-Ch04-L4 "Two failed attempts"). items: [{label, sub, tone, path: [[x, y]…]}].
      Each line fills its own tile (the shape is the point, not the scale). */
  R.lineshapes = function (v) {
    var n = v.items.length, W = n > 2 ? 90 : 110, H = n > 2 ? 54 : 60;
    return '<div class="ac-v__lshapes" style="--n:' + n + '">' + v.items.map(function (it) {
      var xs = it.path.map(function (p) { return p[0]; }), ys = it.path.map(function (p) { return p[1]; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      var pts = it.path.map(function (p) { return r1(10 + (p[0] - x0) / ((x1 - x0) || 1) * (W - 20)) + "," + r1(H - 10 - (p[1] - y0) / ((y1 - y0) || 1) * (H - 20)); }).join(" ");
      return '<div class="ac-v__lshape ' + tone(it.tone || "up") + '"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(it.label + (it.sub ? ": " + it.sub : "")) + '">' +
        '<polyline points="' + pts + '" class="ac-v__lsline ac-v__draw" pathLength="1"/></svg><b class="ac-v__ink">' + esc(it.label) + "</b>" + (it.sub ? "<span>" + esc(it.sub) + "</span>" : "") + "</div>";
    }).join("") + "</div>";
  };
  R.shapes = function (v) {
    return '<div class="ac-v__shapes" style="--n:' + v.items.length + '">' + v.items.map(function (it) {
      return '<div class="ac-v__shape ' + tone(it.tone || "white") + '">' + glyph(it.candles, it.candles.length > 1 ? 44 : 30, 64) + '<b class="ac-v__ink">' + esc(it.name) + "</b>" + (it.text ? "<span>" + esc(it.text) + "</span>" : "") + "</div>";
    }).join("") + "</div>";
  };
  /** tabs: a timeframe switcher (1m · 1H · 1D · 1W), one tab on. */
  R.tabs = function (v) {
    return '<div class="ac-v__tabs ac-v__tabs--tf" aria-hidden="true">' + v.items.map(function (t, i) { return '<span class="' + (i === v.on ? "is-on" : "") + '">' + esc(t) + "</span>"; }).join("") + "</div>";
  };

  /** drawline: candles with a line the learner drags into place (a trendline / channel line, or a level such as a stop).
      mode trend: two handles at fixed candles (from/to index), dragged up and down. mode level: one horizontal line. */
  R.drawline = function (v) {
    var c = v.chart, geo = null, mode = v.mode || "trend";
    var svg = candles(c, { geo: function (g) { geo = g; } });
    var st = v.start || {}, tg = v.target || {};
    var i1, i2, p1, p2, t1, t2;
    if (mode === "level") { i1 = 0; i2 = geo.n - 1; p1 = p2 = st.price; t1 = t2 = tg.price; }
    else { i1 = st.from[0]; i2 = st.to[0]; p1 = st.from[1]; p2 = st.to[1]; var ts = (tg.to[1] - tg.from[1]) / ((tg.to[0] - tg.from[0]) || 1); t1 = tg.from[1] + ts * (i1 - tg.from[0]); t2 = tg.from[1] + ts * (i2 - tg.from[0]); }
    var tol = v.tolerance != null ? v.tolerance : (geo.hi - geo.lo) * 0.04;
    var cfg = { mode: mode, lo: geo.lo, hi: geo.hi, top: geo.top, bot: geo.bot, x1: r1(geo.X(i1)), x2: r1(geo.X(i2)), xe: r1(geo.R - 4), xs: 8, p: [p1, p2], t: [t1, t2], tol: tol, min: tg.min, max: tg.max, step: v.step || Math.max(0.01, Math.round((geo.hi - geo.lo) / 60 * 100) / 100), fmt: c.fmt || 0, quiet: !!v.quiet,
      // candle boxes [x, high y, low y, half width]: the line's label is placed where it doesn't cover them
      cs: v.label ? geo.data.map(function (d, i) { return [r1(geo.X(i)), r1(geo.Y(d[1])), r1(geo.Y(d[2])), r1(Math.max(2, geo.step * 0.35))]; }) : null, h: geo.h };
    var tn = v.tone || "gold";
    var g = '<g class="ac-v__dl ' + tone(tn) + '" data-dl-g><line class="ac-v__dlline" data-dl-line/>' +
      (mode === "level" ? '<circle class="ac-v__dlh" r="11" tabindex="0" role="slider" data-h="0" aria-label="' + esc(v.handleLabel || AC.t("cards.line.level")) + '"/>' :
        '<circle class="ac-v__dlh" r="11" tabindex="0" role="slider" data-h="0" aria-label="' + esc(AC.t("cards.line.start")) + '"/><circle class="ac-v__dlh" r="11" tabindex="0" role="slider" data-h="1" aria-label="' + esc(AC.t("cards.line.end")) + '"/>') +
      (v.label ? '<text class="ac-v__t ac-v__dllab" font-size="10.5" font-weight="800" text-anchor="end" data-dl-lab>' + esc(v.label) + "</text>" : "") + "</g>";
    svg = svg.replace(/<\/svg>$/, g + "</svg>");
    return '<div class="ac-v__box ac-v__box--chart ac-v__box--dl" data-interactive="drawline" data-dl="' + esc(JSON.stringify(cfg)) + '">' + hdr(v) + '<div class="ac-v__plot">' + svg + "</div>" +
      '<p class="ac-v__dlhint">' + esc(v.hint || AC.t(mode === "level" ? "cards.line.hintLevel" : "cards.line.hint")) + "</p>" + (v.done ? '<div class="ac-v__foot ac-v__dldone" data-dl-done hidden>' + AC.rich(v.done) + "</div>" : "") + foot(v.foot) + "</div>";
  };

  /** walk-through helpers: which visuals are revealed by ▶ Play, which have their own taps */
  var PLAY = ["flow", "counter", "series", "hbars", "split", "trades", "rr", "donut", "gauge", "barchart", "cycle", "candle"];
  function playable(spec) { if (!spec) return false; if (spec.kind === "barchart") return !(spec.groups || []).some(function (g) { return g.note; }); return PLAY.indexOf(spec.kind) >= 0; }
  function tappable(x) { return !!x && (AC.visual.interactive(x, false) || x.kind === "checklist"); }

  /** drawline behaviour: drag (pointer) or arrow keys on a handle; reports fit to the target */
  function wireDrawline(w, onChange) {
    var cfg = {}; try { cfg = JSON.parse(w.dataset.dl); } catch (e) {}
    var svg = AC.$("svg", w), line = AC.$("[data-dl-line]", w), hs = AC.$$(".ac-v__dlh", w), lab = AC.$("[data-dl-lab]", w), done = AC.$("[data-dl-done]", w);
    var p = cfg.p.slice(), moved = false, locked = false;
    function Y(q) { return cfg.bot - (q - cfg.lo) / (cfg.hi - cfg.lo) * (cfg.bot - cfg.top); }
    function P(y) { return cfg.lo + (cfg.bot - y) / (cfg.bot - cfg.top) * (cfg.hi - cfg.lo); }
    function clamp(q) { var a = Math.min(cfg.lo, cfg.hi), b = Math.max(cfg.lo, cfg.hi); q = Math.max(a, Math.min(b, q)); return Math.round(q / cfg.step) * cfg.step; }
    function fit() {
      if (cfg.mode === "level") { var q = p[0]; return cfg.min != null || cfg.max != null ? (cfg.min == null || q >= cfg.min - 1e-9) && (cfg.max == null || q <= cfg.max + 1e-9) : Math.abs(q - cfg.t[0]) <= cfg.tol + 1e-9; }
      return Math.abs(p[0] - cfg.t[0]) <= cfg.tol + 1e-9 && Math.abs(p[1] - cfg.t[1]) <= cfg.tol + 1e-9;
    }
    function draw() {
      var xa, ya, xb, yb;
      if (cfg.mode === "level") { xa = cfg.xs; xb = cfg.xe; ya = yb = Y(p[0]); hs[0].setAttribute("cx", cfg.xe - 14); hs[0].setAttribute("cy", r1(ya)); }
      else {
        var sl = (Y(p[1]) - Y(p[0])) / ((cfg.x2 - cfg.x1) || 1);
        xa = cfg.x1; ya = Y(p[0]); xb = cfg.xe; yb = Y(p[0]) + sl * (cfg.xe - cfg.x1);
        hs[0].setAttribute("cx", cfg.x1); hs[0].setAttribute("cy", r1(Y(p[0]))); hs[1].setAttribute("cx", cfg.x2); hs[1].setAttribute("cy", r1(Y(p[1])));
      }
      line.setAttribute("x1", r1(xa)); line.setAttribute("y1", r1(ya)); line.setAttribute("x2", r1(xb)); line.setAttribute("y2", r1(yb));
      if (lab) placeLabel(xa, ya, xb, yb);
      hs.forEach(function (h, i) { var q = p[cfg.mode === "level" ? 0 : i]; h.setAttribute("aria-valuenow", String(q)); h.setAttribute("aria-valuetext", AC.fmt.money(q, "USD", cfg.fmt || (Math.abs(q % 1) > 1e-9 ? 2 : 0))); h.setAttribute("aria-valuemin", String(Math.min(cfg.lo, cfg.hi))); h.setAttribute("aria-valuemax", String(Math.max(cfg.lo, cfg.hi))); });
      var ok = fit();
      if (!cfg.quiet) { w.classList.toggle("is-fit", ok); if (done) done.hidden = !ok; }
    }
    /** The label sits along the line, near its right end, above or below it: the first spot that covers no candle
        (then a spot near the left end), else the spot that covers the least. */
    function placeLabel(xa, ya, xb, yb) {
      var tw = 0; try { tw = lab.getComputedTextLength(); } catch (e) {}
      if (!tw) tw = String(lab.textContent || "").length * 6.2;
      var sl = (yb - ya) / ((xb - xa) || 1);
      function yAt(x) { return ya + sl * (x - xa); }
      var right = xb - (cfg.mode === "level" ? 32 : 2), left = Math.max(xa + 18, cfg.xs + 2) + tw;
      var spots = [[right, -8], [right, 16], [left, -8], [left, 16]];
      function cost(sp) {
        var x1 = sp[0] - tw - 2, x2 = sp[0] + 2, mid = (x1 + x2) / 2, y2 = yAt(mid) + sp[1] + 2, y1 = y2 - 12, c = 0;
        if (y1 < 2 || y2 > (cfg.h || 999) - 2) c += 1000;
        (cfg.cs || []).forEach(function (k) { if (k[0] + k[3] > x1 && k[0] - k[3] < x2) c += Math.max(0, Math.min(y2, k[2]) - Math.max(y1, k[1])); });
        return c;
      }
      var best = spots[0], bc = Infinity;
      spots.some(function (sp) { var c = cost(sp); if (c < bc) { bc = c; best = sp; } return c === 0; });
      lab.setAttribute("x", r1(best[0])); lab.setAttribute("y", r1(yAt(best[0] - tw / 2) + best[1]));
    }
    function set(i, q) { if (locked) return; p[i] = clamp(q); if (cfg.mode === "level") p[1] = p[0]; moved = true; draw(); if (onChange) onChange(); }
    hs.forEach(function (h) {
      var i = +h.dataset.h;
      h.addEventListener("pointerdown", function (e) {
        if (locked) return;
        e.preventDefault(); h.setPointerCapture && h.setPointerCapture(e.pointerId); w.classList.add("is-dragging");
        function mv(ev) { var m = svg.getScreenCTM(); if (!m) return; var y = (ev.clientY - m.f) / m.d; set(i, P(y)); }
        function up() { h.removeEventListener("pointermove", mv); h.removeEventListener("pointerup", up); h.removeEventListener("pointercancel", up); w.classList.remove("is-dragging"); }
        h.addEventListener("pointermove", mv); h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
      });
      h.addEventListener("keydown", function (e) {
        var d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 }[e.key];
        if (!d) return; e.preventDefault(); set(i, p[i] + d * cfg.step * (cfg.hi > cfg.lo ? 1 : -1));
      });
    });
    draw();
    return {
      fit: fit, moved: function () { return moved; }, value: function () { return p.slice(); },
      lock: function () { locked = true; w.classList.add("is-locked"); hs.forEach(function (h) { h.setAttribute("tabindex", "-1"); }); },
      solve: function (wrong) { if (cfg.mode === "level") set(0, cfg.min != null && cfg.max != null ? (wrong ? cfg.max + (cfg.max - (cfg.min)) + cfg.step * 4 : (cfg.min + cfg.max) / 2) : cfg.t[0] + (wrong ? cfg.tol * 3 + cfg.step : 0)); else { set(0, cfg.t[0] + (wrong ? cfg.tol * 3 + cfg.step : 0)); set(1, cfg.t[1]); } },
      reveal: function (ok) { w.classList.add(ok ? "is-fit" : "is-miss"); if (done && ok) done.hidden = false; },
      restore: function (vals) { p = vals.slice(); moved = true; draw(); },
    };
  }

  // ------------------------------------------------------------------ slider (interactive models)
  // Content contracts (lead): tug {min, mid, max, ticks, left, right, leftText, rightText, ends} · value = price, left end = max
  //   longshort {min, max, step, ticks, entry, shares, entryLabel, long, short, foot} · value = price
  //   leverage {margin, leverage, min, max, step, marks[{at,label}], pnlLabel, equityLabel, wipeout, foot} · value = move %
  //   size {account, gapPct, stops[{value,label,loss,note,tone}], foot} · value = one of the stop values
  function sliderRange(model, p, value) {
    if (model === "size") {
      var stops = p.stops || [], idx = 0;
      stops.forEach(function (s, i) { if (s.value === value) idx = i; });
      return { min: 0, max: Math.max(1, stops.length - 1), step: 1, start: idx };
    }
    if (model === "tug") {
      var lo = p.min != null ? p.min : 48, hi = p.max != null ? p.max : 52;
      var v = value != null ? value : (p.mid != null ? p.mid : (lo + hi) / 2);
      return { min: lo, max: hi, step: p.step || (hi - lo) / 4, start: lo + hi - v };   // input runs left→right = high→low price
    }
    var mn = p.min != null ? p.min : (model === "leverage" ? -10 : 0), mx = p.max != null ? p.max : (model === "leverage" ? 10 : 100);
    return { min: mn, max: mx, step: p.step || 1, start: value != null ? value : (model === "longshort" ? (p.entry != null ? p.entry : (mn + mx) / 2) : 0) };
  }
  function tugTrend(v) {
    var out = [], c = 100, slope = v * 1.6;   // v: +1 = more buyers = rising
    for (var i = 0; i < 10; i++) { var o = c, cl = c + slope + (i % 3 === 1 ? -0.35 : 0.25); out.push([o, Math.max(o, cl) + 0.4, Math.min(o, cl) - 0.4, cl]); c = cl; }
    return out;
  }
  function tile2(lab, val, t, extra) {
    return '<div class="ac-v__tile ' + tone(t) + '"><span class="ac-v__sub">' + esc(lab) + '</span><b class="ac-v__big ac-v__ink ac-num">' + esc(val) + "</b>" + (extra || "") + "</div>";
  }
  function sliderOut(model, p, x, label) {
    var h = "";
    if (model === "tug") {
      var lo = p.min != null ? p.min : 48, hi = p.max != null ? p.max : 52, mid = p.mid != null ? p.mid : (lo + hi) / 2;
      var price = lo + hi - x, rel = price > mid ? (price - mid) / (hi - mid) : -(mid - price) / (mid - lo || 1);
      var dir = price > mid + 1e-9 ? "up" : price < mid - 1e-9 ? "down" : "flat";
      h += '<div class="ac-v__sl-top"><span class="ac-v__sl-lab">' + esc(label || AC.t("cards.v.price")) + '</span><b class="ac-v__chip ' + tone(dir === "flat" ? "muted" : dir) + '">' + esc(money(price)) + (dir === "up" ? " ▲" : dir === "down" ? " ▼" : "") + "</b>" +
        '<span class="ac-v__sl-mini">' + candles({ ohlc: tugTrend(rel), axis: false, ticks: 0, height: 140 }, { w: 150 }) + "</span></div>";
      h += '<p class="ac-v__sl-cap">' + esc(dir === "up" ? (p.leftText || AC.t("cards.v.tug.up")) : dir === "down" ? (p.rightText || AC.t("cards.v.tug.down")) : AC.t("cards.v.tug.flat")) + "</p>";
      return h;
    }
    if (model === "longshort") {
      var entry = p.entry != null ? p.entry : 100, sh = p.shares || 1, longP = (x - entry) * sh;
      h += '<div class="ac-v__sl-top"><span class="ac-v__sl-lab">' + esc(AC.t("cards.v.price")) + '</span><b class="ac-v__chip ac-tone--white">' + esc(money(x)) + "</b></div>";
      h += '<div class="ac-v__pair">' + tile2(p.long || AC.t("cards.v.long"), signed(longP, 0), longP > 0 ? "up" : longP < 0 ? "down" : "muted") + tile2(p.short || AC.t("cards.v.short"), signed(-longP, 0), -longP > 0 ? "up" : -longP < 0 ? "down" : "muted") + "</div>";
      return h;
    }
    if (model === "leverage") {
      var margin = p.margin || 1000, lev = p.leverage || 10, pnl = margin * lev * x / 100, eq = Math.max(0, margin + pnl);
      h += (label ? '<span class="ac-v__title">' + esc(label) + "</span>" : "") +
        '<div class="ac-v__sl-top"><span class="ac-v__sl-lab">' + esc(AC.t("cards.v.move")) + '</span><b class="ac-v__chip ' + tone(x > 0 ? "up" : x < 0 ? "down" : "muted") + '">' + esc(pctS(x)) + "</b></div>";
      h += '<div class="ac-v__pair">' + tile2(p.pnlLabel || AC.t("cards.v.pnl"), signed(pnl, 0), pnl > 0 ? "up" : pnl < 0 ? "down" : "muted") +
        tile2(p.equityLabel || AC.t("cards.v.equity"), money(eq, 0), eq <= 0 ? "down" : eq > margin ? "up" : "white", eq <= 0 ? '<span class="ac-v__alert">' + esc(p.wipeout || AC.t("cards.v.wiped")) + "</span>" : "") + "</div>";
      return h;
    }
    if (model === "size") {
      var st = (p.stops || [])[Math.round(x)] || {};
      h += (label ? '<span class="ac-v__title">' + esc(label) + "</span>" : "") +
        '<div class="ac-v__pair">' + tile2(AC.t("cards.v.size"), st.label || "", "white") + tile2(AC.t("cards.v.gapLoss"), st.loss || "", st.tone || "down", st.note ? '<span class="ac-v__sub ac-v__ink">' + esc(st.note) + "</span>" : "") + "</div>";
      return h;
    }
    return "";
  }
  R.slider = function (v) {
    var p = v.params || {}, m = v.model, rg = sliderRange(m, p, v.value);
    var ends = m === "tug" ? [p.left || AC.t("cards.v.tug.buyers"), p.right || AC.t("cards.v.tug.sellers")] : null;
    var ticks = "", marks = "";
    function at(val) { return r1((val - rg.min) / (rg.max - rg.min) * 100); }
    if (m === "tug") {
      var tk = p.ticks || [rg.max, (rg.min + rg.max) / 2, rg.min];
      ticks = tk.map(function (t, i) { return '<span class="' + (i === 0 ? "ac-tone--up ac-v__ink" : i === tk.length - 1 ? "ac-tone--down ac-v__ink" : "") + '">' + esc(money(t)) + "</span>"; }).join("");
    } else if (m === "longshort") {
      ticks = (p.ticks || [rg.min, rg.max]).map(function (t) { return "<span>" + esc(money(t)) + "</span>"; }).join("");
      if (p.entryLabel && p.entry != null) marks = '<span class="ac-v__sl-mark" style="left:' + at(p.entry) + '%">' + esc(p.entryLabel) + "</span>";
    } else if (m === "leverage") {
      marks = (p.marks || []).map(function (k) { return '<span class="ac-v__sl-mark" style="left:' + at(k.at) + '%">' + esc(k.label) + "</span>"; }).join("");
    } else if (m === "size") {
      ticks = (p.stops || []).map(function (s) { return '<span class="' + tone(s.tone || "muted") + ' ac-v__ink">' + esc(s.label) + "</span>"; }).join("");
    }
    var aria = (v.label && v.label.length > 6 ? v.label : "") || AC.t("cards.v.slider." + m);
    var showLabel = m === "tug" || m === "leverage" || m === "size" ? (m === "tug" ? v.label : v.label) : "";
    return '<div class="ac-v__box ac-v__slider ac-v__slider--' + esc(m) + '" data-interactive="slider" data-model="' + esc(m) + '" data-params="' + esc(JSON.stringify(p)) + '" data-label="' + esc(showLabel || "") + '" data-min="' + rg.min + '" data-max="' + rg.max + '">' +
      '<div class="ac-v__sl-out" aria-live="polite">' + sliderOut(m, p, rg.start, showLabel) + "</div>" +
      (ends ? '<div class="ac-v__sl-ends"><span class="ac-tone--up ac-v__ink">◀ ' + esc(ends[0]) + '</span><span class="ac-tone--down ac-v__ink">' + esc(ends[1]) + " ▶</span></div>" : "") +
      '<input type="range" class="ac-v__range" min="' + rg.min + '" max="' + rg.max + '" step="' + rg.step + '" value="' + rg.start + '" aria-label="' + esc(aria) + '">' +
      (marks ? '<div class="ac-v__sl-marks">' + marks + "</div>" : "") + (ticks ? '<div class="ac-v__sl-ticks">' + ticks + "</div>" : "") + foot(p.foot) + "</div>";
  };

  // ------------------------------------------------------------------ public API
  function render(spec, opts) {
    opts = opts || {};
    if (!spec || !spec.kind) return "";
    var fn = R[spec.kind];
    if (!fn) { if (window.console) console.warn("[academy] unknown visual kind", spec.kind); return ""; }
    return fn(spec, opts);
  }
  /** Explore mode applies to walk-throughs whose visual is not interactive on its own. */
  function explorable(spec) { return !!spec && (["candles", "book", "stack", "checklist"].indexOf(spec.kind) >= 0 || playable(spec)); }
  var questionChart = false;
  AC.visual = function (spec, opts) {
    opts = opts || {};
    questionChart = !!opts.question;   // read by candles() while this visual renders
    if (opts.explore && !explorable(spec)) opts = Object.assign({}, opts, { explore: false });
    if (opts.explore && playable(spec)) {
      var inner0 = render(spec, {});
      return '<div class="ac-v ac-v--' + esc(spec.kind) + '"><div class="ac-v__playwrap is-idle" data-explore="play">' + inner0 + '<div class="ac-v__reveals">' + playBtn() + "</div></div></div>";
    }
    var inner = render(spec, opts);
    questionChart = false;
    return inner ? '<div class="ac-v ac-v--' + esc(spec.kind) + '">' + inner + "</div>" : "";
  };
  AC.visual.el = function (spec, opts) { var h = AC.visual(spec, opts); return h ? AC.h(h) : null; };
  AC.visual.candles = candles;
  AC.visual.explorable = explorable;
  AC.visual.trendIcon = trendIcon;
  AC.visual.wireDrawline = wireDrawline;
  AC.visual.glyph = glyph;
  AC.visual.genPath = genPath;
  AC.visual.playable = playable;

  /** Does the visual have something to tap or drag? (walk-throughs wait for it) */
  AC.visual.interactive = function (spec, explore) {
    if (!spec) return false;
    if (spec.kind === "tiles" || spec.kind === "slider") return true;
    if (spec.kind === "bars") return (spec.bars || []).some(function (b) { return b.sub; });
    if (spec.kind === "drawline" || spec.kind === "zoom") return true;
    if (spec.kind === "table") return (spec.rows || []).some(function (r) { return r.note; });
    if (spec.kind === "barchart" && (spec.groups || []).some(function (g) { return g.note; })) return true;
    if (spec.kind === "checklist") return !!explore;
    if (explore && explorable(spec)) return true;
    if (spec.kind === "stack") return (spec.items || []).some(function (x) { return AC.visual.interactive(x); });
    return false;
  };

  /** Wire tiles, bars, sliders and explore taps inside root. opts.onProgress(done, total) fires on every change.
      Returns {done(), total(), value(), hasSlider(), openAll()}. */
  AC.visual.mount = function (root, opts) {
    opts = opts || {};
    var parts = [];
    var reduce = AC.reducedMotion();
    function toggles(btns, attr) {
      var seen = {};
      btns.forEach(function (b, i) {
        b.addEventListener("click", function () {
          var on = b.getAttribute(attr) !== "true";
          b.setAttribute(attr, String(on));
          b.classList.toggle("is-open", on);
          b.classList.add("is-seen");
          seen[i] = true;
          emit();
        });
      });
      return {
        total: btns.length, done: function () { return Object.keys(seen).length; },
        openAll: function () { btns.forEach(function (b, i) { b.setAttribute(attr, "true"); b.classList.add("is-open", "is-seen"); seen[i] = true; }); },
      };
    }
    AC.$$('[data-interactive="tiles"]', root).forEach(function (w) { parts.push(toggles(AC.$$(".ac-v__tbtn", w), "aria-expanded")); });
    AC.$$('[data-interactive="bars"]', root).forEach(function (w) { parts.push(toggles(AC.$$("[data-bar]", w), "aria-expanded")); });
    AC.$$('[data-interactive="trows"]', root).forEach(function (w) { parts.push(toggles(AC.$$("[data-trow]", w), "aria-expanded")); });
    AC.$$('[data-interactive="bcg"]', root).forEach(function (w) { parts.push(toggles(AC.$$("[data-bcg]", w), "aria-expanded")); });
    AC.$$('[data-interactive="chk"]', root).forEach(function (w) { parts.push(toggles(AC.$$("[data-chk]", w), "aria-pressed")); });
    AC.$$('[data-interactive="drawline"]', root).forEach(function (w) {
      if (opts.skipDrawline) return;
      var d = wireDrawline(w, function () { emit(); });
      parts.push({ total: 1, done: function () { return d.fit() ? 1 : 0; }, openAll: function () { d.solve(false); }, drawline: d });
    });
    AC.$$("[data-explore]", root).forEach(function (w) {
      var btns = AC.$$("[data-reveal]", w), seen = {};
      function finish() {
        var f = AC.$$("[data-vfoot]", w); f.forEach(function (x) { x.hidden = false; });
        var end = AC.$('[data-layer="end"]', w); if (end) end.classList.add("is-shown");
      }
      function reveal(b, i, instant) {
        if (seen[i]) return;
        seen[i] = true;
        b.classList.add("is-seen"); b.setAttribute("aria-pressed", "true");
        var layer = b.dataset.reveal;
        if (layer === "all") {
          b.textContent = AC.t("cards.v.played");
          w.classList.remove("is-idle"); w.classList.add("is-played");
          var later = AC.$$(".ac-v__later, .ac-v__seq", w).length;
          setTimeout(finish, instant || reduce ? 0 : Math.min(2500, later * 70 + 300));
        } else {
          AC.$$('[data-layer="' + layer + '"]', w).forEach(function (l) { l.classList.add("is-shown"); });
          if (Object.keys(seen).length === btns.length) finish();
        }
        emit();
      }
      btns.forEach(function (b, i) { b.addEventListener("click", function () { reveal(b, i); }); });
      parts.push({ total: btns.length, done: function () { return Object.keys(seen).length; }, openAll: function () { btns.forEach(function (b, i) { reveal(b, i, true); }); } });
    });
    AC.$$('[data-interactive="zoom"]', root).forEach(function (w) {
      var tabs = AC.$$("[data-ztab]", w), panes = AC.$$("[data-zpane]", w), seen = {};
      tabs.forEach(function (t, i) { if (t.classList.contains("is-seen")) seen[i] = true; });
      tabs.forEach(function (t, i) {
        t.addEventListener("click", function () {
          tabs.forEach(function (x, k) { x.classList.toggle("is-on", k === i); x.setAttribute("aria-selected", String(k === i)); });
          panes.forEach(function (p, k) { p.hidden = k !== i; });
          t.classList.add("is-seen"); seen[i] = true; emit();
        });
      });
      parts.push({ total: tabs.length, done: function () { return Object.keys(seen).length; },
        openAll: function () { tabs.forEach(function (t, i) { t.classList.add("is-seen"); seen[i] = true; }); } });
    });
    AC.$$('[data-interactive="slider"]', root).forEach(function (w) {
      var input = AC.$(".ac-v__range", w), out = AC.$(".ac-v__sl-out", w);
      var model = w.dataset.model, p = {}, lab = w.dataset.label || "";
      try { p = JSON.parse(w.dataset.params || "{}"); } catch (e) {}
      var min = +w.dataset.min, max = +w.dataset.max, tol = (max - min) * 0.1, ends = {};
      function track() {
        var v = +input.value;
        if (v <= min + tol) ends.lo = true;
        if (v >= max - tol) ends.hi = true;
        input.style.setProperty("--fill", ((v - min) / (max - min) * 100) + "%");
        input.setAttribute("aria-valuetext", out.textContent.replace(/\s+/g, " ").trim().slice(0, 140));
      }
      input.addEventListener("input", function () { out.innerHTML = sliderOut(model, p, +input.value, lab); track(); emit(); });
      track();
      // params.goal "lo": the one end that matters (the leverage wipe-out): drag all the way left to go on
      if (p.goal === "lo") {
        var hit = false;
        input.addEventListener("input", function () { if (+input.value <= min) { hit = true; emit(); } });
        parts.push({ total: 1, slider: true, goal: p.goalLabel || "", done: function () { return hit ? 1 : 0; }, value: function () { return +input.value; }, openAll: function () { hit = true; } });
        return;
      }
      parts.push({ total: 2, slider: true, done: function () { return (ends.lo ? 1 : 0) + (ends.hi ? 1 : 0); }, value: function () { return +input.value; },
        openAll: function () { ends.lo = ends.hi = true; } });
    });
    function emit() { if (opts.onProgress) opts.onProgress(api.done(), api.total()); }
    var api = {
      parts: parts,
      total: function () { return parts.reduce(function (a, p) { return a + p.total; }, 0); },
      done: function () { return parts.reduce(function (a, p) { return a + p.done(); }, 0); },
      hasSlider: function () { return parts.some(function (p) { return p.slider; }); },
      value: function () { var s = parts.filter(function (p) { return p.slider; })[0]; return s ? s.value() : null; },
      openAll: function () { parts.forEach(function (p) { p.openAll(); }); emit(); },
    };
    return api;
  };
})();
