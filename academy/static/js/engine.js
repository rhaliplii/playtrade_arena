/* Profit.com Academy · progress engine (the rules from academy-concept.html).
   In production this logic runs on the server, which is the source of truth; the UI only reports what the
   learner did (answers, finished cards) and renders what the engine returns. XP is never sent by the UI.

   Rules implemented here:
   - Lesson: +60 for finishing, +10 per scored question right on the first try (3 per lesson) → max 90.
     XP is paid once: replaying a finished (or tested-out) lesson earns no XP; wrong answers still go to Rico's Gym.
   - Order: a lesson opens when the earlier lessons of its chapter are done and the chapter is unlocked (the previous
     Challenge passed or tested out); the Challenge when every lesson of the chapter is done.
   - Chapter Challenge: one question per lesson; pass = miss at most one. XP on a pass only:
     30 a question right (+50 if all right); full on the first pass, half on a later one. Fail: refresher, retry.
   - Profit Coins: +50 for each Chapter Challenge passed (the first pass only; a tested-out chapter pays none).
   - Path finished: +500 XP, +500 Profit Coins, certificate (AC.certs: per-path ID, the learner's name at that moment).
   - My Trading Plan: five sections (style, entry, risk, checklist, review), one per lesson of the last chapter
     (#ac-index `plan`). Finishing a section's lesson fills it with the lesson's default unless the learner already
     wrote one. The path finishes when every Chapter Challenge is passed (or tested out) and all five sections have text.
   - Rico's Gym: a missed question adds its idea. An idea leaves after 2 right answers on 2 different days;
     wrong again → due the next day. At most 5 cards a day, most urgent first. +30 XP a session; counts toward the goal.
   - Daily goal (lessons a day): Casual 1 · Regular 2 · Serious 4 (guests start on Casual). A day counts for the streak when the goal is met.
     One freeze earned per 7-day streak (max 2 held). Weekend mode: Saturday and Sunday never break the streak.
     Milestones 7 / 30 / 100 / 365 days: +100 / +250 / +500 / +1,000 XP.
   - Levels and ranks: Rookie 1–5 (200 a level) · Analyst 6–20 (≈733) from 1,000 · Strategist 21–28 (1,500) from
     12,000 · Trader 29–36 (2,000) from 24,000 · Market Legend 37+ (5,000 a level) from 40,000. Ranks never go down.
   - Leaderboard: XP earned this calendar month. */
