// Stock profit calculator — page wiring. Maths: lib/stock.js. Engine: calc-ui.js.
(() => {
  const { num, money, price, pct, tone, qty, lineChart, moneyAxis, esc } = CalcUI;
  const S = CalcLib.stock;
  const root = document.querySelector("[data-calc-root]");
  const what = document.getElementById("whatif") || { hidden: true };   // the chart now lives in the results column

  const defaults = {
    cur: "USD", mode: "profit", side: "long", sz: "shares", sh: "100", amt: "15000", en: "150", ex: "175", fee: "2", ft: "flat",
    fs: "total", eft: "flat", ef: "1", xft: "flat", xf: "1", div: "", tax: "", d1: "", d2: "", tgt: "amount", tg: "1000",
    mo: "", dt: "",                       // "More options" and "Details" open or closed
    tk: "", bfr: "", bdy: "",                                // the ticker picked in the Stock field (labels only)
  };

  // Fees: one field by default, either a $ total (split evenly, which is exact for flat fees)
  // or a % charged on each trade's value; or per side with $ / % each under More options.
  const fees = (s) => (s.fs === "split"
    ? { entryFee: { type: s.eft === "pct" ? "pct" : "flat", value: num(s.ef) }, exitFee: { type: s.xft === "pct" ? "pct" : "flat", value: num(s.xf) } }
    : s.ft === "pct"
      ? { entryFee: { type: "pct", value: num(s.fee) || 0 }, exitFee: { type: "pct", value: num(s.fee) || 0 } }
      : { entryFee: { type: "flat", value: (num(s.fee) || 0) / 2 }, exitFee: { type: "flat", value: (num(s.fee) || 0) / 2 } });

  const input = (s) => Object.assign({
    side: s.side, sizeMode: s.sz, shares: num(s.sh), amount: num(s.amt), entry: num(s.en), exit: num(s.ex),
    dividends: num(s.div), taxRate: num(s.tax), startDate: s.d1, endDate: s.d2, borrowRate: num(s.bfr), borrowDays: num(s.bdy),
  }, fees(s));

  // short amounts for the one-line summary: $150, not $150.00
  const m = (v) => money(v).replace(/\.00(?=\D*$)/, "");
  const p = (v) => price(v).replace(/\.00(?=\D*$)/, "");

  const links = (s, short) => `<div class="res-links">
      <button type="button" class="c-toggle" data-toggle="dt" aria-expanded="${s.dt === "1"}">Details</button>
      ${s.mode === "target"
        ? '<button type="button" class="c-link" data-mode="profit">← Back to profit</button>'
        : '<button type="button" class="c-link" data-mode="target">Find the price for a target profit →</button>'}
    </div>`;
  const details = (s, rows) => (s.dt === "1"
    ? `<dl class="res-details">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>` : "");

  function render(s) {
    if (s.fs !== "split" && s.fee !== "" && !(num(s.fee) >= 0)) { what.hidden = true; return { ok: false, errors: [{ field: "fee", message: "Fees can't be negative." }] }; }
    if (s.fs !== "split" && s.ft === "pct" && num(s.fee) >= 100) { what.hidden = true; return { ok: false, errors: [{ field: "fee", message: "A fee per trade must be under 100%." }] }; }
    const i = input(s);
    if (s.mode === "target") return renderTarget(s, i);
    const r = S.calculate(i);
    if (!r.ok) { what.hidden = true; return r; }
    const short = r.side === "short";
    const taxed = r.tax > 0;
    const lead = taxed ? (r.profit >= 0 ? "Profit after tax" : "Loss after tax") : (r.profit >= 0 ? "Net profit" : "Net loss");
    const math = CalcUI.plMath(r.grossProfit, [
      [short ? "dividends owed" : "dividends", short ? -r.dividends : r.dividends],
      ["fees", -r.totalFees],
      ["borrow fee", -r.borrowFee],
      ["tax", -r.tax],
    ], r.profit);
    const tk = esc(String(s.tk || "").toUpperCase());
    // whole shares as they are; a fraction (from an amount) to 4 decimals, so the sentence's maths adds up
    const n = `${Number.isInteger(r.shares) ? qty(r.shares) : qty(r.shares, 4)}${tk ? ` ${tk}` : ""} ${r.shares === 1 ? "share" : "shares"}`;
    const say = short
      ? `Shorted <b>${n}</b> at <b>${p(i.entry)}</b>, bought back at <b>${p(i.exit)}</b>. ${math}`
      : `Bought <b>${n}</b> at <b>${p(i.entry)}</b>, sold at <b>${p(i.exit)}</b>. ${math}`;
    const more = [
      ["Total fees", money(r.totalFees)],
      ...(short
        ? [["Sale proceeds after fees", money(r.entryValue - r.entryFee)], ["Buy-back cost incl. fees", money(r.exitValue + r.exitFee)]]
        : [["Cost incl. fees", money(r.costBasis)], ["Sale proceeds after fees", money(r.exitValue - r.exitFee)]]),
      ...(r.borrowFee ? [["Borrow fee", money(r.borrowFee)]] : []),
      ...(taxed ? [["Tax", money(r.tax)]] : []),
      ...(r.dividends ? [[short ? "Dividends owed" : "Dividends received", money(r.dividends)]] : []),
      ...(r.annualised !== null ? [["Annualised return", pct(r.annualised, { sign: true })]] : []),
      ...(r.days !== null && r.days >= 1 ? [["Holding period", `${Math.round(r.days)} days`]] : []),
    ];
    const wf = renderWhatIf(i, r);
    return {
      ok: true,
      html: `<div><p class="res-kick">${lead}</p>
          <p class="res-big ${tone(r.profit)}">${money(r.profit, { sign: true })}</p></div>
        <dl class="res-grid">
          <div><dt>Return</dt><dd class="${tone(r.roi)}">${pct(r.roi, { sign: true })}</dd></div>
          <div><dt>Break-even exit price</dt><dd>${price(r.breakEven)}</dd></div>
        </dl>
        <p class="res-say">${say}</p>
        ${links(s, short)}${details(s, more)}
        ${r.warnings.map((w) => `<p class="res-warn">${w}</p>`).join("")}
        <section class="res-chart" aria-labelledby="res-chart-title"><h3 id="res-chart-title">Profit or loss chart</h3>${wf.html}</section>`,
      bind: [wf.bind],
    };
  }

  function renderTarget(s, i) {
    const r = S.targetExit(i, { type: s.tgt === "pct" ? "pct" : "amount", value: num(s.tg) });
    what.hidden = true;
    if (!r.ok) return r;
    const short = i.side === "short";
    const goal = s.tgt === "pct" ? `${pct(num(s.tg) / 100)} (${m(r.profit)})` : m(r.profit);
    return {
      ok: true,
      html: `<div><p class="res-kick">${short ? "Buy back at or below" : "Sell at or above"}</p>
          <p class="res-big">${price(r.exit)}</p>
          <p class="res-sub ${tone(short ? -r.move : r.move)}">${pct(r.move, { sign: true })} from your ${short ? "sell" : "buy"} price</p></div>
        <dl class="res-grid">
          <div><dt>Target profit</dt><dd>${money(r.profit)}</dd></div>
          <div><dt>Cost basis</dt><dd>${money(r.costBasis)}</dd></div>
        </dl>
        <p class="res-say">To make <b>${goal}</b> after fees${num(s.tax) ? " and tax" : ""}, ${short ? "buy back" : "sell"} at <b>${p(r.exit)}</b>${short ? " or lower" : " or higher"}.</p>
        ${links(s, short)}`,
    };
  }

  // the "what if" card: P/L across exit prices, as a chart and a table
  function renderWhatIf(i, r) {
    // ±50% around the entry, widened to keep the exit on the chart
    const lo = Math.min(i.entry * 0.5, i.exit * 0.85), hi = Math.max(i.entry * 1.5, i.exit * 1.15), pts = [];
    for (let k = 0; k <= 60; k++) {
      const x = lo + ((hi - lo) * k) / 60;
      const v = S.calculate(Object.assign({}, i, { exit: x }));
      if (v.ok) pts.push({ x, y: v.profit });
    }
    const chart = lineChart({
      points: pts, label: "Profit or loss by exit price", xFmt: (v, axis) => (axis ? CalcUI.currency.sym + CalcUI.compact(v) : price(v)),
      yFmt: (v, axis) => (axis ? moneyAxis(v) : money(v, { sign: true })),
      dots: r.breakEven ? [{ x: r.breakEven, y: 0, label: `Break-even ${p(r.breakEven)}` }] : [],
      markers: [
        { x: i.entry, label: `Entry ${p(i.entry)}`, color: "var(--fg-secondary)" },
        { x: i.exit, label: [`Your exit ${p(i.exit)}`, `${r.profit >= 0 ? "Profit" : "Loss"} ${m(Math.abs(r.profit))}`], color: r.profit >= 0 ? "var(--c-up)" : "var(--c-down)", axis: true },
      ],
    });
    return { html: `${chart.html}
      <div class="c-legend"><span><i style="background:var(--c-up)"></i>Profit</span><span><i style="background:var(--c-down)"></i>Loss</span><span>Dashed lines: your entry and exit</span></div>`, bind: (el) => chart.bind(el) };
  }

  // "More options" / "Details" open state and the target-mode links live in the URL state
  // the size hint under Shares / Amount: what the other unit comes to at the buy price
  const sizeHint = (st) => {
    const e = num(st.en), sh = num(st.sh), amt = num(st.amt);
    const t = !(e > 0) ? ""
      : st.sz === "amount" ? (amt > 0 ? `= ${qty(amt / e, 2)} shares at ${p(e)}` : "")
      : (sh > 0 ? `= ${m(sh * e)} at ${p(e)}` : "");
    root.querySelectorAll("[data-size-hint]").forEach((el) => { el.textContent = t; });
  };
  const tickerField = TickerSearch.wire({ root, kind: "stock", ui: () => ui, priceKeys: ["en", "ex"], filled: "the buy and sell price" });
  const sync = (st) => {
    root.querySelectorAll(".calc-form [data-toggle]").forEach((b) => b.setAttribute("aria-expanded", String(st[b.dataset.toggle] === "1")));
    sizeHint(st);
    tickerField(st);
  };
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-toggle]"), md = e.target.closest("[data-mode]"), use = e.target.closest("[data-set]");
    if (t) ui.set(t.dataset.toggle, ui.state[t.dataset.toggle] === "1" ? "" : "1");
    if (md) ui.set("mode", md.dataset.mode);
    if (use) {
      const [k, v] = use.dataset.set.split("=");
      ui.set(k, v);
      const next = root.querySelector(k === "sz" ? (v === "amount" ? "#in-amt" : "#in-sh") : "#in-fee");
      if (next) next.focus();                        // keep the user in the field they switched
    }
  });
  const ui = CalcUI.create({ root, defaults, render, onState: sync });
})();
