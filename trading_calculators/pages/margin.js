// Margin call calculator — page wiring. Maths: lib/margin.js. Engine: calc-ui.js.
// Laid out as the other calculators: 4 inputs and Long / Short, the rest under More options;
// one hero (the margin call price), two secondary results, a sentence, then Details.
(() => {
  const { num, money, price, pct, qty, lineChart } = CalcUI;
  const M = CalcLib.margin;
  const root = document.querySelector("[data-calc-root]");
  const what = document.getElementById("whatif") || { hidden: true };   // the chart now lives in the results column

  const defaults = { cur: "USD", side: "long", px: "100", sh: "200", im: "50", mm: "", wi: "", rate: "", days: "", cash: "", mo: "", dt: "" };

  // short figures: $100, not $100.00; 25%, not 25.00%
  const m = (v) => money(v).replace(/\.00(?=\D*$)/, "");
  const p = (v) => price(v).replace(/\.00(?=\D*$)/, "");
  const pc = (v, dp = 1) => pct(v, { dp }).replace(/\.0+%$/, "%");

  const input = (s) => ({
    side: s.side, price: num(s.px), shares: num(s.sh), initial: num(s.im), maint: num(s.mm),
    whatIf: num(s.wi), rate: num(s.rate), days: num(s.days), cash: num(s.cash),
  });

  const details = (s, rows) => (s.dt === "1"
    ? `<dl class="res-details">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>` : "");

  function render(s) {
    const i = input(s);
    const r = M.calculate(i);
    if (!r.ok) { what.hidden = true; return r; }
    const long = r.side === "long", maint = pc(r.maintenance / 100, 0);
    const links = `<div class="res-links"><button type="button" class="c-toggle" data-toggle="dt" aria-expanded="${s.dt === "1"}">Details</button></div>`;
    const more = [
      ["Position value", money(r.positionValue)],
      ["Your deposit", money(r.deposit)],
      ["Leverage", r.leverage ? `${qty(r.leverage, 2)}×` : "—"],
      ...(r.carry > 0 ? [[r.carryLabel, money(r.carry)], [`Break-even incl. ${r.carryLabel.toLowerCase()}`, price(r.breakEven)]] : []),
      ...(r.buyingPower !== null ? [["Buying power", money(r.buyingPower)], ["Max shares at this price", qty(r.maxShares)]] : []),
    ];
    let scenario = "";
    if (r.scenario) {
      const sc = r.scenario;
      scenario = sc.inCall
        ? `<p class="res-warn">At ${p(sc.price)} you are in a margin call: equity ${m(sc.equity)} (${pc(sc.equityPct)} of the position) against ${m(sc.required)} required. To cover it, deposit <b>${m(sc.cover.deposit)}</b>${sc.cover.units !== null ? `, or ${long ? "sell" : "buy back"} <b>${qty(sc.cover.units)} shares</b> (${m(sc.cover.unitsValue)})` : ". Equity is gone, so reducing the position can't fix it"}.</p>`
        : `<p class="res-warn">At ${p(sc.price)} equity is ${m(sc.equity)}, ${pc(sc.equityPct)} of the position: above the ${maint} maintenance level, so no call.</p>`;
    }
    const wf = renderWhatIf(i, r);
    const chart = `<section class="res-chart" aria-labelledby="res-chart-title"><h3 id="res-chart-title">How close is a margin call?</h3>${wf.html}</section>`;
    if (r.noCall) {
      return { ok: true, html: `<div><p class="res-kick">Margin call price</p><p class="res-big">None</p></div>
        <dl class="res-grid"><div><dt>Borrowed</dt><dd>$0</dd></div><div><dt>Leverage</dt><dd>1×</dd></div></dl>
        <p class="res-say">You pay for all ${qty(i.shares)} shares yourself, so there is no loan and no margin call.</p>
        ${links}${details(s, more)}${scenario}
        ${chart}`, bind: [wf.bind] };
    }
    const move = Math.abs(r.callMove);
    const say = long
      ? `You put in <b>${m(r.deposit)}</b> and borrow <b>${m(r.loan)}</b> for ${qty(i.shares)} shares at ${p(i.price)}. At ${maint} maintenance, a fall to <b>${p(r.callPrice)}</b> triggers a margin call.`
      : `You short ${qty(i.shares)} shares at ${p(i.price)} (<b>${m(r.positionValue)}</b>) and add <b>${m(r.deposit)}</b>. At ${maint} maintenance, a rise to <b>${p(r.callPrice)}</b> triggers a margin call.`;
    return { ok: true, html: `<div><p class="res-kick">Margin call price</p>
          <p class="res-big is-down">${price(r.callPrice)}</p>
          <p class="res-sub">${pc(move)} ${long ? "below" : "above"} ${p(i.price)}</p></div>
        <dl class="res-grid">
          <div><dt>${long ? "Borrowed" : "Held in account"}</dt><dd>${money(long ? r.loan : r.credit)}</dd></div>
          <div><dt>Position can ${long ? "fall" : "rise"} by</dt><dd>${money(r.cushion)}</dd></div>
        </dl>
        <p class="res-say">${say}</p>
        ${links}${details(s, more)}${scenario}
        ${chart}`, bind: [wf.bind] };
  }

  // equity as a % of the position across prices, against the maintenance line
  function renderWhatIf(i, r) {
    const P0 = i.price, long = r.side === "long";
    const lo = P0 * 0.4, hi = P0 * 1.6, pts = [];
    for (let k = 0; k <= 80; k++) {
      const S = lo + ((hi - lo) * k) / 80;
      const eq = long ? S * i.shares - r.loan : r.credit - S * i.shares;
      pts.push({ x: S, y: (eq / (S * i.shares)) * 100 });
    }
    const markers = [{ x: P0, label: `Today ${p(P0)}`, color: "var(--fg-secondary)" }];
    if (r.callPrice) markers.push({ x: r.callPrice, label: ["Margin call", p(r.callPrice)], color: "var(--c-down)", axis: true });
    const chart = lineChart({ points: pts, label: "Equity as a percentage of the position, by share price", markers, zero: 0, refLine: r.maintenance,
      xFmt: (v, axis) => (axis ? CalcUI.currency.sym + CalcUI.compact(v) : price(v)), yFmt: (v) => `${Math.round(v)}%` });
    return { html: `${chart.html}
      <div class="c-legend"><span><i style="background:var(--c-up)"></i>Equity %</span><span><i style="background:var(--c-down)"></i>Dashed red: ${pc(r.maintenance / 100, 0)} maintenance</span><span>Below it, a margin call</span></div>`, bind: (el) => chart.bind(el) };
  }

  // live hints under the margin fields; the maintenance placeholder follows the side (FINRA)
  const hintIm = root.querySelector("#in-im-hint"), hintMm = root.querySelector("#in-mm-hint"), mmInput = root.querySelector("#in-mm");
  [hintIm, hintMm].forEach((h) => h && h.classList.add("fld__hint--on"));
  const onState = (st) => {
    root.querySelectorAll(".calc-form [data-toggle]").forEach((b) => b.setAttribute("aria-expanded", String(st[b.dataset.toggle] === "1")));
    mmInput.placeholder = String(M.DEFAULT_MAINT[st.side] || 25);
    const value = num(st.px) * num(st.sh), im = num(st.im);
    if (hintIm) hintIm.textContent = im > 0 && im < 50 ? "Below the Reg T 50% minimum for US stocks."
      : value > 0 && im > 0 ? `= ${m((value * im) / 100)} of your own money` : "What you fund yourself. Reg T minimum: 50%.";
    if (hintMm) hintMm.textContent = `FINRA minimum: ${st.side === "short" ? "30% on a short" : "25% on a long"}. Brokers often ask more.`;
  };
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-toggle]");
    if (t) ui.set(t.dataset.toggle, ui.state[t.dataset.toggle] === "1" ? "" : "1");
  });
  const ui = CalcUI.create({ root, defaults, render, onState });
})();
