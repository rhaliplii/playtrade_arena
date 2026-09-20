// Fast Scan join screen: shared join behaviour (game-join.js) plus grid size, personal stats,
// recent runs and the leaderboard, all read from the same store the game writes (fast-scan-core.js).
(() => {
  const FS = window.FastScan;
  const { CONFIG, MODES } = FS;
  const $ = (id) => document.getElementById(id);
  const GUEST = FS.isGuest();
  let size = FS.prefs().size;
  let join;

  // ---------- Grid size ----------
  const sizePick = $("sizePick");
  sizePick.innerHTML = CONFIG.SIZES.map((n) => `<button type="button" role="radio" class="fs-size" data-size="${n}" aria-checked="${n === size}">${n}×${n}</button>`).join("");
  const setSize = (n) => {
    size = n;
    FS.savePrefs({ size });
    sizePick.querySelectorAll("[data-size]").forEach((b) => b.setAttribute("aria-checked", String(Number(b.dataset.size) === n)));
    render();
  };
  sizePick.addEventListener("click", (e) => { const b = e.target.closest("[data-size]"); if (b) setSize(Number(b.dataset.size)); });
  sizePick.addEventListener("keydown", (e) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = CONFIG.SIZES.indexOf(size);
    const next = CONFIG.SIZES[(i + step + CONFIG.SIZES.length) % CONFIG.SIZES.length];
    setSize(next);
    sizePick.querySelector(`[data-size="${next}"]`).focus();
  });

  // ---------- Rendering ----------
  const mode = () => join?.getMode() || "practice";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const when = (t) => new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const signinCard = (title, text) => `
    <div class="fs-signin">
      <p class="fs-signin__title">${title}</p>
      <p class="fs-signin__text">${text}</p>
      <div class="fs-signin__row">
        <a class="btn-brand fs-signin__btn" href="landing.html">Create free account</a>
        <a class="fs-signin__link" href="landing.html">Log in</a>
      </div>
    </div>`;

  const renderMeta = () => {
    const m = mode();
    const { timeLimit, maxMistakes } = FS.limitsFor(m, size);
    $("runMeta").innerHTML = m === "practice"
      ? `${size}×${size} · no clock · <span class="fs-meta__free">free</span>`
      : `${size}×${size} · ${timeLimit}s · ${maxMistakes} mistakes · <span class="fs-meta__cost">costs ❤️ 1</span>`;
    $("ruleLimits").innerHTML = `Classic and Hardcore: <b>${timeLimit || FS.limitsFor("classic", size).timeLimit}s</b> and <b>${maxMistakes || FS.limitsFor("classic", size).maxMistakes} mistakes</b> on a ${size}×${size} grid.`;
  };

  const renderRuns = () => {
    const list = $("runsList");
    if (GUEST) {
      list.innerHTML = signinCard("Track every run", "Sign in to keep your run history and see how your scanning speed improves.");
      return;
    }
    const runs = FS.runs().slice(0, 6);
    if (!runs.length) {
      list.innerHTML = `<p class="fs-empty">No runs yet. Your runs will show up here after your first board.</p>`;
      return;
    }
    const bests = new Set(CONFIG.SIZES.flatMap((n) => Object.keys(MODES).map((k) => FS.best(k, n)?.id)).filter(Boolean));
    list.innerHTML = runs.map((r) => `
      <div class="run">
        <span class="run__mode fs-run--${r.mode}" title="${MODES[r.mode].label}">${MODES[r.mode].short}</span>
        <span class="run__name">${r.size}×${r.size}</span>
        <span class="run__date">${when(r.at)}</span>
        ${bests.has(r.id) ? '<span class="run__best">Best</span>' : ""}
        <span class="run__score${r.completed ? "" : " fs-run__fail"}">${r.completed ? FS.fmtTime(r.timeMs) : r.reason === "Time's up!" ? "Time's up" : "Out"}</span>
      </div>`).join("");
  };

  const hearts = (lives) => Array.from({ length: CONFIG.STARTING_LIVES }, (_, i) =>
    i < lives ? '<img src="assets/pr-life.svg" alt="Life">' : '<img src="assets/pr-heart-off.svg" alt="Empty life">').join("");

  const renderStats = () => {
    const box = $("myStats");
    if (GUEST) {
      box.classList.add("is-guest");
      box.innerHTML = signinCard("Your stats live here", "Create a free account to save your best times, earn coins and get ranked. You can still try Practice right now.");
      return;
    }
    const m = mode();
    const st = FS.stats(m, size);
    const w = FS.wallet();
    box.innerHTML = `
      <div class="pr-stat"><span class="pr-stat__label">Best · ${MODES[m].label} ${size}×${size}</span><span class="pr-stat__value">${st.best ? FS.fmtTime(st.best.timeMs) : "—"}</span></div>
      <div class="pr-stat"><span class="pr-stat__label">Runs</span><span class="pr-stat__value">${st.runs}</span></div>
      <div class="pr-stat"><span class="pr-stat__label">Accuracy</span><span class="pr-stat__value pr-stat__value--mint">${st.accuracy === null ? "—" : `${st.accuracy}%`}</span></div>
      <div class="pr-stat"><span class="pr-stat__label">Best streak</span><span class="pr-stat__value">${st.bestStreak ? `${st.bestStreak} 🔥` : "—"}</span></div>
      <div class="pr-stat pr-stat--wide pr-stat--lives">
        <div><span class="pr-stat__label">Lives</span><p class="pr-stat__label" id="lifeTimer">${w.lives >= CONFIG.STARTING_LIVES ? "Fully equipped" : `Next in ${FS.fmtClock(w.nextLifeIn)}`}</p></div>
        <div class="pr-lives">${hearts(w.lives)}</div>
      </div>
      <div class="pr-stat pr-stat--wide fs-coins"><span class="pr-stat__label">Coins</span><span class="pr-stat__value fs-gold">🪙 ${w.coins}</span></div>`;
  };

  const renderBoard = () => {
    // Practice isn't ranked, so it shows the Classic table for the same grid
    const m = MODES[mode()].ranked ? mode() : "classic";
    const b = GUEST ? null : FS.best(m, size);
    const lb = FS.leaderboard(m, size, b && { name: FS.PLAYER.name, timeMs: b.timeMs, accuracy: b.accuracy });
    $("lbCount").textContent = `${lb.players} players`;
    $("lbSub").textContent = `${MODES[m].label} · ${size}×${size}${mode() === "practice" ? " · Practice isn't ranked" : ""}`;
    const row = (r, line) => `
      <div class="lb-row${line ? " has-line" : ""}${r.you ? " is-you" : ""}">
        <span class="lb-rank">${r.rank}</span>
        <span class="lb-av"${r.you ? "" : ` style="background:${r.color}29;color:${r.color}"`}>${r.you ? `<img src="assets/${FS.PLAYER.avatar}" alt="">` : esc(r.name.split(" ").map((w) => w[0]).join("").slice(0, 2))}</span>
        <span class="lb-name">${esc(r.name)}</span>
        <span class="lb-score">${FS.fmtTime(r.timeMs)}</span>
      </div>`;
    const top = lb.rows.slice(0, 10);
    const you = lb.rows.find((r) => r.you);
    let html = top.map((r, i) => row(r, i < top.length - 1 || (you && you.rank > 10))).join("");
    if (you && you.rank > 10) html += `<div class="fs-lb-gap" aria-hidden="true">···</div>${row(you, false)}`;
    $("lbList").innerHTML = html;
  };

  const render = () => { renderMeta(); renderRuns(); renderStats(); renderBoard(); shownLives = FS.wallet().lives; };

  // Keep the life timer ticking while the page is open; re-render when a life comes back
  let shownLives = FS.wallet().lives;
  setInterval(() => {
    if (GUEST) return;
    const w = FS.wallet();
    if (w.lives !== shownLives) { shownLives = w.lives; renderStats(); return; }
    const el = $("lifeTimer");
    if (el && w.lives < CONFIG.STARTING_LIVES) el.textContent = `Next in ${FS.fmtClock(w.nextLifeIn)}`;
  }, 1000);

  // The game can move the player up a grid ("Next board"): follow it when we come back
  const syncSize = () => { const p = FS.prefs().size; if (p !== size) setSize(p); else render(); };

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
    id: "fast_scan",
    url: "games/fast_scan/index.html",
    name: "Fast Scan",
    modes: { practice: "Practice", classic: "Classic", hardcore: "Hardcore" },
    modeKey: "fast_scan_mode_v1",
    params: () => ({ size: String(size), ...(GUEST ? { guest: "1" } : {}) }),
    canStart: (m) => {
      if (GUEST && MODES[m].ranked) { signin.showModal(); return false; }
      return true;
    },
    onMode: () => render(),
    onMessage: () => syncSize(), // a run finished, or lives/coins changed
    onClose: () => syncSize(),
  });
  render();
})();
