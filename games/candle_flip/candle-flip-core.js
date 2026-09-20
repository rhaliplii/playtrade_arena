// Candle Flip — rules, player data and leaderboard, shared by the game (games/candle_flip/index.html)
// and its Arena join screen (candle-flip.html). The rules follow the original prototype's
// gameConfig: the same grids, time limits and scoring formula.
(() => {
  const CONFIG = {
    // Board sizes, straight from the prototype (cols × rows, and the pairs they hold)
    LEVELS: [
      { key: "beginner", label: "Beginner", cols: 4, rows: 4, pairs: 8, time: 120 },
      { key: "intermediate", label: "Intermediate", cols: 5, rows: 6, pairs: 15, time: 240 },
      { key: "advanced", label: "Advanced", cols: 6, rows: 8, pairs: 24, time: 360 },
    ],
    SCORING: {
      BASE: { beginner: 1000, intermediate: 2000, advanced: 3000 },
      MATCH_BONUS: 50, // per pair found
      STREAK_MULTIPLIER: 20, // per card in the longest streak
      TIME_BONUS: 5, // per second left on the clock
      MOVES_PENALTY: 10, // per move above par
      PAR_MOVES: 2.5, // par is 2.5 moves per pair
    },
    FLIP_BACK_MS: 1000, // how long a mismatched pair stays face up
    FLIP_BACK_BLIND_MS: 650, // Blind gives you less time to memorise
    STREAK_MIN: 3, // matches in a row that count as one streak
    REWARDS: { BASE_COMPLETION: 10, STREAK_BONUS: 2, PERFECT_GAME_BONUS: 5 },
    HINT_COST: 25, // coins, for "Peek" and "+30 seconds"
    PAIR_COST: 50, // coins, for "Reveal a pair"
    EXTRA_TIME: 30, // seconds added by the time hint
    STARTING_LIVES: 5,
    STARTING_COINS: 50, // welcome balance, so hints can be tried from the first run
    LIFE_REGEN_MS: 15 * 60 * 1000, // one life back every 15 minutes, up to STARTING_LIVES
  };

  const MODES = {
    practice: { label: "Practice", short: "P", ranked: false, sub: "No clock, names shown" },
    classic: { label: "Classic", short: "C", ranked: true, sub: "Beat the clock" },
    blind: { label: "Blind", short: "B", ranked: true, sub: "No names, quick flip-back" },
  };

  const KEYS = {
    wallet: "candle_flip_wallet_v1",
    runs: "candle_flip_runs_v1",
    prefs: "candle_flip_prefs_v1",
    learned: "candle_flip_learned_v1",
  };
  const read = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

  // ---------- Signed-in vs guest ----------
  // The Arena has no real authentication yet: `?guest=1` on any Candle Flip page previews the
  // guest experience for this tab, `?guest=0` returns to the signed-in demo player.
  const isGuest = () => {
    const q = new URLSearchParams(location.search).get("guest");
    try {
      if (q === "1") sessionStorage.setItem("pt_guest", "1");
      if (q === "0") sessionStorage.removeItem("pt_guest");
      return sessionStorage.getItem("pt_guest") === "1";
    } catch { return q === "1"; }
  };

  // ---------- Rules ----------
  const level = (key) => CONFIG.LEVELS.find((l) => l.key === key) || CONFIG.LEVELS[0];
  const limitsFor = (mode, levelKey) => {
    const l = level(levelKey);
    return {
      timeLimit: mode === "practice" ? 0 : l.time,
      flipBackMs: mode === "blind" ? CONFIG.FLIP_BACK_BLIND_MS : CONFIG.FLIP_BACK_MS,
      showNames: mode === "practice", // Practice keeps the pattern names on the cards
      pairs: l.pairs,
      cols: l.cols,
      rows: l.rows,
    };
  };

  // One board: two cards per pattern, shuffled (Fisher-Yates, as in the prototype)
  const buildDeck = (levelKey) => {
    const l = level(levelKey);
    const patterns = window.CandleFlipPatterns.pick(l.key, l.pairs);
    const cards = patterns.flatMap((p) => [
      { key: `${p.id}-a`, patternId: p.id, pattern: p },
      { key: `${p.id}-b`, patternId: p.id, pattern: p },
    ]);
    for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    return cards;
  };

  // The prototype's calculateScore, unchanged
  const scoreFor = ({ levelKey, matched, longestStreak, seconds, moves }) => {
    const S = CONFIG.SCORING;
    const l = level(levelKey);
    let score = S.BASE[l.key] || 1000;
    score += matched * S.MATCH_BONUS;
    score += longestStreak * S.STREAK_MULTIPLIER;
    if (l.time && seconds < l.time) score += Math.round((l.time - seconds) * S.TIME_BONUS);
    const par = l.pairs * S.PAR_MOVES;
    if (moves > par) score -= Math.round((moves - par) * S.MOVES_PENALTY);
    return Math.max(0, Math.round(score));
  };

  const coinsFor = ({ streaks, misses }) =>
    CONFIG.REWARDS.BASE_COMPLETION + streaks * CONFIG.REWARDS.STREAK_BONUS + (misses === 0 ? CONFIG.REWARDS.PERFECT_GAME_BONUS : 0);

  // Feedback on a finished board, in the spirit of Fast Scan's evaluate()
  const evaluate = (seconds, accuracy, levelKey) => {
    const l = level(levelKey);
    const fast = l.pairs * 6; // a brisk board: about six seconds per pair
    if (accuracy < 45) return { title: "Slow down and memorise", sub: "Take a beat to place each pattern before you flip.", tone: "warn" };
    if (seconds < fast && accuracy > 70) return { title: "Outstanding recall!", sub: "You are reading patterns like a chartist.", tone: "top" };
    if (seconds < fast * 1.5) return { title: "Sharp memory!", sub: "Your pattern recognition is getting quicker.", tone: "good" };
    return { title: "Board cleared!", sub: "Keep playing to lock these patterns in.", tone: "ok" };
  };

  // ---------- Wallet: lives regenerate over time ----------
  const wallet = () => {
    const w = read(KEYS.wallet, null) || { lives: CONFIG.STARTING_LIVES, coins: CONFIG.STARTING_COINS, regenFrom: null };
    if (w.lives < CONFIG.STARTING_LIVES && w.regenFrom) {
      const gained = Math.floor((Date.now() - w.regenFrom) / CONFIG.LIFE_REGEN_MS);
      if (gained > 0) {
        w.lives = Math.min(CONFIG.STARTING_LIVES, w.lives + gained);
        w.regenFrom = w.lives >= CONFIG.STARTING_LIVES ? null : w.regenFrom + gained * CONFIG.LIFE_REGEN_MS;
        write(KEYS.wallet, w);
      }
    }
    return {
      lives: w.lives,
      coins: w.coins,
      nextLifeIn: w.lives < CONFIG.STARTING_LIVES && w.regenFrom ? Math.max(0, w.regenFrom + CONFIG.LIFE_REGEN_MS - Date.now()) : 0,
    };
  };
  const saveWallet = (patch) => {
    const cur = read(KEYS.wallet, null) || { lives: CONFIG.STARTING_LIVES, coins: CONFIG.STARTING_COINS, regenFrom: null };
    const next = { ...cur, ...patch };
    if (next.lives < CONFIG.STARTING_LIVES && !next.regenFrom) next.regenFrom = Date.now();
    if (next.lives >= CONFIG.STARTING_LIVES) next.regenFrom = null;
    write(KEYS.wallet, next);
  };
  const spendLife = () => { const w = wallet(); if (w.lives <= 0) return false; saveWallet({ lives: w.lives - 1 }); return true; };
  const addCoins = (n) => { const w = wallet(); saveWallet({ coins: Math.max(0, w.coins + n) }); };
  const spendCoins = (n) => { const w = wallet(); if (w.coins < n) return false; saveWallet({ coins: w.coins - n }); return true; };

  // ---------- Runs ----------
  const runs = () => read(KEYS.runs, []);
  const addRun = (run) => { const all = [run, ...runs()].slice(0, 60); write(KEYS.runs, all); };
  const best = (mode, levelKey) =>
    runs().filter((r) => r.completed && r.mode === mode && r.level === levelKey).sort((a, b) => b.score - a.score || a.timeMs - b.timeMs)[0] || null;
  const stats = (mode, levelKey) => {
    const all = runs();
    const moves = all.reduce((n, r) => n + r.moves, 0);
    const matches = all.reduce((n, r) => n + r.matched, 0);
    return {
      runs: all.length,
      best: best(mode, levelKey),
      accuracy: moves ? Math.round((matches / moves) * 100) : null,
      bestStreak: all.reduce((m, r) => Math.max(m, r.bestStreak || 0), 0),
      learned: learned().length,
    };
  };

  // Patterns the player has matched at least once, across every run
  const learned = () => read(KEYS.learned, []);
  const addLearned = (ids) => {
    const set = new Set(learned());
    ids.forEach((id) => set.add(id));
    write(KEYS.learned, [...set]);
  };

  const prefs = () => ({ level: "beginner", ...read(KEYS.prefs, {}) });
  const savePrefs = (p) => write(KEYS.prefs, { ...prefs(), ...p });

  // ---------- Leaderboard (demo data, seeded per mode and level, plus your best) ----------
  const PLAYERS = [
    ["Aiko Tanaka", "#a78bfa"], ["Lucas Moreau", "#3be39a"], ["Priya Raman", "#60a5fa"], ["Mateo Silva", "#ff6b93"],
    ["Hannah Weber", "#fbb517"], ["Yusuf Demir", "#22d3ee"], ["Sofia Rossi", "#f97316"], ["Daniel Kim", "#a78bfa"],
    ["Amara Okafor", "#3be39a"], ["Noah Fischer", "#60a5fa"], ["Leila Haddad", "#ff6b93"], ["Ivan Petrov", "#fbb517"],
  ];
  const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const leaderboard = (mode, levelKey, you) => {
    const l = level(levelKey);
    const rnd = seeded(l.pairs * 131 + (mode === "blind" ? 7919 : 101));
    // The fastest demo player clears with most of the clock left; each next one scores a little less
    let s = CONFIG.SCORING.BASE[l.key] + l.pairs * CONFIG.SCORING.MATCH_BONUS + l.time * 0.8 * CONFIG.SCORING.TIME_BONUS;
    const rows = PLAYERS.map(([name, color]) => {
      s -= l.pairs * (6 + rnd() * 22);
      return { name, color, score: Math.round(s), moves: Math.round(l.pairs * (2.1 + rnd() * 1.4)) };
    });
    if (you) rows.push({ name: `${you.name} (you)`, you: true, avatar: you.avatar, score: you.score, moves: you.moves });
    rows.sort((a, b) => b.score - a.score || a.moves - b.moves);
    rows.forEach((r, i) => (r.rank = i + 1));
    return { rows, players: 58 + Math.floor(rnd() * 80) + (you ? 1 : 0) };
  };

  const fmtTime = (ms) => {
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const fmtClock = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const fmtScore = (n) => n.toLocaleString("en-US");

  window.CandleFlip = {
    CONFIG, MODES, isGuest, level, limitsFor, buildDeck, scoreFor, coinsFor, evaluate,
    wallet, spendLife, addCoins, spendCoins, runs, addRun, best, stats, learned, addLearned,
    prefs, savePrefs, leaderboard, fmtTime, fmtClock, fmtScore,
    PLAYER: { name: "John", avatar: "user-avatar.png" },
  };
})();