(function () {
  "use strict";
  var AC = (window.AC = window.AC || {});

  var XP = { finish: 60, firstTry: 10, challengeQ: 30, challengePerfect: 50, gym: 30, path: 500, placement: 120 };
  var COINS = { challenge: 50, path: 500 };
  var COINS_PATH = COINS.path;
  var GOALS = { casual: 1, regular: 2, serious: 4 };
  // Guest onboarding (the 5-question quick challenge, /academy/start): 10 XP per right answer plus a one-time welcome
  // bonus. Held as "waiting" on the guest record and credited only after sign-up, once per account. Separate from the
  // path: it is never part of a lesson, a chapter or the path's 7,600 XP maximum (history src "onboarding" / "welcome").
  var ONB = { perRight: 10, welcome: 20, questions: 5 };
  var MILESTONES = { 7: 100, 30: 250, 100: 500, 365: 1000 };
  var GYM_MAX = 5, FREEZE_MAX = 2;
  var PLAN_KEYS = ["style", "entry", "risk", "checklist", "review"];

  // ---------------------------------------------------------------- levels & ranks
  var RANKS = [
    { id: "rookie", from: 1, to: 5, start: 0, step: 200 },
    { id: "analyst", from: 6, to: 20, start: 1000, step: 11000 / 15 },
    { id: "strategist", from: 21, to: 28, start: 12000, step: 1500 },
    { id: "trader", from: 29, to: 36, start: 24000, step: 2000 },
    { id: "legend", from: 37, to: Infinity, start: 40000, step: 5000 },
  ];
  function levelStart(lv) {
    for (var i = 0; i < RANKS.length; i++) {
      var r = RANKS[i];
      if (lv >= r.from && lv <= r.to) return Math.round((r.start + (lv - r.from) * r.step) / 10) * 10;
    }
    return 0;
  }
  function levelOf(xp) {
    var lv = 1;
    while (levelStart(lv + 1) <= xp) lv++;
    var rank = RANKS.filter(function (r) { return lv >= r.from && lv <= r.to; })[0];
    var lo = levelStart(lv), hi = levelStart(lv + 1);
    return { level: lv, rank: rank.id, xp: xp, levelFrom: lo, levelTo: hi, progress: (xp - lo) / (hi - lo), nextRank: (RANKS[RANKS.indexOf(rank) + 1] || {}).id || null, nextRankAt: (RANKS[RANKS.indexOf(rank) + 1] || {}).start || null };
  }

  // ---------------------------------------------------------------- dates (local days)
  var clock = { now: function () { return new Date(); } };
  function day(d) { d = d || clock.now(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function addDays(ds, n) { var d = new Date(ds + "T12:00:00"); d.setDate(d.getDate() + n); return day(d); }
  function isWeekend(ds) { var g = new Date(ds + "T12:00:00").getDay(); return g === 0 || g === 6; }
  function month(ds) { return ds.slice(0, 7); }

  // ---------------------------------------------------------------- record
  function blank(guest) {
    return {
      v: 1, created: day(),
      // privacy: Top Learners on by default, the public profile off until the learner turns it on
      settings: { goal: guest ? "casual" : "regular", weekendMode: false, reminders: true, motion: true, sound: true, leaderboard: true, publicProfile: false },
      xp: 0, coins: 0, history: [],               // history: [{d, xp, src}]
      lessons: {},                                  // id → {done, best, firstTry:{call,exercise,check}, card, answered:{}}
      chapters: {},                                 // id → {challenge:{passed, attempts, last:[...], xp (awarded)}, testedOut}
      gym: {},                                      // idea → {due, rights:[days], added, misses}
      days: {},                                     // day → {lessons, gym, met}
      streak: { current: 0, best: 0, last: null, freezes: 0, lostFrom: 0 },
      notes: [], answers: [], plan: {}, planV: 2, certificates: [], paths: {}, seen: {},
      placement: null, onboarded: false,
    };
  }

  var account = null, rec = null, listeners = [], sandboxed = false;
  function isGuestAcc(acc) { return acc === "guest" || acc === "preview-guest"; }
  // Another tab (e.g. My Trading Plan open in a second tab) can write the same record. Every save stamps the record
  // with a new `rev`; load() runs before every read and write and re-reads storage when the stored rev differs from
  // the one in memory, so a change made elsewhere is never overwritten by a stale copy.
  function storedRev(acc) { return AC.store.rev ? AC.store.rev(acc) : null; }
  function newRev() { return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }
  function load() {
    if (sandboxed) return rec;
    var acc = AC.auth ? AC.auth.account() : "guest";
    if (acc !== account || !rec || (rec.rev || null) !== storedRev(acc)) {
      account = acc; rec = AC.store.load(acc) || blank(isGuestAcc(acc));
      // guests can only play one lesson before signing up: an older guest record on the 2-lesson goal moves to 1
      if (isGuestAcc(acc) && !rec.onboarded && rec.settings.goal === "regular") rec.settings.goal = "casual";
      if (migratePlan() | fillPlan() | migrateCerts()) write();
    }
    return rec;
  }
  function write() { rec.rev = newRev(); AC.store.save(account, rec); }
  // a sandboxed engine (design previews: ?state=…) works on a copy and never writes the learner's record
  function save() { if (!sandboxed) write(); listeners.forEach(function (fn) { try { fn(rec); } catch (e) {} }); }
  // a write from another tab: pick it up now and let the page refresh its live values
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("storage", function (e) {
      if (sandboxed || !account || !e.key || e.key.indexOf("rev_" + account) < 0) return;
      if (rec && (rec.rev || null) === storedRev(account)) return;
      rec = null; load();
      listeners.forEach(function (fn) { try { fn(rec); } catch (er) {} });
    });
  }
  function today() { var d = day(); rec.days[d] = rec.days[d] || { lessons: 0, gym: 0, met: false }; return rec.days[d]; }

  function gain(amount, src, out) {
    if (!amount) return 0;
    var before = levelOf(rec.xp);
    rec.xp += amount;
    rec.history.push({ d: day(), xp: amount, src: src });
    var after = levelOf(rec.xp);
    if (out) {
      out.xp = (out.xp || 0) + amount;
      if (after.level > before.level) out.levelReached = after.level;
      if (after.rank !== before.rank) { out.rankUp = after.rank; AC.analytics.track("rank_up", { rank: after.rank }); }
    }
    return amount;
  }

  // ---------------------------------------------------------------- streak & goal
  /** Bring the streak up to date (missed days use freezes, weekend mode skips Sat/Sun). */
  function rollStreak() {
    var s = rec.streak, d = day();
    if (!s.last || s.last === d || s.current === 0) return;
    // days already settled (met, frozen or skipped) are never looked at twice
    var gap = addDays(s.rolled && s.rolled > s.last ? s.rolled : s.last, 1);
    while (gap < d) {
      if (rec.settings.weekendMode && isWeekend(gap)) { gap = addDays(gap, 1); continue; }
      if (s.freezes > 0) { s.freezes--; rec.days[gap] = { lessons: 0, gym: 0, met: false, frozen: true }; gap = addDays(gap, 1); continue; }
      s.lostFrom = s.current;
      s.current = 0;
      break;
    }
    s.rolled = addDays(d, -1);
  }
  function goalTarget() { return GOALS[rec.settings.goal] || 1; }
  function countTowardGoal(kind, out) {
    rollStreak();
    today()[kind] += 1;
    checkGoal(out);
  }
  /** Mark today met (streak +1) once today's lessons + Gym sessions reach the goal. Also run when the goal changes. */
  function checkGoal(out) {
    var t = rec.days[day()];
    if (!t) return;
    var units = t.lessons + t.gym;
    if (!t.met && units >= goalTarget()) {
      t.met = true;
      var s = rec.streak;
      s.current += 1; s.last = day(); s.best = Math.max(s.best, s.current); s.lostFrom = 0;
      if (s.current % 7 === 0 && s.freezes < FREEZE_MAX) s.freezes++;
      if (MILESTONES[s.current]) gain(MILESTONES[s.current], "streak", out);
      AC.analytics.track("streak_day", { streak: s.current });
      if (out) { out.goalMet = true; out.streak = s.current; }
    }
  }

  // ---------------------------------------------------------------- gym (ideas)
  function missIdea(idea) {
    if (!idea) return;
    var g = rec.gym[idea] || (rec.gym[idea] = { added: day(), rights: [], misses: 0 });
    g.misses++; g.rights = []; g.missed = day(); g.due = addDays(day(), 1);
  }
  function rightIdea(idea) {
    var g = rec.gym[idea];
    if (!g) return;
    var d = day();
    if (g.missed === d) return;            // a right retry on the day of the miss doesn't count
    if (g.rights.indexOf(d) < 0) g.rights.push(d);
    if (g.rights.length >= 2) { delete rec.gym[idea]; rec.mastered = (rec.mastered || 0) + 1; }
    else g.due = addDays(d, 1);
  }

  // ---------------------------------------------------------------- my trading plan (5 sections)
  /** The plan's sections from the path index: [{key, label, value (the default), lesson}]; keys only without an index. */
  function planSections() {
    var p = AC.index ? (AC.index() || {}).plan : null;
    if (p && p.sections && p.sections.length) return p.sections;
    return PLAN_KEYS.map(function (k) { return { key: k, label: k, value: "", lesson: null }; });
  }
  function hasText(v) { return v != null && String(v).trim() !== ""; }
  function currentName() { var u = AC.auth && AC.auth.user(); return (u && u.name) || ""; }
  /** Certificates: records saved before per-path IDs carry "LTR-xxxx-xxxx" (random, no name). Re-issue them once with
      the path's prefix (AC.certs), keeping the date and taking the learner's current name. Every certificate the
      record holds is also put in the local registry, so its verify page finds it. */
  function migrateCerts() {
    if (!AC.certs || !rec.certificates || !rec.certificates.length) return false;
    var changed = false;
    rec.certificates.forEach(function (c) {
      if (/^LTR-/i.test(c.id || "") || !c.id) {
        var n = AC.certs.issue({ path: c.path, userId: account, name: c.name || currentName(), d: c.d });
        c.oldId = c.id; c.id = n.id; c.name = n.name; changed = true;
      } else {
        if (c.name == null) { c.name = currentName(); changed = true; }
        AC.certs.register(c, account);
      }
    });
    return changed;
  }
  /** Records from the 8-field plan (Chapters 4–10) move to the 5 sections; the old values are kept in planV1. */
  function migratePlan() {
    if (rec.planV === 2) return false;
    var o = rec.plan || {}, n = {};
    function join(keys) { return keys.map(function (k) { return hasText(o[k]) ? String(o[k]).trim() : ""; }).filter(Boolean).join(" · "); }
    var map = { style: ["style", "markets"], entry: ["setup"], risk: ["stop", "target", "risk", "limits"], checklist: ["checklist"], review: ["review"] };
    Object.keys(map).forEach(function (k) { var v = join(map[k]); if (v) n[k] = v; });
    if (Object.keys(o).length) rec.planV1 = o;
    rec.plan = n; rec.planV = 2;
    return true;
  }
  /** Fill the section of a finished lesson with its default, unless the learner already wrote it (or cleared it). */
  function fillPlan(lessonId) {
    var changed = false;
    rec.planAuto = rec.planAuto || {};
    planSections().forEach(function (s) {
      if (!s.lesson || (lessonId && s.lesson !== lessonId)) return;
      if (!(rec.lessons[s.lesson] && rec.lessons[s.lesson].done)) return;
      if (Object.prototype.hasOwnProperty.call(rec.plan, s.key) || !hasText(s.value)) return;
      rec.plan[s.key] = s.value; rec.planAuto[s.key] = day(); changed = true;
    });
    return changed;
  }
  function planComplete() { return planSections().every(function (s) { return hasText(rec.plan[s.key]); }); }

  /** Engine results: what this action awarded (`xp`) plus the learner's summary (`totalXp`, level, streak…). */
  /** Same for coins: `coins` = Profit Coins awarded by this action, `totalCoins` = the learner's Academy coins. */
  function withSummary(out) { var s = P.summary(); s.totalXp = s.xp; s.totalCoins = s.coins; delete s.xp; delete s.coins; return Object.assign(s, out, { xp: out.xp || 0, coins: out.coins || 0 }); }

  // ---------------------------------------------------------------- public API
  var P = (AC.progress = {
    XP: XP, COINS: COINS, GOALS: GOALS, RANKS: RANKS, levelOf: levelOf, levelStart: levelStart, clock: clock, day: day,
    state: function () { load(); rollStreak(); return rec; },
    onChange: function (fn) { listeners.push(fn); },
    /** Wipe the learner's Academy progress (XP, lessons, chapters, Gym, notes, plan, streak). Keeps the account and settings. */
    reset: function () { load(); var keep = rec.settings, onb = rec.onboarded, quick = rec.onboarding; rec = blank(isGuestAcc(account)); rec.settings = keep; rec.onboarded = onb; if (quick) rec.onboarding = quick; rec.wiped = day(); save(); },
    /** Design previews: from now on work on an in-memory copy; nothing is saved. */
    sandbox: function () { load(); rec = JSON.parse(JSON.stringify(rec)); sandboxed = true; },

    // ----- summary used by the shell and home
    summary: function () {
      load(); rollStreak();
      var t = rec.days[day()] || { lessons: 0, gym: 0, met: false };
      var monthKey = month(day());
      var monthXp = rec.history.filter(function (h) { return month(h.d) === monthKey; }).reduce(function (a, h) { return a + h.xp; }, 0);
      return {
        level: levelOf(rec.xp), xp: rec.xp, coins: rec.coins, monthXp: monthXp,
        streak: rec.streak.current, bestStreak: rec.streak.best, freezes: rec.streak.freezes, streakLost: rec.streak.current === 0 && rec.streak.lostFrom > 0 ? rec.streak.lostFrom : 0,
        goal: { target: goalTarget(), done: t.lessons + t.gym, lessons: t.lessons, gym: t.gym, met: t.lessons + t.gym >= goalTarget(), streakDay: !!t.met, kind: rec.settings.goal },
        lessonsDone: Object.keys(rec.lessons).filter(function (k) { return rec.lessons[k].done; }).length,
        gymDue: P.gymQueue().length, started: rec.history.length > 0, onboarded: rec.onboarded,
      };
    },

    /** Learning stats for My progress and the Gym page: {played (lessons finished by playing, not tested out),
        firstTry (scored questions right on the first try in those), firstTryPct (0–1, null before any), gymSessions}. */
    stats: function () {
      load();
      var played = Object.keys(rec.lessons).filter(function (k) { var l = rec.lessons[k]; return l.done && !l.testedOut; });
      var first = played.reduce(function (a, k) { var f = rec.lessons[k].firstTry || {}; return a + ["call", "exercise", "check"].filter(function (x) { return f[x]; }).length; }, 0);
      var sessions = Object.keys(rec.days).reduce(function (a, d) { var x = rec.days[d] || {}; return a + Math.max(x.gym || 0, x.gymXp ? 1 : 0); }, 0);
      return { played: played.length, firstTry: first, firstTryPct: played.length ? first / (played.length * 3) : null, gymSessions: sessions };
    },

    // ----- lessons
    lesson: function (id) { load(); return rec.lessons[id] || null; },
    startLesson: function (id, meta) {
      load();
      var l = rec.lessons[id] || (rec.lessons[id] = { done: false, card: 0, firstTry: {}, answered: {} });
      l.replay = !!l.done; l.card = l.done ? 0 : l.card || 0; l.answered = l.done ? {} : l.answered || {};
      if (l.done) delete l.open;
      if (meta && meta.chapter) l.chapter = meta.chapter;
      save();
      AC.analytics.track("lesson_start", { lesson: id, replay: l.replay, chapter: meta && meta.chapter });
      return l;
    },
    /** Resume support: the card on screen, and (state) how an answered card was answered so it reopens answered. */
    saveCard: function (id, index, state) {
      load(); var l = rec.lessons[id];
      if (!l) return;
      l.card = index;
      if (state) l.open = { card: index, state: state }; else if (l.open && l.open.card !== index) delete l.open;
      save();
    },
    /** Report an answer to a scored question (slot: "call" | "exercise" | "check"). Returns {firstTry, xp}. */
    answer: function (id, slot, correct, idea) {
      load();
      var l = rec.lessons[id] || P.startLesson(id);
      var first = !l.answered[slot];
      l.answered[slot] = true;
      var res = { firstTry: first && correct, xp: 0 };
      if (first) {
        if (correct && !l.replay && !l.firstTry[slot]) { l.firstTry[slot] = true; res.xp = XP.firstTry; }
        if (!correct) missIdea(idea);
      }
      if (correct && idea) rightIdea(idea);
      save();
      AC.analytics.track("card_answer", { lesson: id, slot: slot, correct: !!correct, first_try: first });
      return res;
    },
    /** Finish a lesson: +60 and the first-try XP the first time only (a replay or a tested-out lesson pays 0); returns everything the complete screen shows. */
    completeLesson: function (id, meta) {
      load();
      var l = rec.lessons[id] || P.startLesson(id);
      var out = { xp: 0, lesson: id };
      var right = ["call", "exercise", "check"].filter(function (s) { return l.firstTry[s]; }).length;
      if (!l.done) {
        gain(XP.finish + right * XP.firstTry, "lesson", out);
        l.done = true; l.best = XP.finish + right * XP.firstTry; l.at = day();
        if (meta && meta.keep) meta.keep.forEach(function (line) { rec.notes.push({ lesson: id, chapter: meta.chapter, text: line, d: day() }); });
        countTowardGoal("lessons", out);
      }
      fillPlan(id);
      out.plan = P.planSection(id);
      if (meta && meta.chapter) l.chapter = meta.chapter;
      out.testedOut = !!l.testedOut;
      l.card = 0; l.replay = false; delete l.open;
      out.firstTryRight = right;
      save();
      AC.analytics.track("lesson_complete", { lesson: id, xp: out.xp, right_first_try: right });
      return withSummary(out);
    },
    /** The one gate for lessons and Challenges. what: a lesson id | "challenge". */
    canPlay: function (chapterId, what) { return !P.lockReason(chapterId, what); },
    /** null when playable, else {reason, chapter, lesson}: reason "guest" (sign up first: guests play no lesson, the
        onboarding quiz is their free taste), "chapter" (pass the Challenge of
        `chapter` first), "lesson" (finish `lesson` first), "soon" (not out yet).
        `lesson` is always the lesson to play next, when there is one. */
    lockReason: function (chapterId, what) {
      load();
      var chs = (AC.index ? AC.index() : { chapters: [] }).chapters || [];
      var ci = -1;
      chs.forEach(function (c, i) { if (c.id === chapterId) ci = i; });
      if (ci < 0) return null;                                  // not in the index: nothing to check against
      var ch = chs[ci], lessons = ch.lessons || [];
      var guest = AC.auth && AC.auth.isGuest();
      var first = chs[0] && chs[0].lessons && chs[0].lessons[0] ? chs[0].lessons[0].id : null;
      if (guest) return { reason: "guest", chapter: chapterId, lesson: first };
      if (!ch.available) return { reason: "soon", chapter: chapterId };
      // Pro: every lesson of the free path opens in any order (the certificate still needs every Chapter Challenge)
      var pro = !!(AC.auth && AC.auth.isPro && AC.auth.isPro());
      function passed(c) { var r = rec.chapters[c] || {}; return !!(r.testedOut || (r.challenge && r.challenge.passed)); }
      function done(id) { return !!(rec.lessons[id] && rec.lessons[id].done); }
      if (what !== "challenge" && done(what)) return null;   // a finished lesson can always be replayed
      if (pro && what !== "challenge") return null;
      if (ci > 0 && !pro && !passed(chs[ci - 1].id)) {
        var prev = chs[ci - 1], todo = (prev.lessons || []).filter(function (l) { return !done(l.id); })[0];
        return { reason: "chapter", chapter: prev.id, lesson: todo ? todo.id : null };
      }
      var open = lessons.filter(function (l) { return !done(l.id); })[0];
      if (what === "challenge") return open ? { reason: "lesson", chapter: chapterId, lesson: open.id } : null;
      var idx = -1;
      lessons.forEach(function (l, i) { if (l.id === what) idx = i; });
      if (idx < 0 || done(what)) return null;
      var before = lessons.slice(0, idx).filter(function (l) { return !done(l.id); })[0];
      return before ? { reason: "lesson", chapter: chapterId, lesson: before.id } : null;
    },

    // ----- chapter challenge
    chapter: function (id) { load(); return rec.chapters[id] || {}; },
    startChallenge: function (chapterId) { AC.analytics.track("challenge_start", { chapter: chapterId }); },
    /** results: [{lesson, correct, idea}] in question order. */
    submitChallenge: function (chapterId, results) {
      load();
      var c = rec.chapters[chapterId] || (rec.chapters[chapterId] = {});
      var ch = c.challenge || (c.challenge = { passed: false, attempts: 0 });
      ch.attempts++;
      var right = results.filter(function (r) { return r.correct; }).length;
      var missed = results.filter(function (r) { return !r.correct; });
      var passed = missed.length <= 1;
      var out = { passed: passed, right: right, total: results.length, missed: missed, xp: 0, coins: 0, attempt: ch.attempts, firstPass: passed && !ch.passed, everFailed: !!ch.everFailed };
      results.forEach(function (r) { if (r.correct) rightIdea(r.idea); else missIdea(r.idea); });
      if (passed) {
        var base = right * XP.challengeQ + (right === results.length ? XP.challengePerfect : 0);
        var amount = ch.passed ? 0 : (ch.everFailed ? Math.round(base / 2) : base);
        gain(amount, "challenge", out);
        if (!ch.passed) { rec.coins += COINS.challenge; ch.coins = COINS.challenge; out.coins = COINS.challenge; AC.wallet.award(COINS.challenge, "challenge:" + chapterId); }
        out.full = base;   // what this pass is worth before the retry halving (the results screen shows the ÷ 2 row)
        ch.xp = (ch.xp || 0) + amount;   // what this chapter's Challenge actually paid (read by chapterXp)
        ch.passed = true; ch.at = day();
        AC.analytics.track("challenge_pass", { chapter: chapterId, right: right, attempt: ch.attempts });
      } else {
        ch.everFailed = true;
        AC.analytics.track("challenge_fail", { chapter: chapterId, right: right, attempt: ch.attempts });
      }
      ch.last = results;
      // keep the attempt that passed (the first pass), and the best try while not passed: a later failed retake mustn't relabel a pass
      if (passed && !ch.passedWith) ch.passedWith = { right: right, total: results.length };
      if (!passed && (!ch.best || right > ch.best.right)) ch.best = { right: right, total: results.length };
      save();
      return withSummary(out);
    },
    /** Placement: a tested-out chapter counts as done (its lessons too, with no lesson XP). */
    testOut: function (chapterId) {
      load();
      var c = rec.chapters[chapterId] || (rec.chapters[chapterId] = {});
      c.testedOut = true; c.challenge = c.challenge || { passed: true, attempts: 0, xp: 0 }; c.challenge.passed = true;
      var ch = AC.index ? AC.index().chapters.filter(function (x) { return x.id === chapterId; })[0] : null;
      (ch ? ch.lessons : []).forEach(function (l) {
        var les = rec.lessons[l.id] || (rec.lessons[l.id] = { firstTry: {}, answered: {}, card: 0 });
        if (!les.done) { les.done = true; les.best = 0; les.testedOut = true; les.at = day(); les.chapter = chapterId; }
      });
      fillPlan();
      save();
    },

    /** XP this chapter actually paid: {lessons, challenge, total} (a tested-out chapter pays 0 here; the placement bonus is separate). */
    chapterXp: function (chapterId) {
      load();
      var c = rec.chapters[chapterId] || {}, ch = c.challenge || {};
      var entry = ((AC.index ? AC.index() : { chapters: [] }).chapters || []).filter(function (x) { return x.id === chapterId; })[0];
      var ids = entry && entry.lessons && entry.lessons.length ? entry.lessons.map(function (l) { return l.id; })
        : Object.keys(rec.lessons).filter(function (k) { return rec.lessons[k].chapter === chapterId; });
      var lessons = ids.reduce(function (a, id) { var l = rec.lessons[id]; return a + (l && l.done ? l.best || 0 : 0); }, 0);
      var challenge = typeof ch.xp === "number" ? ch.xp : 0;
      if (typeof ch.xp !== "number" && ch.passed && !c.testedOut && ch.last) {   // records saved before ch.xp existed
        var right = ch.last.filter(function (r) { return r.correct; }).length;
        var base = right * XP.challengeQ + (right === ch.last.length ? XP.challengePerfect : 0);
        challenge = ch.everFailed ? Math.round(base / 2) : base;
      }
      return { lessons: lessons, challenge: challenge, total: lessons + challenge };
    },

    // ----- gym
    gymQueue: function () {
      load();
      var d = day();
      return Object.keys(rec.gym).map(function (k) { return Object.assign({ idea: k }, rec.gym[k]); })
        .filter(function (g) { return g.due <= d; })
        .sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : b.misses - a.misses; })
        .slice(0, GYM_MAX);
    },
    gymIdeas: function () { load(); return Object.keys(rec.gym).map(function (k) { return Object.assign({ idea: k }, rec.gym[k]); }); },
    gymAnswer: function (idea, correct) { load(); if (correct) rightIdea(idea); else missIdea(idea); save(); },
    completeGym: function (cards) {
      load();
      var out = { xp: 0 };
      var t = today();
      if (!t.gymXp) { t.gymXp = true; gain(XP.gym, "gym", out); }
      countTowardGoal("gym", out);
      save();
      AC.analytics.track("gym_session", { cards: cards });
      return withSummary(out);
    },

    // ----- notes, plan, settings
    addAnswer: function (lessonId, question, text) { load(); rec.answers.push({ lesson: lessonId, q: question, text: text, d: day() }); save(); },
    /** Write one plan section (an empty value is kept as the learner's choice: it is never auto-filled again). */
    setPlan: function (field, value) { load(); rec.plan[field] = value == null ? "" : String(value); if (rec.planAuto) delete rec.planAuto[field]; save(); },
    /** The Save button: every section at once ({key: text}); remembers when the plan was saved. */
    savePlan: function (values) {
      load();
      Object.keys(values || {}).forEach(function (k) {
        var v = values[k] == null ? "" : String(values[k]).trim();
        if (v !== (rec.plan[k] || "")) { rec.plan[k] = v; if (rec.planAuto) delete rec.planAuto[k]; }
      });
      rec.planSaved = day(); save();
      AC.analytics.track("plan_save", { complete: planComplete() });
      return P.plan();
    },
    /** {sections:[{key, n, label, value (the learner's text or ""), fallback (the lesson default), lesson, done (lesson
        finished), auto (filled by the lesson, not edited), filled}], filled, total, complete, saved, chapter} */
    plan: function () {
      load();
      var p = AC.index ? (AC.index() || {}).plan : null, auto = rec.planAuto || {};
      var secs = planSections().map(function (s, i) {
        var v = rec.plan[s.key];
        return { key: s.key, n: i + 1, label: s.label, value: hasText(v) ? String(v) : "", fallback: s.value || "", lesson: s.lesson,
          done: !!(s.lesson && rec.lessons[s.lesson] && rec.lessons[s.lesson].done), auto: !!auto[s.key] && hasText(v), filled: hasText(v) };
      });
      var filled = secs.filter(function (s) { return s.filled; }).length;
      return { sections: secs, filled: filled, total: secs.length, complete: filled === secs.length, saved: rec.planSaved || null, chapter: p ? p.chapter : null };
    },
    /** A lesson that adds a plan section → {n, total: 5, title, key}; null for any other lesson. */
    planSection: function (lessonId) {
      var secs = planSections();
      for (var i = 0; i < secs.length; i++) if (secs[i].lesson && secs[i].lesson === lessonId) return { n: i + 1, total: secs.length, title: secs[i].label, key: secs[i].key };
      return null;
    },
    /** What the finale needs: {challenges: passed (or tested out), total, plan: sections with text, planTotal, ready}. */
    finishStatus: function (chapterIds) {
      load();
      var ids = chapterIds || ((AC.index ? AC.index() : { chapters: [] }).chapters || []).map(function (c) { return c.id; });
      var passed = ids.filter(function (c) { var r = rec.chapters[c] || {}; return !!(r.testedOut || (r.challenge && r.challenge.passed)); }).length;
      var pl = P.plan();
      return { challenges: passed, total: ids.length, plan: pl.filled, planTotal: pl.total, ready: passed === ids.length && ids.length > 0 && pl.complete };
    },
    settings: function (patch) {
      load();
      if (patch) { Object.assign(rec.settings, patch); if (patch.goal) { rollStreak(); checkGoal(); } save(); }
      return rec.settings;
    },
    setOnboarded: function (goal) { load(); rec.onboarded = true; if (goal) { rec.settings.goal = goal; rollStreak(); checkGoal(); } save(); },
    /** Placement result: +120 XP once when the learner tests out of at least one chapter. Returns {xp, …summary}. */
    setPlacement: function (result) {
      load();
      var out = { xp: 0 };
      if (!rec.placementBonus && result && result.testedOut && result.testedOut.length) { rec.placementBonus = day(); gain(XP.placement, "placement", out); }
      rec.placement = result; save();
      AC.analytics.track("placement_complete", { right: result && result.right, tested_out: result && result.testedOut && result.testedOut.length });
      return withSummary(out);
    },

    // ----- path
    finishPath: function (pathId, chapterIds) {
      load();
      // earned: every Chapter Challenge passed (or tested out) and all five plan sections have text
      var ok = P.finishStatus(chapterIds).ready;
      var out = { xp: 0, ok: ok };
      if (!ok || rec.paths[pathId]) return withSummary(out);
      rec.paths[pathId] = { finished: day() };
      gain(XP.path, "path", out);
      rec.coins += COINS_PATH; AC.wallet.award(COINS_PATH, "path:" + pathId); out.coins = COINS_PATH;
      // the certificate is issued with the path (production: by the server, in the same transaction) and carries the
      // learner's name as it is now: a later rename doesn't change a certificate already issued
      var cert = sandboxed ? { id: AC.certs.newId(pathId), issued_at: day(), name: currentName() }   // previews never register one
        : AC.certs.issue({ path: pathId, userId: account, name: currentName(), d: day() });
      rec.certificates.push({ path: pathId, id: cert.id, d: cert.issued_at, name: cert.name });
      out.certificate = { path: pathId, id: cert.id, d: cert.issued_at, name: cert.name };
      save();
      AC.analytics.track("path_finish", { path: pathId });
      return withSummary(out);
    },

    // ----- demo learner for design previews (?as=member): mid-path, like the canvas "learning" state
    seedDemo: function (lessonIds, chapterIds) {
      load();
      if (rec.history.length || rec.wiped) return;   // never re-seed a record the learner reset
      var d0 = clock.now();
      function ago(n) { var d = new Date(d0); d.setDate(d.getDate() - n); return day(d); }
      var chs = (AC.index ? AC.index() : { chapters: [] }).chapters || [];
      function chapterOf(id) { var c = chs.filter(function (x) { return (x.lessons || []).some(function (l) { return l.id === id; }); })[0]; return c ? c.id : undefined; }
      // a 12-day streak: 7 lessons (one a day), the Chapter 1 Challenge and Level Up, a Gym session every day; each day has its XP
      var done = lessonIds.slice(0, Math.min(lessonIds.length - 3, 7));
      done.forEach(function (id, i) {
        var right = i % 3 === 1 ? 2 : 3, d = ago(12 - i);
        rec.lessons[id] = { done: true, best: 60 + right * 10, firstTry: { call: true, exercise: right === 3, check: true }, card: 0, answered: {}, at: d, chapter: chapterOf(id) };
        rec.history.push({ d: d, xp: 60 + right * 10, src: "lesson" });
        rec.days[d] = { lessons: 1, gym: 0, met: true };
      });
      var c1 = chapterIds[0], c1n = 0;
      chs.forEach(function (c) { if (c.id === c1) c1n = (c.lessons || []).length; });
      if (c1) {
        // a legal Challenge: every question right on the first try (n × 30 + 50; 4 questions → 170)
        var qs = c1n || 4, chXp = qs * XP.challengeQ + XP.challengePerfect;
        var c1lessons = ((chs.filter(function (c) { return c.id === c1; })[0] || {}).lessons || []).map(function (l) { return { lesson: l.id, correct: true }; });
        rec.chapters[c1] = { challenge: { passed: true, attempts: 1, at: ago(7), xp: chXp, last: c1lessons, passedWith: { right: qs, total: qs } } };
        rec.history.push({ d: ago(7), xp: chXp, src: "challenge" });
      }
      var next = lessonIds[done.length];
      if (next) rec.lessons[next] = { done: false, card: 3, firstTry: { call: true }, answered: { call: true }, chapter: chapterOf(next) };
      // every streak day meets the 2-unit goal: that day's lesson (if any) plus a Gym session (+30 XP)
      for (var k = 1; k <= 12; k++) {
        var dk = ago(k);
        rec.days[dk] = { lessons: rec.days[dk] ? rec.days[dk].lessons : 0, gym: 1, met: true, gymXp: true };
        rec.history.push({ d: dk, xp: XP.gym, src: "gym" });
      }
      rec.history.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
      rec.xp = rec.history.reduce(function (a, h) { return a + h.xp; }, 0);
      rec.streak = { current: 12, best: 12, last: ago(1), freezes: 1, lostFrom: 0, rolled: ago(1) };
      rec.settings.goal = "regular"; rec.onboarded = true;
      rec.gym = { "spread-is-a-toll": { added: ago(3), rights: [], misses: 1, due: ago(0) }, "bear-market-20-percent": { added: ago(5), rights: [ago(2)], misses: 1, due: ago(0) }, "short-pnl": { added: ago(1), rights: [], misses: 1, due: ago(-1) } };
      rec.mastered = 4;   // ideas already made to stick in the Gym
      rec.notes = [{ lesson: lessonIds[0], chapter: chapterIds[0], text: "A price is the last deal between a buyer and a seller.", d: ago(12) }];
      fillPlan();
      save();
    },
    /** The "Pro · certified" preview: the whole free path played over ~two months (every lesson, every Chapter Challenge
        passed first try, the trading plan filled from its lessons), then finished through finishPath, so the certificate,
        XP and coins come from the real flow (a preview's certificate is never registered). Finished 6 days ago. */
    seedGraduate: function (lessonIds, chapterIds, pathId) {
      load();
      if (rec.history.length || rec.wiped) return;
      var d0 = clock.now();
      function ago(n) { var d = new Date(d0); d.setDate(d.getDate() - n); return day(d); }
      var chs = ((AC.index ? AC.index() : { chapters: [] }).chapters || []).filter(function (c) { return chapterIds.indexOf(c.id) >= 0; });
      var total = chs.reduce(function (a, c) { return a + (c.lessons || []).length; }, 0), i = 0, START = 64, END = 7;
      chs.forEach(function (c) {
        (c.lessons || []).forEach(function (l) {
          var right = i % 4 === 2 ? 2 : 3, d = ago(START - Math.round(i * (START - END) / Math.max(1, total - 1)));
          rec.lessons[l.id] = { done: true, best: 60 + right * 10, firstTry: { call: true, exercise: right === 3, check: true }, card: 0, answered: {}, at: d, chapter: c.id };
          rec.history.push({ d: d, xp: 60 + right * 10, src: "lesson" });
          rec.days[d] = { lessons: ((rec.days[d] || {}).lessons || 0) + 1, gym: 0, met: true };
          i++;
        });
        var last = (c.lessons || []).length ? rec.lessons[c.lessons[c.lessons.length - 1].id].at : ago(END);
        var qs = (c.lessons || []).length || 4, chXp = qs * XP.challengeQ + XP.challengePerfect;
        rec.chapters[c.id] = { challenge: { passed: true, attempts: 1, at: last, xp: chXp, last: (c.lessons || []).map(function (l) { return { lesson: l.id, correct: true }; }), passedWith: { right: qs, total: qs } } };
        rec.history.push({ d: last, xp: chXp, src: "challenge" });
      });
      // Rico's Gym most days, and a 21-day streak (best 34)
      for (var k = 1; k <= START; k++) {
        if (k % 3 === 0) continue;
        var dk = ago(k);
        rec.days[dk] = { lessons: rec.days[dk] ? rec.days[dk].lessons : 0, gym: 1, met: true, gymXp: true };
        rec.history.push({ d: dk, xp: XP.gym, src: "gym" });
      }
      rec.history.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
      rec.xp = rec.history.reduce(function (a, h) { return a + h.xp; }, 0);
      rec.streak = { current: 21, best: 34, last: ago(1), freezes: 2, lostFrom: 0, rolled: ago(1) };
      rec.settings.goal = "regular"; rec.onboarded = true;
      rec.notes = [{ lesson: lessonIds[0], chapter: chapterIds[0], text: "A price is the last deal between a buyer and a seller.", d: ago(START) }];
      rec.gym = { "spread-is-a-toll": { added: ago(9), rights: [ago(4)], misses: 1, due: ago(0) }, "short-pnl": { added: ago(12), rights: [], misses: 1, due: ago(0) } };
      rec.mastered = 23;
      fillPlan();
      rec.planSaved = ago(8);
      P.finishPath(pathId, chapterIds);
      // finished 6 days ago, not today
      var fin = ago(6);
      if (rec.paths[pathId]) rec.paths[pathId].finished = fin;
      rec.certificates.forEach(function (c) { if (c.path === pathId) c.d = fin; });
      rec.history.forEach(function (h) { if (h.src === "path") h.d = fin; });
      save();
    },

    // ----- guest onboarding: the 5-question quick challenge (/academy/start) and the welcome (/academy/welcome)
    ONB: ONB,
    /** {state: "none" | "progress" | "waiting" (done, not credited: a guest) | "credited", answers:[{pick, correct}],
        next (index of the next question), right, total, xp (10 per right), bonus, d (the day it was finished),
        credited (day)} */
    onboarding: function () {
      load();
      var o = rec.onboarding;
      if (!o) return { state: "none", answers: [], next: 0, right: 0, total: ONB.questions, xp: 0, bonus: ONB.welcome };
      var right = o.answers.filter(function (a) { return a && a.correct; }).length, next = 0;
      while (next < ONB.questions && o.answers[next]) next++;
      return { state: o.credited ? "credited" : o.done ? "waiting" : "progress", answers: o.answers.slice(), next: next, right: right,
        total: ONB.questions, xp: right * ONB.perRight, bonus: ONB.welcome, d: o.d || null, credited: o.credited || null,
        creditedXp: o.creditedXp || 0 };
    },
    /** Answer question i (once: a second answer to the same question is ignored). Returns {xp (shown now, credited at sign-up), first}. */
    onbAnswer: function (i, pick, correct) {
      load();
      var o = rec.onboarding || (rec.onboarding = { v: 1, answers: [], started: day() });
      if (o.done || i < 0 || i >= ONB.questions || o.answers[i]) return { xp: 0, first: false };
      o.answers[i] = { pick: pick, correct: !!correct };
      save();
      AC.analytics.track("onboarding_answer", { q: i + 1, correct: !!correct });
      return { xp: correct ? ONB.perRight : 0, first: true };
    },
    /** All five answered: the result is saved (once). */
    onbFinish: function () {
      load();
      var o = rec.onboarding;
      if (!o || o.done) return P.onboarding();
      for (var i = 0; i < ONB.questions; i++) if (!o.answers[i]) return P.onboarding();
      o.done = true; o.d = day();
      save();
      var st = P.onboarding();
      AC.analytics.track("onboarding_complete", { right: st.right });
      return st;
    },
    /** After sign-up: credit the challenge XP and the welcome bonus (once per account) and start the streak (Day 1:
        the challenge counts as today's activity). Guests are never credited. Returns {xp, …summary} (xp 0 when nothing to do). */
    onbCredit: function () {
      load();
      var o = rec.onboarding, out = { xp: 0 };
      if (!o || !o.done || o.credited || isGuestAcc(account)) return withSummary(out);
      var right = o.answers.filter(function (a) { return a && a.correct; }).length;
      gain(right * ONB.perRight, "onboarding", out);
      gain(ONB.welcome, "welcome", out);
      o.credited = day(); o.creditedXp = out.xp;
      rollStreak();
      var t = today(), s = rec.streak;
      if (!t.met) {
        t.met = true; t.onboarding = true;
        s.current += 1; s.last = day(); s.best = Math.max(s.best, s.current); s.lostFrom = 0;
      }
      save();
      AC.analytics.track("onboarding_credit", { right: right, xp: out.xp });
      return withSummary(out);
    },
    /** Log in to an account that already has progress (no merge): bring the guest's challenge result over when this
        account never took the challenge. The guest copy is removed, so it is never offered twice. */
    onbAdopt: function (from) {
      load();
      var g = AC.store.load(from || "guest");
      if (!g || !g.onboarding || rec.onboarding) return false;
      rec.onboarding = g.onboarding;
      delete g.onboarding; AC.store.save(from || "guest", g);
      save();
      return true;
    },

    // ----- guest → member
    mergeGuestInto: function (memberId, from) {
      from = from || "guest";
      var guest = AC.store.load(from);
      if (!guest) return;
      var member = AC.store.load(memberId);
      if (!member) AC.store.save(memberId, guest);
      AC.store.clear(from);
      account = null; load();
    },
  });
})();
