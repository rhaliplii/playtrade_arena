// Next Move join screen: shared join behaviour (game-join.js) plus personal stats, recent runs
// and the leaderboard, all read from the same store the game writes (games/next_move/next-move-core.js).
(() => {
  const NM = window.NextMove;
  const { CONFIG, MODES } = NM;
  const $ = (id) => document.getElementById(id);
  const GUEST = NM.isGuest();
  let join;

  // ---------- Rendering ----------
  const mode = () => join?.getMode() || "practice";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const when = (t) => new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const signinCard = (title, text) => `
    <div class="nm-signin">
      <p class="nm-signin__title">${title}</p>
      <p class="nm-signin__text">${text}</p>
      <div class="nm-signin__row">
        <a class="btn-brand nm-signin__btn" href="landing.html">Create free account</a>
        <a class="nm-signin__link" href="landing.html">Log in</a>
      </div>
    </div>`;

  const renderRuns = () => {
    const list = $("runsList");
    if (GUEST) {
      list.innerHTML = signinCard("Track every run", "Sign in to keep your run history and watch your chart reading improve.");
      return;
    }
    const runs = NM.runs().slice(0, 6);
    if (!runs.length) {
      list.innerHTML = `<p class="nm-empty">No runs yet. Your runs will show up here after your first chart.</p>`;
      return;
    }
    const bests = new Set(Object.keys(MODES).map((m) => NM.best(m)?.id).filter(Boolean));
    list.innerHTML = runs.map((r) => `
      <div class="run">
        <span class="run__mode nm-run--${r.mode}" title="${MODES[r.mode].label}">${MODES[r.mode].short}</span>
        <span class="run__name">${r.correct}/${r.total}</span>
        <span class="run__date">${when(r.at)}</span>
        ${bests.has(r.id) ? '<span class="run__best">Best</span>' : ""}
        <span class="run__score">${NM.fmtScore(r.score)} pts</span>
      </div>`).join("");
  };

  const hearts = (lives) => Array.from({ length: CONFIG.STARTING_LIVES }, (_, i) =>
    i < lives ? '<img src="assets/pr-life.svg" alt="Life">' : '<img src="assets/pr-heart-off.svg" alt="Empty life">').join("");

  const renderStats = () => {
    const box = $("myStats");
    if (GUEST) {
      box.classList.add("is-guest");
      box.innerHTML = signinCard("Your stats live here", "Create a free account to save your scores, earn coins and get ranked. You can still try Practice right now.");
      return;
    }
    const m = mode();
    const st = NM.stats(m);
    const w = NM.wallet();
    box.innerHTML = `
      <div class="pr-stat"><span class="pr-stat__label">Best · ${MODES[m].label}</span><span class="pr-stat__value">${st.best ? NM.fmtScore(st.best.score) : "—"}</span></div>
      <div class="pr-stat"><span class="pr-stat__label">Runs</span><span class="pr-stat__value">${st.runs}</span></div>
      <div class="pr-stat"><span class="pr-stat__label">Accuracy</span><span class="pr-stat__value pr-stat__value--mint">${st.accuracy === null ? "—" : `${st.accuracy}%`}</span></div>
      <div class="pr-stat"><span class="pr-stat__label">Best streak</span><span class="pr-stat__value">${st.bestStreak ? `${st.bestStreak} 🔥` : "—"}</span></div>
      <div class="pr-stat pr-stat--wide pr-stat--lives">
        <div><span class="pr-stat__label">Lives</span><p class="pr-stat__label" id="lifeTimer">${w.lives >= CONFIG.STARTING_LIVES ? "Fully equipped" : `Next in ${NM.fmtClock(w.nextLifeIn)}`}</p></div>
        <div class="pr-lives">${hearts(w.lives)}</div>
      </div>`;
  };

  const renderBoard = () => {
    // Practice isn't ranked, so it shows the Survival table
    const m = MODES[mode()].ranked ? mode() : "survival";
    const b = GUEST ? null : NM.best(m);
    const lb = NM.leaderboard(m, b && { name: NM.PLAYER.name, score: b.score, accuracy: b.accuracy });
    $("lbCount").textContent = `${lb.players} players`;
    $("lbSub").textContent = `${MODES[m].label}${mode() === "practice" ? " · Practice isn't ranked" : ""}`;
    const row = (r, line) => `
      <div class="lb-row${line ? " has-line" : ""}${r.you ? " is-you" : ""}">
        <span class="lb-rank">${r.rank}</span>
        <span class="lb-av"${r.you ? "" : ` style="background:${r.color}29;color:${r.color}"`}>${r.you ? `<img src="assets/${NM.PLAYER.avatar}" alt="">` : esc(r.name.split(" ").map((w) => w[0]).join("").slice(0, 2))}</span>
        <span class="lb-name">${esc(r.name)}</span>
        <span class="lb-score">${NM.fmtScore(r.score)}</span>
      </div>`;
    const top = lb.rows.slice(0, 10);
    const you = lb.rows.find((r) => r.you);
    let html = top.map((r, i) => row(r, i < top.length - 1 || (you && you.rank > 10))).join("");
    if (you && you.rank > 10) html += `<div class="nm-lb-gap" aria-hidden="true">···</div>${row(you, false)}`;
    $("lbList").innerHTML = html;
  };

  const render = () => { renderRuns(); renderStats(); renderBoard(); shownLives = NM.wallet().lives; };

  // Keep the life timer ticking while the page is open; re-render when a life comes back
  let shownLives = NM.wallet().lives;
  setInterval(() => {
    if (GUEST) return;
    const w = NM.wallet();
    if (w.lives !== shownLives) { shownLives = w.lives; renderStats(); return; }
    const el = $("lifeTimer");
    if (el && w.lives < CONFIG.STARTING_LIVES) el.textContent = `Next in ${NM.fmtClock(w.nextLifeIn)}`;
  }, 1000);

  // ---------- Guests: ranked modes need an account ----------
  const signin = $("signinDialog");
  signin.addEventListener("click", (e) => { if (e.target === signin) signin.close(); });
  signin.querySelector("[data-play-practice]").addEventListener("click", () => {
    signin.close();
    join.setMode("practice");
    join.openGame();
  });

  // ---------- Shared join behaviour ----------
  join = initGameJoin({
    id: "next_move",
    url: "games/next_move/index.html",
    name: "Next Move",
    modes: { practice: "Practice", survival: "Survival" },
    modeKey: "next_move_mode_v1",
    params: () => (GUEST ? { guest: "1" } : {}),
    canStart: (m) => {
      if (GUEST && MODES[m].ranked) { signin.showModal(); return false; }
      return true;
    },
    onMode: (m) => { NM.savePrefs({ mode: m }); render(); },
    onMessage: () => render(), // a run finished, or lives and coins changed
    onClose: () => render(),
  });
  render();
})();
