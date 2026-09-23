/* =========================================================
   Next Move · game.js
   The state machine and the run.

   Every rule lives here; every pixel lives in ui.js and chart.js.
   Transitions are explicit (spec §39) so that, for example, an answer
   pressed during the candle reveal simply cannot register.
   ========================================================= */
(function (NM) {
  'use strict';

  const { UP, DOWN, NO_TRADE } = NM.Scenarios;
  const UI = NM.UI;
  const track = (n, p) => NM.Analytics.track(n, p);

  /* ---------- states ---------- */
  const S = {
    MENU: 'MENU',
    ONBOARDING: 'ONBOARDING',
    COUNTDOWN: 'COUNTDOWN',
    LOADING_SCENARIO: 'LOADING_SCENARIO',
    ANALYZING: 'ANALYZING',
    ANSWER_LOCKED: 'ANSWER_LOCKED',
    REVEALING: 'REVEALING',
    FEEDBACK: 'FEEDBACK',
    NEXT_SCENARIO: 'NEXT_SCENARIO',
    GAME_OVER: 'GAME_OVER',
    SUMMARY: 'SUMMARY',
  };

  const MODES = {
    practice: { lives: null, extraTime: 8, hints: true, autoAdvance: false, fixed: 0 },
    survival: { lives: 3, extraTime: 0, hints: false, autoAdvance: true, fixed: 0 },
    ranked: { lives: 3, extraTime: 0, hints: false, autoAdvance: true, fixed: 20 },
  };

  /*
   * How long the feedback stays up before the next chart.
   *
   * A fixed 2.9s was too short to read an explanation, and the
   * explanations are the product. Two rules now:
   *
   *  · a correct answer advances on its own, after enough time to read
   *    what was written — scaled to the length of the text, not a
   *    constant, because a myth-busting note runs twice as long as a
   *    one-line confirmation;
   *  · a miss never auto-advances. Getting it wrong is precisely the
   *    moment the player needs to read, and no timer should be deciding
   *    when they have finished.
   */
  const READ_BASE_MS = 1200;      // time to take in the revealed candles
  const READ_PER_WORD_MS = 150;   // brisk skim of prose you have just been shown
  const READ_MIN_MS = 3500;
  const READ_MAX_MS = 7000;

  function feedbackDwell(scn, correct) {
    if (!correct) return 0;
    const words = (scn.explanation + ' ' + (scn.myth || '')).trim().split(/\s+/).length;
    return Math.min(READ_MAX_MS, Math.max(READ_MIN_MS, READ_BASE_MS + words * READ_PER_WORD_MS));
  }

  const POWERUP_EVERY = 4;   // correct answers per reward
  const POWERUP_CAP = 3;
  const PICKABLE = ['insight', 'time', 'fifty', 'shield', 'saver'];

  /* ---------- engine state ---------- */
  const G = {
    state: S.MENU,
    run: null,
    chart: null,
    profile: null,
    reduced: false,
    mode: 'survival',        // the mode selected on the menu
    paused: false,
    autoTimer: 0,
    revealGuard: 0,
    cdTimer: 0,
  };

  /* 3 · 2 · 1 · GO, matching the other Playtrade games. */
  const COUNT_MS = 780;
  const GO_MS = 520;

  const timer = { active: false, remaining: 0, limit: 0, id: 0, last: 0 };

  function setState(next) {
    G.state = next;
    document.body.dataset.state = next;
  }

  /* =========================================================
     Run
     ========================================================= */
  function newRun(mode, opts = {}) {
    const cfg = MODES[mode];
    const skillStats = {};
    Object.keys(NM.Scenarios.SKILLS).forEach((k) => { skillStats[k] = { seen: 0, correct: 0 }; });

    return {
      mode,
      config: cfg,
      status: 'playing',
      score: 0,
      xpEarned: 0,
      lives: cfg.lives,
      maxLives: cfg.lives,
      livesLost: 0,
      streak: 0,
      bestStreak: 0,
      index: 0,
      correct: 0,
      incorrect: 0,
      timeouts: 0,
      seen: [],
      mistakes: [],
      skillStats,
      categoryStats: {},
      answerStats: { UP: { seen: 0, correct: 0 }, DOWN: { seen: 0, correct: 0 }, NO_TRADE: { seen: 0, correct: 0 } },
      powerups: { insight: 0, time: 0, fifty: 0, shield: 0, saver: 0 },
      armed: { shield: false, saver: false },
      correctSincePowerup: 0,
      lastStreakCue: 0,
      /* A fixed playlist overrides generation — used by the test harnesses. */
      playlist: opts.playlist || null,
      categories: opts.categories || null,
      scenario: null,
      startedAt: Date.now(),
      reactionStart: 0,
      totalReaction: 0,
      difficultySum: 0,
      timeLimitSum: 0,
    };
  }

  function startRun(mode, opts = {}) {
    stopAuto();
    const run = newRun(mode, opts);
    G.run = run;

    /* A little starting kit so the mechanic is discoverable. */
    if (mode === 'practice') { run.powerups.insight = 2; run.powerups.fifty = 1; }
    else { run.powerups.insight = 1; }

    UI.showScreen('play');
    UI.renderScore(0);
    UI.renderStreak(0);
    UI.renderLives(run.lives, run.maxLives);
    UI.renderLevel(NM.Progression.levelInfo());
    UI.setAnswersEnabled(false);
    UI.renderTimer(null);
    UI.renderPowerups(run.powerups, run.armed, false);
    UI.prepareCountdown();
    /* Wipe the previous run's chart before the count starts. */
    G.chart.clear();

    track('game_started', { mode });
    track('mode_selected', { mode, categories: (opts.categories || []).join(',') || 'all' });

    /* The first chart loads only once the count finishes — otherwise the
       player would get several seconds of free analysis before the clock
       they are being timed against even starts. */
    countdownThen(() => nextScenario());
  }

  function stopCountdown() {
    if (G.cdTimer) clearTimeout(G.cdTimer);
    G.cdTimer = 0;
  }

  function countdownThen(done) {
    stopCountdown();
    /* The Arena's attract loop is watch-only, so it opens straight on a chart rather than
       counting the viewer in. Real runs are unaffected. */
    if (document.documentElement.classList.contains('is-preview')) { UI.hideCountdown(); done(); return; }
    setState(S.COUNTDOWN);
    let n = 3;
    const tick = () => {
      G.cdTimer = 0;
      if (G.state !== S.COUNTDOWN || !G.run) return;   // quit mid-count
      if (n > 0) {
        UI.countdownNumber(n);
        NM.Audio.play('count');
        n--;
        G.cdTimer = setTimeout(tick, COUNT_MS);
      } else {
        UI.countdownGo();
        NM.Audio.play('go');
        G.cdTimer = setTimeout(() => {
          G.cdTimer = 0;
          if (G.state !== S.COUNTDOWN || !G.run) return;
          UI.hideCountdown();
          done();
        }, GO_MS);
      }
    };
    tick();
  }

  function pickScenario() {
    const run = G.run;
    const rng = NM.Rng.create(run.startedAt + run.index * 7919);

    if (run.playlist) return run.playlist[run.index] || null;

    if (run.mode === 'practice') {
      return NM.Scenarios.pick(rng, { categories: run.categories, exclude: run.seen });
    }
    const difficulties = NM.Scenarios.survivalDifficulty(run.index);
    return NM.Scenarios.pick(rng, { difficulties, exclude: run.seen });
  }

  function nextScenario() {
    const run = G.run;
    if (!run) return;

    if (run.config.fixed && run.index >= run.config.fixed) return endRun('complete');

    setState(S.LOADING_SCENARIO);
    const scn = pickScenario();
    if (!scn) return endRun('complete');

    run.scenario = scn;
    run.seen.push(scn.id);

    UI.hideFeedback();
    UI.clearAnswerMarks();
    UI.renderScenario(scn, run.mode);
    UI.renderHints(scn, run.config.hints);
    UI.renderProgress(run.config.fixed ? `Chart ${run.index + 1} of ${run.config.fixed}` : `Chart ${run.index + 1}`);
    UI.renderPowerups(run.powerups, run.armed, true);
    G.chart.load(scn);

    track('scenario_viewed', NM.Analytics.scenarioProps(scn, { mode: run.mode, index: run.index }));

    /* A short beat so the chart is on screen before the clock starts. */
    setTimeout(() => {
      if (G.state !== S.LOADING_SCENARIO || !G.run) return;
      setState(S.ANALYZING);
      UI.setAnswersEnabled(true);
      run.reactionStart = performance.now();
      startTimer(scn.timeLimit + run.config.extraTime);
    }, G.reduced ? 80 : 420);
  }

  /* =========================================================
     Timer
     ========================================================= */
  /*
   * The clock runs on an interval rather than requestAnimationFrame.
   * rAF stops in a background tab and is throttled under load, which
   * would silently hand the player extra time — or freeze the clock
   * outright. Elapsed time is measured from timestamps, so the
   * countdown stays honest even if a tick is late.
   */
  const TICK_MS = 50;

  function startTimer(seconds) {
    stopTimer();
    timer.active = true;
    timer.limit = seconds;
    timer.remaining = seconds;
    timer.last = performance.now();
    lastTickSecond = -1;
    UI.renderTimer(timer.remaining, timer.limit);
    timer.id = setInterval(tickTimer, TICK_MS);
  }

  function stopTimer() {
    timer.active = false;
    if (timer.id) clearInterval(timer.id);
    timer.id = 0;
  }

  let lastTickSecond = -1;
  function tickTimer() {
    if (!timer.active) return;
    const now = performance.now();
    const dt = (now - timer.last) / 1000;
    timer.last = now;
    if (G.paused) return;

    timer.remaining = Math.max(0, timer.remaining - dt);
    UI.renderTimer(timer.remaining, timer.limit);

    const sec = Math.ceil(timer.remaining);
    if (sec <= 3 && sec !== lastTickSecond && sec > 0) {
      lastTickSecond = sec;
      NM.Audio.play('tick');
    }
    if (timer.remaining <= 0) {
      lastTickSecond = -1;
      stopTimer();
      submit(null, true);
    }
  }

  /* =========================================================
     Answering
     ========================================================= */
  function submit(answer, timedOut = false) {
    if (G.state !== S.ANALYZING) return;
    const run = G.run;
    const scn = run.scenario;

    stopTimer();
    setState(S.ANSWER_LOCKED);
    UI.setAnswersEnabled(false);
    UI.renderTimer(null);

    const reaction = performance.now() - run.reactionStart;
    const correct = !timedOut && answer === scn.answer;

    run.pending = { answer, timedOut, correct, reaction };
    UI.markAnswer(timedOut ? null : answer, scn.answer);

    track('answer_selected', NM.Analytics.scenarioProps(scn, {
      mode: run.mode, answer: timedOut ? 'TIMEOUT' : answer,
      reaction_ms: Math.round(reaction), streak: run.streak, lives: run.lives, score: run.score,
    }));
    if (!timedOut && answer === NO_TRADE) track('no_trade_selected', NM.Analytics.scenarioProps(scn, { mode: run.mode }));

    setState(S.REVEALING);

    armRevealWatchdog(scn);
    tickCandles(scn);
    G.chart.reveal(onRevealed);
  }

  /* requestAnimationFrame stops in a background tab, so the reveal is
     forced to completion if the frame loop goes quiet — the player must
     never be stranded watching a half-drawn chart. */
  function armRevealWatchdog(scn) {
    const ms = NM.Chart.revealDurationFor(scn.futureCount, G.reduced);
    clearTimeout(G.revealGuard);
    G.revealGuard = setTimeout(() => G.chart.finishReveal(), ms + 700);
  }

  /** One faint tick per candle as the future arrives. */
  function tickCandles(scn) {
    const n = scn.futureCount;
    const per = NM.Chart.revealDurationFor(n, G.reduced) / n;
    for (let i = 0; i < n; i++) setTimeout(() => NM.Audio.play('candle'), i * per);
  }

  function onRevealed() {
    clearTimeout(G.revealGuard);
    G.revealGuard = 0;
    if (!G.run || G.state !== S.REVEALING) return;
    const run = G.run;
    const scn = run.scenario;
    const { answer, timedOut, correct, reaction } = run.pending;

    G.chart.showOutcome({ correct, answer, picked: answer });

    /* ---- score ---- */
    const result = NM.Scoring.scoreAnswer({
      scenario: scn, correct, answer, reactionMs: reaction,
      streakBefore: run.streak, mode: run.mode,
    });
    run.score += result.points;
    run.totalReaction += reaction;
    run.difficultySum += scn.difficulty;
    run.timeLimitSum += scn.timeLimit * 1000;

    /* ---- streak, lives ---- */
    let lifeLost = false;
    let savedStreak = false;
    let shielded = false;

    if (correct) {
      run.correct++;
      run.streak++;
      run.bestStreak = Math.max(run.bestStreak, run.streak);
      run.correctSincePowerup++;
    } else {
      run.incorrect++;
      if (timedOut) run.timeouts++;
      run.mistakes.push({ scn, picked: timedOut ? null : answer });

      if (run.armed.saver && run.powerups.saver > 0) {
        run.powerups.saver--; run.armed.saver = false; savedStreak = true;
      } else {
        run.streak = 0;
      }

      if (run.lives != null) {
        if (run.armed.shield && run.powerups.shield > 0) {
          run.powerups.shield--; run.armed.shield = false; shielded = true;
        } else {
          run.lives--; run.livesLost++; lifeLost = true;
        }
      }
    }

    /* ---- stats ---- */
    (scn.skills || [scn.skill]).forEach((k) => {
      const s = run.skillStats[k] || (run.skillStats[k] = { seen: 0, correct: 0 });
      s.seen++; if (correct) s.correct++;
    });
    const cs = run.categoryStats[scn.category] || (run.categoryStats[scn.category] = { seen: 0, correct: 0 });
    cs.seen++; if (correct) cs.correct++;
    const as = run.answerStats[scn.answer];
    as.seen++; if (correct) as.correct++;

    /* ---- xp & profile ---- */
    const firstTimeConcept = NM.Progression.isFirstTimeConcept(scn);
    const xp = NM.Scoring.xpForAnswer({ scenario: scn, correct, mode: run.mode, firstTimeConcept });
    run.xpEarned += xp;
    const unlocked = NM.Progression.recordAnswer({ scenario: scn, correct, answer, xp });
    NM.Progression.save();

    /* ---- feedback ---- */
    UI.renderScore(run.score);
    UI.renderStreak(run.streak);
    UI.renderLives(run.lives, run.maxLives, lifeLost);
    UI.renderLevel(NM.Progression.levelInfo());

    if (correct) {
      NM.Audio.play(answer === NO_TRADE ? 'noTradeRight' : 'correct');
      UI.flash('good');
      UI.pop('+' + UI.fmt(result.points), 'good');
      track('answer_correct', NM.Analytics.scenarioProps(scn, { mode: run.mode, points: result.points, streak: run.streak }));
      if (run.streak >= 3 && run.streak !== run.lastStreakCue) {
        run.lastStreakCue = run.streak;
        const tier = NM.Scoring.tierFor(run.streak);
        if (tier.at && run.streak === tier.at) {
          NM.Audio.play('streak', run.streak);
          UI.toast(`${tier.icon} ${tier.label}`, `${run.streak} in a row · ×${tier.mult} multiplier`, 'good');
        }
      }
    } else {
      NM.Audio.play('wrong');
      UI.flash('bad');
      UI.shake();
      track('answer_incorrect', NM.Analytics.scenarioProps(scn, {
        mode: run.mode, answer: timedOut ? 'TIMEOUT' : answer, streak_lost: !savedStreak,
      }));
      if (lifeLost) {
        NM.Audio.play('lifeLost');
        track('life_lost', { mode: run.mode, lives_left: run.lives });
      }
      if (shielded) UI.toast('⛨ Shield used', 'Life protected.', 'info');
      if (savedStreak) UI.toast('🔥 Streak saved', `Streak held at ${run.streak}.`, 'info');
    }

    if (unlocked.length) {
      unlocked.forEach((a) => UI.toast('🏆 ' + a.name, a.desc, 'good'));
    }

    /* ---- power-up reward ---- */
    if (correct && run.correctSincePowerup >= POWERUP_EVERY) {
      run.correctSincePowerup = 0;
      grantPowerup();
    }
    UI.renderPowerups(run.powerups, run.armed, false);

    const gameOver = run.lives != null && run.lives <= 0;
    const isLast = gameOver || (run.config.fixed && run.index + 1 >= run.config.fixed);

    const dwell = run.config.autoAdvance ? feedbackDwell(scn, correct) : 0;
    run.dwell = dwell;

    setState(S.FEEDBACK);
    UI.showFeedback({
      scn, correct, picked: answer, points: result.points, timedOut,
      mode: run.mode, autoMs: dwell, isLast,
    });

    /* A small grace period so the bar visually reaches the end instead of
       being cut off a frame or two short. */
    if (dwell) G.autoTimer = setTimeout(() => advance(), dwell + 120);
  }

  function grantPowerup() {
    const run = G.run;
    const options = PICKABLE.filter((k) => run.powerups[k] < POWERUP_CAP);
    if (!options.length) return;
    const k = options[Math.floor(Math.random() * options.length)];
    run.powerups[k]++;
    NM.Audio.play('powerup');
    UI.toast(UI.POWERUPS[k].icon + ' ' + UI.POWERUPS[k].name, UI.POWERUPS[k].desc, 'info');
  }

  function stopAuto() {
    if (G.autoTimer) clearTimeout(G.autoTimer);
    G.autoTimer = 0;
    if (G.revealGuard) clearTimeout(G.revealGuard);
    G.revealGuard = 0;
  }

  function stopAllTimers() {
    stopTimer();
    stopAuto();
    stopCountdown();
    UI.hideCountdown();
  }

  function advance() {
    stopAuto();
    if (G.state !== S.FEEDBACK) return;
    const run = G.run;
    setState(S.NEXT_SCENARIO);

    if (run.lives != null && run.lives <= 0) return endRun('out_of_lives');
    run.index++;
    if (run.config.fixed && run.index >= run.config.fixed) return endRun('complete');
    nextScenario();
  }

  /**
   * Practice only: watch the same chart play out again.
   * The scenario is already scored, so this never re-enters ANALYZING —
   * otherwise a keypress during the replay would submit a second answer
   * for a scenario that has already been counted.
   */
  function replay() {
    if (G.state !== S.FEEDBACK || !G.run) return;
    stopAuto();
    const run = G.run;
    const scn = run.scenario;
    const pending = run.pending;

    UI.hideFeedback();
    UI.clearAnswerMarks();
    UI.setAnswersEnabled(false);
    UI.renderTimer(null);
    UI.renderHints(scn, run.config.hints);
    G.chart.load(scn);
    setState(S.LOADING_SCENARIO);

    setTimeout(() => {
      if (G.state !== S.LOADING_SCENARIO || G.run !== run) return;
      setState(S.REVEALING);
      UI.markAnswer(pending.timedOut ? null : pending.answer, scn.answer);
      armRevealWatchdog(scn);
      tickCandles(scn);
      G.chart.reveal(() => {
        clearTimeout(G.revealGuard);
        G.revealGuard = 0;
        if (G.run !== run) return;
        G.chart.showOutcome({ correct: pending.correct, answer: pending.answer });
        setState(S.FEEDBACK);
        UI.showFeedback({
          scn, correct: pending.correct, picked: pending.answer,
          points: 0, timedOut: pending.timedOut, mode: run.mode, autoMs: 0, isLast: false,
        });
      });
    }, G.reduced ? 80 : 500);
  }

  /* =========================================================
     Power-ups
     ========================================================= */
  function usePowerup(k) {
    const run = G.run;
    if (!run) return;

    /* Shield and Streak Saver are armed ahead of time and spent on a miss. */
    if (k === 'shield' || k === 'saver') {
      if (run.powerups[k] <= 0) return;
      run.armed[k] = !run.armed[k];
      NM.Audio.play('click');
      UI.renderPowerups(run.powerups, run.armed, G.state === S.ANALYZING);
      UI.toast(UI.POWERUPS[k].icon + ' ' + UI.POWERUPS[k].name, run.armed[k] ? 'Armed for your next miss.' : 'Disarmed.', 'info');
      track('powerup_used', { mode: run.mode, powerup: k, armed: run.armed[k] });
      return;
    }

    if (G.state !== S.ANALYZING || run.powerups[k] <= 0) return;
    const scn = run.scenario;

    if (k === 'insight') {
      run.powerups[k]--;
      UI.addInsight(scn.insight || measuredInsight(scn));
    } else if (k === 'time') {
      run.powerups[k]--;
      timer.remaining = Math.min(timer.limit, timer.remaining + 3);
      timer.limit = Math.max(timer.limit, timer.remaining);
      UI.renderTimer(timer.remaining, timer.limit);
      UI.pop('+3s', 'info');
    } else if (k === 'fifty') {
      run.powerups[k]--;
      const wrong = [UP, DOWN, NO_TRADE].filter((a) => a !== scn.answer);
      UI.disableAnswer(wrong[Math.floor(Math.random() * wrong.length)]);
    }

    NM.Audio.play('powerup');
    UI.renderPowerups(run.powerups, run.armed, true);
    track('powerup_used', NM.Analytics.scenarioProps(scn, { mode: run.mode, powerup: k }));
  }

  /** Fallback clue, computed from the candles so it is always true. */
  function measuredInsight(scn) {
    const r = scn.readout;
    const pct = Math.round(Math.abs(r.volVsAvg) * 100);
    return `Volume on the last bar is ${pct}% ${r.volVsAvg >= 0 ? 'above' : 'below'} its 20-bar average.`;
  }

  /* =========================================================
     Ending a run
     ========================================================= */
  function endRun(reason) {
    const run = G.run;
    if (!run || run.status !== 'playing') return;
    run.status = 'over';
    stopAllTimers();
    setState(S.GAME_OVER);

    const total = run.correct + run.incorrect;
    const levelBefore = NM.Progression.levelInfo();

    const runXp = NM.Scoring.xpForRun({
      correct: run.correct, total, bestStreak: run.bestStreak, mode: run.mode,
    });
    run.xpEarned += runXp;

    const unlocked = NM.Progression.recordRun({
      mode: run.mode, score: run.score, bestStreak: run.bestStreak,
      scenarios: total, correct: run.correct, xp: runXp,
    });

    NM.Audio.play(reason === 'out_of_lives' ? 'gameOver' : 'levelUp');
    track('game_over', {
      mode: run.mode, reason, score: run.score, correct: run.correct,
      total, best_streak: run.bestStreak, lives_lost: run.livesLost,
      ranked_points: NM.Scoring.rankedPoints({
        correct: run.correct, total, avgDifficulty: total ? run.difficultySum / total : 1,
        bestStreak: run.bestStreak,
        avgReactionMs: total ? run.totalReaction / total : 0,
        avgTimeLimitMs: total ? run.timeLimitSum / total : 1,
      }),
    });

    setState(S.SUMMARY);
    UI.showScreen('summary');
    UI.renderSummary(run, run.xpEarned, unlocked, levelBefore);
  }

  /** Leaving mid-run still shows what was learned, if anything was. */
  function quitRun() {
    if (!G.run) return toHome();
    if (G.run.correct + G.run.incorrect === 0) { stopAllTimers(); G.run = null; return toHome(); }
    endRun('quit');
  }

  /* =========================================================
     Navigation
     ========================================================= */
  function toHome() {
    stopAllTimers();
    G.run = null;
    setState(S.MENU);
    UI.showScreen('home');
    UI.renderHome(G.profile, G.mode);
  }

  function setPaused(p) {
    if (!G.run || (G.state !== S.ANALYZING && G.state !== S.FEEDBACK)) return;
    G.paused = p;
    if (p) {
      stopAuto();
      UI.showOverlay('paused');
    } else {
      UI.hideOverlay('paused');
      timer.last = performance.now();
      if (G.state === S.FEEDBACK && G.run.dwell) {
        G.autoTimer = setTimeout(() => advance(), G.run.dwell);
      }
    }
  }

  /* =========================================================
     Input
     ========================================================= */
  function bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const key = e.key.toLowerCase();

      if (key === 'escape' || key === 'p') {
        if (G.run && !G.paused) { setPaused(true); e.preventDefault(); }
        else if (G.paused) { setPaused(false); e.preventDefault(); }
        return;
      }
      if (G.paused) return;

      if (G.state === S.ANALYZING) {
        if (e.key === 'ArrowUp' || key === 'w') { e.preventDefault(); NM.Audio.unlock(); submit(UP); }
        else if (e.key === 'ArrowDown' || key === 's') { e.preventDefault(); NM.Audio.unlock(); submit(DOWN); }
        else if (e.key === ' ' || key === 'n') { e.preventDefault(); NM.Audio.unlock(); submit(NO_TRADE); }
        else if (key >= '1' && key <= '5') {
          const k = PICKABLE[Number(key) - 1];
          if (k) { e.preventDefault(); usePowerup(k); }
        }
      } else if (G.state === S.FEEDBACK) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(); }
      }
    });
  }

  /* =========================================================
     Boot
     ========================================================= */
  /*
   * The candle reveal always animates at full pace. It is the lesson, not
   * decoration — a player who never sees the sequence cannot learn from it,
   * and that was the single most confusing thing about the old behaviour.
   *
   * The system preference still governs genuinely decorative motion: the
   * drifting background, the panel transitions and the CSS animations
   * (handled automatically by the prefers-reduced-motion media query).
   */
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function init() {
    G.profile = NM.Progression.load();

    UI.init({
      onAnswer: (a) => { NM.Audio.unlock(); submit(a); },
      onNext: () => advance(),
      onReplay: () => replay(),
      onPowerup: (k) => usePowerup(k),
      onChapter: (ch) => {
        UI.hideOverlay('chapters');
        startRun('practice', { categories: ch === 'mixed' ? null : [ch] });
      },
      onAgain: () => {
        const mode = G.run ? G.run.mode : 'survival';
        const cats = G.run ? G.run.categories : null;
        UI.hideOverlay('summary');
        startRun(mode, { categories: cats });
      },
      onHome: () => toHome(),
    });

    G.reduced = false;      // the reveal is content, so it always animates
    document.body.classList.toggle('reduced-motion', prefersReducedMotion());

    G.chart = NM.Chart.create(document.getElementById('chart'), { reducedMotion: false });
    NM.__chart = G.chart;   // exposed for the test harness

    NM.Audio.setEnabled(G.profile.settings.sound !== false);
    syncSoundButton();

    bindKeys();
    bindButtons();

    /* Switching away mid-question pauses rather than running the clock
       down while the player cannot see the chart. */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && G.run && !G.paused && (G.state === S.ANALYZING || G.state === S.FEEDBACK)) {
        setPaused(true);
      }
    });

    if (!G.profile.onboarded) {
      setState(S.ONBOARDING);
      UI.showScreen('onboard');
    } else {
      toHome();
    }
  }

  function syncSoundButton() {
    const b = document.getElementById('btnSound');
    if (!b) return;
    const on = NM.Audio.isEnabled();
    b.classList.toggle('off', !on);
    b.setAttribute('aria-label', on ? 'Mute sound' : 'Unmute sound');
    b.title = on ? 'Mute sound' : 'Unmute sound';
  }

  function bindButtons() {
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };

    on('btnOnboardStart', () => {
      NM.Progression.setOnboarded();
      NM.Audio.unlock();
      UI.hideOverlay('onboard');
      startRun('practice', { categories: ['trend'] });
    });
    on('btnOnboardSkip', () => {
      NM.Progression.setOnboarded();
      UI.hideOverlay('onboard');
      toHome();
    });

    /* Mode is chosen on the menu; the CTA acts on the selection. */
    on('modeSurvival', () => { NM.Audio.unlock(); G.mode = 'survival'; UI.selectMode('survival'); NM.Audio.play('click'); });
    on('modePractice', () => { NM.Audio.unlock(); G.mode = 'practice'; UI.selectMode('practice'); NM.Audio.play('click'); });
    on('btnStart', () => {
      NM.Audio.unlock();
      /* Practice is organised as a learning path, so it opens the chapter
         picker rather than dropping into a random chapter. */
      if (G.mode === 'practice') {
        UI.renderChapters(G.profile);
        UI.showOverlay('chapters');
      } else {
        startRun('survival');
      }
    });
    on('btnChaptersClose', () => UI.hideOverlay('chapters'));

    on('btnPause', () => setPaused(true));
    on('btnResume', () => setPaused(false));
    on('btnQuit', () => { setPaused(false); UI.hideOverlay('paused'); quitRun(); });

    on('btnSound', () => {
      const next = !NM.Audio.isEnabled();
      NM.Audio.setEnabled(next);
      NM.Progression.setSetting('sound', next);
      syncSoundButton();
      if (next) NM.Audio.play('click');
    });

  }

  NM.Game = { init, S, get state() { return G.state; }, get run() { return G.run; }, startRun, toHome };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.NM = window.NM || {});
