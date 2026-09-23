/* =========================================================
   Next Move · progression.js
   Persistent player profile: XP, level, skill ratings, achievements.

   Stored in localStorage for the prototype. The shape is deliberately
   flat and serialisable so it can become a profit.com user record
   later without a migration (spec §12).
   ========================================================= */
(function (NM) {
  'use strict';

  const KEY = 'next_move_profile_v1';

  const LEVELS = [
    { lvl: 1, xp: 0, title: 'Observer' },
    { lvl: 2, xp: 120, title: 'Observer' },
    { lvl: 3, xp: 280, title: 'Chart Watcher' },
    { lvl: 4, xp: 480, title: 'Chart Watcher' },
    { lvl: 5, xp: 720, title: 'Chart Reader' },
    { lvl: 6, xp: 1000, title: 'Chart Reader' },
    { lvl: 7, xp: 1320, title: 'Chart Reader' },
    { lvl: 8, xp: 1700, title: 'Technical Scout' },
    { lvl: 9, xp: 2140, title: 'Technical Scout' },
    { lvl: 10, xp: 2640, title: 'Technical Scout' },
    { lvl: 12, xp: 3800, title: 'Setup Hunter' },
    { lvl: 14, xp: 5200, title: 'Setup Hunter' },
    { lvl: 16, xp: 6900, title: 'Market Analyst' },
    { lvl: 18, xp: 8900, title: 'Market Analyst' },
    { lvl: 20, xp: 11200, title: 'Market Analyst' },
    { lvl: 24, xp: 16000, title: 'Senior Analyst' },
    { lvl: 28, xp: 22000, title: 'Senior Analyst' },
    { lvl: 30, xp: 26000, title: 'Technical Strategist' },
  ];

  const ACHIEVEMENTS = [
    { id: 'first_read', name: 'First Read', desc: 'Get your first scenario right.' },
    { id: 'trend_spotter', name: 'Trend Spotter', desc: 'Read 10 trend scenarios correctly.' },
    { id: 'level_headed', name: 'Level Headed', desc: 'Read 10 support & resistance scenarios correctly.' },
    { id: 'breakout_specialist', name: 'Breakout Specialist', desc: 'Read 15 breakout scenarios correctly.' },
    { id: 'patience_pays', name: 'Patience Pays', desc: 'Make 10 correct NO TRADE calls.' },
    { id: 'on_fire', name: 'On Fire', desc: 'Reach a 10-answer streak.' },
    { id: 'survivor', name: 'Survivor', desc: 'Read 25 scenarios in a single Survival run.' },
    { id: 'volume_reader', name: 'Volume Reader', desc: 'Read 8 volume scenarios correctly.' },
    { id: 'no_chaser', name: 'No Chaser', desc: 'Correctly pass on 5 unconfirmed breakouts.' },
  ];

  const blankSkill = () => ({ seen: 0, correct: 0, rating: 50 });

  function blank() {
    const skills = {};
    Object.keys(NM.Scenarios.SKILLS).forEach((k) => { skills[k] = blankSkill(); });
    return {
      v: 1,
      xp: 0,
      skills,
      concepts: {},          // concept name -> times seen
      achievements: {},      // id -> ISO date unlocked
      counters: {},          // ad-hoc counters for achievements
      best: { survival: 0, practice: 0 },
      bestStreak: 0,
      runs: 0,
      scenariosSeen: 0,
      onboarded: false,
      settings: { sound: true },
    };
  }

  let profile = blank();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        profile = { ...blank(), ...saved };
        profile.skills = { ...blank().skills, ...(saved.skills || {}) };
        profile.settings = { ...blank().settings, ...(saved.settings || {}) };
        profile.best = { ...blank().best, ...(saved.best || {}) };
      }
    } catch { /* storage unavailable or corrupt — start fresh */ }
    return profile;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* storage unavailable */ }
  }

  /* ---------- level ---------- */
  function levelInfo(xp = profile.xp) {
    let cur = LEVELS[0], next = null;
    for (let i = 0; i < LEVELS.length; i++) {
      if (xp >= LEVELS[i].xp) cur = LEVELS[i];
      else { next = LEVELS[i]; break; }
    }
    const span = next ? next.xp - cur.xp : 1;
    const into = next ? xp - cur.xp : 1;
    return {
      level: cur.lvl,
      title: cur.title,
      xp,
      xpInto: into,
      xpSpan: span,
      xpToNext: next ? next.xp - xp : 0,
      progress: next ? Math.max(0, Math.min(1, into / span)) : 1,
      isMax: !next,
    };
  }

  /* ---------- recording ---------- */

  /**
   * Skill ratings move like a light Elo: a correct answer on a hard
   * scenario moves the needle more than an easy one, and the rating
   * converges rather than swinging on a single result.
   */
  function bumpSkill(key, correct, difficulty) {
    const s = profile.skills[key] || (profile.skills[key] = blankSkill());
    s.seen++;
    if (correct) s.correct++;
    const K = 4 + difficulty * 1.5;
    const expected = s.rating / 100;
    s.rating = Math.max(3, Math.min(99, s.rating + K * ((correct ? 1 : 0) - expected)));
  }

  function recordAnswer({ scenario, correct, answer, xp }) {
    profile.scenariosSeen++;
    profile.xp += xp;
    (scenario.skills || [scenario.skill]).forEach((k) => bumpSkill(k, correct, scenario.difficulty));

    const c = profile.concepts;
    c[scenario.concept] = (c[scenario.concept] || 0) + 1;

    const n = profile.counters;
    const bump = (k) => { n[k] = (n[k] || 0) + 1; };
    if (correct) {
      bump('correct');
      bump('cat_' + scenario.category);
      if (answer === NM.Scenarios.NO_TRADE) bump('no_trade');
      if (answer === NM.Scenarios.NO_TRADE && scenario.category === 'breakout') bump('passed_breakout');
    }
    return checkAchievements();
  }

  function isFirstTimeConcept(scenario) {
    return !profile.concepts[scenario.concept];
  }

  function recordRun({ mode, score, bestStreak, scenarios, correct, xp }) {
    profile.runs++;
    profile.xp += xp;
    if (score > (profile.best[mode] || 0)) profile.best[mode] = score;
    if (bestStreak > profile.bestStreak) profile.bestStreak = bestStreak;

    const n = profile.counters;
    if (mode === 'survival' && scenarios >= 25) n.survivor_run = 1;

    const unlocked = checkAchievements();
    save();
    return unlocked;
  }

  /* ---------- achievements ---------- */
  function checkAchievements() {
    const n = profile.counters;
    const rules = {
      first_read: () => (n.correct || 0) >= 1,
      trend_spotter: () => (n.cat_trend || 0) >= 10,
      level_headed: () => (n.cat_sr || 0) >= 10,
      breakout_specialist: () => (n.cat_breakout || 0) >= 15,
      patience_pays: () => (n.no_trade || 0) >= 10,
      on_fire: () => profile.bestStreak >= 10,
      survivor: () => !!n.survivor_run,
      volume_reader: () => (n.cat_volume || 0) >= 8,
      no_chaser: () => (n.passed_breakout || 0) >= 5,
    };
    const fresh = [];
    ACHIEVEMENTS.forEach((a) => {
      if (!profile.achievements[a.id] && rules[a.id] && rules[a.id]()) {
        profile.achievements[a.id] = new Date().toISOString();
        fresh.push(a);
      }
    });
    return fresh;
  }

  /* ---------- insight ---------- */

  /** Weakest skill with enough evidence behind it to be worth naming. */
  function weakestSkill(minSeen = 3) {
    let worst = null;
    Object.keys(profile.skills).forEach((k) => {
      const s = profile.skills[k];
      if (s.seen < minSeen) return;
      if (!worst || s.rating < profile.skills[worst].rating) worst = k;
    });
    return worst;
  }

  function strongestSkill(minSeen = 3) {
    let best = null;
    Object.keys(profile.skills).forEach((k) => {
      const s = profile.skills[k];
      if (s.seen < minSeen) return;
      if (!best || s.rating > profile.skills[best].rating) best = k;
    });
    return best;
  }

  /* ---------- settings ---------- */
  function setSetting(k, v) { profile.settings[k] = v; save(); }
  function setOnboarded() { profile.onboarded = true; save(); }

  function reset() { profile = blank(); save(); return profile; }

  NM.Progression = {
    LEVELS, ACHIEVEMENTS,
    load, save, reset,
    get: () => profile,
    levelInfo,
    recordAnswer, recordRun,
    isFirstTimeConcept,
    weakestSkill, strongestSkill,
    setSetting, setOnboarded,
    bestFor: (mode) => profile.best[mode] || 0,
  };
})(window.NM = window.NM || {});
