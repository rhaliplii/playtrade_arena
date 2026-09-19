// Playtrade dropdown in the top navigation (Figma: Navigation, node 492:11532).
// Shared by every page; runs once the page (and the side navigation) exists.
const initArenaMenu = () => {
  const trigger = document.querySelector(".topnav__menu .topnav__item");
  if (!trigger) return;

  // Same destinations and current-page marker as the side navigation;
  // pages outside the arena (the landing page) set <body data-nav-active="none">
  const outside = document.body.dataset.navActive === "none";
  const active = outside ? "" : document.getElementById("sideNav")?.dataset.active || "tournaments";
  const LEFT = [
    { id: "tournaments", label: "Tournaments", icon: "nav-cup.svg", href: "index.html" },
    { id: "games", label: "Market Games", icon: "nav-game.svg", href: "index.html#games-title" },
    { id: "stats", label: "My Stats", icon: "nav-crown.svg", href: "#" },
    { id: "leaderboard", label: "Leaderboard", icon: "nav-ranking.svg", href: "index.html#top-title" },
    { id: "missions", label: "Missions", icon: "nav-target.svg", href: "index.html#missions-title" },
    { id: "toolbox", label: "Toolbox", tools: true, href: "#" },
  ];
  const RIGHT = [
    { id: "toolshop", label: "Toolshop", icon: "nav-shop.svg", href: "#" },
    { id: "wallet", label: "Wallet", icon: "nav-wallet.svg", href: "#" },
  ];
  const SOCIAL = [
    ["Telegram", "ft-telegram.svg"], ["Facebook", "ft-facebook.svg"], ["YouTube", "ft-youtube.svg"], ["X", "ft-x.svg"], ["LinkedIn", "ft-linkedin.svg"],
  ];

  const icon = (it) =>
    it.tools
      ? '<span class="nav-dd__icon ico-flip"><img class="ico-flip__img" src="assets/sb2-tools.svg" alt=""></span>'
      : `<span class="nav-dd__icon"><img src="assets/${it.icon}" alt=""></span>`;
  const item = (it) =>
    `<a class="nav-dd__item${it.id === active ? " is-active" : ""}" href="${it.href}" role="menuitem"${it.id === active ? ' aria-current="page"' : ""}>${icon(it)}${it.label}</a>`;

  const wrap = document.createElement("div");
  wrap.className = "nav-dd";
  trigger.replaceWith(wrap);
  wrap.appendChild(trigger);
  if (!outside) trigger.classList.add("is-current");
  trigger.setAttribute("href", "index.html");
  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-expanded", "false");

  const panel = document.createElement("div");
  panel.className = "nav-dd__panel";
  panel.id = "arenaMenu";
  panel.setAttribute("role", "menu");
  panel.setAttribute("aria-label", "Playtrade");
  panel.innerHTML = `
    <div class="nav-dd__col">${LEFT.map(item).join("")}</div>
    <div class="nav-dd__col nav-dd__col--right">
      <div class="nav-dd__links">${RIGHT.map(item).join("")}</div>
      <div class="nav-dd__community">
        <p class="nav-dd__title">Join Community</p>
        <div class="nav-dd__stores">
          <a class="nav-dd__store nav-dd__store--apple" href="#"><img src="assets/ft-apple.svg" alt="">App Store</a>
          <a class="nav-dd__store nav-dd__store--google" href="#" aria-label="Get it on Google Play"><img class="gp-icon" src="assets/ft-playstore.svg" alt=""><img class="gp-text" src="assets/ft-googleplay-text.svg" alt=""></a>
        </div>
        <div class="nav-dd__social">${SOCIAL.map(([n, f]) => `<a href="#" aria-label="${n}"><img src="assets/${f}" alt=""></a>`).join("")}</div>
      </div>
    </div>`;
  wrap.appendChild(panel);
  trigger.setAttribute("aria-controls", panel.id);

  let closeTimer = 0;
  const setOpen = (open) => {
    clearTimeout(closeTimer);
    wrap.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", String(open));
  };

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
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initArenaMenu);
else initArenaMenu();
