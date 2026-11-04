/* Profit.com Academy · Chapter Challenge (route learn-to-trade/<chapter>/challenge).
   Intro → one question per lesson (answered once, right/wrong + one-line why) → submitChallenge →
   passed (XP breakdown + Profit Coins, next chapter or, after the last chapter, "Finish the path") or
   not yet (missed ideas → one-minute refresher → retry, with the chapter's second question set when it has one).
   Every number on the results comes from the engine result (XP, coins, chapters done); nothing is hard-coded.
   Preview params: ?state=intro|q|wrong|pass|fail|refresh (screenshots; run on a throwaway copy of progress, never saved)
                   ?right=N (state=pass: N right) · ?retry=1 (state=pass: a pass after a fail, half XP) · ?qi=N (state=q)
   Opens only when every lesson of the chapter is done (AC.progress.lockReason). */
(function () {
  "use strict";
  var AC = window.AC;
  var esc = function (s) { return AC.esc(s); };

  AC.ready(function () {
    var D = AC.data("ac-challenge");
    var host = document.getElementById("acPlayer");
    if (!D || !host) return;
    var CH = D.chapter, SETS = [D.questions], need = Math.max(0, D.questions.length - 1);
    // a second set (one question per lesson, same order) makes every other try "new questions"
    if (D.retry && D.retry.length === D.questions.length) SETS.push(D.retry);
    var hasNew = SETS.length > 1;
    function setFor(attempts) { return SETS[(attempts || 0) % SETS.length]; }
    var Q = setFor(((AC.progress.chapter(CH.id) || {}).challenge || {}).attempts), n = Q.length;
    var XP = AC.progress.XP;
    var st = AC.cards.param("state");
    if (st) AC.progress.sandbox();
    var chapterUrl = AC.url("learn-to-trade/" + CH.id);
    var results = [], qi = 0, ctl = null;
    var F = AC.cards.frame({ close: chapterUrl, closeLabel: AC.t("challenge.close"), heading: AC.t("challenge.heading", { n: CH.n }), aside: AC.t("challenge.aside.intro"), segments: n, sheetMain: true, sheetDock: true,
      keys: function () { return ctl; } });
    F.el.classList.add("ac-pl--challenge");
    host.innerHTML = "";
    host.appendChild(F.el);

    var onCta = null;
    F.cta.addEventListener("click", function () { if (!F.cta.disabled && onCta) onCta(); });
    function cta(label, fn) { F.setCta(typeof label === "string" ? { label: label } : label); onCta = fn; }
    function focusTitle() { var h = AC.$(".ac-c__title, .ac-res__title", F.main); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } }

    if (AC.auth.isGuest()) {
      F.layout("gate");
      F.setAside("");
      F.main.innerHTML = '<div class="ac-gate"><h1 class="ac-c__title">' + esc(AC.t("challenge.gate.title")) + '</h1><p class="ac-c__text">' + esc(AC.t("challenge.gate.text")) + "</p></div>";
      cta(AC.t("player.gate.cta"), function () { AC.signupSheet(AC.t("challenge.gate.text")); });
      F.extra.appendChild(AC.cards.ghost(AC.t("player.backChapter"), chapterUrl));
      return;
    }
    var lock = st ? null : AC.progress.lockReason(CH.id, "challenge");
    if (lock) return AC.cards.locked(F, lock, CH.id, "challenge");

    // ---------------------------------------------------------------- intro
    function intro() {
      F.clear(); F.layout("card"); F.setProgress(-1); F.setAside(AC.t("challenge.aside.intro"));
      var max = n * XP.challengeQ + XP.challengePerfect;
      var rules = [AC.t("challenge.intro.r1", { n: n }), AC.t("challenge.intro.r2"), AC.t("challenge.intro.r3", { need: need, n: n }), AC.t("challenge.intro.rule4", { xp: XP.challengeQ, bonus: XP.challengePerfect, n: n })];
      F.main.innerHTML = '<section class="ac-c">' + AC.cards.eyebrow(AC.t("challenge.intro.eyebrow", { n: CH.n, short: CH.short }), "gold") +
        AC.cards.title(AC.t("challenge.intro.title")) + '<p class="ac-c__text">' + esc(D.next ? AC.t("challenge.intro.text", { next: D.next.n }) : AC.t(D.last ? "challenge.intro.textPath" : "challenge.intro.textLast")) + "</p>" +
        '<ul class="ac-ch-intro__rules">' + rules.map(function (r, i) { return "<li><span>" + (i + 1) + "</span><span>" + esc(r) + "</span></li>"; }).join("") + "</ul>" +
        '<span class="ac-chip--gold-lg">' + esc(AC.t("challenge.intro.upTo", { xp: AC.fmt.num(max) })) + "</span></section>";
      var line = AC.t("challenge.intro.rico");
      F.setRico(AC.h(AC.cards.bubble(line, "present")), AC.h('<div class="ac-side">' + AC.cards.bubble(line, "present", true) + "</div>"));
      cta(AC.t("challenge.intro.cta"), start);
    }
    function start() { results = []; qi = 0; AC.progress.startChallenge(CH.id); question(); }
    /** A retry after a fail: the other question set when the chapter has one (the engine counts the attempts). */
    function retry() { Q = setFor(((AC.progress.chapter(CH.id) || {}).challenge || {}).attempts); n = Q.length; start(); }
    function word(k) { return k >= 1 && k <= 8 ? AC.t("challenge.word." + k) : AC.fmt.num(k); }
    /** Chapters passed (or tested out) on the path, from the engine record: "3 of 10 chapters done". */
    function chaptersDone() {
      var chs = (AC.index ? AC.index().chapters : []) || [];
      var done = chs.filter(function (c) { var r = AC.progress.chapter(c.id) || {}; return r.testedOut || (r.challenge && r.challenge.passed); }).length;
      return { done: done, total: chs.length || (D.path ? D.path.chapters : 0) };
    }

    // ---------------------------------------------------------------- one question per lesson
    function missed() { return results.filter(function (r) { return !r.correct; }).length; }
    function question() {
      var q = Q[qi];
      F.clear(); F.layout("card"); F.setProgress(qi, false);
      F.setAside(missed() ? AC.t("challenge.aside.missed", { n: missed() }) : AC.t("challenge.aside.rule"));
      var meta = '<div class="ac-ch-q__meta"><span>' + esc(AC.t("challenge.q.meta", { i: qi + 1, n: n, lesson: q.lesson })) + '</span><span class="ac-eb__chip">' + esc(AC.t("challenge.q.new")) + "</span></div>";
      ctl = AC.cards.mcq({ type: "challenge", title: q.q }, {
        eyebrow: "", tone: "gold", head: meta + '<h2 class="ac-c__title">' + AC.rich(q.q) + "</h2>",
        options: q.options.map(function (o) { return { text: o }; }), answer: q.answer, why: q.why, work: q.work, gym: !!q.idea, slot: "challenge", idea: q.idea, dim: true,
        visual: q.visual && AC.visual ? AC.visual(q.visual) : "", keepVisual: AC.cards.keepVisual(q.visual), visualMain: true,
        nextLabel: qi + 1 < n ? AC.t("challenge.q.next") : AC.t("challenge.q.results"),
      }, {
        mode: "challenge",
        answer: function (slot, ok) { results[qi] = { lesson: CH.lessons[q.lesson - 1] ? CH.lessons[q.lesson - 1].id : String(q.lesson), correct: ok, idea: q.idea }; return {}; },
        changed: function () { F.setCta(ctl.cta()); },
      });
      ctl.el.classList.add("ac-ch-q");
      var eb = AC.$(".ac-eb", ctl.el); if (eb) eb.remove();
      F.main.appendChild(ctl.el);
      F.setRico(null, null);
      F.setCta(ctl.cta());
      onCta = function () {
        var r = ctl.primary();
        if (r === "next") { qi += 1; return qi < n ? question() : submit(); }
        if (ctl.sheet && !ctl.sheetPlaced) {
          ctl.sheetPlaced = true;
          // the next step sits inside the sheet (canvas: "Not quite … [Next question]")
          var b = AC.h('<button type="button" class="ac-btn ac-btn--primary ac-btn--lg ac-sheet__cta">' + esc(ctl.cta().label) + "</button>");
          b.addEventListener("click", function () { onCta(); });
          ctl.sheet.appendChild(b);
          F.setRico(null, null); F.placeSheet(ctl.sheet); F.setProgress(qi, true);
          F.el.classList.add("is-sheetcta");
          F.setAside(missed() ? AC.t("challenge.aside.missed", { n: missed() }) : AC.t("challenge.aside.rule"));
          F.showAnswer();
        }
        F.setCta(ctl.cta());
      };
      if (qi) focusTitle();
    }

    // ---------------------------------------------------------------- results (kit2 challenge_result)
    var last = null;
    function submit() {
      last = AC.progress.submitChallenge(CH.id, results);
      results.length === n && showResult(last);
    }
    function bars(res) {
      var miss = {};
      results.forEach(function (r, i) { if (!r.correct) miss[i] = 1; });
      return '<div class="ac-res__answers"><div class="ac-res__ahead"><span>' + esc(AC.t("challenge.byLesson")) + "</span><b>" + esc(AC.t("challenge.rightOf", { right: res.right, n: n })) + "</b></div>" +
        '<ol class="ac-res__bars">' + Q.map(function (q, i) { return '<li class="' + (miss[i] ? "is-miss" : "") + '" style="--i:' + i + '"><span class="ac-visually-hidden">' + esc(q.q) + " · " + esc(AC.t(miss[i] ? "challenge.bar.missed" : "challenge.bar.right")) + "</span>" + esc(AC.t("challenge.lessonShort", { n: q.lesson })) + "</li>"; }).join("") + "</ol></div>";
    }
    /** content markup (**bold**, [[term|text]]) → plain text for a side card line */
    function sidecard(cls, k, title, text, btn) {
      return '<div class="ac-sidecard ' + cls + '"><span class="ac-sidecard__k">' + esc(k) + "</span>" + (title ? "<b>" + esc(title) + "</b>" : "") + (text ? "<span>" + esc(text) + "</span>" : "") + (btn || "") + "</div>";
    }
    function showResult(res) {
      F.clear();
      var ok = res.passed;
      F.layout(ok ? "results" : "results-fail");
      F.setProgress(n, false); F.setAside(AC.t("challenge.aside.results"));
      AC.$$(".ac-pl__prog span", F.el).forEach(function (s) { s.className = "is-done"; });
      var perfect = res.right === n;
      var half = ok && res.xp > 0 && res.full != null && res.xp < res.full;
      var text = ok ? (!res.xp ? AC.t("challenge.pass.again", { right: res.right, n: n }) : half ? AC.t("challenge.pass.halfNote", { right: res.right, n: n })
        : AC.t(perfect ? "challenge.pass.perfectBonus" : "challenge.pass.oneMissThrough", { right: res.right, n: n }))
        : AC.t(hasNew ? "challenge.fail.textNew" : "challenge.fail.textSame", { need: need });
      var prog = chaptersDone();
      if (ok && prog.total) text += " " + AC.t("challenge.pass.chaptersDone", { done: prog.done, total: prog.total });
      var hero = '<div class="ac-res__hero' + (ok ? "" : " ac-res__hero--fail") + '"><div class="ac-res__copy"><span class="ac-res__chip">' + esc(ok ? AC.t("challenge.pass.chipN", { n: CH.n }) : AC.t("challenge.fail.chip")) + "</span>" +
        '<h1 class="ac-res__title">' + esc(ok ? AC.t("challenge.pass.youPassed", { title: CH.title }) : AC.t(res.right === need - 1 ? "challenge.fail.title" : "challenge.fail.titleNotYet", { right: res.right, n: n })) + '</h1><p class="ac-res__text">' + esc(text) + "</p></div>" +
        AC.cards.rico(ok ? "star" : "think", "ac-res__rico") + "</div>";
      var xp = "";
      if (ok && (res.xp || res.coins)) {
        // the rows add up to the engine's award: questions + bonus (= res.full), minus the retry half when it applies
        var qXp = res.right * XP.challengeQ, bonusXp = res.full != null ? Math.max(0, res.full - qXp) : (perfect ? XP.challengePerfect : 0);
        var cut = half ? Math.max(0, (res.full != null ? res.full : qXp + bonusXp) - res.xp) : 0;
        xp = '<div class="ac-res__xp"><div><span>' + esc(AC.t("challenge.xp.rows", { right: res.right, xp: XP.challengeQ })) + "</span><b>+" + AC.fmt.num(qXp) + "</b></div>" +
          (bonusXp ? "<div><span>" + esc(AC.t("challenge.xp.bonus", { n: n })) + "</span><b>+" + AC.fmt.num(bonusXp) + "</b></div>" : "") +
          (cut ? "<div><span>" + esc(AC.t("challenge.xp.halfLess")) + "</span><b>−" + AC.fmt.num(cut) + "</b></div>" : "") +
          '<div class="ac-done__total"><b>' + esc(AC.t("challenge.xp.total")) + '</b><b class="ac-num ac-xpin" data-xp>' + esc(AC.t("cards.sheet.xp", { n: res.xp || 0 })) + "</b></div>" +
          (res.levelReached ? '<div class="ac-res__lvl">' + AC.levelCue(res) + "</div>" : "") +
          (res.coins ? '<div class="ac-res__coins"><span>' + esc(AC.t("challenge.xp.coinsLabel")) + '</span><b class="ac-num">' + esc(AC.t("challenge.xp.coins", { n: AC.fmt.num(res.coins) })) + "</b></div>" : "") + "</div>";
      }
      var side = [];
      if (ok) {
        // a retake after a pass (or a tested-out chapter) unlocks nothing new: the next chapter was already open
        var already = !res.firstPass;
        if (D.next) side.push(sidecard("ac-sidecard--unlocked", AC.t(already ? "challenge.side.nextK" : "challenge.side.unlocked"), D.next.available ? AC.t("challenge.side.unlockedTitle", { n: D.next.n, title: D.next.title }) : "", D.next.available ? AC.t(already ? "challenge.side.alreadyText" : "challenge.side.unlockedText") : AC.t("challenge.side.soon", { n: D.next.n, title: D.next.title })));
        else if (D.last) side.push(sidecard("ac-sidecard--unlocked", AC.t("challenge.side.finaleK", { xp: AC.fmt.num(D.path.finale.xp), coins: AC.fmt.num(D.path.finale.coins) }), AC.t("challenge.side.finaleTitle"),
          prog.done >= prog.total ? AC.t("challenge.side.finaleText", { n: prog.total }) : AC.t("challenge.side.finaleTodo"),
          '<a class="ac-btn ac-btn--soft ac-btn--sm" href="' + AC.url("my-plan") + '">' + esc(AC.t("challenge.side.planCta")) + "</a>"));
        // the missed idea is due tomorrow; the chapter review plays this chapter's ideas today
        if (res.missed.length) side.push(sidecard("ac-sidecard--gym", AC.t("challenge.side.gym"), AC.t("challenge.side.gymTitle"), AC.t("challenge.side.gymText"),
          '<a class="ac-btn ac-btn--soft ac-btn--sm" href="' + AC.url("gym/today?chapter=" + CH.id) + '">' + esc(AC.t("challenge.side.gymCta", { xp: XP.gym })) + "</a>"));
      } else {
        refreshers(res).forEach(function (r) { side.push(sidecard("ac-sidecard--warn", AC.t("challenge.side.brush"), r.title, r.text)); });
      }
      var btns = [];   // [label, href | fn, primary]
      if (ok) {
        var nextUrl = D.next && D.next.available ? AC.url("learn-to-trade/" + D.next.id) : AC.url("learn-to-trade");
        if (D.next && D.next.available) btns = [[AC.t(res.firstPass ? "challenge.cta.nextChapter" : "challenge.cta.goChapter", { n: D.next.n }), nextUrl, true], [AC.t("challenge.cta.path"), AC.url("learn-to-trade")]];
        else if (D.last) btns = [[AC.t("challenge.cta.finish"), AC.url("learn-to-trade/finish"), true], [AC.t("challenge.cta.path"), AC.url("learn-to-trade")]];
        else btns = [[AC.t("challenge.cta.path"), AC.url("learn-to-trade"), true]];
      } else {
        btns = [[AC.t("challenge.cta.gym", { xp: XP.gym }), AC.url("gym/today?chapter=" + CH.id), true], [AC.t("challenge.cta.retry"), function () { refresh(res); }]];
      }
      var inCard = '<div class="ac-res__btns">' + btns.map(function (b, i) {
        return typeof b[1] === "string" ? '<a class="ac-btn ac-btn--lg ' + (b[2] ? "ac-btn--primary" : "ac-btn--ghost") + '" href="' + esc(b[1]) + '">' + esc(b[0]) + "</a>" : '<button type="button" class="ac-btn ac-btn--lg ac-btn--ghost" data-b="' + i + '">' + esc(b[0]) + "</button>";
      }).join("") + "</div>";
      F.main.innerHTML = '<div class="ac-res"><div class="ac-res__main">' + hero + bars(res) + xp + inCard + '</div><div class="ac-res__side">' + side.join("") + "</div></div>";
      AC.$$("[data-b]", F.main).forEach(function (x) { x.addEventListener("click", btns[+x.dataset.b][1]); });
      var first = btns[0];
      cta({ label: first[0], arrow: ok && !!((D.next && D.next.available) || D.last) }, typeof first[1] === "string" ? function () { F.go(first[1]); } : first[1]);
      btns.slice(1).forEach(function (b) { F.extra.appendChild(typeof b[1] === "string" ? AC.cards.ghost(b[0], b[1]) : AC.cards.ghost(b[0], null, b[1])); });
      AC.countUp(AC.$("[data-xp]", F.main), res.xp || 0, function (v) { return AC.t("cards.sheet.xp", { n: v }); });
      if (!(ok && res.rankUp)) AC.sound.play(ok ? "pass" : "done");
      if (ok && res.firstPass && AC.celebrate) AC.celebrate(AC.$(".ac-res__hero", F.main), { coins: res.coins ? 6 : 0 });
      if (ok && res.rankUp) AC.rankUp(res);
      focusTitle();
    }
    function refreshers(res) {
      var ideas = res.missed.map(function (m) { return m.idea; });
      var out = (D.refresher || []).filter(function (r) { return ideas.indexOf(r.idea) >= 0; });
      // a missed idea without a refresher entry: show the question's one-line why
      ideas.forEach(function (idea) {
        if (out.some(function (r) { return r.idea === idea; })) return;
        var q = Q.filter(function (x) { return x.idea === idea; })[0];
        if (q) { var l = CH.lessons[q.lesson - 1]; out.push({ idea: idea, title: l ? AC.t("gym.session.fromLesson", { ch: CH.n, short: CH.short, n: l.n }) + " · " + l.title : "", text: q.why }); }
      });
      return out;
    }

    // ---------------------------------------------------------------- one-minute refresher, then retry
    function refresh(res) {
      F.clear(); F.layout("card"); F.setProgress(-1); F.setAside(AC.t("challenge.aside.refresher"));
      var list = refreshers(res);
      F.main.innerHTML = '<section class="ac-c"><div class="ac-eb"><span class="ac-eb__label ac-eb__label--warn">' + esc(AC.t("challenge.refresh.eyebrow")) + "</span></div>" +
        AC.cards.title(AC.t("challenge.refresh.title", { n: list.length, word: word(list.length) })) +
        list.map(function (r) { return '<div class="ac-panel"><b>' + esc(r.title) + "</b><span>" + AC.rich(r.text) + "</span></div>"; }).join("") +
        '<p class="ac-c__hint">' + esc(list.length === 2 ? AC.t(hasNew ? "challenge.refresh.noteNewBoth" : "challenge.refresh.noteBoth") : AC.t(hasNew ? "challenge.refresh.noteNew" : "challenge.refresh.note", { n: list.length })) + "</p></section>";
      var line = AC.t("challenge.refresh.rico", { n: list.length, word: word(list.length) });
      F.setRico(AC.h(AC.cards.bubble(line, "think")), AC.h('<div class="ac-side">' + AC.cards.bubble(line, "think", true) + "</div>"));
      cta(AC.t(hasNew ? "challenge.cta.retryNew" : "challenge.cta.retry"), retry);
      focusTitle();
    }

    // ---------------------------------------------------------------- preview states for screenshots (sandboxed above)
    function fake(passed) {
      if (passed && AC.cards.param("retry")) { results = Q.map(function (q, i) { return { lesson: (CH.lessons[q.lesson - 1] || {}).id, correct: i > 1, idea: q.idea }; }); AC.progress.submitChallenge(CH.id, results); }
      results = Q.map(function (q, i) { return { lesson: (CH.lessons[q.lesson - 1] || {}).id, correct: passed ? (AC.cards.param("right") ? i < +AC.cards.param("right") : true) : i === 1 || i === 2, idea: q.idea }; });
      submit();
    }
    if (st === "q") {
      start();
      var upto = +(AC.cards.param("qi") || 0);   // preview: question N (earlier ones answered right)
      if (upto) { while (qi < upto && qi < n - 1) { results[qi] = { lesson: (CH.lessons[Q[qi].lesson - 1] || {}).id, correct: true, idea: Q[qi].idea }; qi++; } question(); }
    }
    else if (st === "wrong") { start(); ctl.pick((Q[0].answer + 1) % Q[0].options.length); onCta(); }
    else if (st === "pass") fake(true);
    else if (st === "fail") fake(false);
    else if (st === "refresh") { fake(false); refresh(last); }
    else intro();
  });
})();
