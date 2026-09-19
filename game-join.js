// Market Game join screen — behaviour shared by every Arena game.
//   initGameJoin({
//     id:        "bull_run",                     // game id; also the postMessage `source`
//     url:       "games/bull_run/index.html",    // the game page, loaded in the full-screen player
//     name:      "Bull Run",                     // player title
//     modes:     { practice: "Practice", … },    // mode id → label
//     modeKey:   "bull_run_mode_v1",             // localStorage key shared with the game
//     params:    (mode) => ({ … }),              // extra query params for a run (optional)
//     canStart:  (mode) => true,                 // return false to cancel a start (optional)
//     onMode:    (mode) => {},                   // after the mode changes (optional)
//     onMessage: (data) => {},                   // any other message from the game (optional)
//     onClose:   () => {},                       // after the player closes (optional)
//   })
// Markup hooks: [data-mode] radio buttons, [data-for-mode] blocks, [data-open-how] + #howDialog,
// #startBtn, #gameModal (.game-modal__frame, #gameModalTitle, [data-game-close]), #gamePreview.
window.initGameJoin = (cfg) => {
  const modeIds = Object.keys(cfg.modes);

  // ---------- Mode switch ----------
  let mode = modeIds[0];
  try {
    const saved = localStorage.getItem(cfg.modeKey);
    if (modeIds.includes(saved)) mode = saved;
  } catch { /* storage unavailable */ }

  const modeButtons = document.querySelectorAll("[data-mode]");
  const setMode = (next) => {
    mode = next;
    try { localStorage.setItem(cfg.modeKey, next); } catch { /* storage unavailable */ }
    modeButtons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.mode === next)));
    // Blocks that only apply to one mode
    document.querySelectorAll("[data-for-mode]").forEach((el) => (el.hidden = !el.dataset.forMode.split(" ").includes(next)));
    cfg.onMode?.(next);
  };
  modeButtons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  // Arrow keys move between the radio options
  modeButtons.forEach((b, i) => b.addEventListener("keydown", (e) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = modeButtons[(i + step + modeButtons.length) % modeButtons.length];
    next.focus();
    setMode(next.dataset.mode);
  }));
  setMode(mode);

  // ---------- How to play ----------
  const howDialog = document.getElementById("howDialog");
  if (howDialog) {
    document.querySelectorAll("[data-open-how]").forEach((b) => b.addEventListener("click", () => howDialog.showModal()));
    howDialog.querySelector("[data-close-how]")?.addEventListener("click", () => howDialog.close());
    howDialog.addEventListener("click", (e) => { if (e.target === howDialog) howDialog.close(); });
  }

  // ---------- Live preview: the real game running its attract mode ----------
  const preview = (() => {
    const el = document.getElementById("gamePreview");
    if (!el) return { pause() {}, resume() {} };
    const src = el.getAttribute("src");
    el.addEventListener("load", () => el.classList.toggle("is-ready", el.getAttribute("src") === src));
    return {
      // Unload while the full game is open so two game loops never run at once
      pause() { el.classList.remove("is-ready"); el.setAttribute("src", "about:blank"); },
      resume() { el.setAttribute("src", src); },
    };
  })();

  // ---------- Game player ----------
  const modal = document.getElementById("gameModal");
  const frame = modal.querySelector(".game-modal__frame");
  const modalTitle = document.getElementById("gameModalTitle");
  const startBtn = document.getElementById("startBtn");

  const openGame = () => {
    if (cfg.canStart && cfg.canStart(mode) === false) return;
    modalTitle.textContent = `${cfg.name} · ${cfg.modes[mode]}`;
    const query = new URLSearchParams({ mode, ...(cfg.params ? cfg.params(mode) : {}), autostart: "1" });
    frame.src = `${cfg.url}?${query}`;
    modal.hidden = false;
    document.body.classList.add("is-playing");
    preview.pause();
    // The game listens for keys on its own window, so hand it focus once loaded
    frame.addEventListener("load", () => frame.focus(), { once: true });
  };
  const closeGame = () => {
    modal.hidden = true;
    frame.src = "about:blank"; // stops the game loop and audio
    document.body.classList.remove("is-playing");
    preview.resume();
    startBtn.focus();
    cfg.onClose?.();
  };
  startBtn.addEventListener("click", openGame);
  modal.querySelector("[data-game-close]").addEventListener("click", closeGame);
  modal.addEventListener("keydown", (e) => { if (e.key === "Escape") closeGame(); }); // Esc inside the game pauses it instead
  // The game's own "Exit game" buttons ask us to close the player; anything else goes to the page
  window.addEventListener("message", (e) => {
    if (e.source !== frame.contentWindow || !e.data || e.data.source !== cfg.id) return;
    if (e.data.type === "exit") closeGame();
    else cfg.onMessage?.(e.data);
  });

  return { getMode: () => mode, setMode, openGame, closeGame };
};
