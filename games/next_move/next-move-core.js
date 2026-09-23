// Next Move — the Arena's side of the game: lives, coins, run history and the leaderboard,
// shared by the game (games/next_move/index.html) and its join screen (next-move.html).
// The gameplay, scoring and progression stay in the game's own js/ modules; this only holds
// what the Arena needs to show around it, on the same conventions as Fast Scan and Candle Flip.
(() => {
  const CONFIG = {
    STARTING_LIVES: 5,
    STARTING_COINS: 50,
    LIFE_REGEN_MS: 15 * 60 * 1000, // one life back every 15 minutes, up to STARTING_LIVES
    REWARDS: { BASE_COMPLETION: 10, STREAK_BONUS: 2, PERFECT_GAME_BONUS: 5 },
    STREAK_MIN: 3, // right answers in a row that count as one streak
  };

  // The game's own modes; Survival is the ranked one, as Classic is in Fast Scan
  const MODES = {
    practice: { label: "Practice", short: "P", ranked: false, sub: "Learn with hints" },
    survival: { label: "Survival", short: "S", ranked: true, sub: "Wrong calls cost lives" },
  };

  const KEYS = { wallet: "next_move_wallet_v1", runs: "next_move_runs_v1", prefs: "next_move_prefs_v1" };
  const read = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

  // ---------- Signed-in vs guest ----------
  // The Arena has no real authentication yet: `?guest=1` on any Next Move page previews the
  // guest experience for this tab, `?guest=0` returns to the signed-in demo player.
  const isGuest = () => {
    const q = new URLSearchParams(location.search).get("guest");
    try {
      if (q === "1") sessionStorage.setItem("pt_guest", "1");
      if (q === "0") sessionStorage.removeItem("pt_guest");
      return sessionStorage.getItem("pt_guest") === "1";
    } catch { return q === "1"; }
  };

  const coinsFor = ({ streaks, incorrect }) =>
    CONFIG.REWARDS.BASE_COMPLETION + streaks * CONFIG.REWARDS.STREAK_BONUS + (incorrect === 0 ? CONFIG.REWARDS.PERFECT_GAME_BONUS : 0);

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

  // ---------- Runs ----------
  const runs = () => read(KEYS.runs, []);
  const addRun = (run) => { const all = [run, ...runs()].slice(0, 60); write(KEYS.runs, all); };
  const best = (mode) =>
    runs().filter((r) => r.mode === mode).sort((a, b) => b.score - a.score || b.accuracy - a.accuracy)[0] || null;
  const stats = (mode) => {
    const all = runs();
    const answered = all.reduce((n, r) => n + r.total, 0);
    const right = all.reduce((n, r) => n + r.correct, 0);
    return {
      runs: all.length,
      best: best(mode),
      accuracy: answered ? Math.round((right / answered) * 100) : null,
      bestStreak: all.reduce((m, r) => Math.max(m, r.bestStreak || 0), 0),
      charts: answered,
    };
  };

  const prefs = () => ({ mode: "survival", ...read(KEYS.prefs, {}) });
  const savePrefs = (p) => write(KEYS.prefs, { ...prefs(), ...p });

  // ---------- Leaderboard (demo data, seeded per mode, plus your best) ----------
  const PLAYERS = [
    ["Aiko Tanaka", "#a78bfa"], ["Lucas Moreau", "#3be39a"], ["Priya Raman", "#60a5fa"], ["Mateo Silva", "#ff6b93"],
    ["Hannah Weber", "#fbb517"], ["Yusuf Demir", "#22d3ee"], ["Sofia Rossi", "#f97316"], ["Daniel Kim", "#a78bfa"],
    ["Amara Okafor", "#3be39a"], ["Noah Fischer", "#60a5fa"], ["Leila Haddad", "#ff6b93"], ["Ivan Petrov", "#fbb517"],
  ];
  const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const leaderboard = (mode, you) => {
    const rnd = seeded(mode === "survival" ? 7919 : 101);
    let s = mode === "survival" ? 14800 : 9200;
    const rows = PLAYERS.map(([name, color]) => {
      s -= 240 + rnd() * 900;
      return { name, color, score: Math.round(s), accuracy: Math.round(72 + rnd() * 26) };
    });
    if (you) rows.push({ name: `${you.name} (you)`, you: true, avatar: you.avatar, score: you.score, accuracy: you.accuracy });
    rows.sort((a, b) => b.score - a.score || b.accuracy - a.accuracy);
    rows.forEach((r, i) => (r.rank = i + 1));
    return { rows, players: 52 + Math.floor(rnd() * 90) + (you ? 1 : 0) };
  };

  const fmtScore = (n) => Number(n || 0).toLocaleString("en-US");
  const fmtClock = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  window.NextMove = {
    CONFIG, MODES, isGuest, coinsFor,
    wallet, spendLife, addCoins, runs, addRun, best, stats, prefs, savePrefs, leaderboard,
    fmtScore, fmtClock,
    PLAYER: { name: "John", avatar: "user-avatar.png" },
  };
})();
