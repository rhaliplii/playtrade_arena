// Bull Run join screen: mode switch, animated runner preview, how-to dialog, game launch

const GAME_URL = "games/bull_run/index.html";
const MODE_KEY = "bull_run_mode_v1"; // shared with the game, so both remember the same mode

// ---------- Mode switch ----------
let mode = "practice";
try { if (localStorage.getItem(MODE_KEY) === "survival") mode = "survival"; } catch { /* storage unavailable */ }

const modeButtons = document.querySelectorAll("[data-mode]");
function setMode(next) {
  mode = next;
  try { localStorage.setItem(MODE_KEY, next); } catch { /* storage unavailable */ }
  modeButtons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.mode === next)));
  // Rules that differ per mode carry both texts
  document.querySelectorAll("[data-practice]").forEach((el) => {
    el.textContent = next === "survival" ? el.dataset.survival : el.dataset.practice;
  });
  // Rules with markup keep one element per mode
  document.querySelectorAll("[data-for-mode]").forEach((el) => (el.hidden = el.dataset.forMode !== next));
}
modeButtons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
setMode(mode);

// ---------- How to play ----------
const howDialog = document.getElementById("howDialog");
document.querySelectorAll("[data-open-how]").forEach((b) => b.addEventListener("click", () => howDialog.showModal()));
howDialog.querySelector("[data-close-how]").addEventListener("click", () => howDialog.close());
howDialog.addEventListener("click", (e) => { if (e.target === howDialog) howDialog.close(); });

// ---------- Game player ----------
const modal = document.getElementById("gameModal");
const frame = modal.querySelector(".game-modal__frame");
const modalTitle = document.getElementById("gameModalTitle");
const startBtn = document.getElementById("startBtn");

function openGame() {
  const label = mode === "survival" ? "Survival" : "Practice";
  modalTitle.textContent = `Bull Run · ${label}`;
  frame.src = `${GAME_URL}?mode=${mode}&autostart=1`;
  modal.hidden = false;
  document.body.classList.add("is-playing");
  preview.pause();
  // The game listens for keys on its own window, so hand it focus once loaded
  frame.addEventListener("load", () => frame.focus(), { once: true });
}
function closeGame() {
  modal.hidden = true;
  frame.src = "about:blank"; // stops the game loop and audio
  document.body.classList.remove("is-playing");
  preview.resume();
  startBtn.focus();
}
startBtn.addEventListener("click", openGame);
modal.querySelector("[data-game-close]").addEventListener("click", closeGame);
modal.addEventListener("keydown", (e) => { if (e.key === "Escape") closeGame(); }); // Esc inside the game pauses it instead
// The game's own "Exit game" buttons (pause screen, end of run) ask us to close the player
window.addEventListener("message", (e) => {
  if (e.source === frame.contentWindow && e.data && e.data.source === "bull_run" && e.data.type === "exit") closeGame();
});

// ---------- Live preview: the actual game running its attract mode ----------
const preview = (() => {
  const el = document.getElementById("runnerPreview");
  const src = el.getAttribute("src");
  el.addEventListener("load", () => el.classList.toggle("is-ready", el.getAttribute("src") === src));
  return {
    // Unload while the full game is open so two 3D scenes never run at once
    pause() { el.classList.remove("is-ready"); el.setAttribute("src", "about:blank"); },
    resume() { el.setAttribute("src", src); },
  };
})();
