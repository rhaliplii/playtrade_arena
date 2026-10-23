// Ticker search for the stock and crypto calculators: the Global search popup (Figma "Global
// search", node 7587:18283), opened from a calculator's Stock / Coin field on its Tickers tab.
// Picking a ticker hands it back to the calculator, which fills the ticker and the buy price.
//
//   TickerSearch.open({ kind: "stock" | "crypto", onPick(ticker) })
//
// DATA: a sample list with sample prices until the market-data feed (Darqube Horizon) is
// connected. Swap `source()` for the feed's search + latest-quote calls; nothing else changes.
(() => {
  const SAMPLE = [
    // stocks and ETFs (US listings)
    ["AAPL", "Apple Inc", "Stocks", "NASDAQ", 228.52], ["MSFT", "Microsoft Corporation", "Stocks", "NASDAQ", 432.11],
    ["NVDA", "NVIDIA Corporation", "Stocks", "NASDAQ", 135.24], ["AMZN", "Amazon.com Inc", "Stocks", "NASDAQ", 198.37],
    ["GOOGL", "Alphabet Inc Class A", "Stocks", "NASDAQ", 172.33], ["META", "Meta Platforms Inc", "Stocks", "NASDAQ", 585.61],
    ["TSLA", "Tesla Inc", "Stocks", "NASDAQ", 248.94], ["NFLX", "Netflix Inc", "Stocks", "NASDAQ", 712.43],
    ["AMD", "Advanced Micro Devices Inc", "Stocks", "NASDAQ", 156.32], ["PLTR", "Palantir Technologies Inc", "Stocks", "NASDAQ", 41.52],
    ["INTC", "Intel Corporation", "Stocks", "NASDAQ", 22.41], ["JPM", "JPMorgan Chase & Co", "Stocks", "NYSE", 222.84],
    ["V", "Visa Inc", "Stocks", "NYSE", 289.37], ["KO", "Coca-Cola Co", "Stocks", "NYSE", 69.82],
    ["DIS", "Walt Disney Co", "Stocks", "NYSE", 98.71], ["BA", "Boeing Co", "Stocks", "NYSE", 156.18],
    ["SPY", "SPDR S&P 500 ETF Trust", "ETFs", "NYSE Arca", 572.29], ["QQQ", "Invesco QQQ Trust", "ETFs", "NASDAQ", 489.12],
    ["VTI", "Vanguard Total Stock Market Index Fund ETF Shares", "ETFs", "NYSE Arca", 284.53], ["VOO", "Vanguard S&P 500 ETF", "ETFs", "NYSE Arca", 525.77],
    // crypto (USD prices)
    ["BTC", "Bitcoin", "Crypto", "", 67450], ["ETH", "Ethereum", "Crypto", "", 2620.4],
    ["SOL", "Solana", "Crypto", "", 152.31], ["XRP", "XRP", "Crypto", "", 0.5412],
    ["BNB", "BNB", "Crypto", "", 585.2], ["DOGE", "Dogecoin", "Crypto", "", 0.1184],
    ["ADA", "Cardano", "Crypto", "", 0.3621], ["AVAX", "Avalanche", "Crypto", "", 27.43],
    ["DOT", "Polkadot", "Crypto", "", 4.352], ["LINK", "Chainlink", "Crypto", "", 11.62],
    ["LTC", "Litecoin", "Crypto", "", 68.21], ["TON", "Toncoin", "Crypto", "", 5.214],
    ["TRX", "TRON", "Crypto", "", 0.1603], ["SHIB", "Shiba Inu", "Crypto", "", 0.00001782],
  ].map(([symbol, name, type, exchange, price]) => ({ symbol, name, type, exchange, price }));
  const TRENDING = { stock: ["TSLA", "NVDA", "AAPL", "AMZN", "MSFT", "META", "PLTR", "SPY"], crypto: ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB"],
    any: ["TSLA", "NVDA", "BTC", "AAPL", "ETH", "AMZN", "SOL", "SPY"] };
  // the category chips each calculator offers (the popup's full set is Trending, Crypto,
  // Stocks, Forex, Indices, Commodities, ETFs; only the ones a calculator can use are shown)
  const CHIPS = { stock: ["Trending", "Stocks", "ETFs"], crypto: ["Trending", "Crypto"], any: ["Trending", "Stocks", "ETFs", "Crypto"] };
  const KINDS = { stock: ["Stocks", "ETFs"], crypto: ["Crypto"], any: ["Stocks", "ETFs", "Crypto"] };
  const NOUN = { stock: "stocks", crypto: "coins", any: "tickers" };

  const source = (kind) => SAMPLE.filter((t) => KINDS[kind].includes(t.type));
  const find = (symbol) => SAMPLE.find((t) => t.symbol === String(symbol || "").toUpperCase()) || null;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  // a logo stand-in: the ticker's first letter on a colour from its name
  const hue = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const logo = (t) => `<span class="gs-logo" style="--h:${hue(t.symbol)}" aria-hidden="true">${esc(t.symbol[0])}</span>`;

  const RECENT_KEY = "calc_ticker_recent_v1";
  const recent = (kind) => { try { return (JSON.parse(localStorage.getItem(RECENT_KEY)) || []).map(find).filter((t) => t && KINDS[kind].includes(t.type)); } catch { return []; } };
  const remember = (t) => {
    try {
      const list = [t.symbol, ...(JSON.parse(localStorage.getItem(RECENT_KEY)) || []).filter((s) => s !== t.symbol)].slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch { /* storage unavailable */ }
  };

  const ICON = {
    search: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="m13.5 13.5 3.5 3.5"/></svg>',
    close: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15"/></svg>',
    history: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 10a6.5 6.5 0 1 0 1.9-4.6L3.5 7.3"/><path d="M3.5 3.8v3.5H7M10 6.5V10l2.5 1.5"/></svg>',
  };

  let dlg = null;
  function open({ kind = "stock", onPick } = {}) {
    if (dlg) dlg.remove();
    const opener = document.activeElement;
    let chip = "Trending", tab = "tickers", hi = 0, rows = [];
    dlg = document.createElement("div");
    dlg.className = "gs";
    dlg.innerHTML = `<div class="gs__backdrop" data-close></div>
      <div class="gs__panel" role="dialog" aria-modal="true" aria-label="Search ${NOUN[kind]}">
        <div class="gs__top">
          <label class="gs__search">${ICON.search}<span class="sr-only">Search</span>
            <input type="text" autocomplete="off" spellcheck="false" placeholder="${{ crypto: "Search coin, e.g. BTC or Ethereum", any: "Search stock or coin, e.g. AAPL or BTC" }[kind] || "Search ticker or company, e.g. AAPL"}" role="combobox" aria-expanded="true" aria-controls="gs-list" aria-autocomplete="list">
            <button type="button" class="gs__clear" hidden>Clear</button></label>
          <button type="button" class="gs__x" data-close aria-label="Close">${ICON.close}</button>
        </div>
        <div class="gs__tabs" role="tablist">
          <button type="button" class="gs__tab gs__tab--icon" role="tab" data-tab="recent" aria-label="Recent">${ICON.history}</button>
          <button type="button" class="gs__tab" role="tab" data-tab="tickers">Tickers</button>
        </div>
        <div class="gs__bar">
          <div class="gs__chips" role="group" aria-label="Category">${CHIPS[kind].map((c) => `<button type="button" class="gs__chip" data-chip="${c}">${c}<span class="gs__n"></span></button>`).join("")}</div>
        </div>
        <div class="gs__list" id="gs-list" role="listbox" aria-label="Tickers"></div>
        <p class="gs__note">Sample prices for the prototype. Live, delayed prices come with the market-data feed.</p>
      </div>`;
    document.body.append(dlg);
    document.documentElement.classList.add("gs-open");
    const input = dlg.querySelector("input"), list = dlg.querySelector(".gs__list"), clear = dlg.querySelector(".gs__clear");

    const pool = () => {
      const q = input.value.trim().toLowerCase(), all = source(kind);
      if (tab === "recent") return recent(kind);
      if (q) return all.filter((t) => t.symbol.toLowerCase().startsWith(q) || t.name.toLowerCase().includes(q))
        .sort((a, b) => (b.symbol.toLowerCase() === q) - (a.symbol.toLowerCase() === q) || (b.symbol.toLowerCase().startsWith(q)) - (a.symbol.toLowerCase().startsWith(q)));
      if (chip === "Trending") return TRENDING[kind].map(find);
      return all.filter((t) => t.type === chip);
    };
    const draw = () => {
      rows = pool();
      hi = Math.min(hi, Math.max(0, rows.length - 1));
      const q = input.value.trim();
      dlg.querySelectorAll(".gs__tab").forEach((b) => { const on = b.dataset.tab === tab; b.classList.toggle("is-on", on); b.setAttribute("aria-selected", String(on)); });
      dlg.querySelectorAll(".gs__chip").forEach((b) => {
        const c = b.dataset.chip, on = !q && tab === "tickers" && c === chip;
        b.classList.toggle("is-on", on);
        b.querySelector(".gs__n").textContent = c === "Trending" ? TRENDING[kind].length : source(kind).filter((t) => t.type === c).length;
      });
      dlg.querySelector(".gs__bar").hidden = tab === "recent";
      clear.hidden = !q;
      list.innerHTML = rows.length
        ? rows.map((t, n) => `<button type="button" class="gs__row${n === hi ? " is-hi" : ""}" role="option" id="gs-o${n}" aria-selected="${n === hi}" data-n="${n}">
            ${logo(t)}<span class="gs__sym">${esc(t.symbol)}</span><span class="gs__name">${esc(t.name)}</span>
            <span class="gs__type">${esc(t.type)}</span><span class="gs__ex">${esc(t.exchange)}</span></button>`).join("")
        : `<p class="gs__empty">${tab === "recent" ? "Tickers you pick will show here." : `No ${NOUN[kind]} match “${esc(q)}”.`}</p>`;
      input.setAttribute("aria-activedescendant", rows.length ? `gs-o${hi}` : "");
    };
    const pick = (t) => { if (!t) return; remember(t); close(); onPick && onPick(t); };
    const close = () => {
      if (!dlg) return;
      dlg.remove(); dlg = null;
      document.documentElement.classList.remove("gs-open");
      document.removeEventListener("keydown", onKey, true);
      if (opener && opener.focus) opener.focus();
    };
    const move = (d) => {
      if (!rows.length) return;
      hi = (hi + d + rows.length) % rows.length;
      list.querySelectorAll(".gs__row").forEach((r, n) => { r.classList.toggle("is-hi", n === hi); r.setAttribute("aria-selected", String(n === hi)); });
      input.setAttribute("aria-activedescendant", `gs-o${hi}`);
      list.querySelector(`#gs-o${hi}`)?.scrollIntoView({ block: "nearest" });
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); move(e.key === "ArrowDown" ? 1 : -1); }
      else if (e.key === "Enter" && document.activeElement === input) { e.preventDefault(); pick(rows[hi]); }
      else if (e.key === "Tab") {                       // keep focus inside the dialog
        const f = [...dlg.querySelectorAll("input, button:not([hidden])")].filter((x) => x.offsetParent !== null);
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKey, true);
    input.addEventListener("input", () => { tab = "tickers"; hi = 0; draw(); });
    clear.addEventListener("click", () => { input.value = ""; hi = 0; draw(); input.focus(); });
    dlg.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) return close();
      const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; hi = 0; draw(); return; }
      const c = e.target.closest("[data-chip]"); if (c) { chip = c.dataset.chip; tab = "tickers"; input.value = ""; hi = 0; draw(); return; }
      const r = e.target.closest(".gs__row"); if (r) pick(rows[Number(r.dataset.n)]);
    });
    list.addEventListener("pointermove", (e) => { const r = e.target.closest(".gs__row"); if (r && Number(r.dataset.n) !== hi) move(Number(r.dataset.n) - hi); });
    draw();
    input.focus();
  }

  // Wire a calculator's Stock / Coin field. `ui` is a getter for the calculator (CalcUI.create's
  // result); picking sets tk and puts the current price in the buy and sell prices (`priceKeys`:
  // the result starts as "if you sold now"), plus anything `also` adds. Returns
  // refresh(state) for the calculator's onState hook, which redraws the field from the URL state.
  function wire({ root, kind, ui, priceKeys, also, filled = "the buy and sell price" }) {
    const fld = root.querySelector(".c-ticker");
    if (!fld) return () => {};
    const clear = fld.querySelector("[data-tk-clear]"), hint = fld.querySelector("[data-tk-hint]");
    fld.querySelector("[data-ticker-open]").addEventListener("click", () => open({
      kind,
      onPick: (t) => {
        const u = ui(), before = Object.assign({}, u.state);   // `also` may need the values the pick replaces
        u.set("tk", t.symbol); priceKeys.forEach((k) => u.set(k, String(t.price))); if (also) also(t, u, before);
      },
    }));
    clear.addEventListener("click", () => { ui().set("tk", ""); fld.querySelector("[data-ticker-open]").focus(); });
    // the box shows the pick (logo, ticker, name) with × to clear; the hint says where the price went
    const label = fld.querySelector("[data-tk-label]"), btn = fld.querySelector("[data-ticker-open]");
    const empty = label.textContent;
    return (st) => {
      const sym = String(st.tk || "").toUpperCase(), t = find(sym);
      fld.classList.toggle("is-set", !!sym);
      clear.hidden = !sym;
      btn.querySelector(".gs-logo")?.remove();
      if (sym) btn.querySelector("svg").insertAdjacentHTML("afterend", logo(t || { symbol: sym }));
      btn.querySelector("svg").style.display = sym ? "none" : "";
      label.textContent = sym ? (t ? `${t.symbol} · ${t.name}` : sym) : empty;
      hint.textContent = t ? `Sample price ${t.price.toLocaleString("en-US", { style: "currency", currency: "USD", maximumSignificantDigits: t.price < 1 ? 4 : undefined })}, filled in as ${filled}` : "";
    };
  }

  window.TickerSearch = { open, find, wire };
})();
