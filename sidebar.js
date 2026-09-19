// Left side navigation shared by the arena and the join screens (Figma: Navigation, node 663:11505).
// Include right after <aside class="side-nav" id="sideNav" data-active="..."> so it renders before first paint.
(() => {
  const STORE_KEY = "pt_sidenav_collapsed_v1";
  const nav = document.getElementById("sideNav");
  if (!nav) return;
  const active = nav.dataset.active;

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
  // Top-menu destinations; only shown in the mobile drawer, where the top menu is hidden
  const SITE = [
    { label: "Home", href: "landing.html" },
    { label: "Tools", href: "landing.html#features" },
    { label: "Learn", href: "#" },
    { label: "Plans", href: "landing.html#plans" },
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

  nav.innerHTML = `
    <div class="side-nav__scroll">
      <nav class="side-nav__group" aria-label="Main">${MAIN.map(link).join("")}</nav>
      <div class="side-nav__bottom">
        <div class="side-nav__pro">
          <img src="assets/nav-pro.svg" alt="" width="30" height="30">
          <div class="side-nav__pro-copy">
            <p class="side-nav__pro-title">Pro Subscription</p>
            <p class="side-nav__pro-text">Get full access from only <b>$9.99/month.</b></p>
          </div>
          <a class="btn-brand side-nav__pro-btn" href="#">Become Pro</a>
        </div>
        <div class="side-nav__group">${BOTTOM.map(link).join("")}</div>
        <nav class="side-nav__site" aria-label="Profit.com">
          <p class="side-nav__site-title">Profit.com</p>
          ${SITE.map((l) => `<a class="side-nav__site-link" href="${l.href}">${l.label}</a>`).join("")}
        </nav>
      </div>
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

  // ---- Phones and small tablets: the side navigation becomes a drawer opened from the top bar
  const bar = document.querySelector(".topnav");
  if (!bar) return;
  const burger = document.createElement("button");
  burger.type = "button";
  burger.className = "topnav__burger";
  burger.setAttribute("aria-controls", "sideNav");
  burger.setAttribute("aria-expanded", "false");
  burger.setAttribute("aria-label", "Open menu");
  burger.innerHTML = '<span></span><span></span><span></span>';
  bar.prepend(burger);

  const scrim = document.createElement("div");
  scrim.className = "side-nav-scrim";
  scrim.hidden = true;
  nav.after(scrim);

  const setDrawer = (open, fromKeyboard = false) => {
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.documentElement.classList.toggle("has-drawer", open);
    if (open) {
      scrim.hidden = false;
      requestAnimationFrame(() => scrim.classList.add("is-on"));
      if (fromKeyboard) nav.querySelector("a")?.focus({ preventScroll: true });
    } else {
      scrim.classList.remove("is-on");
      setTimeout(() => { if (!nav.classList.contains("is-open")) scrim.hidden = true; }, 250);
    }
  };
  // e.detail is 0 for keyboard-triggered clicks: move focus into the drawer only then
  burger.addEventListener("click", (e) => setDrawer(!nav.classList.contains("is-open"), e.detail === 0));
  scrim.addEventListener("click", () => setDrawer(false));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setDrawer(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) { setDrawer(false); burger.focus(); }
  });
  // Leaving the phone layout closes the drawer
  matchMedia("(min-width: 861px)").addEventListener("change", (e) => { if (e.matches) setDrawer(false); });
})();
