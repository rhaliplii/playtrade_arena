/* =========================================================
   Next Move · scoring.js
   Score, streak multipliers and XP — all pure functions.

   Deliberate balance choices:
   · Speed is worth at most 25 points, so a reckless fast player can
     never out-score an accurate slow one (spec §7).
   · A correct NO TRADE earns a discipline bonus, because the game has
     to reward patience if it wants to teach it (spec §10).
   ========================================================= */
(function (NM) {
  'use strict';

  const BASE = 100;
  const SPEED_MAX = 25;
  const DISCIPLINE_BONUS = 0.1;

  /* Streak tiers: the label and multiplier the HUD shows. */
  const STREAK_TIERS = [
    { at: 10, mult: 2.0, label: 'Perfect Read', icon: '⚡' },
    { at: 8, mult: 1.75, label: 'Market Vision', icon: '⚡' },
    { at: 5, mult: 1.5, label: 'On Fire', icon: '🔥' },
    { at: 3, mult: 1.2, label: 'Streak', icon: '🔥' },
    { at: 0, mult: 1.0, label: '', icon: '' },
  ];

  const tierFor = (streak) => STREAK_TIERS.find((t) => streak >= t.at);
  const streakMult = (streak) => tierFor(streak).mult;

  /* Practice is for learning, so it pays less than the competitive modes. */
  const MODE_XP = { practice: 0.5, survival: 1, ranked: 1 };

  /**
   * Score one answer.
   * `reactionMs` is measured from the moment the chart became readable.
   */
  function scoreAnswer({ scenario, correct, answer, reactionMs, streakBefore, mode }) {
    if (!correct) {
      return { points: 0, base: 0, difficultyMult: 0, streakMult: 0, speedBonus: 0, disciplineBonus: 0 };
    }

    const difficultyMult = NM.Scenarios.DIFFICULTY[scenario.difficulty].mult;
    const sMult = streakMult(streakBefore);

    let points = BASE * difficultyMult * sMult;

    /* Speed bonus: full value for an answer inside a third of the clock,
       tapering to zero at the buzzer. */
    const limit = scenario.timeLimit * 1000;
    const frac = Math.max(0, Math.min(1, 1 - (reactionMs - limit / 3) / (limit * 0.67)));
    const speedBonus = Math.round(SPEED_MAX * frac);
    points += speedBonus;

    const disciplineBonus = answer === NM.Scenarios.NO_TRADE ? Math.round(points * DISCIPLINE_BONUS) : 0;
    points += disciplineBonus;

    if (mode === 'practice') points = Math.round(points * 0.5);

    return {
      points: Math.round(points),
      base: BASE,
      difficultyMult,
      streakMult: sMult,
      speedBonus,
      disciplineBonus,
    };
  }

  /** XP for a single scenario — smaller numbers, steadier progression. */
  function xpForAnswer({ scenario, correct, mode, firstTimeConcept }) {
    let xp = 4;                               // showing up and reading a chart
    if (correct) xp += 8 + scenario.difficulty * 2;
    if (correct && firstTimeConcept) xp += 20; // learning a new concept
    return Math.round(xp * (MODE_XP[mode] != null ? MODE_XP[mode] : 1));
  }

  /** End-of-run XP: accuracy and volume, so long accurate runs pay off. */
  function xpForRun({ correct, total, bestStreak, mode }) {
    if (!total) return 0;
    const acc = correct / total;
    let xp = correct * 2;
    if (acc >= 0.9) xp += 60;
    else if (acc >= 0.75) xp += 35;
    else if (acc >= 0.6) xp += 15;
    xp += Math.min(50, bestStreak * 5);
    return Math.round(xp * (MODE_XP[mode] != null ? MODE_XP[mode] : 1));
  }

  /**
   * Ranked points. Not surfaced in this build, but the weighting is the
   * product decision worth fixing early: accuracy dominates, difficulty
   * matters next, speed is a tiebreaker (spec §7).
   */
  function rankedPoints({ correct, total, avgDifficulty, bestStreak, avgReactionMs, avgTimeLimitMs }) {
    if (!total) return 0;
    const accuracy = correct / total;
    const speed = avgTimeLimitMs ? Math.max(0, 1 - avgReactionMs / avgTimeLimitMs) : 0;
    return Math.round(
      1000 * Math.pow(accuracy, 1.6) * (0.6 + 0.4 * (avgDifficulty / 4)) +
      20 * bestStreak +
      60 * speed
    );
  }

  NM.Scoring = {
    BASE, SPEED_MAX, STREAK_TIERS,
    tierFor, streakMult,
    scoreAnswer, xpForAnswer, xpForRun, rankedPoints,
  };
})(window.NM = window.NM || {});
