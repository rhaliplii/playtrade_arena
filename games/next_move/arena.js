// Next Move — the Arena wrapper around the game.
//
// The game itself (js/*) is untouched: it still owns every rule. This layer only does what
// the Arena needs around it, exactly as Fast Scan and Candle Flip do:
//   ?preview            the attract loop the join screen embeds, which records nothing
//   ?mode=…&autostart=1 launch straight into a run, skipping the game's own menu
//   ?guest=1            the signed-out experience: Survival needs an account
// and, when embedded, reports finished runs to the join screen and hands back "Exit game".
(() => {
  const NM = window.NM;
  const CORE = window.NextMove;
  if (!NM || !CORE) return;

  const params = new URLSearchParams(location.search);
  const PREVIEW = params.has("preview");
  const EMBEDDED = params.has("autostart") && window.parent !== window;
  const GUEST = CORE.isGuest();
  const MODES = CORE.MODES;
  let mode = MODES[params.get("mode")] ? params.get("mode") : "survival";
  if (GUEST && MODES[mode].ranked) mode = "practice"; // ranked runs need an account

  const post = (msg) => { if (window.parent !== window) window.parent.postMessage({ source: "next_move", ...msg }, "*"); };
  const $ = (id) => document.getElementById(id);

  // ---------- The attract loop ----------
  // The real game, playing itself: it answers each chart after a beat and watches the reveal.
  // Nothing is persisted and no run is ever finished, so it cannot touch the player's record.
  const runPreview = () => {
    NM.Progression.save = () => {};            // the one write point, stubbed
    NM.Audio.setEnabled(false);                // the attract loop is always silent
    document.documentElement.classList.add("is-preview");

    NM.Game.startRun("practice");
    // Paced so a passer-by can actually follow a round: read the chart, see the call, watch
    // the candles arrive, then move on
    const READ_MS = 2400;   // the chart is left alone before the call is made
    const REVEAL_MS = 3400; // the outcome is left up before moving on
    const NEXT_MS = 1100;
    const answers = () => [...document.querySelectorAll("#answers button")];
    let read = -1;
    const step = () => {
      const run = NM.Game.run;
      if (!run) return setTimeout(step, 600);
      const next = $("btnNext");
      if (next && !next.closest("[hidden]")) { next.click(); return setTimeout(step, NEXT_MS); }
      const opts = answers().filter((b) => !b.disabled);
      if (opts.length) {
        if (read !== run.index) { read = run.index; return setTimeout(step, READ_MS); }
        // mostly right, so the reveal reads as a lesson rather than a loss reel
        const scn = run.scenario;
        const want = scn && Math.random() < 0.72 ? scn.answer : null;
        const pick = (want && opts.find((b) => b.dataset.a === want)) || opts[Math.floor(Math.random() * opts.length)];
        pick.click();
        return setTimeout(step, REVEAL_MS);
      }
      setTimeout(step, 700);
    };
    setTimeout(step, 900);
  };

  // ---------- Out of lives ----------
  const showNoLives = () => {
    const w = CORE.wallet();
    const el = document.createElement("section");
    el.className = "overlay";
    el.id = "arenaNoLives";
    el.innerHTML = `
      <div class="card">
        <div class="over">
          <span class="over-label">No lives left</span>
          <h2 class="over-title">Out of lives</h2>
          <p class="fineprint" style="font-size:14px;opacity:.75">Survival runs cost a life. Your next life arrives in
            <b id="arenaLifeIn">${CORE.fmtClock(w.nextLifeIn)}</b> — Practice is always free.</p>
          <div class="over-actions">
            <button class="btn big" id="arenaPractice">Play Practice</button>
            <div class="over-links"><button class="link-btn" id="arenaExit">${EMBEDDED ? "Exit game" : "Menu"}</button></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);
    const iv = setInterval(() => {
      const t = $("arenaLifeIn");
      if (!t) return clearInterval(iv);
      t.textContent = CORE.fmtClock(CORE.wallet().nextLifeIn);
    }, 1000);
    $("arenaPractice").addEventListener("click", () => { el.remove(); clearInterval(iv); NM.Game.startRun("practice"); });
    $("arenaExit").addEventListener("click", () => { clearInterval(iv); EMBEDDED ? post({ type: "exit" }) : location.reload(); });
  };

  // ---------- A finished run goes back to the Arena ----------
  let recorded = null;
  const recordRun = (run) => {
    if (!run || recorded === run || PREVIEW) return;
    recorded = run;
    const total = run.correct + run.incorrect;
    const streaks = Math.floor((run.bestStreak || 0) / CORE.CONFIG.STREAK_MIN);
    const entry = {
      id: Date.now(), at: Date.now(), mode: run.mode,
      score: run.score, correct: run.correct, incorrect: run.incorrect, total,
      accuracy: total ? Math.round((run.correct / total) * 100) : 0,
      bestStreak: run.bestStreak || 0, streaks, xp: run.xpEarned || 0, coins: 0,
    };
    if (MODES[run.mode].ranked && !GUEST) { entry.coins = CORE.coinsFor(entry); CORE.addCoins(entry.coins); }
    if (!GUEST) CORE.addRun(entry);
    post({ type: "run", run: entry });
  };

  // The game shows its summary when a run ends; that is the signal, with no hook into its rules
  const summary = $("summary");
  if (summary) {
    new MutationObserver(() => {
      if (summary.hidden) return;
      recordRun(NM.Game.run);
      if (!EMBEDDED) return;
      // Inside the Arena player, "Menu" is where the player leaves the game
      const home = $("btnHome");
      if (home && !home.dataset.arena) {
        home.dataset.arena = "1";
        home.textContent = "Exit game";
        home.addEventListener("click", (e) => { e.stopImmediatePropagation(); post({ type: "exit" }); }, true);
      }
    }).observe(summary, { attributes: true, attributeFilter: ["hidden"] });
  }

  // ---------- Boot ----------
  const boot = () => {
    if (!NM.Game || !NM.Game.startRun) return setTimeout(boot, 50);
    if (PREVIEW) return runPreview();
    if (!params.has("autostart")) return;              // opened directly: the game's own menu
    ["home", "onboard", "chapters"].forEach((id) => { const el = $(id); if (el) el.hidden = true; });
    if (MODES[mode].ranked && !GUEST && !CORE.spendLife()) return showNoLives();
    post({ type: "wallet" });
    NM.Game.startRun(mode);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
