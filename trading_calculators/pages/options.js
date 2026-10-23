// Options profit calculator — page wiring. Maths: lib/options.js. Engine: calc-ui.js.
// Legs live in the URL as l=type~side~strike~premium~qty_… (stock legs: s~l~price~~shares).
(() => {
  const { num, money, price, pct, tone, qty, lineChart, moneyAxis, esc } = CalcUI;
  const O = CalcLib.options;
  const root = document.querySelector("[data-calc-root]");
  const legsBox = root.querySelector("[data-legs]");
  const what = document.getElementById("whatif") || { hidden: true };   // the chart now lives in the results column

  const defaults = {
    cur: "USD", pre: "long-call", k: "100", pr: "3.50", n: "1", at: "110",
    und: "100", dte: "30", iv: "30", rate: "4", l: "c~l~100~3.50~1_c~s~110~2.10~1", mult: "100", fee: "", mo: "", dt: "",
  };
  const T = { c: "call", p: "put", s: "stock" }, TK = { call: "c", put: "p", stock: "s" };
  // the four single options in the Strategy menu: one leg from the Strike / Premium / Contracts fields
  const SINGLES = { "long-call": ["call", "long"], "long-put": ["put", "long"], "short-call": ["call", "short"], "short-put": ["put", "short"] };
  // links from before the Strategy menu (pre=single with ot / os) open on the matching single option
  {
    const q = new URLSearchParams(location.search);
    if ((q.get("pre") || "single") === "single" && (q.has("ot") || q.has("os") || q.get("pre") === "single")) {
      q.set("pre", `${q.get("os") === "sell" ? "short" : "long"}-${q.get("ot") === "put" ? "put" : "call"}`);
      q.delete("ot"); q.delete("os");
      history.replaceState(null, "", `${location.pathname}?${q}${location.hash}`);
    }
  }

  // ---- legs <-> URL
  const parse = (s) => (s || "").split("_").filter(Boolean).map((r) => {
    const [t, sd, k, pr, q] = r.split("~");
    return { t: T[t] ? t : "c", sd: sd === "s" ? "s" : "l", k: k || "", pr: pr || "", q: q || "" };
  });
  const enc = (legs) => legs.map((l) => [l.t, l.sd, l.k, l.pr, l.q].join("~")).join("_");

  const legHtml = (l, n, total) => {
    const stock = l.t === "s";
    return `<div class="leg" data-leg="${n}">
      <div class="fld" data-f="legs.${n}.type"><label for="lt${n}">Leg ${n + 1}</label>
        <span class="fld__box"><select id="lt${n}" data-lt><option value="c"${l.t === "c" ? " selected" : ""}>Call</option><option value="p"${l.t === "p" ? " selected" : ""}>Put</option><option value="s"${stock ? " selected" : ""}>Stock</option></select></span></div>
      <div class="fld" data-f="legs.${n}.side"><label for="ls${n}">Action</label>
        <span class="fld__box"><select id="ls${n}" data-ls><option value="l"${l.sd === "l" ? " selected" : ""}>Buy</option><option value="s"${l.sd === "s" ? " selected" : ""}>Sell</option></select></span></div>
      <div class="fld" data-f="legs.${n}.${stock ? "price" : "strike"}"><label for="lk${n}">${stock ? "Share price" : "Strike"}</label>
        <span class="fld__box"><input id="lk${n}" data-lk inputmode="decimal" autocomplete="off" spellcheck="false" value="${esc(l.k)}" placeholder="0"></span></div>
      <div class="fld" data-f="legs.${n}.premium"${stock ? " hidden" : ""}><label for="lp${n}">Premium</label>
        <span class="fld__box"><input id="lp${n}" data-lp inputmode="decimal" autocomplete="off" spellcheck="false" value="${esc(l.pr)}" placeholder="0.00"></span></div>
      <div class="fld" data-f="legs.${n}.qty"><label for="lq${n}">${stock ? "Shares" : "Contracts"}</label>
        <span class="fld__box"><input id="lq${n}" data-lq inputmode="decimal" autocomplete="off" spellcheck="false" value="${esc(l.q)}" placeholder="1"></span></div>
      ${total > 1 ? `<button type="button" class="c-x" data-del="${n}" aria-label="Remove leg ${n + 1}">×</button>` : "<span></span>"}
    </div>`;
  };
  const draw = (state) => {
    const legs = parse(state.l);
    legsBox.innerHTML = legs.map((l, n) => legHtml(l, n, legs.length)).join("") +
      (legs.length < O.MAX_LEGS ? '<button type="button" class="c-link" data-add>+ Add a leg</button>' : "");
  };
  const read = () => [...legsBox.querySelectorAll("[data-leg]")].map((el) => ({
    t: el.querySelector("[data-lt]").value, sd: el.querySelector("[data-ls]").value,
    k: el.querySelector("[data-lk]").value.trim(), pr: el.querySelector("[data-lp]").value.trim(), q: el.querySelector("[data-lq]").value.trim(),
  }));
  const extras = { set: draw, get: () => ({ l: enc(read()) }) };

  // a type change re-draws the row (stock legs have no premium)
  legsBox.addEventListener("change", (e) => { if (e.target.matches("[data-lt]")) { ui.set("pre", "custom"); ui.set("l", enc(read())); } });
  legsBox.addEventListener("input", (e) => { if (!e.target.matches("[data-lt]") && ui.state.pre !== "custom") root.querySelector("#in-pre").value = "custom"; });
  legsBox.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]"), del = e.target.closest("[data-del]");
    if (!add && !del) return;
    const legs = read();
    if (add) { const u = num(ui.state.und) || 100; legs.push({ t: "c", sd: "l", k: String(strikeStep(u) * Math.round(u / strikeStep(u))), pr: "", q: "1" }); }
    if (del) legs.splice(Number(del.dataset.del), 1);
    ui.set("pre", "custom");
    ui.set("l", enc(legs));
  });

  // ---- presets: strikes around the stock price; premiums are clearly-labelled examples
  const strikeStep = (u) => (u < 10 ? 0.5 : u < 50 ? 1 : u < 200 ? 5 : u < 1000 ? 10 : 50);
  const examplePremium = (type, k, u) => {
    const intrinsic = type === "call" ? Math.max(u - k, 0) : Math.max(k - u, 0);
    const time = u * 0.035 * Math.max(0.12, 1 - Math.abs(k - u) / (u * 0.25));
    return (Math.round((intrinsic + time) * 20) / 20).toFixed(2);
  };
  // build a preset's legs around today's stock price (on picking it, and when that price changes)
  const placePreset = (pre) => {
    const pr = !SINGLES[pre] && O.PRESETS[pre], u = num(ui.state.und);   // single options use their own fields
    if (!pr || !(u > 0)) return;
    const st = strikeStep(u), atm = Math.round(u / st) * st;
    const legs = pr.legs.map((l) => {
      if (l.type === "stock") return { t: "s", sd: l.side === "long" ? "l" : "s", k: String(u), pr: "", q: String(num(ui.state.mult) || 100) };
      const k = Number((atm + l.k * st).toFixed(4));
      return { t: TK[l.type], sd: l.side === "long" ? "l" : "s", k: String(k), pr: examplePremium(l.type, k, u), q: "1" };
    });
    ui.set("l", enc(legs));
  };
  root.querySelector("#in-pre").addEventListener("change", (e) => {
    ui.set("pre", e.target.value);   // store the choice first: set() re-applies state to the form
    placePreset(e.target.value);      // single option and custom legs keep their own inputs
  });
  root.querySelector("#in-und").addEventListener("input", () => setTimeout(() => placePreset(ui.state.pre)));

  const single = (s) => s.pre in SINGLES;
  const input = (s) => ({
    legs: single(s)
      ? [{ type: SINGLES[s.pre][0], side: SINGLES[s.pre][1], strike: num(s.k), premium: num(s.pr), qty: num(s.n) }]
      : parse(s.l).map((l) => (l.t === "s"
        ? { type: "stock", side: l.sd === "l" ? "long" : "short", price: num(l.k), qty: num(l.q) }
        : { type: T[l.t], side: l.sd === "l" ? "long" : "short", strike: num(l.k), premium: num(l.pr), qty: num(l.q) })),
    multiplier: num(s.mult), feePerContract: num(s.fee), expiryPrice: num(s.at),
  });

  const name = (s) => (O.PRESETS[s.pre] ? O.PRESETS[s.pre].name.toLowerCase() : "position");
  const m = (v) => money(v).replace(/\.00(?=\D*$)/, "");
  const p = (v) => price(v).replace(/\.00(?=\D*$)/, "");

  function render(s) {
    const fail = (field, message) => { what.hidden = true; return { ok: false, errors: [{ field, message }] }; };
    if (s.at === "") return fail("at", "Enter the stock price at expiry to see your profit.");
    if (!(num(s.at) >= 0)) return fail("at", "The stock price at expiry can't be negative.");
    if (s.und !== "" && !(num(s.und) > 0)) return fail("und", "The stock price must be greater than zero.");
    if (s.mult === "") return fail("multiplier", "Enter the shares per contract (100 for US stock options).");
    const i = input(s);
    const r = O.calculate(i);
    if (!r.ok) { what.hidden = true; return r; }
    const pl = r.atExpiry.profit, at = num(s.at);
    // max loss and max profit as plain amounts: the label already says which it is
    const ml = r.maxLossUnlimited ? "Unlimited" : money(Math.abs(r.maxLoss));
    const mp = r.maxProfitUnlimited ? "Unlimited" : money(Math.abs(r.maxProfit));
    const be = r.breakEvens.length ? r.breakEvens.map(price).join(" / ") : "None";
    const debit = r.netPremium >= 0;
    // the sentence, in the stock page's equation pattern:
    //   "Bought 1 call at a $100 strike for $350. At $110: $1,000 value − $350 cost = $650 profit"
    // terms of the equation, signed by their effect on profit; the first is the lead
    const stockPL = i.legs.filter((l) => l.type === "stock").reduce((t, l) => t + (at - l.price) * l.qty * (l.side === "long" ? 1 : -1), 0);
    const value = pl + r.fees + r.netPremium - stockPL;       // what the options are worth at expiry (signed)
    const terms = debit
      ? [[value, value < 0 ? "owed" : "value"], [-r.netPremium, "cost"]]
      : [[-r.netPremium, "premium"], [value, value < 0 ? "owed" : "value"]];
    if (stockPL) terms.push([stockPL, stockPL >= 0 ? "stock gain" : "stock loss"]);
    if (r.fees) terms.push([-r.fees, "fees"]);
    const end = `<b>${m(Math.abs(pl))} ${pl >= 0 ? "profit" : "loss"}</b>`;
    const math = terms.map(([v, label], n) => `${n ? (v < 0 ? "− " : "+ ") : ""}${m(Math.abs(v))} ${label}`).join(" ") + ` = ${end}`;
    const b = (v) => `<b>${m(v)}</b>`;
    let say;
    if (single(s)) {
      const l = i.legs[0], c = `${qty(l.qty)} ${l.type}${l.qty === 1 ? "" : "s"}`;
      say = `${l.side === "long" ? "Bought" : "Sold"} ${c} at a ${b(l.strike)} strike for ${b(Math.abs(r.netPremium))}.`;
    } else {
      say = `Opened this ${name(s)} for a ${b(Math.abs(r.netPremium))} ${debit ? "debit" : "credit"}.`;
    }
    say += ` At ${b(at)}: ${math}`;
    // value today (Black-Scholes): needs today's stock price and days left
    const u = num(s.und), days = num(s.dte), today = u > 0 && days > 0 && num(s.iv) > 0 ? O.todayAt(i, u, days, num(s.iv), num(s.rate) || 0) : null;
    const more = [
      ...(today !== null ? [[`If closed today at ${pp(u)} (${qty(days)} days left)`, money(today, { sign: true })]] : []),
      [debit ? "Net debit (paid)" : "Net credit (received)", money(Math.abs(r.netPremium))],
      ["Max profit", mp],
      ["Max loss", ml],
      ...(r.stockCost ? [["Stock leg", money(Math.abs(r.stockCost))]] : []),
      ...(r.fees ? [["Fees", money(r.fees)]] : []),
    ];
    const wf = renderWhatIf(i, r, num(s.und), at, today !== null ? { days, iv: num(s.iv), rate: num(s.rate) || 0 } : null);
    return { ok: true, html: `<div><p class="res-kick">${pl >= 0 ? "Profit" : "Loss"} at expiry</p>
        <p class="res-big ${tone(pl)}">${money(pl, { sign: true })}</p>
        <p class="res-sub">if the stock is ${price(at)}</p></div>
      <dl class="res-grid">
        <div><dt>Break-even</dt><dd>${be}</dd></div>
        <div><dt>Max loss</dt><dd class="is-down">${ml}</dd></div>
      </dl>
      <p class="res-say">${say}</p>
      <div class="res-links"><button type="button" class="c-toggle" data-toggle="dt" aria-expanded="${s.dt === "1"}">Details</button></div>
      ${s.dt === "1" ? `<dl class="res-details">${more.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>` : ""}
      <p class="res-warn">${today === null ? "Valued at expiry. Add today's stock price under More options to see today's value too." : "Profit at expiry; the dashed curve is an estimate of today's value (Black-Scholes)."}</p>
      <section class="res-chart" aria-labelledby="res-chart-title"><h3 id="res-chart-title">Payoff at expiration</h3>${wf.html}</section>`, bind: [wf.bind] };
  }

  const mm = (v) => money(v).replace(/\.00(?=\D*$)/, ""), pp = (v) => price(v).replace(/\.00(?=\D*$)/, "");
  function renderWhatIf(i, r, u, at, now) {
    const ks = [...r.kinks, ...r.breakEvens, ...(u > 0 ? [u] : []), ...(at > 0 ? [at] : [])].filter((x) => x > 0);
    if (!ks.length) ks.push(100);
    const lo = Math.max(0, Math.min(...ks) * 0.8), hi = Math.max(...ks) * 1.2;
    const pts = O.curve(i, lo, hi, 160).map((p) => ({ x: p.price, y: p.profit }));
    // the agreed chart grammar: entry (today's price, when known), break-even dots, a two-line exit label
    const markers = [];
    if (u > 0) markers.push({ x: u, label: `Today ${pp(u)}`, color: "var(--fg-secondary)" });
    if (at > 0) {
      const pl = O.profitAt(i, at);
      markers.push({ x: at, label: [`At expiry ${pp(at)}`, `${pl >= 0 ? "Profit" : "Loss"} ${mm(Math.abs(pl))}`], color: pl >= 0 ? "var(--c-up)" : "var(--c-down)", axis: true });
    }
    const dots = r.breakEvens.map((b) => ({ x: b, y: 0, label: `Break-even ${pp(b)}` }));
    const extra = now ? [{ points: O.todayCurve(i, lo, hi, now.days, now.iv, now.rate, 120).map((q) => ({ x: q.price, y: q.profit })), color: "var(--fg-primary)" }] : [];
    const chart = lineChart({ points: pts, label: "Profit or loss at expiration by stock price", markers, dots, extra, height: 280,
      xFmt: (v, axis) => (axis ? CalcUI.currency.sym + CalcUI.compact(v) : price(v)), yFmt: (v, axis) => (axis ? moneyAxis(v) : money(v, { sign: true })) });
    return { html: `${chart.html}
      <div class="c-legend"><span><i style="background:var(--c-up)"></i>Profit</span><span><i style="background:var(--c-down)"></i>Loss</span>${now ? `<span>Dashed: today, ${qty(now.days)} days left (estimate)</span>` : ""}</div>`, bind: (el) => chart.bind(el) };
  }

  // the article's worked examples are tabs; the open tab follows the strategy chosen above,
  // and a reader can still click through the others
  const oxTabs = document.querySelector(".ox-tabs"), oxName = document.querySelector("[data-ox-name]");
  const exampleFor = (st) => ({ "short-call": "long-call", "short-put": "cash-secured-put", custom: "long-call" })[st.pre] || st.pre;
  const showExample = (key, focus) => {
    const tab = oxTabs && oxTabs.querySelector(`[data-ox-tab="${key}"]`);
    if (!tab) return;
    oxTabs.querySelectorAll("[data-ox-tab]").forEach((t) => {
      const on = t === tab;
      t.classList.toggle("is-active", on); t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    oxName.textContent = tab.textContent.toLowerCase();
    if (focus) tab.focus();
    tab.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  let lastPick = null;                               // only follow the calculator when its strategy changes
  if (oxTabs) {
    oxTabs.addEventListener("click", (e) => { const t = e.target.closest("[data-ox-tab]"); if (t) showExample(t.dataset.oxTab); });
    oxTabs.addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const all = [...oxTabs.querySelectorAll("[data-ox-tab]")], n = all.indexOf(document.activeElement);
      const next = e.key === "Home" ? 0 : e.key === "End" ? all.length - 1 : (n + (e.key === "ArrowLeft" ? -1 : 1) + all.length) % all.length;
      showExample(all[next].dataset.oxTab, true);
    });
  }
  const sync = (st) => {
    root.querySelectorAll(".calc-form [data-toggle]").forEach((b) => b.setAttribute("aria-expanded", String(st[b.dataset.toggle] === "1")));
    const pick = exampleFor(st);
    if (pick !== lastPick) { lastPick = pick; showExample(pick); }
  };
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-toggle]");
    if (t) ui.set(t.dataset.toggle, ui.state[t.dataset.toggle] === "1" ? "" : "1");
  });
  const ui = CalcUI.create({ root, defaults, render, extras, onState: sync });
})();
