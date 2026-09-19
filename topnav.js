// Profit.com top navigation (Figma: Navigation — Playtrade 492:11532, Tools 174:8896,
// Learn 173:39451, More 173:46479). Shared by every page.
//   > 1024px  desktop bar: each menu opens a dropdown panel
//   ≤ 1024px  ☰ opens a full menu drawer built from the same data (see .mnav in styles.css)
const initTopnav = () => {
  const bar = document.querySelector(".topnav");
  if (!bar) return;
  // Show the bar's bottom edge only while content is scrolled beneath it
  const markScrolled = () => bar.classList.toggle("is-scrolled", window.scrollY > 4);
  addEventListener("scroll", markScrolled, { passive: true });
  markScrolled();

  const items = [...bar.querySelectorAll(".topnav__menu > .topnav__item")];
  const byLabel = (label) => items.find((a) => a.textContent.trim() === label);

  // Pages outside the arena (the landing page) set <body data-nav-active="none">
  const outside = document.body.dataset.navActive === "none";
  const active = outside ? "" : document.getElementById("sideNav")?.dataset.active || "tournaments";

  // ---------- Shared building blocks ----------
  const SOCIAL = [
    ["Telegram", "ft-telegram.svg"], ["Facebook", "ft-facebook.svg"], ["YouTube", "ft-youtube.svg"], ["X", "ft-x.svg"], ["LinkedIn", "ft-linkedin.svg"],
  ];
  const community = `
    <div class="nav-dd__community">
      <p class="nav-dd__title">Join Community</p>
      <div class="nav-dd__stores">
        <a class="nav-dd__store nav-dd__store--apple" href="#"><img src="assets/ft-apple.svg" alt="">App Store</a>
        <a class="nav-dd__store nav-dd__store--google" href="#" aria-label="Get it on Google Play"><img class="gp-icon" src="assets/ft-playstore.svg" alt=""><img class="gp-text" src="assets/ft-googleplay-text.svg" alt=""></a>
      </div>
      <div class="nav-dd__social">${SOCIAL.map(([n, f]) => `<a href="#" aria-label="${n}"><img src="assets/${f}" alt=""></a>`).join("")}</div>
    </div>`;

  const icon = (it) =>
    it.tools
      ? '<span class="nav-dd__icon ico-flip"><img class="ico-flip__img" src="assets/sb2-tools.svg" alt=""></span>'
      : `<span class="nav-dd__icon"><img src="assets/${it.icon}" alt=""></span>`;
  const item = (it) => {
    const on = Boolean(it.id) && it.id === active;
    const chevron = it.sub ? '<img class="nav-dd__chev" src="assets/tl-chevron.svg" alt="">' : "";
    return `<a class="nav-dd__item${on ? " is-active" : ""}" href="${it.href}" role="menuitem"${on ? ' aria-current="page"' : ""}>${icon(it)}${it.label}${it.extra || ""}${chevron}</a>`;
  };
  const list = (arr) => arr.map(item).join("");

  const faces = '<span class="nav-dd__faces" aria-hidden="true"><img src="assets/tl-bn-1.png" alt=""><img src="assets/tl-bn-2.png" alt=""><img src="assets/tl-bn-3.png" alt=""></span>';
  const hot = '<img class="nav-dd__emoji" src="assets/tl-fire.svg" alt="" title="Popular">';
  const telegram = '<span class="nav-dd__tg" title="Also on Telegram"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.3 7.7l7.9-3.1c.4-.1.7.1.6.6l-1.3 6.3c-.1.5-.4.6-.8.4l-2-1.5-1 .9c-.1.1-.2.2-.4.2l.1-2.1 3.8-3.4c.2-.1 0-.2-.2-.1L5.2 8.9l-2-.6c-.5-.2-.5-.5.1-.6z" fill="#fff"/></svg></span>';
  const newTag = '<span class="nav-dd__new">New</span>';

  const PARTNERS = [
    { name: "XM.com", logo: "mr-xm.svg", tag: true, text: "$2,500 weekly prize pool. <br>10 traders to win. Free entry." },
    { name: "Zoomex", logo: "mr-zoomex.svg", text: "Get 30% Trading fee discount for 3 months!" },
    { name: "Capex", logo: "mr-capex.svg", text: "Sign up and claim up to <br>100% deposit bonus." },
  ];
  const partner = (p) => `
    <a class="nav-dd__partner" href="#" role="menuitem">
      <img class="nav-dd__partner-logo" src="assets/${p.logo}" alt="">
      <span class="nav-dd__partner-copy">
        <span class="nav-dd__partner-name">${p.name}${p.tag ? '<span class="nav-dd__comp"><img src="assets/mr-trophy.svg" alt="">COMPETITION</span>' : ""}</span>
        <span class="nav-dd__partner-text">${p.text}</span>
      </span>
    </a>`;
  const refer = `
    <a class="nav-dd__refer" href="#" role="menuitem">
      <span class="nav-dd__refer-title">Earn <span class="nav-dd__cash">$10</span> CASH for every PRO+ Friend you Refer!</span>
      <span class="nav-dd__refer-avatars" aria-hidden="true">${["lp-av-2.png", "lp-av-5.png", "lp-av-3.png", "lp-av-4.png"].map((f) => `<img src="assets/${f}" alt="">`).join("")}</span>
    </a>`;

  // ---------- Menu content: one source for the desktop dropdowns and the mobile drawer ----------
  const MENUS = [
    {
      key: "playtrade",
      label: "Playtrade",
      icon: "cup.svg",
      href: "index.html",
      current: !outside,
      left: [
        { id: "tournaments", label: "Tournaments", icon: "nav-cup.svg", href: "index.html" },
        { id: "games", label: "Market Games", icon: "nav-game.svg", href: "index.html#games-title" },
        { id: "stats", label: "My Stats", icon: "nav-crown.svg", href: "#" },
        { id: "leaderboard", label: "Leaderboard", icon: "nav-ranking.svg", href: "index.html#top-title" },
        { id: "missions", label: "Missions", icon: "nav-target.svg", href: "index.html#missions-title" },
        { id: "toolbox", label: "Toolbox", tools: true, href: "#" },
      ],
      right: [
        { id: "toolshop", label: "Toolshop", icon: "nav-shop.svg", href: "#" },
        { id: "wallet", label: "Wallet", icon: "nav-wallet.svg", href: "#" },
      ],
    },
    {
      key: "tools",
      label: "Tools",
      left: [
        { label: "Discover", icon: "tl-compass.svg", href: "#" },
        { label: "Billionaires", icon: "tl-dollar.svg", href: "#", extra: faces },
        { label: "Charts", icon: "tl-health.svg", href: "#", extra: hot },
        { label: "Market Overview", icon: "tl-search-zoom.svg", href: "#" },
        { label: "News", icon: "tl-document.svg", href: "#" },
        { label: "Calendar", icon: "tl-calendar.svg", href: "#" },
        { label: "Trading Signals", icon: "tl-signal.svg", href: "#", extra: telegram },
      ],
      right: [
        { label: "Screener", icon: "tl-radar.svg", href: "#", sub: true },
        { label: "Watchlist", icon: "tl-star.svg", href: "#", sub: true },
        { label: "Dashboards", icon: "tl-element-plus.svg", href: "#", sub: true },
        { label: "Messenger", icon: "tl-messages.svg", href: "#" },
      ],
    },
    {
      key: "learn",
      label: "Learn",
      left: [
        { label: "Home", icon: "ln-home.svg", href: "#", extra: newTag },
        { label: "Video Tutorials", icon: "ln-play.svg", href: "#" },
        { label: "Weekly Briefs", icon: "ln-lamp.svg", href: "#" },
        { label: "AI Daily Brief", icon: "ln-flash.svg", href: "#" },
        { label: "Market Pulse", icon: "ln-heart-rate.svg", href: "#" },
        { label: "Blog", icon: "ln-message-text.svg", href: "#" },
      ],
      right: [
        { label: "Release Notes", icon: "ln-note.svg", href: "#" },
        { label: "FAQs", icon: "ln-question.svg", href: "index.html#faq-title" },
      ],
    },
    { key: "plans", label: "Plans", href: "landing.html#plans" },
    {
      key: "more",
      label: "More",
      left: [
        { label: "Compare and review", icon: "mr-search-status.svg", href: "landing.html#lp-compare-title" },
        { label: "Become a partner", icon: "mr-user-tick.svg", href: "#" },
      ],
      right: [
        { label: "Business Solutions", icon: "mr-briefcase.svg", href: "#", sub: true },
        { label: "Company", icon: "mr-company.svg", href: "#", sub: true },
        { label: "Mobile App", icon: "mr-mobile.svg", href: "#", extra: hot },
        { label: "Refer &amp; Earn", icon: "mr-gift.svg", href: "#" },
        { label: "Affiliates", icon: "mr-volume.svg", href: "#" },
        { label: "Help Center", icon: "ln-question.svg", href: "#" },
        { label: "Contact Us", icon: "mr-email.svg", href: "mailto:support@profit.com" },
      ],
      featured: PARTNERS,
      promo: refer,
    },
  ];

  // Desktop panel layout for each menu
  const panelHtml = (m) =>
    m.key === "more"
      ? `
      <div class="nav-dd__col nav-dd__col--wide">
        <div class="nav-dd__links">${list(m.left)}</div>
        <p class="nav-dd__eyebrow">Featured</p>
        <div class="nav-dd__links">${m.featured.map(partner).join("")}</div>
      </div>
      <div class="nav-dd__col nav-dd__col--more">
        <div class="nav-dd__links">${list(m.right)}</div>
        ${m.promo}
      </div>`
      : `
      <div class="nav-dd__col">${list(m.left)}</div>
      <div class="nav-dd__col nav-dd__col--right">
        <div class="nav-dd__links">${list(m.right)}</div>
        ${community}
      </div>`;

  // ---------- Desktop: dropdown panels ----------
  const makeDropdown = (trigger, m) => {
    if (!trigger) return;
    const id = `${m.key}Menu`;
    const wrap = document.createElement("div");
    wrap.className = "nav-dd";
    trigger.replaceWith(wrap);
    wrap.appendChild(trigger);
    if (m.current) trigger.classList.add("is-current");
    if (m.href) trigger.setAttribute("href", m.href);
    trigger.setAttribute("aria-haspopup", "true");
    trigger.setAttribute("aria-expanded", "false");

    const panel = document.createElement("div");
    panel.className = "nav-dd__panel";
    panel.id = id;
    panel.setAttribute("role", "menu");
    panel.setAttribute("aria-label", m.label);
    panel.innerHTML = panelHtml(m);
    wrap.appendChild(panel);
    trigger.setAttribute("aria-controls", id);

    let closeTimer = 0;
    const setOpen = (open) => {
      clearTimeout(closeTimer);
      // Only one menu open at a time
      if (open) document.querySelectorAll(".nav-dd.is-open").forEach((o) => { if (o !== wrap) o.dispatchEvent(new Event("nav-dd:close")); });
      wrap.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", String(open));
    };
    wrap.addEventListener("nav-dd:close", () => setOpen(false));

    // Hover opens it; a short delay lets the pointer travel from the label into the panel
    wrap.addEventListener("mouseenter", () => setOpen(true));
    wrap.addEventListener("mouseleave", () => { closeTimer = setTimeout(() => setOpen(false), 160); });
    // Click / tap toggles (touch has no hover)
    trigger.addEventListener("click", (e) => { e.preventDefault(); setOpen(!wrap.classList.contains("is-open")); });
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); panel.querySelector("a")?.focus(); }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && wrap.classList.contains("is-open")) { setOpen(false); trigger.focus(); }
    });
    document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) setOpen(false); });
    wrap.addEventListener("focusout", (e) => { if (!wrap.contains(e.relatedTarget)) setOpen(false); });
  };
  MENUS.filter((m) => m.left).forEach((m) => makeDropdown(byLabel(m.label), m));
  byLabel("Plans")?.setAttribute("href", "landing.html#plans");

  // ---------- Tablet & phone: ☰ opens the full menu as a drawer ----------
  const cta = bar.querySelector(".topnav__upgrade");
  const sale = bar.querySelector(".topnav__sale");
  const section = (m) => {
    if (!m.left) return `<a class="mnav__link" href="${m.href}">${m.label}</a>`;
    const open = m.key === "playtrade" && m.current;
    const body = m.key === "more"
      ? `${list(m.left)}${list(m.right)}
         <p class="nav-dd__eyebrow">Featured</p>
         ${m.featured.map(partner).join("")}
         ${m.promo}`
      : `${list(m.left)}${list(m.right)}`;
    return `
      <div class="mnav__section${open ? " is-open" : ""}">
        <button class="mnav__head" type="button" aria-expanded="${open}" aria-controls="mnav-${m.key}">
          ${m.icon ? `<img class="mnav__head-icon" src="assets/${m.icon}" alt="">` : ""}${m.label}
          <img class="mnav__caret" src="assets/dropdown-arrow.svg" alt="">
        </button>
        <div class="mnav__body" id="mnav-${m.key}" role="group" aria-label="${m.label}"${open ? "" : " hidden"}>${body}</div>
      </div>`;
  };

  const drawer = document.createElement("nav");
  drawer.className = "mnav";
  drawer.id = "mobileNav";
  drawer.setAttribute("aria-label", "Main menu");
  drawer.inert = true;
  drawer.innerHTML = `
    <div class="mnav__scroll">
      <button class="mnav__search" type="button"><img src="assets/search.svg" alt="">Search Profit.com</button>
      <div class="mnav__sections">${MENUS.map(section).join("")}</div>
      ${community}
      <button class="mnav__lang" type="button"><img src="assets/globe.svg" alt="">English<span>EN</span></button>
    </div>
    ${cta ? `<div class="mnav__foot"><a class="btn-brand mnav__cta" href="${cta.getAttribute("href")}">${cta.textContent.trim()}${sale ? `<span class="mnav__sale">${sale.textContent.trim()}</span>` : ""}</a></div>` : ""}`;
  document.body.appendChild(drawer);

  // Accordion sections
  drawer.querySelectorAll(".mnav__head").forEach((head) => {
    head.addEventListener("click", () => {
      const sec = head.parentElement;
      const open = !sec.classList.contains("is-open");
      sec.classList.toggle("is-open", open);
      head.setAttribute("aria-expanded", String(open));
      sec.querySelector(".mnav__body").hidden = !open;
    });
  });

  const burger = document.createElement("button");
  burger.type = "button";
  burger.className = "topnav__burger";
  burger.setAttribute("aria-controls", drawer.id);
  burger.setAttribute("aria-expanded", "false");
  burger.setAttribute("aria-label", "Open menu");
  burger.innerHTML = "<span></span><span></span><span></span>";
  bar.prepend(burger);

  const scrim = document.createElement("div");
  scrim.className = "mnav-scrim";
  scrim.hidden = true;
  document.body.appendChild(scrim);

  const setDrawer = (open, fromKeyboard = false) => {
    drawer.classList.toggle("is-open", open);
    drawer.inert = !open;
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.documentElement.classList.toggle("has-drawer", open);
    if (open) {
      scrim.hidden = false;
      requestAnimationFrame(() => scrim.classList.add("is-on"));
      if (fromKeyboard) drawer.querySelector("button, a")?.focus({ preventScroll: true });
    } else {
      scrim.classList.remove("is-on");
      setTimeout(() => { if (!drawer.classList.contains("is-open")) scrim.hidden = true; }, 250);
    }
  };
  // e.detail is 0 for keyboard-triggered clicks: move focus into the drawer only then
  burger.addEventListener("click", (e) => setDrawer(!drawer.classList.contains("is-open"), e.detail === 0));
  scrim.addEventListener("click", () => setDrawer(false));
  drawer.addEventListener("click", (e) => { if (e.target.closest("a")) setDrawer(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) { setDrawer(false); burger.focus(); }
  });
  // Growing back to the desktop bar closes the drawer
  matchMedia("(min-width: 1025px)").addEventListener("change", (e) => { if (e.matches) setDrawer(false); });
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initTopnav);
else initTopnav();
