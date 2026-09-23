/* =========================================================
   Next Move · ui.js
   Every DOM read and write lives here.

   game.js owns the rules and calls into this module; this module never
   decides anything about gameplay. Keeping that line sharp is what lets
   the HUD, the summary and the chart evolve independently.
   ========================================================= */
(function (NM) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('en-US');

  const ANSWER_LABEL = { UP: 'UP', DOWN: 'DOWN', NO_TRADE: 'NO TRADE' };

  const CATEGORY_TIPS = {
    trend: 'Trends are defined by structure. Before deciding, find the last two swing highs and lows — if they are still stepping the same way, the trend is intact.',
    sr: 'A level is only worth using if price has actually reacted to it before. Count the touches, and watch what the candle does when it gets there.',
    breakout: 'Treat a breakout as unconfirmed until the candle closes beyond the level with volume behind it. Trading through a level is not the same as closing through it.',
    reversal: 'Reversal patterns are hypotheses until their confirmation level breaks. The neckline is the trade, not the shape.',
    ma: 'Moving averages describe the trend that already exists. Ask where price is relative to them, not just whether they crossed.',
    volume: 'Volume tells you how much conviction is behind a move. Compare the signal bar with its 20-bar average before believing it.',
    candlestick: 'A candle only means something in a location. The same hammer is a signal at support and noise in open space.',
    pattern: 'A pattern is a hypothesis until price closes outside it. Draw the two lines, then wait for the break rather than predicting it.',
    momentum: 'RSI and MACD describe how price is moving, not where it should stop. Ask what the indicator is doing relative to its own recent behaviour, and where price is on the chart.',
    volatility: 'Bollinger Bands measure volatility, not value. A band touch means "stretched" only when the middle band is flat; in a trend it just means trending.',
    discipline: 'The strongest players pass often. If you cannot name the level you are leaning on, there is probably no setup.',
  };

  const IS_TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  /* Shown under the 3-2-1 so the controls are fresh for the first chart. */
  const CONTROLS_HINT = IS_TOUCH
    ? '<span><b>Tap</b> DOWN · NO TRADE · UP</span>'
    : '<span><kbd>↓</kbd>/<kbd>S</kbd> down</span><span>·</span>' +
      '<span><kbd>Space</kbd> no trade</span><span>·</span>' +
      '<span><kbd>↑</kbd>/<kbd>W</kbd> up</span>';

  let els = null;
  let handlers = {};

  function init(h) {
    handlers = h || {};
    els = {
      play: $('play'),
      lives: $('lives'),
      streak: $('streak'),
      score: $('score'),
      lvlChip: $('lvlChip'),
      timerNum: $('timerNum'),
      timerArc: $('timerArc'),
      timerWrap: $('timerWrap'),
      symName: $('symName'),
      symTf: $('symTf'),
      diffChip: $('diffChip'),
      catChip: $('catChip'),
      chartPanel: $('chartPanel'),
      hints: $('hints'),
      feedback: $('feedback'),
      answers: $('answers'),
      powerups: $('powerups'),
      progress: $('progress'),
      toasts: $('toasts'),
      pops: $('pops'),
      prompt: $('prompt'),
      countdown: $('countdown'),
    };
    bindAnswers();
    return els;
  }

  function bindAnswers() {
    els.answers.querySelectorAll('button[data-a]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        handlers.onAnswer && handlers.onAnswer(btn.dataset.a);
      });
    });
  }

  /* ---------- screens ---------- */
  const SCREENS = ['home', 'onboard', 'chapters', 'paused', 'summary'];

  function showScreen(id) {
    SCREENS.forEach((s) => { const el = $(s); if (el) el.hidden = s !== id; });
    els.play.hidden = id !== null && id !== 'play';
    if (id === 'play') els.play.hidden = false;
  }

  const showOverlay = (id) => { const el = $(id); if (el) el.hidden = false; };
  const hideOverlay = (id) => { const el = $(id); if (el) el.hidden = true; };

  /* ---------- HUD ---------- */
  function renderLives(lives, max, lostJustNow) {
    if (lives == null) { els.lives.hidden = true; return; }
    els.lives.hidden = false;
    let html = '';
    for (let i = 0; i < max; i++) {
      const alive = i < lives;
      const breaking = lostJustNow && i === lives;
      html += `<i class="heart${alive ? '' : ' gone'}${breaking ? ' breaking' : ''}" aria-hidden="true">${alive ? '♥' : '♡'}</i>`;
    }
    els.lives.innerHTML = html;
    els.lives.setAttribute('aria-label', `${lives} of ${max} lives remaining`);
  }

  function renderStreak(streak) {
    const tier = NM.Scoring.tierFor(streak);
    const on = streak >= 2;
    els.streak.classList.toggle('on', on);
    els.streak.classList.toggle('hot', streak >= 5);
    els.streak.innerHTML = on
      ? `<span class="s-icon">${tier.icon || '🔥'}</span><b>${streak}</b>${tier.mult > 1 ? `<span class="s-mult">×${tier.mult}</span>` : ''}`
      : `<span class="s-icon dim">🔥</span><b>0</b>`;
  }

  function renderScore(score) { els.score.textContent = fmt(score); }

  function renderLevel(info) {
    els.lvlChip.textContent = `LVL ${info.level}`;
    els.lvlChip.title = `${info.title} · ${fmt(info.xp)} XP`;
  }

  const TIMER_LEN = 100.5; // circumference of the r=16 arc

  function renderTimer(remaining, limit) {
    if (remaining == null) { els.timerWrap.hidden = true; return; }
    els.timerWrap.hidden = false;
    const f = Math.max(0, Math.min(1, remaining / limit));
    els.timerArc.style.strokeDashoffset = String(TIMER_LEN * (1 - f));
    els.timerNum.textContent = remaining >= 10 ? Math.ceil(remaining) : remaining.toFixed(1);
    els.timerWrap.classList.toggle('urgent', remaining <= 3 && remaining > 0);
  }

  function renderProgress(text) {
    els.progress.textContent = text || '';
    els.progress.hidden = !text;
  }

  /* ---------- scenario ---------- */
  function renderScenario(scn, mode) {
    els.symName.textContent = scn.symbol;
    els.symTf.hidden = false;
    els.symTf.textContent = scn.timeframe;
    els.diffChip.hidden = false;
    els.diffChip.textContent = scn.difficultyLabel;
    els.diffChip.className = 'chip diff d' + scn.difficulty;

    /* The category is a hint, so it only shows in Practice — in Survival
       naming "Breakouts" would give away half the answer. */
    if (mode === 'practice') {
      els.catChip.hidden = false;
      els.catChip.textContent = scn.categoryLabel;
      els.catChip.style.color = scn.categoryColor;
    } else {
      els.catChip.hidden = true;
    }

    els.prompt.textContent = 'What happens next?';
    els.chartPanel.classList.remove('locked');
    els.chartPanel.classList.add('entering');
    setTimeout(() => els.chartPanel && els.chartPanel.classList.remove('entering'), 420);
  }

  function renderHints(scn, show) {
    if (!show || !scn.hints || !scn.hints.length) { els.hints.hidden = true; els.hints.innerHTML = ''; return; }
    els.hints.hidden = false;
    els.hints.innerHTML = scn.hints
      .map((h) => `<span class="hint"><b>${esc(h.k)}</b>${esc(h.v)}</span>`).join('');
  }

  function addInsight(text) {
    els.hints.hidden = false;
    const el = document.createElement('span');
    el.className = 'hint insight';
    el.innerHTML = `<b>Analyst</b>${esc(text)}`;
    els.hints.appendChild(el);
  }

  /* ---------- answers ---------- */
  function setAnswersEnabled(on) {
    els.answers.querySelectorAll('button[data-a]').forEach((b) => { b.disabled = !on; });
    els.answers.classList.toggle('locked', !on);
  }

  function markAnswer(picked, correctAnswer) {
    els.answers.querySelectorAll('button[data-a]').forEach((b) => {
      b.classList.toggle('picked', b.dataset.a === picked);
      b.classList.toggle('is-correct', b.dataset.a === correctAnswer);
    });
    els.chartPanel.classList.add('locked');
  }

  function clearAnswerMarks() {
    els.answers.querySelectorAll('button[data-a]').forEach((b) => {
      b.classList.remove('picked', 'is-correct', 'disabled-5050');
      b.disabled = false;
    });
  }

  function disableAnswer(a) {
    const b = els.answers.querySelector(`button[data-a="${a}"]`);
    if (b) { b.disabled = true; b.classList.add('disabled-5050'); }
  }

  /* ---------- feedback ---------- */
  function showFeedback({ scn, correct, picked, points, timedOut, mode, autoMs, isLast }) {
    const verdict = correct ? '✓' : '✕';
    const pickedLabel = timedOut ? 'No answer' : ANSWER_LABEL[picked];

    els.feedback.className = 'feedback ' + (correct ? 'right' : 'wrong');
    els.feedback.hidden = false;
    els.feedback.innerHTML = `
      <div class="fb-top">
        <span class="fb-verdict">${verdict} ${esc(pickedLabel)}</span>
        ${correct
        ? `<span class="fb-points">+${fmt(points)}</span>`
        : `<span class="fb-actual">Correct: <b>${esc(ANSWER_LABEL[scn.answer])}</b></span>`}
        <span class="fb-move">${esc(scn.outcomeLabel)} over ${scn.futureCount} bars</span>
      </div>
      <p class="fb-why">${esc(scn.explanation)}</p>
      ${scn.myth ? `<p class="fb-myth"><b>Worth unlearning</b> ${esc(scn.myth)}</p>` : ''}
      <div class="fb-foot">
        <span class="fb-concept" style="--c:${esc(scn.categoryColor)}">${esc(scn.concept)}</span>
        ${scn.patternLabel ? `<span class="fb-pattern" style="--c:${esc(scn.confirmation ? scn.confirmation.color : '#9ba1a8')}">${esc(scn.patternLabel)}${scn.confirmation ? ` · ${esc(scn.confirmation.label)}` : ''}</span>` : ''}
        <div class="fb-actions">
          ${mode === 'practice' ? '<button class="link-btn" id="btnReplay">Replay chart</button>' : ''}
          ${!autoMs && !isLast ? '<span class="fb-wait">Take your time</span>' : ''}
          <button class="btn small" id="btnNext">${isLast ? 'See results' : 'Next'} ▸</button>
        </div>
      </div>
      ${autoMs ? '<div class="fb-bar"><i style="--dwell:' + autoMs + 'ms"></i></div>' : ''}
    `;

    const next = $('btnNext');
    if (next) next.addEventListener('click', () => handlers.onNext && handlers.onNext());
    const replay = $('btnReplay');
    if (replay) replay.addEventListener('click', () => handlers.onReplay && handlers.onReplay());
  }

  function hideFeedback() {
    els.feedback.hidden = true;
    els.feedback.innerHTML = '';
  }

  /* ---------- power-ups ---------- */
  const POWERUPS = {
    insight: { icon: '◎', name: 'Analyst Insight', desc: 'Reveal one extra measured clue.' },
    time: { icon: '⏱', name: 'Time Boost', desc: 'Add 3 seconds to the clock.' },
    fifty: { icon: '½', name: '50 / 50', desc: 'Remove one wrong answer.' },
    shield: { icon: '⛨', name: 'Shield', desc: 'Prevent the next life loss.' },
    saver: { icon: '🔥', name: 'Streak Saver', desc: 'Keep your streak through one miss.' },
  };

  function renderPowerups(counts, armed, enabled) {
    const keys = Object.keys(POWERUPS);
    const any = keys.some((k) => (counts[k] || 0) > 0);
    els.powerups.hidden = !any;
    if (!any) return;
    els.powerups.innerHTML = keys.map((k) => {
      const n = counts[k] || 0;
      if (!n) return '';
      const isArmed = armed && armed[k];
      return `<button class="pu${isArmed ? ' armed' : ''}" data-pu="${k}" ${enabled ? '' : 'disabled'}
        title="${esc(POWERUPS[k].name)} — ${esc(POWERUPS[k].desc)}"
        aria-label="${esc(POWERUPS[k].name)}, ${n} available">
        <span class="pu-i">${POWERUPS[k].icon}</span><span class="pu-n">${n}</span></button>`;
    }).join('');
    els.powerups.querySelectorAll('button[data-pu]').forEach((b) => {
      b.addEventListener('click', () => handlers.onPowerup && handlers.onPowerup(b.dataset.pu));
    });
  }

  /* ---------- start countdown ---------- */

  /** Blank the chart header so nothing is readable before the count ends. */
  function prepareCountdown() {
    /* Blank, not a dash: a stray glyph in the corner during the countdown
       reads as a rendering fault. */
    els.symName.textContent = '';
    els.symTf.hidden = true;
    els.diffChip.hidden = true;
    els.catChip.hidden = true;
    els.prompt.textContent = 'Get ready';
    els.hints.hidden = true;
    els.hints.innerHTML = '';
    els.powerups.hidden = true;
    hideFeedback();
    renderProgress('');
  }

  function countdownNumber(n) {
    /* Re-created each tick so the pop animation restarts. */
    els.countdown.innerHTML = `<div><span class="n">${n}</span><div class="cd-keys">${CONTROLS_HINT}</div></div>`;
  }

  function countdownGo() {
    els.countdown.innerHTML = '<div><span class="n go">GO</span></div>';
  }

  function hideCountdown() {
    els.countdown.innerHTML = '';
    els.symTf.hidden = false;
    els.diffChip.hidden = false;
  }

  /* ---------- transient feedback ---------- */
  function pop(text, kind = 'info') {
    const el = document.createElement('div');
    el.className = 'pop ' + kind;
    el.textContent = text;
    els.pops.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  function toast(title, body, kind = 'info') {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = `<b>${esc(title)}</b>${body ? `<span>${esc(body)}</span>` : ''}`;
    els.toasts.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 2600);
  }

  function flash(kind) {
    document.body.classList.add('flash-' + kind);
    setTimeout(() => document.body.classList.remove('flash-' + kind), 420);
  }

  function shake() {
    els.chartPanel.classList.add('shake');
    setTimeout(() => els.chartPanel && els.chartPanel.classList.remove('shake'), 420);
  }

  /* ---------- home ---------- */

  const MODE_CTA = { survival: 'Start Survival', practice: 'Start Practice' };

  /** Highlight the chosen mode card and relabel the call to action. */
  function selectMode(mode) {
    ['practice', 'survival'].forEach((m) => {
      const el = $('mode' + m.charAt(0).toUpperCase() + m.slice(1));
      if (el) el.setAttribute('aria-checked', String(m === mode));
    });
    const cta = $('btnStart');
    if (cta) cta.textContent = MODE_CTA[mode] || MODE_CTA.survival;
  }

  function renderHome(profile, mode) {
    const info = NM.Progression.levelInfo();
    $('homeLevel').textContent = 'LVL ' + info.level;
    $('homeLevel').title = `${info.title} · ${fmt(info.xp)} XP`;

    /* One compact line rather than a stats grid — the menu's job is to get
       the player into a run, not to report on them. */
    const best = NM.Progression.bestFor('survival');
    const bits = [];
    if (best) bits.push(`best ${fmt(best)}`);
    if (profile.bestStreak) bits.push(`streak ${profile.bestStreak}`);
    if (profile.scenariosSeen) bits.push(`${fmt(profile.scenariosSeen)} charts read`);
    $('homeStatLine').textContent = bits.length ? bits.join(' · ') : 'New player — start with Practice';

    selectMode(mode || 'survival');
  }

  /* ---------- practice chapters ---------- */
  function renderChapters(profile) {
    const wrap = $('chapterList');
    wrap.innerHTML = NM.Scenarios.CHAPTERS.map((ch) => {
      const pool = NM.Scenarios.defsByCategory(ch.id);
      const skill = ch.id === 'mixed' ? null : NM.Scenarios.CATEGORIES[ch.id].skill;
      const s = skill ? profile.skills[skill] : null;
      const rating = s && s.seen ? Math.round(s.rating) : null;
      return `<button class="chapter" data-ch="${ch.id}">
        <span class="ch-n">${ch.n}</span>
        <span class="ch-body"><b>${esc(ch.title)}</b><small>${esc(ch.blurb)}</small></span>
        <span class="ch-meta">${pool.length} charts${rating != null ? `<em>${rating}</em>` : ''}</span>
      </button>`;
    }).join('');
    wrap.querySelectorAll('button[data-ch]').forEach((b) => {
      b.addEventListener('click', () => handlers.onChapter && handlers.onChapter(b.dataset.ch));
    });
  }

  /* ---------- run summary ---------- */
  function buildTip(run) {
    /* Specific behavioural patterns first — they are far more useful
       than "you scored 54% on breakouts". */
    const chased = run.mistakes.filter((m) => m.scn.answer === 'NO_TRADE' && m.picked !== 'NO_TRADE').length;
    const passed = run.mistakes.filter((m) => m.scn.answer !== 'NO_TRADE' && m.picked === 'NO_TRADE').length;
    const wrongWay = run.mistakes.filter((m) => m.scn.answer !== 'NO_TRADE' && m.picked !== 'NO_TRADE' && m.picked !== m.scn.answer).length;

    if (chased >= 2 && chased >= passed) {
      return 'You called a direction on ' + chased + ' setups that had not confirmed yet — passing is the stronger play there.';
    }
    if (passed >= 2 && passed > chased) {
      return 'You passed on ' + passed + ' clean setups — when structure, volume and a level all agree, take the read.';
    }
    if (wrongWay >= 2) {
      return 'On ' + wrongWay + ' charts you read the direction backwards — name the last swing high and low before deciding.';
    }
    const weak = NM.Progression.weakestSkill(2);
    if (weak) return CATEGORY_TIPS[weak] || CATEGORY_TIPS.discipline;
    return CATEGORY_TIPS.discipline;
  }

  /*
   * The result screen is a game-over screen, not a dashboard. The first
   * glance answers four things: it's over, how far you got, what you
   * scored, and how to go again. Everything analytical lives behind one
   * collapsed disclosure.
   */
  function renderSummary(run, xpGain, unlocked, levelBefore) {
    const total = run.correct + run.incorrect;
    const acc = total ? Math.round((run.correct / total) * 100) : 0;
    const info = NM.Progression.levelInfo();
    const levelled = info.level > levelBefore.level;
    const isBest = run.mode !== 'practice' && run.score > 0 && run.score >= NM.Progression.bestFor(run.mode);

    /* "Survived" only means something where lives were at stake. */
    const outOfLives = run.lives != null && run.lives <= 0;
    const label = outOfLives ? 'Game over'
      : run.mode === 'practice' ? 'Session complete' : 'Run complete';
    const headline = run.mode === 'survival'
      ? `You survived ${total} chart${total === 1 ? '' : 's'}`
      : `You read ${total} chart${total === 1 ? '' : 's'}`;

    const seen = Object.keys(run.skillStats).filter((k) => run.skillStats[k].seen > 0);
    const rate = (k) => run.skillStats[k].correct / run.skillStats[k].seen;
    /* Ties break on evidence, so a 2-for-2 outranks a 1-for-1. */
    const byScore = (a, b) => (rate(b) - rate(a)) || (run.skillStats[b].seen - run.skillStats[a].seen);

    const skillRows = seen.slice().sort(byScore).map((k) => {
      const st = run.skillStats[k];
      const pct = Math.round((st.correct / st.seen) * 100);
      return `<div class="sk">
        <span class="sk-name">${esc(NM.Scenarios.SKILLS[k])}</span>
        <span class="sk-bar"><i style="width:${pct}%" class="${pct >= 75 ? 'good' : pct >= 50 ? 'mid' : 'low'}"></i></span>
        <span class="sk-pct">${pct}%<em>${st.correct}/${st.seen}</em></span>
      </div>`;
    }).join('');

    /* Rank everything the run actually touched. "Focus next" has to be the
       genuinely worst category — naming a skill the player got 100% on
       would be worse than saying nothing. */
    const ranked = seen.slice().sort(byScore);
    const strongest = ranked[0];
    const worst = ranked[ranked.length - 1];
    const weakest = worst && worst !== strongest && rate(worst) < rate(strongest) ? worst : null;

    const hasBreakdown = !!skillRows && total >= 3;

    $('summaryCard').innerHTML = `
      <div class="over">
        <span class="over-label">${esc(label)}</span>
        <h2 class="over-title">${esc(headline)}</h2>

        <div class="over-score">
          <b>${fmt(run.score)}</b>
          <span>points</span>
        </div>
        ${isBest || levelled ? `<div class="over-badges">
          ${isBest ? '<span class="over-badge best">New personal best</span>' : ''}
          ${levelled ? `<span class="over-badge level">Level ${info.level} · ${esc(info.title)}</span>` : ''}
        </div>` : ''}

        <div class="over-stats">
          <div><b>${acc}%</b><span>Accuracy</span></div>
          <div><b>${run.bestStreak}</b><span>Best streak</span></div>
          <div><b>+${fmt(xpGain)}</b><span>XP earned</span></div>
        </div>

        ${hasBreakdown ? `<details class="over-more" id="overMore">
          <summary><span>See your breakdown</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </summary>
          <div class="over-more-body">
            <div class="sk-list">${skillRows}</div>
            ${strongest ? `<div class="over-insights">
              <div><span>Strongest</span><b>${esc(NM.Scenarios.SKILLS[strongest])}</b></div>
              ${weakest ? `<div><span>Focus next</span><b class="warn">${esc(NM.Scenarios.SKILLS[weakest])}</b></div>` : ''}
            </div>` : ''}
            <p class="over-tip">${esc(buildTip(run))}</p>
            ${unlocked.length ? `<div class="over-ach">${unlocked.map((a) =>
              `<span>${esc(a.name)}</span>`).join('')}</div>` : ''}
          </div>
        </details>` : ''}

        <div class="over-actions">
          <button class="btn big" id="btnAgain">${run.mode === 'practice' ? 'Practise again' : 'Play Survival again'}</button>
          <div class="over-links">
            <button class="link-btn" id="btnHome">Menu</button>
          </div>
        </div>

        <p class="fineprint">Educational simulated scenarios. Not investment advice.</p>
      </div>
    `;

    $('btnAgain').addEventListener('click', () => handlers.onAgain && handlers.onAgain());
    $('btnHome').addEventListener('click', () => handlers.onHome && handlers.onHome());
  }

  NM.UI = {
    init, $, esc, fmt,
    ANSWER_LABEL, POWERUPS, CATEGORY_TIPS,
    showScreen, showOverlay, hideOverlay,
    renderLives, renderStreak, renderScore, renderLevel, renderTimer, renderProgress,
    renderScenario, renderHints, addInsight,
    prepareCountdown, countdownNumber, countdownGo, hideCountdown,
    setAnswersEnabled, markAnswer, clearAnswerMarks, disableAnswer,
    showFeedback, hideFeedback,
    renderPowerups, pop, toast, flash, shake,
    renderHome, renderChapters, renderSummary, buildTip, selectMode,
    els: () => els,
  };
})(window.NM = window.NM || {});
