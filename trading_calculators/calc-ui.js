// Profit.com trading calculators — shared UI engine (no maths here; that lives in lib/).
//
// A calculator page declares its controls in HTML:
//   <input data-k="entry" inputmode="decimal">            a value
//   <div class="seg tabs" data-k="side" role="radiogroup"> buttons with data-v
//   <div data-show="side=short"> … </div>                   shown only for that state
//   <div class="fld" data-f="entry"> … <p class="fld__err">  where errors for "entry" go
// and hands CalcUI.create() its defaults and a render(state) function. CalcUI keeps the
// state in the URL (so every result is a shareable link), restores it on load, re-renders
// on every keystroke, and handles Reset, Share result and the currency selector.
(() => {
  "use strict";

  // ------------------------------------------------------------ numbers & currency
  const CURRENCIES = {
    USD: { label: "USD $", sym: "$" }, EUR: { label: "EUR €", sym: "€" }, GBP: { label: "GBP £", sym: "£" },
    JPY: { label: "JPY ¥", sym: "¥", dp: 0 }, CAD: { label: "CAD $", sym: "CA$" }, AUD: { label: "AUD $", sym: "A$" },
    CHF: { label: "CHF", sym: "CHF " }, INR: { label: "INR ₹", sym: "₹" }, USDT: { label: "USDT", sym: "", suffix: " USDT" },
  };
  let cur = CURRENCIES.USD;

  // "" → null (empty), "1,234.50" → 1234.5, anything unreadable → NaN (the lib reports it)
  const num = (s) => {
    if (s === null || s === undefined) return null;
    const t = String(s).trim().replace(/[\s,_]/g, "").replace(/^\$/, "");
    if (t === "") return null;
    return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? Number(t) : NaN;
  };

  const group = (v, dp) => v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  // money: 2 decimals (0 for JPY), currency symbol, a real minus sign
  const money = (v, { sign = false } = {}) => {
    if (v === null || v === undefined || !Number.isFinite(v)) return "—";
    const dp = cur.dp === undefined ? 2 : cur.dp;
    // a trillion or more reads as "$1.2 trillion" so it fits the result tiles
    const a = Math.abs(v);
    const abs = a >= 1e12 ? `${Number((a / 1e12).toPrecision(3)).toLocaleString("en-US")} trillion` : group(a, a >= 1e9 ? 0 : dp);
    const s = v < 0 ? "−" : sign && v > 0 ? "+" : "";
    return `${s}${cur.sym}${abs}${cur.suffix || ""}`;
  };
  // price: enough decimals for crypto (0.00001234) without padding big prices
  const price = (v) => {
    if (v === null || v === undefined || !Number.isFinite(v)) return "—";
    const a = Math.abs(v);
    const dp = a === 0 ? 2 : a >= 1 ? 2 : Math.min(10, Math.max(2, 2 - Math.floor(Math.log10(a)) + 2));
    const body = a < 1 && a > 0 ? group(a, dp).replace(/(\.\d*?[1-9])0+$/, "$1") : group(a, dp);   // trim padding on tiny prices only
    return `${v < 0 ? "−" : ""}${cur.sym}${body}${cur.suffix || ""}`;
  };
  const pct = (v, { sign = false, dp = 2 } = {}) => {
    if (v === null || v === undefined || !Number.isFinite(v)) return "—";
    const s = v < 0 ? "−" : sign && v > 0 ? "+" : "";
    return `${s}${group(Math.abs(v * 100), dp)}%`;
  };
  const qty = (v, maxDp = 8) => {
    if (v === null || v === undefined || !Number.isFinite(v)) return "—";
    return v.toLocaleString("en-US", { maximumFractionDigits: maxDp });
  };
  const tone = (v) => (v > 0 ? "is-up" : v < 0 ? "is-down" : "");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ------------------------------------------------------------ chart
  // A responsive SVG line chart of P/L-style data, green above zero and red below, with
  // optional vertical markers and a hover/touch read-out. Returns { html, bind(el) }.
  let chartSeq = 0;
  const chartWidth = () => {
    const out = document.querySelector(".calc-out");
    if (!out || !out.clientWidth) return 640;
    const cs = getComputedStyle(out);
    return Math.max(260, Math.min(960, Math.round(out.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))));
  };
  // dots: points on the curve, e.g. break-even ({ x, y, label }), drawn as a ring with a label
  // extra: more series ({ points, color }) drawn as dashed lines, e.g. options' value today
  const lineChart = ({ points, markers = [], dots = [], extra = [], xFmt = price, yFmt = money, height = 250, zero = 0, refLine = null, label = "Chart" }) => {
    if (!points || points.length < 2) return { html: "", bind() {} };
    // drawn at the results column's real width, so 1 unit = 1px and labels never shrink or
    // collide on a phone; a narrow chart gets taller than its share of `height` would give it
    const W = chartWidth(), H = W >= 560 ? height : Math.round(Math.max(Math.min(height, W * 0.8), 220)), L = W < 420 ? 52 : 64, R = 14, T = 14, B = 30;
    const xs = points.map((p) => p.x), ys = points.map((p) => p.y).filter(Number.isFinite);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const ey = extra.flatMap((e) => e.points.map((p) => p.y)).filter(Number.isFinite);
    let y0 = Math.min(zero, ...ys, ...ey), y1 = Math.max(zero, ...ys, ...ey);
    if (refLine !== null) { y0 = Math.min(y0, refLine); y1 = Math.max(y1, refLine); }
    if (y1 - y0 < 1e-9) { y1 += 1; y0 -= 1; }
    const yt = nice(y0, y1);            // round tick values; the axis spans whole ticks
    y0 = yt[0]; y1 = yt[yt.length - 1];
    const X = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
    const Y = (y) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
    // a dot's label: right of it, else left of it, else pushed inside the chart's edges
    const labelX = (x, w) => (x + 8 + w <= W - 2 ? x + 8 : x - 8 - w >= 2 ? x - 8 - w : Math.max(2, W - 2 - w));
    const id = `cc${++chartSeq}`;
    const d = points.filter((p) => Number.isFinite(p.y)).map((p, n) => `${n ? "L" : "M"}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join("");
    const area = `${d}L${X(x1).toFixed(1)},${Y(zero).toFixed(1)}L${X(x0).toFixed(1)},${Y(zero).toFixed(1)}Z`;
    const ticks = yt;
    // a marker with axis: true prints its own value on the x axis (in its colour); round ticks
    // that would collide with it give way
    const axisMarks = markers.filter((m) => m.axis && m.x >= x0 && m.x <= x1);
    const xt = nice(x0, x1).filter((t) => t >= x0 - 1e-9 && t <= x1 + 1e-9 && axisMarks.every((m) => Math.abs(X(t) - X(m.x)) > 56));
    const zy = Y(zero).toFixed(1);
    const html = `<div class="c-chart" data-chart="${id}">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
        <defs>
          <clipPath id="${id}u"><rect x="0" y="0" width="${W}" height="${zy}"/></clipPath>
          <clipPath id="${id}d"><rect x="0" y="${zy}" width="${W}" height="${H}"/></clipPath>
        </defs>
        ${ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="var(--c-chart-grid)"/>
          <text x="${L - 8}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end">${esc(yFmt(t, true))}</text>`).join("")}
        ${xt.map((t) => `<text x="${X(t).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(xFmt(t, true))}</text>`).join("")}
        ${axisMarks.map((m) => `<text x="${X(m.x).toFixed(1)}" y="${H - 8}" text-anchor="middle" style="fill:${m.color || "var(--fg-secondary)"};font-weight:700">${esc(xFmt(m.x, true))}</text>`).join("")}
        <path d="${area}" fill="var(--c-up-soft)" clip-path="url(#${id}u)"/>
        <path d="${area}" fill="var(--c-down-soft)" clip-path="url(#${id}d)"/>
        <line x1="${L}" x2="${W - R}" y1="${zy}" y2="${zy}" stroke="var(--fg-secondary)" stroke-opacity="0.5"/>
        ${refLine !== null ? `<line x1="${L}" x2="${W - R}" y1="${Y(refLine).toFixed(1)}" y2="${Y(refLine).toFixed(1)}" stroke="var(--c-down)" stroke-dasharray="5 4"/>` : ""}
        <path d="${d}" fill="none" stroke="var(--c-up)" stroke-width="2.5" clip-path="url(#${id}u)" stroke-linejoin="round"/>
        <path d="${d}" fill="none" stroke="var(--c-down)" stroke-width="2.5" clip-path="url(#${id}d)" stroke-linejoin="round"/>
        ${(() => {
          // labels read to the right of their line; one flips to the left when it would run past
          // the next line or off the plot (≈7 units per character at the label size)
          const ms = markers.filter((m) => m.x >= x0 && m.x <= x1).sort((a, b) => a.x - b.x);
          // every line first, then every label, so a label's halo sits over all the lines
          const lines = ms.map((m) => `<line x1="${X(m.x).toFixed(1)}" x2="${X(m.x).toFixed(1)}" y1="${T}" y2="${H - B}" stroke="${m.color || "var(--fg-secondary)"}" stroke-dasharray="4 4"/>`).join("");
          // a label may be several lines (an array); every other label drops below the previous one
          const rows = (m) => [].concat(m.label);
          return lines + ms.map((m, n) => {
            const ls = rows(m), x = X(m.x), w = Math.max(...ls.map((t) => t.length)) * 7.6, next = ms[n + 1] ? X(ms[n + 1].x) : W - R;
            const left = x + 5 + w > next - 4 && x - 5 - w >= L;
            const tx = (left ? x - 5 : Math.max(2, Math.min(x + 5, W - 2 - w))).toFixed(1), y = T + 11 + (n % 2 ? rows(ms[n - 1]).length * 15 : 0);
            return `<text x="${tx}" y="${y}"${left ? ' text-anchor="end"' : ""} class="c-chart__mlabel" style="fill:${m.color || "var(--fg-secondary)"}">${ls.map((t, k) => `<tspan x="${tx}" dy="${k ? "1.2em" : 0}">${esc(t)}</tspan>`).join("")}</text>`;
          }).join("");
        })()}
        ${extra.map((e) => `<path d="${e.points.filter((p) => Number.isFinite(p.y)).map((p, n) => `${n ? "L" : "M"}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join("")}" fill="none" stroke="${e.color}" stroke-width="2" stroke-dasharray="6 5" stroke-linejoin="round"/>`).join("")}
        ${dots.filter((d) => d.x >= x0 && d.x <= x1).map((d) => `<circle cx="${X(d.x).toFixed(1)}" cy="${Y(d.y).toFixed(1)}" r="5" fill="var(--c-card)" stroke="var(--fg-primary)" stroke-width="2"/>
          <text class="c-chart__mlabel" x="${labelX(X(d.x), String(d.label).length * 7.6).toFixed(1)}" y="${(Y(d.y) + 16).toFixed(1)}" style="fill:var(--fg-secondary)">${esc(d.label)}</text>`).join("")}
        <line class="c-chart__cross" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--fg-primary)" stroke-opacity="0" />
        <circle class="c-chart__dot" r="4.5" cx="0" cy="0" fill="var(--fg-primary)" opacity="0"/>
        <rect class="c-chart__hit" x="${L}" y="0" width="${W - L - R}" height="${H}" fill="transparent"/>
      </svg>
      <div class="c-chart__tip" role="status" aria-live="off"></div>
    </div>`;
    const bind = (root) => {
      const box = root.querySelector(`[data-chart="${id}"]`);
      if (!box) return;
      const svg = box.querySelector("svg"), tip = box.querySelector(".c-chart__tip");
      const cross = box.querySelector(".c-chart__cross"), dot = box.querySelector(".c-chart__dot");
      const move = (e) => {
        const r = svg.getBoundingClientRect();
        const vx = ((e.clientX - r.left) / r.width) * W;
        const xv = x0 + ((Math.min(Math.max(vx, L), W - R) - L) / (W - L - R)) * (x1 - x0);
        let best = points[0];
        for (const p of points) if (Math.abs(p.x - xv) < Math.abs(best.x - xv)) best = p;
        if (!Number.isFinite(best.y)) return;
        const px = X(best.x), py = Y(best.y);
        cross.setAttribute("x1", px); cross.setAttribute("x2", px); cross.setAttribute("stroke-opacity", "0.25");
        dot.setAttribute("cx", px); dot.setAttribute("cy", py); dot.setAttribute("opacity", "1");
        tip.textContent = `${xFmt(best.x)} → ${yFmt(best.y)}`;
        tip.style.left = `${(px / W) * 100}%`; tip.style.top = `${(py / H) * r.height}px`;
        box.classList.add("is-hover");
      };
      // labels keep one on-screen size: --k converts screen px into viewBox units at this width
      const fit = () => { const w = svg.getBoundingClientRect().width; if (w) box.style.setProperty("--k", (W / w).toFixed(3)); };
      fit();
      if (window.ResizeObserver) new ResizeObserver(fit).observe(svg);
      const leave = () => { box.classList.remove("is-hover"); dot.setAttribute("opacity", "0"); cross.setAttribute("stroke-opacity", "0"); };
      svg.addEventListener("pointermove", move);
      svg.addEventListener("pointerdown", move);
      svg.addEventListener("pointerleave", leave);
    };
    return { html, bind };
  };

  // "nice" axis ticks: 1, 2 or 5 × 10^n steps covering [lo, hi], about five of them
  const nice = (lo, hi, n = 5) => {
    const raw = (hi - lo) / n;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((st) => (hi - lo) / st <= n + 0.5) || 10 * mag;
    const out = [];
    for (let t = Math.floor(lo / step) * step; t <= hi + step * 0.999; t += step) out.push(Math.abs(t) < step / 1e6 ? 0 : Number(t.toPrecision(12)));
    return out;
  };

  // short axis labels: 12.5k, 1.2M
  const compact = (v) => {
    const a = Math.abs(v), s = v < 0 ? "−" : "";
    if (a >= 1e6) return `${s}${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
    if (a >= 1e4) return `${s}${Number((a / 1e3).toFixed(1))}k`;
    if (a >= 1e3) return `${s}${Number((a / 1e3).toFixed(2))}k`;
    if (a >= 100) return `${s}${a.toFixed(0)}`;
    if (a >= 1) return `${s}${Number(a.toFixed(a >= 10 ? 1 : 2))}`;
    return a === 0 ? "0" : `${s}${Number(a.toPrecision(2))}`;
  };
  const moneyAxis = (v) => `${cur.sym}${compact(v)}${cur.suffix ? "" : ""}`.replace(`${cur.sym}−`, `−${cur.sym}`);

  // A notice at the top right of the screen, under the top bar: green, with a tick, gone after
  // a moment. One at a time; a new one replaces the last. Announced to screen readers.
  let toastEl = null, toastT = 0;
  const toast = (text) => {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "c-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.append(toastEl);
    }
    toastEl.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 6.3 12 13 4.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>${esc(text)}`;
    toastEl.classList.remove("is-on");
    void toastEl.offsetWidth;                     // restart the entrance when shown again
    toastEl.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("is-on"), 2400);
  };

  // ------------------------------------------------------------ the controller
  function create({ root, defaults, render, extras = null, onState = null }) {
    // the whole calculator card: its toolbar (currency) sits outside the input column
    const form = root;
    const out = root.querySelector(".calc-out");
    // a collapsible options panel (<details class="c-opt">) keeps its open state in the URL
    // as mo=1, like the "More options" toggles, so a shared link opens it too
    const det = form.querySelector("details.c-opt");
    if (det && !("mo" in defaults)) defaults = Object.assign({}, defaults, { mo: "" });
    let state = Object.assign({}, defaults);

    // restore from the URL: only keys this calculator knows
    const q = new URLSearchParams(location.search);
    for (const k of Object.keys(defaults)) if (q.has(k)) state[k] = q.get(k);

    const segs = () => [...form.querySelectorAll(".seg[data-k]")];
    const inputs = () => [...form.querySelectorAll("input[data-k], select[data-k]")];

    const apply = () => {
      inputs().forEach((el) => {
        const v = state[el.dataset.k] ?? "";
        if (el.type === "checkbox") el.checked = v === "1";
        else if (el.value !== v) el.value = v;
      });
      segs().forEach((s) => s.querySelectorAll("[data-v]").forEach((b) => {
        const on = b.dataset.v === state[s.dataset.k];
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-checked", String(on));
        b.tabIndex = on ? 0 : -1;
      }));
      if (extras) extras.set(state);
      if (det) det.open = state.mo === "1";
      showHide();
    };

    const showHide = () => root.querySelectorAll("[data-show]").forEach((el) => {
      // "k=a|b" shows for those values; "k!=a" shows for anything else
      const ok = el.dataset.show.split("&").every((cond) => {
        const neg = cond.includes("!=");
        const [k, vs] = cond.split(neg ? "!=" : "=");
        const hit = vs.split("|").includes(state[k]);
        return neg ? !hit : hit;
      });
      el.hidden = !ok;
    });

    const read = () => {
      inputs().forEach((el) => { state[el.dataset.k] = el.type === "checkbox" ? (el.checked ? "1" : "") : el.value; });
      if (extras) Object.assign(state, extras.get());
    };

    let urlT = 0;
    const writeUrl = () => {
      clearTimeout(urlT);
      urlT = setTimeout(() => {
        const p = new URLSearchParams();
        const guest = new URLSearchParams(location.search).get("guest");
        if (guest !== null) p.set("guest", guest);
        for (const k of Object.keys(defaults)) if (state[k] !== undefined && state[k] !== "" && state[k] !== defaults[k]) p.set(k, state[k]);
        const s = p.toString();
        history.replaceState(null, "", `${location.pathname}${s ? `?${s}` : ""}${location.hash}`);
      }, 150);
    };

    let tracked = false;
    const run = () => {
      cur = CURRENCIES[state.cur] || CURRENCIES.USD;
      root.querySelectorAll("[data-cur-sym]").forEach((el) => { el.textContent = cur.sym.trim() || cur.suffix.trim(); });
      if (onState) onState(state);
      const r = render(state);
      // errors: mark the fields, keep the last good layout out of the way
      form.querySelectorAll(".fld.is-invalid").forEach((f) => {
        f.classList.remove("is-invalid");
        const e = f.querySelector(".fld__err"); if (e) e.remove();
        f.querySelectorAll("[aria-invalid]").forEach((i) => i.removeAttribute("aria-invalid"));
      });
      if (r.errors && r.errors.length) {
        let shown = 0;
        r.errors.forEach((e) => {
          // the first visible field with this name (a calculator can have alternate inputs)
          const f = [...form.querySelectorAll(`.fld[data-f="${e.field}"]`)].find((x) => !x.closest("[hidden]"));
          if (!f) return;
          shown++;
          // an empty field is "not done yet", not an error: say it once in the results panel
          f.classList.add("is-invalid");
          f.querySelectorAll("input, select").forEach((i) => i.setAttribute("aria-invalid", "true"));
          f.insertAdjacentHTML("beforeend", `<p class="fld__err" id="err-${esc(e.field.replace(/\./g, "-"))}">${esc(e.message)}</p>`);
        });
        out.innerHTML = `<div class="res-empty" role="status"><b>${shown ? "Check the highlighted fields" : "Fill in the calculator"}</b>${esc(r.errors[0].message)}</div>`;
      } else {
        out.innerHTML = r.html;
        (r.bind || []).forEach((b) => b(out));
        out.querySelectorAll(".res-cta").forEach((box) => {
          const a = box.querySelector("a[data-cta]");
          if (window.CalcCTA.member()) {
            // signed in: the same next step, as an action instead of a sign-up
            box.querySelector("p").innerHTML = box.querySelector("p").innerHTML.replace(/\bfree /g, "");
            a.removeAttribute("data-cta");
            a.href = "#";
            a.textContent = a.dataset.member || "Set price alert";
            return;
          }
          a.dataset.ref = window.CalcCTA.ref(a.dataset.cta);
          a.href = window.CalcCTA.href(a.dataset.ref);
          a.textContent = "Sign up free";
        });
        if (!tracked) { tracked = true; window.CalcTrack && window.CalcTrack({ event: "calculator_result", calculator: document.body.dataset.calc }); }
      }
      writeUrl();
    };

    // charts are drawn to the column's width: redraw when it changes (rotation, window resize)
    let drawnAt = out.clientWidth;
    if (window.ResizeObserver) new ResizeObserver(() => {
      if (Math.abs(out.clientWidth - drawnAt) < 24 || !out.querySelector(".c-chart")) return;
      drawnAt = out.clientWidth; run();
    }).observe(out);
    if (det) det.addEventListener("toggle", () => { state.mo = det.open ? "1" : ""; writeUrl(); });
    form.addEventListener("input", () => { read(); showHide(); run(); });
    form.addEventListener("change", () => { read(); showHide(); run(); });
    form.addEventListener("submit", (e) => e.preventDefault());

    // segmented toggles: click, plus arrow keys like a native radio group
    form.addEventListener("click", (e) => {
      const b = e.target.closest(".seg [data-v]");
      if (!b) return;
      const s = b.closest(".seg");
      state[s.dataset.k] = b.dataset.v;
      apply(); run();
    });
    form.addEventListener("keydown", (e) => {
      const b = e.target.closest(".seg [data-v]");
      if (!b || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const all = [...b.closest(".seg").querySelectorAll("[data-v]")];
      let n = all.indexOf(b);
      if (e.key === "Home") n = 0; else if (e.key === "End") n = all.length - 1;
      else n = (n + (e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1) + all.length) % all.length;
      all[n].click(); all[n].focus();
    });

    // toolbar: Reset and Share result
    root.querySelector("[data-reset]")?.addEventListener("click", () => {
      state = Object.assign({}, defaults);
      apply(); run();
      window.CalcTrack && window.CalcTrack({ event: "calculator_reset", calculator: document.body.dataset.calc });
    });
    // "Share result": the link carries every input, toggle and open panel. On a phone it opens
    // the native share sheet; on desktop it copies the link and says so.
    root.querySelector("[data-share]")?.addEventListener("click", async (e) => {
      const btn = e.currentTarget, label = btn.querySelector("span");
      clearTimeout(urlT);
      const p = new URLSearchParams();
      for (const k of Object.keys(defaults)) if (state[k] !== undefined && state[k] !== "" && state[k] !== defaults[k]) p.set(k, state[k]);
      const url = `${location.origin}${location.pathname}${p.toString() ? `?${p}` : ""}`;
      history.replaceState(null, "", url);
      const say = (t) => { label.textContent = t; clearTimeout(btn.sayT); btn.sayT = setTimeout(() => { label.textContent = "Share result"; }, 2000); };
      const track = (method) => window.CalcTrack && window.CalcTrack({ event: "calculator_share", calculator: document.body.dataset.calc, method });
      const phone = matchMedia("(pointer: coarse)").matches && typeof navigator.share === "function";
      if (phone) {
        try { await navigator.share({ title: document.title, url }); track("share_sheet"); return; }
        catch (err) { if (err && err.name === "AbortError") return; /* otherwise fall back to copying */ }
      }
      let ok = false;
      try { await navigator.clipboard.writeText(url); ok = true; } catch { /* insecure context or denied */ }
      if (!ok) {                                       // older path: a hidden field and the copy command
        const t = Object.assign(document.createElement("textarea"), { value: url });
        t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;opacity:0;top:0;left:0";
        document.body.append(t); t.select();
        try { ok = document.execCommand("copy"); } catch { /* not allowed */ }
        t.remove(); btn.focus();
      }
      if (ok) { toast("Link copied"); track("copy"); }
      else say("Copy the address bar");
    });

    apply();
    run();
    return { get state() { return state; }, rerun: () => { read(); run(); }, set(k, v) { state[k] = v; apply(); run(); } };
  }

  // The arithmetic at the end of a result sentence, every amount positive and the result last:
  //   "$2,500 gain − $2 fees = <b>$2,498 profit</b>",  "$2,500 loss + $2 fees = <b>$2,502 loss</b>"
  // `terms` are [label, effect on profit] (fees −2, dividends +50); zero terms are left out.
  // From a gain, costs are subtracted; from a loss, costs are added (they deepen it).
  const short = (v) => money(v).replace(/\.00(?=\D*$)/, "");
  const plMath = (gross, terms, result) => {
    const gain = gross >= 0;
    const parts = terms.filter(([, v]) => v && Math.abs(v) >= 0.005)
      .map(([label, v]) => `${(v < 0) === gain ? "−" : "+"} ${short(Math.abs(v))} ${label}`);
    const end = `<b class="res-pl ${tone(result)}">${short(Math.abs(result))} ${result >= 0 ? "profit" : "loss"}</b>`;
    return parts.length ? `${short(Math.abs(gross))} ${gain ? "gain" : "loss"} ${parts.join(" ")} = ${end}` : end;
  };

  window.CalcUI = {
    create, num, money, price, pct, qty, tone, esc, lineChart, compact, moneyAxis, plMath, toast, CURRENCIES,
    get currency() { return cur; },
  };
})();
