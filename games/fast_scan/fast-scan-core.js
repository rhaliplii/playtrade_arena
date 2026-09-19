// Fast Scan — rules, player data and leaderboard, shared by the game (games/fast_scan/index.html)
// and its Arena join screen (fast-scan.html). Rules follow the original prototype's GAME_CONFIG.
(() => {
  const CONFIG = {
    SIZES: [3, 4, 5, 6, 7, 8, 9, 10],
    TIME_LIMITS: { 3: 8, 4: 18, 5: 30, 6: 45, 7: 60, 8: 80, 9: 100, 10: 120 }, // seconds
    MAX_MISTAKES: { 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 7, 9: 7, 10: 7 },
    STREAK_WINDOW: 2, // seconds between two right taps to keep a streak going
    STREAK_MIN: 3, // taps in a row that count as one streak
    REWARDS: { BASE_COMPLETION: 10, STREAK_BONUS: 2, PERFECT_GAME_BONUS: 5 },
    HINT_COST: 25, // coins, for "Reveal next" and "+3 seconds"
    EXTRA_TIME: 3, // seconds added by the time hint
    STARTING_LIVES: 5,
    STARTING_COINS: 50, // welcome balance, so hints can be tried from the first run
    LIFE_REGEN_MS: 15 * 60 * 1000, // one life back every 15 minutes, up to STARTING_LIVES
  };

  const MODES = {
    practice: { label: "Practice", short: "P", ranked: false, sub: "No clock, no pressure" },
    classic: { label: "Classic", short: "C", ranked: true, sub: "Beat the clock" },
    hardcore: { label: "Hardcore", short: "H", ranked: true, sub: "Random numbers, no hints" },
  };

  const KEYS = { wallet: "fast_scan_wallet_v1", runs: "fast_scan_runs_v2" /* v1 could contain runs recorded by the preview */, prefs: "fast_scan_prefs_v1" };
  try { localStorage.removeItem("fast_scan_runs_v1"); } catch { /* storage unavailable */ }
  const read = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

  // ---------- Signed-in vs guest ----------
  // The Arena has no real authentication yet: `?guest=1` on any Fast Scan page previews the guest
  // experience for this tab, `?guest=0` returns to the signed-in demo player.
  const isGuest = () => {
    const q = new URLSearchParams(location.search).get("guest");
    try {
      if (q === "1") sessionStorage.setItem("pt_guest", "1");
      if (q === "0") sessionStorage.removeItem("pt_guest");
      return sessionStorage.getItem("pt_guest") === "1";
    } catch { return q === "1"; }
  };

  // ---------- Rules ----------
  const limitsFor = (mode, size) => ({
    timeLimit: mode === "practice" ? 0 : CONFIG.TIME_LIMITS[size] || 150,
    maxMistakes: mode === "practice" ? 0 : CONFIG.MAX_MISTAKES[size] || 7,
  });

  // Numbers for one board: 1…N (Practice, Classic) or random ascending values with gaps (Hardcore)
  const generateNumbers = (size, mode) => {
    const total = size * size;
    let nums;
    if (mode === "hardcore") {
      nums = [];
      let current = Math.floor(Math.random() * 10) + 1;
      for (let i = 0; i < total; i++) { nums.push(current); current += Math.floor(Math.random() * 50) + 1; }
    } else {
      nums = Array.from({ length: total }, (_, i) => i + 1);
    }
    for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
    return nums;
  };

  const coinsFor = ({ streaks, mistakes }) =>
    CONFIG.REWARDS.BASE_COMPLETION + streaks * CONFIG.REWARDS.STREAK_BONUS + (mistakes === 0 ? CONFIG.REWARDS.PERFECT_GAME_BONUS : 0);

  // Feedback on a finished board (from the prototype's evaluatePerformance)
  const evaluate = (seconds, accuracy, size) => {
    const fast = 1.5 * size * size;
    if (accuracy < 80) return { title: "Slow down, focus more", sub: "Accuracy matters more than speed.", tone: "warn" };
    if (seconds < fast && accuracy > 95) return { title: "Outstanding performance!", sub: "You're scanning like a pro trader.", tone: "top" };
    if (seconds < fast * 1.5) return { title: "Great scanning speed!", sub: "Your focus is improving.", tone: "good" };
    return { title: "Good effort!", sub: "Keep practicing to improve your speed.", tone: "ok" };
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
  const best = (mode, size) =>
    runs().filter((r) => r.completed && r.mode === mode && r.size === size).sort((a, b) => a.timeMs - b.timeMs || b.accuracy - a.accuracy)[0] || null;
  const stats = (mode, size) => {
    const all = runs();
    const attempts = all.reduce((n, r) => n + r.found + r.mistakes, 0);
    const found = all.reduce((n, r) => n + r.found, 0);
    return {
      runs: all.length,
      best: best(mode, size),
      accuracy: attempts ? Math.round((found / attempts) * 100) : null,
      bestStreak: all.reduce((m, r) => Math.max(m, r.bestStreak || 0), 0),
    };
  };

  const prefs = () => ({ size: 5, ...read(KEYS.prefs, {}) });
  const savePrefs = (p) => write(KEYS.prefs, { ...prefs(), ...p });

  // ---------- Leaderboard (demo data, seeded per mode and grid size, plus your best) ----------
  const PLAYERS = [
    ["Aiko Tanaka", "#a78bfa"], ["Lucas Moreau", "#3be39a"], ["Priya Raman", "#60a5fa"], ["Mateo Silva", "#ff6b93"],
    ["Hannah Weber", "#fbb517"], ["Yusuf Demir", "#22d3ee"], ["Sofia Rossi", "#f97316"], ["Daniel Kim", "#a78bfa"],
    ["Amara Okafor", "#3be39a"], ["Noah Fischer", "#60a5fa"], ["Leila Haddad", "#ff6b93"], ["Ivan Petrov", "#fbb517"],
  ];
  const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const leaderboard = (mode, size, you) => {
    const rnd = seeded(size * 97 + (mode === "hardcore" ? 7919 : 101));
    const perCell = mode === "hardcore" ? 0.95 : 0.62; // seconds per number for the fastest demo player
    let t = size * size * perCell * 1000;
    const rows = PLAYERS.map(([name, color]) => {
      t += size * size * (18 + rnd() * 40); // each next player a little slower
      return { name, color, timeMs: Math.round(t), accuracy: Math.round(88 + rnd() * 12) };
    });
    if (you) rows.push({ name: `${you.name} (you)`, you: true, avatar: you.avatar, timeMs: you.timeMs, accuracy: you.accuracy });
    rows.sort((a, b) => a.timeMs - b.timeMs || b.accuracy - a.accuracy);
    rows.forEach((r, i) => (r.rank = i + 1));
    return { rows, players: 64 + Math.floor(rnd() * 90) + (you ? 1 : 0) };
  };

  const fmtTime = (ms) => {
    const s = ms / 1000;
    return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
  };
  const fmtClock = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  window.FastScan = {
    CONFIG, MODES, isGuest, limitsFor, generateNumbers, coinsFor, evaluate,
    wallet, spendLife, addCoins, spendCoins, runs, addRun, best, stats, prefs, savePrefs, leaderboard,
    fmtTime, fmtClock,
    PLAYER: { name: "John", avatar: "user-avatar.png" },
  };
})();
