// Left side navigation shared by the arena and the join screens (Figma: Navigation, node 663:11505).
// Include right after <aside class="side-nav" id="sideNav" data-active="..."> so it renders before first paint.
(() => {
  const STORE_KEY = "pt_sidenav_collapsed_v1";
  const nav = document.getElementById("sideNav");
  if (!nav) return;
  const active = nav.dataset.active;

  // The side nav serves two sections. Playtrade is the default; Learn pages ask for
  // their own set with data-nav="learn" — same markup, same styles, different items.
  const LEARN_MAIN = [
    { id: "learn-home", label: "Learn Home", icon: "ln-home.svg", href: "#" },
    { id: "academy", label: "Academy", icon: "nav-academy.svg", href: "academy/index.html" },
    { id: "tutorials", label: "Video Tutorials", icon: "ln-play.svg", href: "#" },
    { id: "briefs", label: "Weekly Briefs", icon: "ln-lamp.svg", href: "#" },
    { id: "daily", label: "AI Daily Brief", icon: "ln-flash.svg", href: "#" },
    { id: "pulse", label: "Market Pulse", icon: "ln-heart-rate.svg", href: "#" },
    { id: "blog", label: "Blog", icon: "ln-message-text.svg", href: "#" },
  ];
  const LEARN_BOTTOM = [
    { id: "notes", label: "Release Notes", icon: "ln-note.svg", href: "#" },
    { id: "faqs", label: "FAQs", icon: "ln-question.svg", href: "index.html#faq-title" },
    { id: "help", label: "Help", icon: "nav-help.svg", href: "#" },
  ];

  // Trading calculator pages (data-nav="calc"): the calculators only, no Pro card or bottom group.
  const CALC_MAIN = [
    { id: "hub", label: "All calculators", icon: "tl-calc-all.svg", href: "trading_calculators/index.html" },
    { id: "stock", label: "Stock profit", icon: "tl-calc-stock.svg", href: "trading_calculators/stock-profit-calculator/index.html" },
    { id: "crypto", label: "Crypto profit", icon: "tl-calc-crypto.svg", href: "trading_calculators/crypto-profit-calculator/index.html" },
    { id: "position", label: "Position size", icon: "tl-calc-position.svg", href: "trading_calculators/position-size-calculator/index.html" },
    { id: "options", label: "Options profit", icon: "tl-calc-options.svg", href: "trading_calculators/options-profit-calculator/index.html" },
    { id: "margin", label: "Margin", icon: "tl-calc-margin.svg", href: "trading_calculators/margin-calculator/index.html" },
  ];

  const MAIN = [
    { id: "tournaments", label: "Tournaments", icon: "nav-cup.svg", href: "index.html", whiteIcon: true },
    { id: "games", label: "Market Games", icon: "nav-game.svg", href: "index.html#games-title", badge: 1 },
    { id: "stats", label: "My Stats", icon: "nav-crown.svg", href: "#" },
    { id: "leaderboard", label: "Leaderboard", icon: "nav-ranking.svg", href: "index.html#top-title" },
    { id: "missions", label: "Missions", icon: "nav-target.svg", href: "index.html#missions-title" },
    { id: "toolbox", label: "Toolbox", tools: true, href: "#" },
    { id: "toolshop", label: "Toolshop", icon: "nav-shop.svg", href: "#" },
    { id: "wallet", label: "Wallet", icon: "nav-wallet.svg", href: "#", base: true, coins: "54,930" },
  ];
  const BOTTOM = [
    { id: "brokers", label: "Brokers", icon: "nav-user-tick.svg", href: "#", base: true, brokers: true },
    { id: "refer", label: "Refer a Friend", icon: "nav-gift.svg", href: "#" },
    { id: "help", label: "Help", icon: "nav-help.svg", href: "#" },
  ];

  const icon = (item) =>
    item.tools
      ? // Figma exports the Toolbox slot as the default user glyph; this is the real one, drawn flipped
        '<span class="side-nav__icon ico-flip"><img class="ico-flip__img" src="assets/sb2-tools.svg" alt=""></span>'
      : `<span class="side-nav__icon"><img class="${item.whiteIcon ? "is-white" : ""}" src="assets/${item.icon}" alt=""></span>`;

  const extra = (item) => {
    if (item.coins)
      return `<span class="side-nav__coins"><img src="assets/nav-coin.svg" alt="">${item.coins}</span>`;
    if (item.brokers)
      return `<span class="side-nav__logos" aria-hidden="true"><img src="assets/nav-broker-1.svg" alt=""><img src="assets/nav-broker-2.svg" alt=""><span class="side-nav__logo3"><img src="assets/nav-broker-3-bg.svg" alt=""><img class="a" src="assets/nav-broker-3-a.svg" alt=""><img class="b" src="assets/nav-broker-3-b.svg" alt=""></span></span>`;
    return "";
  };

  const link = (item) => {
    const cls = ["side-nav__item", item.base && "side-nav__item--base", item.id === active && "is-active"].filter(Boolean).join(" ");
    const current = item.id === active ? ' aria-current="page"' : "";
    const badge = item.badge ? `<span class="side-nav__badge">${item.badge}</span>` : "";
    return `<a class="${cls}" href="${item.href}" data-label="${item.label}"${current}>${icon(item)}${badge}<span class="side-nav__label">${item.label}</span>${extra(item)}</a>`;
  };

  const learn = nav.dataset.nav === "learn";
  const calc = nav.dataset.nav === "calc";
  const mainItems = calc ? CALC_MAIN : learn ? LEARN_MAIN : MAIN;
  const bottomItems = learn ? LEARN_BOTTOM : BOTTOM;

  nav.innerHTML = `
    <div class="side-nav__scroll">
      <nav class="side-nav__group" aria-label="Main">${mainItems.map(link).join("")}</nav>
      ${calc ? "" : `<div class="side-nav__bottom">
        <div class="side-nav__pro">
          <img src="assets/nav-pro.svg" alt="" width="30" height="30">
          <div class="side-nav__pro-copy">
            <p class="side-nav__pro-title">Pro Subscription</p>
            <p class="side-nav__pro-text">Get full access from only <b>$9.99/month.</b></p>
          </div>
          <a class="btn-brand side-nav__pro-btn" href="#">Become Pro</a>
        </div>
        <div class="side-nav__group">${bottomItems.map(link).join("")}</div>
      </div>`}
    </div>
    <button class="side-nav__toggle" type="button"><img src="assets/nav-toggle-arrow.svg" alt=""></button>`;

  const toggle = nav.querySelector(".side-nav__toggle");
  const apply = (collapsed) => {
    nav.classList.toggle("is-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", collapsed ? "Expand navigation" : "Collapse navigation");
    // Labels are hidden when collapsed, so show them as tooltips instead
    nav.querySelectorAll(".side-nav__item").forEach((a) => {
      if (collapsed) { a.title = a.dataset.label; a.setAttribute("aria-label", a.dataset.label); }
      else { a.removeAttribute("title"); a.removeAttribute("aria-label"); }
    });
  };

  let collapsed = true;
  try { collapsed = localStorage.getItem(STORE_KEY) !== "0"; } catch { /* storage unavailable */ }
  nav.classList.add("no-anim"); // don't animate the initial state
  apply(collapsed);
  requestAnimationFrame(() => requestAnimationFrame(() => nav.classList.remove("no-anim")));

  toggle.addEventListener("click", () => {
    collapsed = !collapsed;
    apply(collapsed);
    try { localStorage.setItem(STORE_KEY, collapsed ? "1" : "0"); } catch { /* storage unavailable */ }
  });

})();
