// Position size calculator — page wiring. Maths: lib/position.js. Engine: calc-ui.js.
// Two columns on wide screens: the inputs stacked on the left, the answer on the right as a
// headline ("Buy 125 shares"), a target / stop bar and one sentence; the rest under Details.
(() => {
  const { num, money, price, pct, qty, esc } = CalcUI;
  const P = CalcLib.position;
  const root = document.querySelector("[data-calc-root]");

  const defaults = {
    cur: "USD", side: "long", acc: "25000", rm: "pct", rp: "1", ra: "250", en: "50", sm: "price", st: "48", sp: "4",
    at: "stock", tm: "price", tp: "56", tpp: "12", step: "1", fee: "", slip: "", lev: "1", mo: "", dt: "", tk: "",
  };
  // the asset type sets the word for a unit and the default rounding ("Round to" can override it)
  const ASSET = {
    stock: { one: "share", many: "shares", step: "1" },
    crypto: { one: "coin", many: "coins", step: "0.00000001" },
    other: { one: "unit", many: "units", step: "0" },
  };
  const asset = (s) => ASSET[s.at] || ASSET.stock;

  // take profit as a price, or as a % from entry (above it on a long, below on a short)
  const takeProfit = (s) => {
    if (s.tm !== "pct") return num(s.tp);
    const d = num(s.tpp), e = num(s.en);
    return d === null || !(e > 0) ? null : e * (1 + (s.side === "short" ? -1 : 1) * d / 100);
  };
  const input = (s) => ({
    side: s.side, account: num(s.acc), riskMode: s.rm, riskPct: num(s.rp), riskAmount: num(s.ra), entry: num(s.en),
    stopMode: s.sm, stop: num(s.st), stopPct: num(s.sp), target: takeProfit(s), step: Number(s.step) || 0,
    fees: num(s.fee), slippage: num(s.slip), leverage: num(s.lev),
  });

  // short figures: $250, not $250.00; 1%, not 1.00%
  const m = (v) => money(v).replace(/\.00(?=\D*$)/, "");
  const p = (v) => price(v).replace(/\.00(?=\D*$)/, "");
  const pc = (v) => pct(v).replace(/\.00%$/, "%").replace(/(\.\d)0%$/, "$1%");

  // The risk : reward card. Price runs up the bar on a true scale: each zone's height is its
  // distance from the entry (a long's take profit above, its stop below; a short the other way),
  // with the prices on an axis at the left and the entry line labelled with the position size.
  const rrCard = (r, i, size) => {
    const long = r.side === "long", t = r.target, H = 240, MIN = 46;
    const dLoss = Math.abs(i.entry - r.stop), dWin = t ? Math.abs(t.price - i.entry) : 0;
    let hWin = t ? (H * dWin) / (dWin + dLoss) : MIN, hLoss = t ? H - hWin : 120;
    if (hWin < MIN) { hLoss -= MIN - hWin; hWin = MIN; }            // keep both labels readable
    if (hLoss < MIN) { hWin -= MIN - hLoss; hLoss = MIN; }
    const win = t
      ? `<div class="rr-zone rr-zone--win" style="height:${Math.round(hWin)}px"><button type="button" class="rr-edit" data-open-tp>Take profit</button><span>${t.reward >= 0 ? "+" : "−"}${m(Math.abs(t.reward))} · ${qty(t.rr, 1)}R</span></div>`
      : `<div class="rr-zone rr-zone--empty" style="height:${MIN}px"><button type="button" class="rr-edit" data-open-tp>Add a take profit to see the reward</button></div>`;
    const loss = `<div class="rr-zone rr-zone--loss" style="height:${Math.round(hLoss)}px"><span>Stop</span><span>−${m(r.risk)} · ${pc(r.riskPct)}<span class="rr-of"> of account</span></span></div>`;
    const top = long ? (t ? t.price : null) : r.stop, bottom = long ? r.stop : (t ? t.price : null);
    const zones = long ? win + loss : loss + win, entryAt = Math.round(long ? (t ? hWin : MIN) : hLoss);
    const ratio = t && t.reward > 0 ? `1 : ${qty(t.rr, 1)}` : "—";
    const beRaw = t && t.reward > 0 ? (r.risk / (r.risk + t.reward)) * 100 : null;
    const be = beRaw === null ? null : beRaw < 1 ? "under 1" : Math.round(beRaw);
    const note = t && t.reward > 0
      ? `You risk ${m(r.risk)} to make ${m(t.reward)}. At ${ratio} you need to win ${be === "under 1" ? "<b>under 1%</b>" : `more than <b>${be}%</b>`} of trades to break even.`
      : t ? `At this take profit the trade still loses ${m(Math.abs(t.reward))} after fees, so there is no reward to weigh.`
      : `You risk ${m(r.risk)} (${pc(r.riskPct)} of your account) if the stop is hit.`;
    // an axis price: in full, plus a short form ($59.9k) that narrow phones show for big prices
    const ax = (v) => (v >= 1e4 ? `<b class="rr-full">${p(v)}</b><b class="rr-short">${CalcUI.currency.sym + CalcUI.compact(v)}</b>` : p(v));
    const longest = [top, i.entry, bottom].filter((v) => v !== null).sort((a, b) => p(b).length - p(a).length)[0];
    const plot = `<div class="rr-plot" role="img" aria-label="${esc(`Entry ${p(i.entry)}, stop ${p(r.stop)}${t ? `, take profit ${p(t.price)}` : ""}`)}">
          <div class="rr-axis">
            <i class="rr-axis__w" aria-hidden="true">${ax(longest)}</i>
            ${top !== null ? `<span style="top:0">${ax(top)}</span>` : ""}
            <span style="top:${entryAt}px">${ax(i.entry)}</span>
            ${bottom !== null ? `<span style="top:100%">${ax(bottom)}</span>` : ""}
          </div>
          <div class="rr-bar">${zones}<div class="rr-entry" style="top:${entryAt}px"><span>Entry · ${esc(size)}</span></div></div>
        </div>`;
    return { ratio, note, plot };
  };

  function render(s) {
    const i = input(s);
    const r = P.calculate(i);
    if (!r.ok) return r;
    const a = asset(s), unit = r.units === 1 ? a.one : a.many, long = r.side === "long";
    const more = [
      ["Position value", money(r.positionValue)],
      ["Share of account", pc(r.pctOfAccount)],
      ["Amount at risk", money(r.risk)],
      ["Stop distance", `${price(r.stopDistance)} (${pc(r.stopDistancePct)})`],
      [`Risk per ${a.one}`, price(r.perUnitRisk)],
      ["Leverage used", `${qty(r.leverageUsed, 2)}×`],
      ...r.rTargets.map((t) => [`${t.r}R ${long ? "above" : "below"} entry`, `${price(t.price)} · ${money(t.profit, { sign: true })}`]),
    ];
    // laid out as the other calculators: a result tile and two smaller tiles, the sentence,
    // then the chart under its own heading, then Details
    const rr = rrCard(r, i, `${qty(r.units)} ${unit}`);
    const head = `${qty(r.units)}${s.tk ? ` ${esc(String(s.tk).toUpperCase())}` : ""}${s.tk && s.at === "crypto" ? "" : ` ${esc(unit)}`}`;
    return { ok: true, html: `<div class="ps-hero"><p class="res-kick">Position size${long ? "" : " · short"}</p>
          <p class="res-big">${head}</p>
          <p class="res-sub">${m(r.positionValue)} position · ${pc(r.pctOfAccount)} of your account</p></div>
        <dl class="res-grid">
          <div><dt>Risk : reward</dt><dd>${rr.ratio}</dd></div>
          <div><dt>Amount at risk</dt><dd class="is-down">${m(r.risk)} <span class="res-dd-note">${pc(r.riskPct)}</span></dd></div>
        </dl>
        <p class="res-say">${rr.note}</p>
        <section class="res-chart" aria-labelledby="res-chart-title"><h3 id="res-chart-title">Risk and reward chart</h3>${rr.plot}</section>
        ${r.stopDistancePct < 0.005 ? `<p class="res-warn">This stop is ${pc(r.stopDistancePct)} from the entry. The spread, slippage or a gap can easily be wider, so the real loss could be several times ${m(r.risk)}.</p>` : ""}
        ${r.capped ? '<p class="res-warn">Capped by buying power: the full risk budget would need more than your max leverage.</p>' : ""}
        <div class="res-links"><button type="button" class="c-toggle" data-toggle="dt" aria-expanded="${s.dt === "1"}">Details</button></div>
        ${s.dt === "1" ? `<dl class="res-details">${more.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>` : ""}` };
  }

  // the quick-risk chips and the "Use …" links set a value; Details / More options toggle
  const sync = (st) => {
    root.querySelectorAll(".calc-form [data-toggle]").forEach((b) => b.setAttribute("aria-expanded", String(st[b.dataset.toggle] === "1")));
    root.querySelectorAll(".ps-chip").forEach((b) => b.classList.toggle("is-on", num(st.rp) === num(b.dataset.set.split("=")[1])));
    tickerField(st);
  };
  // the Ticker field: the price becomes the entry; the stop and take profit keep their distance
  // from it in %, and Trade in follows the asset (whole shares, or 8 decimals for a coin)
  const tickerField = TickerSearch.wire({
    root, kind: "any", ui: () => ui, priceKeys: ["en"], filled: "the entry price",
    also: (t, u, b) => {
      const e0 = num(b.en), e = t.price;
      const at = (v) => String(e * v / e0 >= 1 ? +(e * v / e0).toFixed(2) : +(e * v / e0).toPrecision(4));   // cents, or 4 figures under $1
      if (e0 > 0 && b.sm !== "pct" && num(b.st) > 0) u.set("st", at(num(b.st)));
      if (e0 > 0 && b.tm !== "pct" && num(b.tp) > 0) u.set("tp", at(num(b.tp)));
      setAsset(t.type === "Crypto" ? "crypto" : "stock");
    },
  });
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-toggle]"), use = e.target.closest("[data-set]");
    if (e.target.closest("[data-open-tp]")) {        // the card's take-profit label: edit it in More options
      ui.set("mo", "1");
      const f = root.querySelector(ui.state.tm === "pct" ? "#in-tpp" : "#in-tp");
      if (f) { f.focus(); f.select(); }
      return;
    }
    if (t) ui.set(t.dataset.toggle, ui.state[t.dataset.toggle] === "1" ? "" : "1");
    if (use) {
      const [k, v] = use.dataset.set.split("=");
      ui.set(k, v);
      const next = root.querySelector({ rm: v === "pct" ? "#in-rp" : "#in-ra", sm: v === "pct" ? "#in-sp" : "#in-st", tm: v === "pct" ? "#in-tpp" : "#in-tp" }[k]);
      if (next) next.focus();                        // a unit switch keeps the user in the field
    }
  });
  const ui = CalcUI.create({ root, defaults, render, onState: sync });
  // a new asset type brings its default rounding
  function setAsset(at) { ui.set("at", at); ui.set("step", ASSET[at].step); }
  root.querySelector("#in-at").addEventListener("change", (e) => setAsset(e.target.value));
})();
