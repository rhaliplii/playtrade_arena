// Candle Flip join screen: shared join behaviour (game-join.js) plus the level picker, personal
// stats, recent runs, the pattern guide and the leaderboard, all read from the same store the
// game writes (games/candle_flip/candle-flip-core.js).
(() => {
  const CF = window.CandleFlip;
  const { CONFIG, MODES } = CF;
  const PATTERNS = window.CandleFlipPatterns;
  const $ = (id) => document.getElementById(id);
  const GUEST = CF.isGuest();
  const LEVEL_KEYS = CONFIG.LEVELS.map((l) => l.key);
  let level = LEVEL_KEYS.includes(CF.prefs().level) ? CF.prefs().level : "beginner";
  let join;

  // ---------- Level ----------
  const levelPick = $("levelPick");
  levelPick.innerHTML = CONFIG.LEVELS.map((l) =>
    `<button type="button" role="radio" class="cf-level" data-level="${l.key}" aria-checked="${l.key === level}">${l.label}<small>${l.pairs} pairs</small></button>`).join("");
  const setLevel = (key) => {
    level = key;
    CF.savePrefs({ level });
    levelPick.querySelectorAll("[data-level]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.level === key)));
    render();
  };
  levelPick.addEventListener("click", (e) => { const b = e.target.closest("[data-level]"); if (b) setLevel(b.dataset.level); });
  levelPick.addEventListener("keydown", (e) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = LEVEL_KEYS[(LEVEL_KEYS.indexOf(level) + step + LEVEL_KEYS.length) % LEVEL_KEYS.length];
    setLevel(next);
    levelPick.querySelector(`[data-level="${next}"]`).focus();
  });

  // ---------- Rendering ----------
  const mode = () => join?.getMode() || "practice";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const when = (t) => new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const signinCard = (title, text) => `
    <div class="cf-signin">
      <p class="cf-signin__title">${title}</p>
      <p class="cf-signin__text">${text}</p>
      <div class="cf-signin__row">
        <a class="btn-brand cf-signin__btn" href="landing.html">Create free account</a>
        <a class="cf-signin__link" href="landing.html">Log in</a>
      </div>
    </div>`;

  const renderMeta = () => {
    const m = mode();
    const l = CF.level(level);
    const { timeLimit } = CF.limitsFor(m, level);
    $("runMeta").innerHTML = m === "practice"
      ? `${l.pairs} pairs · no clock · <span class="cf-meta__free">free</span>`
      : `${l.pairs} pairs · ${CF.fmtClock(timeLimit * 1000)}`;
    $("ruleLimits").innerHTML = `Classic and Blind on ${l.label}: <b>${CF.fmtClock(l.time * 1000)}</b> to clear <b>${l.pairs} pairs</b>.`;
  };

  const renderRuns = () => {
    const list = $("runsList");
    if (GUEST) {
      list.innerHTML = signinCard("Track every run", "Sign in to keep your run history and watch your pattern recall improve.");
      return;
    }
    const runs = CF.runs().slice(0, 6);
    if (!runs.length) {
      list.innerHTML = `<p class="cf-empty">No runs yet. Your runs will show up here after your first board.</p>`;
      return;
    }
    const bests = new Set(LEVEL_KEYS.flatMap((k) => Object.keys(MODES).map((m) => CF.best(m, k)?.id)).filter(Boolean));
    list.innerHTML = runs.map((r) => `
      <div class="run">
        <span class="run__mode cf-run--${r.mode}" title="${MODES[r.mode].label}">${MODES[r.mode].short}</span>
        <span class="run__name">${CF.level(r.level).label}</span>
        <span class="run__date">${when(r.at)}</span>
        ${bests.has(r.id) ? '<span class="run__best">Best</span>' : ""}
        <span class="run__score${r.completed ? "" : " cf-run__fail"}">${r.completed ? `${CF.fmtScore(r.score)} pts` : `${r.matched}/${r.pairs}`}</span>
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
    const st = CF.stats(m, level);
    const w = CF.wallet();
    const total = PATTERNS.all().length;
    box.innerHTML = `
      <div class="pr-stat"><span class="pr-stat__label">Best · ${MODES[m].label} ${CF.level(level).label}</span><span class="pr-stat__value">${st.best ? CF.fmtScore(st.best.score) : "—"}</span></div>
      <div class="pr-stat"><span class="pr-stat__label">Runs</span><span class="pr-stat__value">${st.runs}</span></div>
      <div class="pr-stat"><span class="pr-stat__label">Match rate</span><span class="pr-stat__value pr-stat__value--mint">${st.accuracy === null ? "—" : `${st.accuracy}%`}</span></div>
      <div class="pr-stat"><span class="pr-stat__label">Best streak</span><span class="pr-stat__value">${st.bestStreak ? `${st.bestStreak} 🔥` : "—"}</span></div>
      <div class="pr-stat pr-stat--wide cf-learned">
        <div><span class="pr-stat__label">Patterns learned</span><p class="pr-stat__label">${st.learned} of ${total}</p></div>
        <span class="cf-learned__bar"><i style="width:${Math.round((st.learned / total) * 100)}%"></i></span>
      </div>
      <div class="pr-stat pr-stat--wide pr-stat--lives">
        <div><span class="pr-stat__label">Lives</span><p class="pr-stat__label" id="lifeTimer">${w.lives >= CONFIG.STARTING_LIVES ? "Fully equipped" : `Next in ${CF.fmtClock(w.nextLifeIn)}`}</p></div>
        <div class="pr-lives">${hearts(w.lives)}</div>
      </div>`;
  };

  const renderBoard = () => {
    // Practice isn't ranked, so it shows the Classic table for the same level
    const m = MODES[mode()].ranked ? mode() : "classic";
    const b = GUEST ? null : CF.best(m, level);
    const lb = CF.leaderboard(m, level, b && { name: CF.PLAYER.name, score: b.score, moves: b.moves });
    $("lbCount").textContent = `${lb.players} players`;
    $("lbSub").textContent = `${MODES[m].label} · ${CF.level(level).label}${mode() === "practice" ? " · Practice isn't ranked" : ""}`;
    const row = (r, line) => `
      <div class="lb-row${line ? " has-line" : ""}${r.you ? " is-you" : ""}">
        <span class="lb-rank">${r.rank}</span>
        <span class="lb-av"${r.you ? "" : ` style="background:${r.color}29;color:${r.color}"`}>${r.you ? `<img src="assets/${CF.PLAYER.avatar}" alt="">` : esc(r.name.split(" ").map((w) => w[0]).join("").slice(0, 2))}</span>
        <span class="lb-name">${esc(r.name)}</span>
        <span class="lb-score">${CF.fmtScore(r.score)}</span>
      </div>`;
    const top = lb.rows.slice(0, 10);
    const you = lb.rows.find((r) => r.you);
    let html = top.map((r, i) => row(r, i < top.length - 1 || (you && you.rank > 10))).join("");
    if (you && you.rank > 10) html += `<div class="cf-lb-gap" aria-hidden="true">···</div>${row(you, false)}`;
    $("lbList").innerHTML = html;
  };

  const render = () => { renderMeta(); renderRuns(); renderStats(); renderBoard(); shownLives = CF.wallet().lives; };

  // Keep the life timer ticking while the page is open; re-render when a life comes back
  let shownLives = CF.wallet().lives;
  setInterval(() => {
    if (GUEST) return;
    const w = CF.wallet();
    if (w.lives !== shownLives) { shownLives = w.lives; renderStats(); return; }
    const el = $("lifeTimer");
    if (el && w.lives < CONFIG.STARTING_LIVES) el.textContent = `Next in ${CF.fmtClock(w.nextLifeIn)}`;
  }, 1000);

  // The game can move the player up a level ("Next level"): follow it when we come back
  const syncLevel = () => { const p = CF.prefs().level; if (p !== level) setLevel(p); else render(); };

  // ---------- Pattern guide: the deck, and what each pattern means ----------
  const guide = $("guideDialog");
  const openGuide = () => {
    const known = new Set(GUEST ? [] : CF.learned());
    const bias = (b) => (b === "bull" ? "Bullish" : b === "bear" ? "Bearish" : "Indecision");
    $("guideBody").innerHTML = PATTERNS.ORDER.map((tier) => `
      <p class="cf-guide__tier">${CF.level(tier).label} deck</p>
      <div class="cf-guide__list">
        ${PATTERNS.tiers[tier].map((p) => `
          <div class="cf-pat">
            <span class="cf-pat__art">${p.svg}</span>
            <div>
              <p class="cf-pat__name">${esc(p.name)}${known.has(p.id) ? '<span class="cf-pat__tick" title="You have matched this one">✓</span>' : ""}</p>
              <p class="cf-pat__text"><span class="cf-pat__bias cf-pat__bias--${p.bias}">${bias(p.bias)}</span> · ${esc(p.meaning)}</p>
            </div>
          </div>`).join("")}
      </div>`).join("");
    guide.showModal();
  };
  $("guideBtn").addEventListener("click", openGuide);
  guide.querySelector("[data-close-guide]").addEventListener("click", () => guide.close());
  guide.addEventListener("click", (e) => { if (e.target === guide) guide.close(); });

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
    id: "candle_flip",
    url: "games/candle_flip/index.html",
    name: "Candle Flip",
    modes: { practice: "Practice", classic: "Classic", blind: "Blind" },
    modeKey: "candle_flip_mode_v1",
    params: () => ({ level, ...(GUEST ? { guest: "1" } : {}) }),
    canStart: (m) => {
      if (GUEST && MODES[m].ranked) { signin.showModal(); return false; }
      return true;
    },
    onMode: () => render(),
    onMessage: () => syncLevel(), // a run finished, or lives/coins changed
    onClose: () => syncLevel(),
  });
  render();
})();
