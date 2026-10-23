// Crypto profit calculator — page wiring. Maths: lib/crypto.js. Engine: calc-ui.js.
// Laid out as the stock calculator: the first buy in the main row, extra buys (dollar-cost
// averaging) under More options; they live in the URL as b=price~amount_price~amount.
(() => {
  const { num, money, price, pct, tone, qty, lineChart, moneyAxis, esc } = CalcUI;
  const C = CalcLib.crypto;
  const root = document.querySelector("[data-calc-root]");
  const rowsBox = root.querySelector("[data-buys]");
  const what = document.getElementById("whatif") || { hidden: true };   // the chart now lives in the results column
  const MAX_BUYS = 8;

  const defaults = {
    cur: "USD", mode: "profit", side: "long", sz: "amount", amt: "1000", co: "", bp: "60000", ex: "75000",
    fee: "0.1", ft: "pct", fs: "total", bf: "0.1", sf: "0.1", oc: "", tax: "", coin: "BTC",
    tgt: "amount", tg: "500", b: "", mo: "", dt: "", tk: "", bfr: "", bdy: "",
  };

  // short amounts for sentences and labels: $150, not $150.00
  const m = (v) => money(v).replace(/\.00(?=\D*$)/, "");
  const p = (v) => price(v).replace(/\.00(?=\D*$)/, "");
  const coin = (s) => (s.coin || "").trim().toUpperCase().replace(/[^A-Z0-9.]/g, "").slice(0, 10);
  const unit = (s) => esc(coin(s) || "coins");

  // ---- extra buys (rows 2…n) <-> URL
  const parseRows = (s) => (s || "").split("_").filter(Boolean).map((r) => { const [pr, a] = r.split("~"); return { p: pr || "", a: a || "" }; });
  const rowHtml = (r, n, st) => {
    const coins = st.sz === "coins", short = st.side === "short", k = n + 2;
    return `<div class="c-rowline" style="grid-template-columns:1fr 1fr 36px" data-row="${n}">
      <div class="fld" data-f="buys.${n + 1}.price"><label for="bp${k}">${short ? "Sale" : "Buy"} ${k} price</label>
        <span class="fld__box"><span class="fld__affix" data-cur-sym aria-hidden="true">$</span><input id="bp${k}" data-row-p inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="0.00" value="${esc(r.p)}"></span></div>
      <div class="fld" data-f="buys.${n + 1}.${coins ? "coins" : "amount"}"><label for="ba${k}">${coins ? "Coins" : "Amount"}</label>
        <span class="fld__box">${coins ? "" : '<span class="fld__affix" data-cur-sym aria-hidden="true">$</span>'}<input id="ba${k}" data-row-a inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="0" value="${esc(r.a)}"></span></div>
      <button type="button" class="c-x" data-del="${n}" aria-label="Remove ${short ? "sale" : "buy"} ${k}">×</button>
    </div>`;
  };
  const draw = (st) => {
    const rows = parseRows(st.b);
    rowsBox.innerHTML = rows.map((r, n) => rowHtml(r, n, st)).join("") +
      (rows.length < MAX_BUYS - 1 ? `<button type="button" class="c-link" data-add>+ Add a ${st.side === "short" ? "sale" : "buy"}</button>` : "");
  };
  const extras = {
    set: draw,
    get: () => ({ b: [...rowsBox.querySelectorAll("[data-row]")].map((el) => `${el.querySelector("[data-row-p]").value.trim()}~${el.querySelector("[data-row-a]").value.trim()}`).join("_") }),
  };
  rowsBox.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]"), del = e.target.closest("[data-del]");
    if (!add && !del) return;
    const list = parseRows(extras.get().b);
    if (add) list.push({ p: "", a: "" });
    if (del) list.splice(Number(del.dataset.del), 1);
    ui.set("b", list.map((r) => `${r.p}~${r.a}`).join("_"));
    const focus = rowsBox.querySelector(add ? `[data-row="${list.length - 1}"] input` : "[data-add]");
    if (focus) focus.focus();
  });

  // Fees: one field, a % charged on each order (the exchange rate) or a $ total for buy and
  // sell; or a % per side under More options. The maths takes % fees per side, so a $ total
  // goes in as a fixed cost, which is exactly how it affects profit and break-even.
  // a short's borrow fee: position value × rate a year × days ÷ 365, counted as a cost
  const borrowFee = (s) => {
    if (s.side !== "short" || !(num(s.bfr) > 0) || !(num(s.bdy) > 0)) return 0;
    const rows = [{ p: s.bp, a: s.sz === "coins" ? s.co : s.amt }, ...parseRows(s.b).map((r) => ({ p: r.p, a: r.a }))];
    const value = rows.reduce((t, r) => t + (s.sz === "coins" ? (num(r.a) || 0) * (num(r.p) || 0) : num(r.a) || 0), 0);
    return value * (num(s.bfr) / 100) * (num(s.bdy) / 365);
  };
  const flatFee = (s) => (s.fs !== "split" && s.ft === "flat" ? num(s.fee) || 0 : 0);
  const input = (s) => {
    const coins = s.sz === "coins";
    const first = coins ? { price: num(s.bp), coins: num(s.co) } : { price: num(s.bp), amount: num(s.amt) };
    const rest = parseRows(s.b).map((r) => (coins ? { price: num(r.p), coins: num(r.a) } : { price: num(r.p), amount: num(r.a) }));
    const split = s.fs === "split", pctFee = !split && s.ft !== "flat" ? num(s.fee) : 0;
    return {
      side: s.side === "short" ? "short" : "long", sizeMode: coins ? "coins" : "amount", buys: [first, ...rest],
      buyFee: split ? num(s.bf) : pctFee, sellFee: split ? num(s.sf) : pctFee,
      otherCosts: (num(s.oc) || 0) + flatFee(s) + borrowFee(s), taxRate: num(s.tax), exit: num(s.ex),
    };
  };

  const links = (s) => `<div class="res-links">
      <button type="button" class="c-toggle" data-toggle="dt" aria-expanded="${s.dt === "1"}">Details</button>
      ${s.mode === "target"
        ? '<button type="button" class="c-link" data-mode="profit">← Back to profit</button>'
        : '<button type="button" class="c-link" data-mode="target">Find the price for a target profit →</button>'}
    </div>`;
  const details = (s, rows) => (s.dt === "1"
    ? `<dl class="res-details">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>` : "");

  function render(s) {
    const fail = (field, message) => { what.hidden = true; return { ok: false, errors: [{ field, message }] }; };
    if (s.fs !== "split" && s.fee !== "" && !(num(s.fee) >= 0)) return fail("fee", "Fees can't be negative.");
    if (s.fs !== "split" && s.ft !== "flat" && num(s.fee) >= 100) return fail("fee", "A fee per trade must be under 100%.");
    const i = input(s);
    if (s.mode === "target") return renderTarget(s, i);
    const r = C.calculate(i);
    if (!r.ok) { what.hidden = true; return r; }
    const sh = r.side === "short", many = r.legs.length > 1, sym = unit(s);
    const flat = flatFee(s), borrow = borrowFee(s), fees = r.totalFees + flat, other = r.otherCosts - flat - borrow;
    const taxed = r.tax > 0;
    const lead = taxed ? (r.profit >= 0 ? "Profit after tax" : "Loss after tax") : (r.profit >= 0 ? "Net profit" : "Net loss");
    const gross = sh ? r.coins * (r.avgPrice - i.exit) : r.coins * (i.exit - r.avgPrice);   // the price move alone
    const math = CalcUI.plMath(gross, [["fees", -fees], ["borrow fee", -borrow], ["other costs", -other], ["tax", -r.tax]], r.profit);
    const entry = many ? ` in ${r.legs.length} ${sh ? "sales" : "buys"} at an average <b>${p(r.avgPrice)}</b>` : ` at <b>${p(r.avgPrice)}</b>`;
    const say = `${sh ? "Shorted" : "Bought"} <b>${qty(r.coins, 8)} ${sym}</b>${entry}, ${sh ? "bought back" : "sold"} at <b>${p(i.exit)}</b>. ${math}`;
    const more = [
      ["Coins", `${qty(r.coins, 8)} ${sym}`],
      ["Total fees", money(fees)],
      ...(many ? [["Average entry", price(r.avgPrice)]] : []),
      ...(sh
        ? [["Sale proceeds after fees", money(r.proceeds - flat / 2)], ["Buy-back cost incl. fees", money(r.buyBackCost + flat / 2)]]
        : [["Cost incl. fees", money(r.spent + flat / 2)], ["Sale proceeds after fees", money(r.proceeds - flat / 2)]]),   // a $ total is split evenly, as on the stock page
      ...(borrow > 0 ? [["Borrow fee", money(borrow)]] : []),
      ...(other > 0 ? [["Other costs", money(other)]] : []),
      ...(taxed ? [["Tax", money(r.tax)]] : []),
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
        ${links(s)}${details(s, more)}
        ${sh ? `<p class="res-warn">Short P/L excludes ${borrow > 0 ? "" : "borrow fees (add one under More options), "}funding rates and liquidation.</p>` : ""}
        <section class="res-chart" aria-labelledby="res-chart-title"><h3 id="res-chart-title">Profit or loss chart</h3>${wf.html}</section>`,
      bind: [wf.bind],
    };
  }

  function renderTarget(s, i) {
    what.hidden = true;
    const r = C.targetExit(i, { type: s.tgt === "pct" ? "pct" : "amount", value: num(s.tg) });
    if (!r.ok) return r;
    const sh = i.side === "short", sym = unit(s);
    const goal = s.tgt === "pct" ? `${pct(num(s.tg) / 100)} (${m(r.profit)})` : m(r.profit);
    return {
      ok: true,
      html: `<div><p class="res-kick">${sh ? `Buy back ${sym} at or below` : `Sell ${sym} at or above`}</p>
          <p class="res-big">${price(r.exit)}</p>
          <p class="res-sub ${tone(sh ? -r.move : r.move)}">${pct(r.move, { sign: true })} from your average entry</p></div>
        <dl class="res-grid">
          <div><dt>Target profit</dt><dd>${money(r.profit)}</dd></div>
          <div><dt>${sh ? "Position value + costs" : "Cost incl. fees"}</dt><dd>${money(r.invested)}</dd></div>
        </dl>
        <p class="res-say">To make <b>${goal}</b> after fees${num(s.tax) ? " and tax" : ""}, ${sh ? "buy back" : "sell"} at <b>${p(r.exit)}</b>${sh ? " or lower" : " or higher"}.</p>
        ${links(s)}`,
    };
  }

  // the "what if" card: P/L across exit prices, with your entry and exit marked
  function renderWhatIf(i, r) {
    const e = r.avgPrice;
    const lo = Math.min(e * 0.5, i.exit * 0.85), hi = Math.max(e * 1.5, i.exit * 1.15), pts = [];
    for (let k = 0; k <= 60; k++) {
      const x = lo + ((hi - lo) * k) / 60;
      const v = C.calculate(Object.assign({}, i, { exit: x }));
      if (v.ok) pts.push({ x, y: v.profit });
    }
    const chart = lineChart({
      points: pts, label: "Profit or loss by exit price", xFmt: (v, axis) => (axis ? CalcUI.currency.sym + CalcUI.compact(v) : price(v)),
      yFmt: (v, axis) => (axis ? moneyAxis(v) : money(v, { sign: true })),
      dots: r.breakEven ? [{ x: r.breakEven, y: 0, label: `Break-even ${p(r.breakEven)}` }] : [],
      markers: [
        { x: e, label: `${r.legs.length > 1 ? "Avg entry" : "Entry"} ${p(e)}`, color: "var(--fg-secondary)" },
        { x: i.exit, label: [`Your exit ${p(i.exit)}`, `${r.profit >= 0 ? "Profit" : "Loss"} ${m(Math.abs(r.profit))}`], color: r.profit >= 0 ? "var(--c-up)" : "var(--c-down)", axis: true },
      ],
    });
    return { html: `${chart.html}
      <div class="c-legend"><span><i style="background:var(--c-up)"></i>Profit</span><span><i style="background:var(--c-down)"></i>Loss</span><span>Dashed lines: your entry and exit</span></div>`, bind: (el) => chart.bind(el) };
  }

  // the size hint under Amount / Coins: what the other unit comes to at the buy price
  const sizeHint = (st) => {
    const e = num(st.bp), amt = num(st.amt), co = num(st.co), sym = unit(st);
    const t = !(e > 0) ? ""
      : st.sz === "coins" ? (co > 0 ? `= ${m(co * e)} at ${p(e)}` : "")
      : (amt > 0 ? `= ${qty(amt / e, 8)} ${sym} at ${p(e)}` : "");   // the amount is before fees
    root.querySelectorAll("[data-size-hint]").forEach((el) => { el.textContent = t; });
  };
  // the Coin field: picking a coin also sets the coin symbol used in the labels
  const tickerField = TickerSearch.wire({ root, kind: "crypto", ui: () => ui, priceKeys: ["bp", "ex"], also: (t, u) => u.set("coin", t.symbol) });
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
      const next = root.querySelector(k === "sz" ? (v === "coins" ? "#in-co" : "#in-amt") : "#in-fee");
      if (next) next.focus();                        // keep the user in the field they switched
    }
  });
  const ui = CalcUI.create({ root, defaults, render, extras, onState: sync });
})();
