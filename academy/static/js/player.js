/* Profit.com Academy · the lesson player (route learn-to-trade/<chapter>/<lesson>).
   Data inlined by build/pages/lesson.py as #ac-lesson: {lesson, chapter, next, first}.
   One responsive player; one fixed primary button that changes in place; progress saved after every card.
   Layout and states: _source/canvas-ch1v2 (phones: one column; desktop: two columns at 1.28×, see cards.js frame()).
   Preview params: ?card=N (0-based) · ?state=right|wrong|open|done|welcome|rankup · ?pick=N (wrong answer to show)
                   ?right=N (state=done: N scored questions right on the first try) · ?as=guest|new|member
   A preview (?card or ?state) runs the engine on a throwaway copy: it never awards XP or changes saved progress,
   and it may open any lesson. Real play goes through AC.progress.lockReason (lessons in order, chapters after their
   Challenge). The rank-up screen, rank card and count-up live in rankup.js. */
(function () {
  "use strict";
  var AC = window.AC;
  var esc = function (s) { return AC.esc(s); };

  var FLAME = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path class="ac-flame" d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z"/></svg>';
  var TICK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17 19 7"/></svg>';
  AC.streakTiles = function (res) {
    var g = res.goal || {}, s = res.streak || 0, best = res.bestStreak || s;
    return '<div class="ac-done__tiles"><div class="ac-done__tile ac-done__tile--streak">' + FLAME +
      '<span><b class="ac-num">' + esc(AC.t("player.done.days", { n: s })) + "</b><span>" + esc(s === 0 ? AC.t("player.done.streakNone") : s === 1 && best <= 1 ? AC.t("player.done.streakStarted") : AC.t("player.done.best", { n: best })) + "</span></span></div>" +
      '<div class="ac-done__tile ac-done__tile--goal' + (g.met ? " is-met" : "") + '"><span class="ac-done__tick">' + TICK + "</span><span><b>" + esc(AC.t(g.met ? "player.done.goalMet" : "player.done.goal")) + "</b><span>" +
      esc(AC.t(g.gym ? "player.done.goalCountGym" : "player.done.goalCount", { done: Math.min(g.done || 0, g.target || 1), n: g.target || 1 })) + "</span></span></div></div>";
  };

  AC.ready(function () {
    var D = AC.data("ac-lesson");
    var host = document.getElementById("acPlayer");
    if (!D || !host) return;
    var L = D.lesson, CH = D.chapter, cards = L.cards;
    var param = AC.cards.param, qCard = param("card"), qState = param("state");
    var preview = qCard != null || qState != null;
    if (preview) AC.progress.sandbox();
    var chapterUrl = AC.url("learn-to-trade/" + CH.id);
    var ctl = null;
    var F = AC.cards.frame({
      close: chapterUrl, closeLabel: AC.t("player.close"), count: true, zoom: true, segments: cards.length,
      kicker: AC.t("player.kicker", { ch: CH.n, n: CH.index + 1, total: CH.count }), title: L.title,
      keys: function () { return ctl; },
    });
    host.innerHTML = "";
    host.appendChild(F.el);

    // ---------------------------------------------------------------- guests: no lesson without an account (previews may look at any)
    if (AC.auth.isGuest() && !preview) {
      // no gate screen: the sign-up sheet opens over the lesson; closing it goes back to the chapter
      F.layout("gate");
      F.main.innerHTML = "";
      F.cta.hidden = true;
      AC.signupSheet(AC.t("player.gate.text", { lesson: L.title }), { next: location.href, onCancel: function () { location.href = chapterUrl; } });
      return;
    }
    // ---------------------------------------------------------------- lessons open in order, a chapter after the previous Challenge
    var lock = preview ? null : AC.progress.lockReason(CH.id, L.id);
    if (lock && lock.reason !== "guest") return AC.cards.locked(F, lock, CH.id, L.id);

    var before = AC.progress.lesson(L.id) || {};
    var wasDone = !!before.done, testedOut = !!before.testedOut;
    var saved = AC.progress.startLesson(L.id, { chapter: CH.id });
    var keepIdx = cards.length - 1;
    var start = Math.min(keepIdx, Math.max(0, saved.card || 0));
    if (qCard != null && !isNaN(+qCard)) start = Math.max(0, Math.min(keepIdx, +qCard));
    if (qState === "done" || qState === "rankup") start = keepIdx;
    // resume: the card that was answered but not left reopens answered (the engine already has that answer)
    var resume = !preview && saved.open && saved.open.card === start ? saved.open : null;

    var idx = -1, finished = false, welcoming = false, onDone = null, lastAnswer = null, restoring = null;
    var ctx = {
      lesson: L.id, chapter: CH.id, mode: "lesson", replay: !!saved.replay,
      split: CH.n > 1,   // canvas-p1 boards (Chapters 2–10): learn cards in two columns on desktop (cards.js autoSide)
      answer: function (slot, ok, idea) {
        if (restoring) return { xp: restoring.xp || 0 };
        return (lastAnswer = AC.progress.answer(L.id, slot, ok, idea));
      },
      changed: function () { refresh(); },
    };
    function refresh() { if (ctl && !finished) F.setCta(ctl.cta()); }
    function focusTitle(sel) { var h = AC.$(sel || ".ac-c__title", F.main); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } }

    function show(i, first) {
      idx = i;
      F.clear();
      F.layout("card");
      F.setProgress(i, false);
      if (cards[i].type === "keep") return complete(cards[i]);
      AC.progress.saveCard(L.id, i);
      ctl = AC.cards.render(cards[i], ctx);
      if (!first && !AC.reducedMotion()) ctl.el.classList.add("ac-enter");
      F.main.appendChild(ctl.el);
      F.setRico(ctl.bubble, ctl.side);
      refresh();
      if (ctl.onShow) ctl.onShow();
      if (resume && resume.card === i && ctl.restore && resume.state && resume.state.answer) {
        restoring = resume.state;
        try { ctl.restore(resume.state.answer); } catch (e) {}
        restoring = null;
        if (ctl.answered) placeSheet(true);
        refresh();
      }
      resume = null;
      if (!first) focusTitle();
    }
    /** After an answer: the feedback sheet goes in, the segment fills, and the answer is saved for resume. */
    function placeSheet(restored) {
      if (!ctl.sheet || ctl.sheetPlaced) return;
      ctl.sheetPlaced = true;
      F.placeSheet(ctl.sheet);
      F.setProgress(idx, true);
      if (!restored && ctl.snapshot) AC.progress.saveCard(L.id, idx, { answer: ctl.snapshot(), xp: (lastAnswer && lastAnswer.xp) || 0 });
      if (!restored) F.showAnswer();
    }

    // ---------------------------------------------------------------- first visit: Rico says hi (once per learner)
    var welcomeKey = "welcome_" + AC.auth.account();
    function welcome() {
      welcoming = true;
      F.clear(); F.layout("welcome");
      var nq = cards.filter(function (c) { return AC.cards.slot(c); }).length;
      F.main.innerHTML = '<section class="ac-welcome">' + AC.cards.rico("present", "ac-welcome__rico ac-rico--idle", AC.t("player.welcome.alt")) +
        '<h1 class="ac-welcome__title">' + esc(AC.t("player.welcome.title")) + '</h1><p class="ac-welcome__text">' + esc(L.intro || AC.t("player.welcome.text")) + "</p>" +
        '<div class="ac-welcome__chips"><span>' + esc(AC.t("player.welcome.minutes", { n: L.minutes })) + "</span><span>" + esc(AC.t("player.welcome.questions", { n: nq })) + "</span><span>" + esc(AC.t("player.welcome.free")) + "</span></div>" +
        '<button type="button" class="ac-btn ac-btn--primary ac-btn--lg ac-welcome__go" data-go>' + esc(AC.t("player.welcome.cta")) + AC.cards.ARROW + "</button></section>";
      F.setCta({ label: AC.t("player.welcome.cta"), arrow: true });
      AC.$("[data-go]", F.main).addEventListener("click", begin);
      focusTitle(".ac-welcome__title");
    }
    function begin() {
      welcoming = false;
      if (!preview) try { AC.store.set(welcomeKey, AC.progress.day ? AC.progress.day() : 1); } catch (e) {}
      show(start);
    }

    F.cta.addEventListener("click", function () {
      if (welcoming) return begin();
      if (finished) { if (onDone) onDone(); return; }
      if (!ctl || F.cta.disabled) return;
      var r = ctl.primary();
      if (r === "next") return show(idx + 1);
      placeSheet(false);
      refresh();
    });
    // keyboard (A–D / 1–4, arrows, Enter, Esc): AC.cards.frame

    // ---------------------------------------------------------------- Lesson complete (canvas-ch1v2: guest / signed in)
    var nextHref = D.next ? AC.url("learn-to-trade/" + CH.id + "/" + D.next.id) : AC.url("learn-to-trade/" + CH.id + "/challenge");
    function next() {
      if (AC.auth.isGuest() && D.next) { AC.signupSheet(AC.t("player.done.saveReason")); return; }
      F.go(nextHref);
    }
    function complete(card) {
      finished = true;
      ctl = null;
      F.setProgress(cards.length - 1, true);
      F.layout("done");
      if (qState === "done" && param("right") != null) {   // preview: answer N scored questions right first
        ["call", "exercise", "check"].slice(0, +param("right")).forEach(function (s) { AC.progress.answer(L.id, s, true); });
      }
      var res = AC.progress.completeLesson(L.id, { chapter: CH.id, keep: card.lines });
      AC.sound.play(res.rankUp ? "" : "done");
      if (res.goalMet && !res.rankUp) setTimeout(function () { AC.sound.play("goal"); }, 450);
      var guest = AC.auth.isGuest(), XP = AC.progress.XP;
      var right = res.firstTryRight || 0, xp = res.xp || 0;
      // every row comes from the engine result and the rows add up to res.xp: finishing + first tries, and whatever
      // else this completion paid (a streak milestone reached by meeting today's goal)
      function row(label, n) { return '<div class="ac-done__row"><span>' + esc(label) + '</span><b class="ac-up">+' + AC.fmt.num(n) + "</b></div>"; }
      var base = wasDone ? 0 : XP.finish + right * XP.firstTry, extra = Math.max(0, xp - base);
      var rows = wasDone
        ? row(AC.t(testedOut ? "player.done.testedOut" : "player.done.replay"), xp)
        : row(AC.t("player.done.finished"), XP.finish) + row(AC.t("player.done.firstTry", { n: right }), right * XP.firstTry) +
          (extra ? row(AC.t("player.done.streakBonus", { n: res.streak || 0 }), extra) : "");
      var ranks = AC.progress.RANKS.slice(0, 3).map(function (r) { return AC.t("rank." + r.id); });
      var xpCard = '<div class="ac-done__card ac-done__xp">' + rows + '<div class="ac-done__total"><b>' + esc(AC.t("player.done.total")) + '</b><b class="ac-done__big ac-num ac-xpin" data-xp>' + esc(AC.t("cards.sheet.xp", { n: xp })) + "</b></div>" +
        (guest ? '<span class="ac-done__ranks">' + esc(AC.t("player.done.ranks", { a: ranks[0], b: ranks[1], c: ranks[2] })) + "</span>" : "") + "</div>";
      // Chapter 10: the lesson that writes a section of My Trading Plan says so (engine: planSection)
      var ps = res.plan || (AC.progress.planSection ? AC.progress.planSection(L.id) : null);
      var planRow = ps ? '<p class="ac-done__card ac-done__plan"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg><span>' +
        esc(AC.t("player.done.plan", { n: ps.n, total: ps.total })) + '</span><a class="ac-link" href="' + AC.url("my-plan") + '">' + esc(AC.t("player.done.openPlan")) + "</a></p>" : "";
      var list = '<ul class="ac-done__list">' + card.lines.map(function (l) { return "<li>" + AC.rich(l) + "</li>"; }).join("") + "</ul>";
      var hero = '<div class="ac-done__hero' + (guest ? " ac-done__hero--guest" : "") + '">' + AC.cards.rico("star", "ac-done__rico ac-react--cheer", AC.t("player.done.ricoAlt")) +
        '<div class="ac-done__head"><span class="ac-done__eb">' + esc(AC.t("player.done.eyebrow")) + '</span><h1 class="ac-done__title">' + esc(card.headline) + "</h1></div></div>";
      // what comes next
      var nq = CH.count, chXp = nq * XP.challengeQ + XP.challengePerfect;
      var upTitle = D.next ? D.next.title : AC.t("player.done.challengeName");
      var upMeta = D.next ? AC.t("player.done.minutes", { n: D.next.minutes }) : AC.t("player.done.challengeMeta", { n: nq, xp: AC.fmt.num(chXp) });
      var upLine = '<p class="ac-done__up">' + esc(AC.t("player.done.upNext")) + " <b>" + esc(upTitle) + "</b> · " + esc(upMeta) + "</p>";
      var nextLabel = D.next ? AC.t("player.done.next") : AC.t("player.done.takeChallenge");
      // the last lesson replayed after the Challenge is passed: say so, and go on to the next chapter (or the path)
      var chRec = AC.progress.chapter(CH.id) || {};
      if (!D.next && (chRec.testedOut || (chRec.challenge && chRec.challenge.passed))) {
        var NC = D.nextChapter && D.nextChapter.available ? D.nextChapter : null;
        upLine = '<p class="ac-done__up"><b>' + esc(AC.t("player.done.challengeName")) + "</b> · " + esc(AC.t("player.done.challengePassed")) +
          (NC ? " · " + esc(AC.t("player.done.upNext")) + " <b>" + esc(AC.t("player.done.chapterNext", { n: NC.n, title: NC.title })) + "</b>" : "") + "</p>";
        nextLabel = NC ? AC.t("challenge.cta.nextChapter", { n: NC.n }) : AC.t("challenge.cta.path");
        nextHref = NC ? AC.url("learn-to-trade/" + NC.id) : AC.url("learn-to-trade");
      }
      var main, side;
      if (guest) {
        main = hero + xpCard;
        side = planRow + '<div class="ac-done__card ac-done__keep"><span class="ac-done__k">' + esc(AC.t("player.done.keepN", { n: card.lines.length })) + "</span>" + list + "</div>" +
          '<div class="ac-done__card ac-done__save"><b>' + esc(AC.t("player.done.saveXp", { xp: AC.fmt.num(res.totalXp || xp) })) + "</b><span>" + esc(AC.t("player.done.saveText")) + "</span>" +
          '<button type="button" class="ac-btn ac-btn--primary ac-btn--lg" data-action="signup" data-reason="' + esc(AC.t("player.done.saveReason")) + '">' + esc(AC.t("player.gate.cta")) + "</button></div>";
      } else {
        main = hero + xpCard + '<div class="ac-done__next">' + upLine + '<a class="ac-btn ac-btn--primary ac-btn--lg" href="' + esc(nextHref) + '">' + esc(nextLabel) + AC.cards.ARROW + "</a></div>";
        side = AC.rankCard(res, xp) + AC.streakTiles(res) + planRow +
          (planRow ? "" : '<p class="ac-done__card ac-done__notes"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h14v16l-7-4-7 4z"/></svg><span>' +
          esc(AC.t("player.done.savedN", { n: card.lines.length })) + '</span><a class="ac-link" href="' + AC.url("me/notes") + '">' + esc(AC.t("player.done.notes")) + "</a></p>") +
          '<div class="ac-done__card ac-done__keep ac-done__keep--notes"><div class="ac-done__keephead"><span class="ac-done__k">' + esc(AC.t("player.done.savedTitle")) + '</span><a class="ac-link" href="' + AC.url("me/notes") + '">' + esc(AC.t("player.done.notes")) + "</a></div>" + list + "</div>";
      }
      F.main.innerHTML = '<div class="ac-done' + (guest ? " ac-done--guest" : "") + '"><div class="ac-done__main">' + main + '</div><div class="ac-done__side" data-side>' + side + "</div></div>";
      F.setRico(null, null);
      if (guest) {
        F.setCta({ label: AC.t("player.done.saveXp", { xp: AC.fmt.num(res.totalXp || xp) }), sub: AC.t("player.done.saveSub"), stack: true });
        onDone = function () { AC.signupSheet(AC.t("player.done.saveReason")); };
        // the next lesson needs an account: say so on the button that opens the sign-up sheet
        F.extra.appendChild(AC.cards.ghost(D.next ? AC.t("player.done.signupNext", { n: CH.index + 2 }) : AC.t("player.done.takeChallenge"), null, next, true));
      } else {
        F.dock.innerHTML = upLine;
        F.setCta({ label: nextLabel, arrow: true });
        onDone = next;
        F.extra.appendChild(AC.cards.ghost(AC.t("player.backChapter"), chapterUrl));
      }
      F.el.classList.toggle("ac-pl--guestdone", guest);
      AC.countUp(AC.$("[data-xp]", F.main), xp, function (v) { return AC.t("cards.sheet.xp", { n: v }); });
      focusTitle(".ac-done__title");
      if (res.rankUp && !guest) AC.rankUp(res);
    }

    var showWelcome = qState === "welcome" || (L.id === D.first && qCard == null && !qState && !(saved.card > 0) && !wasDone && !AC.store.get(welcomeKey));
    if (showWelcome) welcome(); else show(start, true);
    if (qState === "rankup") AC.rankUp({ rankUp: "analyst", level: AC.progress.levelOf(1000), totalXp: 1000 });   // preview
    if (qState && qState !== "done" && qState !== "welcome" && AC.cards.drive(ctl, qState)) F.cta.click();
    if (param("open") && ctl) AC.$$("[data-step]", F.el).slice(0, +param("open")).reverse().forEach(function (b) { b.click(); });   // preview: N rows seen
  });
})();
