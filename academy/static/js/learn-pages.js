/* Profit.com Academy · Learn pages: home (guest / new / learning), setup, placement, paths, Pro path, path map, chapter.
   The SSR markup is the guest state; this script fills learner state from AC.progress (done ticks, Continue, XP, locks,
   Challenge state), runs the setup choices and the placement quiz. Data: #ac-learn (path model), #ac-placement. */
(function () {
  "use strict";
  var AC = window.AC;
  var $ = function (s, el) { return AC.$(s, el); };
  var $$ = function (s, el) { return AC.$$(s, el); };
  var t = function (k, v) { return AC.t(k, v); };
  var esc = function (s) { return AC.esc(s); };
  // XP rules come from the engine (set at boot): a lesson pays the finish XP plus up to three first-try answers
  var XP = null;
  function xpRules() {
    var X = AC.progress.XP;
    return { lesson: X.lesson || X.finish + 3 * X.firstTry, q: X.challengeQ, perfect: X.challengePerfect, placement: X.placement };
  }

  var ICON = {
    check: '<path d="m5 12 5 5 9-10"/>', chev: '<path d="m9 6 6 6-6 6"/>', shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    diamond: '<path d="M12 2 22 12 12 22 2 12z"/>', award: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5 8 21l4-2 4 2-1-7.5"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z"/>', gym: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', replay: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  };
  function svg(name, size, sw, extra) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || "") + ">" + ICON[name] + "</svg>";
  }

  // ------------------------------------------------------------------ model
  function data() { return AC.data("ac-learn") || { chapters: [], skills: [] }; }
  function isGuest() { return AC.auth.isGuest(); }
  function lessonUrl(c, l) { return AC.url(data().path + "/" + c.id + "/" + l.id); }
  function chapterUrl(c, sub) { return AC.url(data().path + "/" + c.id + (sub ? "/" + sub : "")); }

  /** Every chapter with the learner's state; current chapter and the next action. */
  function model() {
    var d = data();
    var P = AC.progress;
    var first = null;
    var chapters = d.chapters.map(function (c) {
      var st = P.chapter(c.id) || {};
      var ch = st.challenge || {};
      var lessons = c.lessons.map(function (l, i) {
        var r = c.available ? P.lesson(l.id) : null;
        var answered = r && r.answered ? Object.keys(r.answered).length : 0;
        return Object.assign({}, l, {
          // a chapter that isn't authored yet can only be passed by a preview record: its lessons count as done
          n: i + 1, done: !!(r && r.done) || (!c.available && !!ch.passed), card: r && !r.done ? (r.card || 0) : 0,
          started: !!(r && !r.done && ((r.card || 0) > 0 || answered > 0)), best: (r && r.best) || 0, firstTry: (r && r.firstTry) || {},
        });
      });
      var out = Object.assign({}, c, {
        lessons: lessons, done: lessons.filter(function (l) { return l.done; }).length,
        passed: !!ch.passed, testedOut: !!st.testedOut, attempts: ch.attempts || 0, last: ch.last || null,
      });
      if (c.available && !first && lessons.length) first = { c: out, l: lessons[0] };
      return out;
    });
    chapters.forEach(function (c, i) {
      c.unlocked = c.available && (i === 0 || chapters[i - 1].passed);
      c.complete = c.passed && (c.testedOut || c.done === c.count);
      c.next = c.lessons.filter(function (l) { return !l.done; })[0] || null;
      c.paid = chapterXpOf(c);
      c.earned = c.paid.lessons + c.paid.challenge;   // the header's "XP earned": what the rows show
    });
    var current = chapters.filter(function (c) { return c.available && !c.complete; })[0] || null;
    // the whole path: every chapter out and passed (or tested out); finished = the finale claimed (certificate earned)
    var allPassed = chapters.length > 0 && chapters.every(function (c) { return c.available && c.passed; });
    var finished = !!((P.state().paths || {})[d.path]);
    var action;
    if (!current) action = finished ? { kind: "finished" } : allPassed ? { kind: "finish" } : { kind: "done" };
    else if (!current.unlocked) action = { kind: "challenge", c: chapters[chapters.indexOf(current) - 1] };
    else if (current.next && !(current.testedOut && current.done === 0 && current.passed)) action = { kind: "lesson", c: current, l: current.next };
    else if (!current.passed) action = { kind: "challenge", c: current };
    else action = { kind: "done" };
    var all = [];
    chapters.forEach(function (c) { c.lessons.forEach(function (l) { all.push(l); }); });
    return {
      chapters: chapters, current: current, action: action, first: first, skills: d.skills || [],
      lessonsDone: all.filter(function (l) { return l.done; }).length, lessonsTotal: d.lessons || all.length, xpTotal: d.xp,
      passed: chapters.filter(function (c) { return c.passed; }).length,
      started: AC.progress.summary().started, allPassed: allPassed, finished: finished,
    };
  }
  /** XP the chapter actually paid {lessons, challenge}: the engine's record (AC.progress.chapterXp); without
      it, the same numbers the rows show (lesson bests, the passing Challenge result). */
  function chapterXpOf(c) {
    if (AC.progress.chapterXp) return AC.progress.chapterXp(c.id);
    var r = challengeResult(c);
    var ch = c.passed && !c.testedOut && r && r.passed ? r.right * XP.q + (r.right === r.total ? XP.perfect : 0) : 0;
    return { lessons: c.lessons.reduce(function (a, l) { return a + (l.done ? l.best : 0); }, 0), challenge: ch };
  }
  /** The Challenge attempt to show: the passing one once passed (a later retake can't replace it), else the best try.
      Reads challenge.passedWith / challenge.best when the engine keeps them, else the last attempt. */
  function challengeResult(c) {
    var raw = (AC.progress.chapter(c.id) || {}).challenge || {};
    function sum(x) {
      if (!x) return null;
      if (x.length != null) { var r = x.filter(function (q) { return q.correct; }).length; return { right: r, total: x.length, passed: x.length - r <= 1 }; }
      return { right: x.right, total: x.total, passed: x.total - x.right <= 1 };
    }
    var pw = sum(raw.passedWith), best = sum(raw.best), last = sum(raw.last);
    if (c.passed) return pw || (last && last.passed ? last : null);
    return best || last;
  }
  /** Guests play only the path's first lesson. */
  function playable(m, l) { return !isGuest(); }   // guests sign up before any lesson (the onboarding quiz is the free taste)
  function setLink(a, href, guestLocked) {
    if (!a) return;
    a.setAttribute("href", href);
    if (guestLocked) { a.setAttribute("data-action", "signup"); a.setAttribute("data-reason", t("chapter.signupReason")); }
    else { a.removeAttribute("data-action"); }
  }
  function actionLink(m) {
    var a = m.action;
    if (a.kind === "lesson") return { href: lessonUrl(a.c, a.l), locked: !playable(m, a.l) };
    if (a.kind === "challenge") return { href: chapterUrl(a.c, "challenge"), locked: isGuest() };
    if (a.kind === "finish") return { href: AC.url(data().path + "/finish"), locked: false };
    if (a.kind === "finished") return { href: AC.url("me/certificates"), locked: false };
    return { href: AC.url("gym"), locked: false };
  }
  function minutesLeft(l) { return l.cards ? Math.max(1, Math.ceil(l.minutes * (1 - l.card / l.cards))) : l.minutes; }
  /** Why a later lesson isn't open: the current lesson (nowL) comes first. */
  function lessonHint(m, nowL) {
    if (!playable(m, nowL)) return t("pm.l.hint.signup");
    return nowL.started ? t("pm.l.hint.lessonLeft", { l: nowL.n, n: mins(minutesLeft(nowL)) }) : t("pm.l.hint.lesson", { l: nowL.n, n: nowL.minutes });
  }

  // segments: one per chapter
  function fillSegs(root, m) {
    $$("[data-seg]", root).forEach(function (li) {
      var c = m.chapters.filter(function (x) { return x.id === li.getAttribute("data-seg"); })[0];
      if (!c) return;
      var pct = c.passed ? 100 : c.count ? Math.round((c.done / c.count) * 100) : 0;
      $(".ac-seg__bar > span", li).style.width = pct + "%";
      li.classList.toggle("is-on", pct > 0);
      li.classList.toggle("is-now", m.current === c && c.unlocked);
    });
  }

  // ------------------------------------------------------------------ shared bits
  function firstName() { var u = AC.auth.user(); return u && u.name ? u.name.split(" ")[0] : ""; }
  function now() { return AC.progress.clock.now(); }
  function monthName() { return AC.fmt.date(now(), { month: "long" }); }
  function resets() {
    var d = now(), next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    var days = Math.max(1, Math.ceil((next - d) / 86400000));
    return { days: days, text: t("home.top.resets", { n: days }), date: AC.fmt.date(next, { month: "long", day: "numeric" }) };
  }
  function avatar(p, cls) {
    if (p.me) return '<span class="ac-ava ac-ava--me ' + (cls || "") + '" aria-hidden="true">' + esc(initials((AC.auth.user() || {}).name || p.name)) + "</span>";
    if (p.avatar) return '<img class="ac-ava ' + (cls || "") + '" src="' + AC.base + "static/img/avatars/avatar-" + p.avatar + '.webp" alt="" loading="lazy">';
    return '<span class="ac-ava ac-ava--' + (p.tone || "pro") + " " + (cls || "") + '" aria-hidden="true">' + esc(initials(p.name)) + "</span>";
  }
  function initials(n) { return String(n || "").split(/\s+/).map(function (w) { return w.charAt(0); }).join("").slice(0, 2).toUpperCase(); }

  // ------------------------------------------------------------------ home
  function home() {
    var root = $("[data-home]");
    if (!root) return;
    var aud = document.body.dataset.audience;
    snakeMap();
    topBoard();
    var m = model();
    var s = AC.progress.summary();
    if (aud === "guest") { guestHome(m, s); guestSticky(); swipeDots(); learnMore(); certThumb(); proSwap(root); return; }
    $$("[data-home-aside]").forEach(function (el) { el.innerHTML = aside(m, s, aud); });
    $$("[data-pm-hero]", root).forEach(function (h) { pmHero(h, m); });
    pathProgress(m);
    swipeDots();   // the Pro paths row (phones)
    if (aud === "new") {
      var nm = firstName();
      $("[data-greet-new]").textContent = nm ? t("home.new.title", { name: nm }) : t("home.new.titleNoName");
      return;
    }
    // ---- learning
    var h = now().getHours();
    var part = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
    var nm2 = firstName();
    $("[data-greet]").textContent = nm2 ? t("home.greet." + part, { name: nm2 }) : t("home.greet." + part + "NoName");
    var left = Math.max(0, s.goal.target - s.goal.done);
    // never "0 more lessons": a goal that is reached (even before the engine marks it) reads as met
    $("[data-greet-sub]").textContent = s.goal.met && s.streak ? t("home.learn.sub.met", { n: s.streak }) : s.goal.met || !left ? t("home.goal.met")
      : s.streak > 0 ? t("home.learn.sub.more", { n: left, streak: AC.fmt.num(s.streak) }) : t("home.learn.sub.start", { n: left });
  }

  /** Guest home. First visit: the SSR marketing hero. A guest who has played (Lesson 1, or the placement quiz): what
      they earned, Continue to the next lesson (its page shows the sign-up gate) and "Save your progress". */
  function guestHome(m, s) {
    // A guest who already played: the hero keeps its first-visit copy; only a small "Lesson 1 done" line and the
    // main button change (one step: sign up free to continue). First-time guests see the hero exactly as built.
    var hero = $(".ac-ghero");
    if (!hero || !s.started) return;
    var a = m.action, first = m.first && m.first.l;
    if (first && first.done) {
      setText($("[data-gh-eb]", hero), first.best ? t("home.started.eb", { n: first.n, xp: AC.fmt.num(first.best) }) : t("home.started.ebNoXp", { n: first.n }));
      showEl($("[data-gh-eb]", hero), true);
    }
    var cta = $("[data-gh-cta]", hero);
    if (a.kind === "lesson" && playable(m, a.l)) {
      setText($("[data-gh-cta-label]", cta), t("home.started.continue", { n: a.l.n }));   // Lesson 1 started, not finished
      setLink(cta, lessonUrl(a.c, a.l), false);
    } else {
      setText($("[data-gh-cta-label]", cta), t("home.started.signup"));
      setLink(cta, a.kind === "lesson" ? lessonUrl(a.c, a.l) : chapterUrl(a.c, "challenge"), true);
      cta.setAttribute("data-reason", t("home.started.reason", { xp: AC.fmt.num(s.xp), title: a.kind === "lesson" ? a.l.title : a.c.title }));
    }
  }


  /** Copies the hero's main button (label, link, sign-up gate) onto another button; returns the hero. */
  function mirrorHeroCta(cta) {
    var hero = $(".ac-ghero"), src = hero && $("[data-gh-cta]", hero);
    if (!cta || !src) return null;
    setText($("[data-gh-cta-label]", cta), $("[data-gh-cta-label]", src).textContent);
    ["href", "data-action", "data-reason"].forEach(function (k) {
      var v = src.getAttribute(k);
      if (v == null) cta.removeAttribute(k); else cta.setAttribute(k, v);
    });
    return hero;
  }
  /** Phones, guests: a sticky copy of the hero's main button once the hero has scrolled out of view (canvas
      Home-Guest-C-Mobile). Hidden on desktop by CSS. (The "Ready when you are" card has its own button: Sign up free.) */
  function guestSticky() {
    var bar = $("[data-gh-sticky]"), hero = bar && mirrorHeroCta($("[data-gh-sticky-cta]", bar));
    if (!hero) return;
    function show(on) {
      bar.classList.toggle("is-on", on);
      if (on) bar.removeAttribute("inert"); else bar.setAttribute("inert", "");
    }
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (es) {
      var e = es[es.length - 1];
      // on only once the hero has gone off the top (not while it is still below the fold)
      show(!e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(hero);
  }

  /** What you'll learn on phones: "+6 more chapters" opens the full list in place. */
  function learnMore() {
    var btn = $("[data-wyl-toggle]");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var extra = $$("[data-wyl-extra]");
      extra.forEach(function (li) { li.hidden = false; });
      btn.setAttribute("aria-expanded", "true");
      btn.closest("[data-wyl-more]").hidden = true;
      var first = extra[0] && $(".ac-wyl__link", extra[0]);
      if (first) first.focus({ preventScroll: true });
    });
  }

  /** The finish-line card (phones, guests): its thumbnail is the real certificate (AC.cert) with a blank name line;
      the card opens the sample certificate sheet (never a verify page). */
  function sampleCert(path, name) {
    var d = now(), p2 = function (n) { return (n < 10 ? "0" : "") + n; };
    var m = AC.cert.model({ path: path, sample: true, d: d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()) });
    m.name = name;
    return m;
  }
  function certThumb() {
    var card = $("[data-cert-thumb]"), slot = card && $("[data-cert-slot]", card);
    if (!slot || !AC.cert) return;
    var d;
    try { d = JSON.parse(card.getAttribute("data-cert-thumb")); } catch (e) { return; }
    // the thumbnail leaves the name line blank (board Home-Guest-D-Mobile): it's the learner's certificate to come
    slot.innerHTML = AC.cert.html(sampleCert(d.path, "\u00a0"));
    var dlg = $("[data-cert-sheet]");
    if (dlg) card.addEventListener("click", function () { certSheet(dlg, card, d.path); });
  }

  /** The sample certificate sheet (.ac-pmsheet shell: bottom sheet on phones, dialog on wider screens). A modal
      <dialog>: Esc and the backdrop close it, Tab stays inside, the page doesn't scroll behind it (CSS :has), and focus
      returns to the card. Its button is the hero's "Start learning free" (mirrorHeroCta: label, link, sign-up gate). */
  function certSheet(dlg, opener, path) {
    var slot = $("[data-cert-sheet-slot]", dlg);
    if (!slot.firstChild) slot.innerHTML = AC.cert.html(sampleCert(path, t("home.certSheet.name")));
    var cta = $("[data-cert-sheet-cta]", dlg);
    mirrorHeroCta(cta);
    if (!dlg.dataset.wired) {
      dlg.dataset.wired = "1";
      var shut = function () { if (dlg.open) { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); } };
      $("[data-cert-sheet-x]", dlg).addEventListener("click", shut);
      $("[data-cert-sheet-close]", dlg).addEventListener("click", shut);
      dlg.addEventListener("click", function (e) { if (e.target === dlg) shut(); });   // backdrop (the box fills the dialog)
      cta.addEventListener("click", shut);   // then the link (or the sign-up sheet, data-action) takes over
      dlg.addEventListener("keydown", function (e) {
        if (e.key !== "Tab") return;
        var f = $$("a[href], button:not([disabled])", dlg), first = f[0], last = f[f.length - 1];
        var at = document.activeElement;
        if (e.shiftKey && (at === first || !dlg.contains(at) || at === $("#cert-sheet-t", dlg))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
      });
      dlg.addEventListener("close", function () {
        // back to the card, unless another modal (the sign-up sheet) has taken over
        if (dlg._opener && !document.querySelector("dialog[open]")) dlg._opener.focus({ preventScroll: true });
      });
    }
    dlg._opener = opener;
    if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
    dlg.scrollTop = 0;
    $("#cert-sheet-t", dlg).focus({ preventScroll: true });

  }

  /** Swipe rows with dot indicators ([data-swipe="<dots id>"]): one dot per card, the nearest card's dot is on. */
  function swipeDots() {
    $$("[data-swipe]").forEach(function (row) {
      var dots = row.getAttribute("data-swipe") && document.getElementById(row.getAttribute("data-swipe"));
      if (!dots) return;
      var cards = Array.prototype.slice.call(row.children);
      dots.innerHTML = cards.map(function () { return "<span></span>"; }).join("");
      var spans = Array.prototype.slice.call(dots.children);
      function update() {
        var left = row.getBoundingClientRect().left, best = 0, bestD = Infinity;
        var pad = parseFloat(getComputedStyle(row).paddingLeft) || 0;
        cards.forEach(function (c, i) {
          var d = Math.abs(c.getBoundingClientRect().left - left - pad);
          if (d < bestD) { bestD = d; best = i; }
        });
        // scrolled to the end: the last card is "on"
        if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 2) best = cards.length - 1;
        spans.forEach(function (sp, i) { sp.classList.toggle("is-on", i === best); });
        tabs.forEach(function (b, i) { if (i === best) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
      }
      // optional step labels above the row (How it works): tap one to scroll its card in
      var tabs = row.hasAttribute("data-swipe-tabs") && row.parentNode ? $$("[data-swipe-to]", row.parentNode) : [];
      tabs.forEach(function (b) {
        b.addEventListener("click", function () {
          var c = cards[+b.getAttribute("data-swipe-to")], pad = parseFloat(getComputedStyle(row).paddingLeft) || 0;
          if (!c) return;
          var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
          row.scrollTo({ left: row.scrollLeft + c.getBoundingClientRect().left - row.getBoundingClientRect().left - pad, behavior: reduce ? "auto" : "smooth" });
        });
      });
      var raf = 0;
      row.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; update(); }); }, { passive: true });
      window.addEventListener("resize", update);
      update();
    });
  }

  /** "What's ahead" (home): this chapter's Challenge, the next skill, the certificate. Progress itself is on the path card. */
  function pathProgress(m) {
    var cards = $$(".ac-pathprog");
    if (!cards.length) return;
    var c = m.current || m.chapters[m.chapters.length - 1];
    var ready = c.available && c.done === c.count;
    var nextSkill = (m.skills || []).filter(function (sk) { var ch = m.chapters[sk.after - 1]; return !(ch && ch.passed); })[0];
    var miles = [
      { ic: "shield", box: "", b: t("home.miles.challenge", { n: c.n }), s: c.passed ? t("home.miles.challengePassed") : ready ? t("home.miles.challengeReady") : t("home.miles.challengeOpens", { n: c.count }) },
    ];
    if (nextSkill) miles.push({ ic: "diamond", box: "", b: t("home.miles.skill", { name: nextSkill.name }), s: t("home.miles.skillAfter", { n: nextSkill.after }) });
    // the certificate: earned (opens it), ready to claim (opens the finale), or what it takes
    miles.push(m.finished ? { ic: "award", box: " ac-iconbox--gold", b: t("home.miles.cert"), s: t("home.miles.certEarned"), href: AC.url("me/certificates") }
      : m.allPassed ? { ic: "award", box: " ac-iconbox--gold", b: t("home.miles.cert"), s: t("pm.earn.ready"), href: AC.url(data().path + "/finish") }
      : { ic: "award", box: " ac-iconbox--gold", b: t("home.miles.cert"), s: t("home.miles.certText", { n: m.chapters.length }) });
    var html = miles.map(function (x) {
      var tag = x.href ? 'a href="' + esc(x.href) + '"' : "div";
      return "<" + tag + ' class="ac-mile' + (x.href ? " ac-mile--link" : "") + '"><span class="ac-iconbox' + x.box + '">' + svg(x.ic, 18) + "</span><span><b>" + esc(x.b) + "</b><span>" + esc(x.s) + "</span></span></" + (x.href ? "a" : "div") + ">";
    }).join("");
    cards.forEach(function (card) { var box = $("[data-pp-miles]", card); if (box) box.innerHTML = html; });
  }

  function weekDots() {
    var rec = AC.progress.state();
    var d = now();
    var dow = (d.getDay() + 6) % 7; // Monday first
    var out = [];
    for (var i = 0; i < 7; i++) {
      var day = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow + i, 12);
      var key = AC.progress.day(day), rd = rec.days[key] || {};
      var cls = (rd.met ? " is-met" : "") + (rd.frozen ? " is-frozen" : "") + (i === dow ? " is-today" : "");
      out.push('<li class="' + cls.trim() + '"' + (i === dow ? ' aria-current="date"' : "") + "><span></span><span>" + esc(AC.fmt.date(day, { weekday: "narrow" })) + "</span></li>");
    }
    return '<ol class="ac-week" aria-label="' + esc(t("home.streak.week")) + '">' + out.join("") + "</ol>";
  }

  function ring(done, target) {
    var r = 23, circ = 2 * Math.PI * r, pct = Math.min(1, done / target);
    var fill = pct > 0 ? '<circle class="ac-ring__fill" cx="28" cy="28" r="23" stroke-dasharray="' + (circ * pct).toFixed(1) + " " + circ.toFixed(1) + '" transform="rotate(-90 28 28)"/>' : "";
    return '<svg class="ac-ring" width="56" height="56" viewBox="0 0 56 56" role="img" aria-label="' + esc(t("home.goal.aria", { done: Math.min(done, target), target: target })) + '">' +
      '<circle class="ac-ring__track" cx="28" cy="28" r="23"/>' + fill + '<text x="28" y="33" text-anchor="middle">' + Math.min(done, target) + "/" + target + "</text></svg>";
  }

  function aside(m, s, aud) {
    var g = s.goal, lv = s.level;
    var lessonMin = (m.action.l && m.action.l.minutes) || 4;
    var goalLine = aud === "new"
      ? "<b>" + esc(t("home.goal.titleN", { n: g.target })) + "</b><span>" + esc(t("home.goal.about", { n: g.target * 5 })) + "</span>"
      : "<b>" + esc(t("home.goal.title")) + "</b><span>" + esc(g.met || g.done >= g.target ? t("home.goal.met") : t("home.goal.more", { n: g.target - g.done, min: (g.target - g.done) * lessonMin })) + "</span>";
    var streakHead = s.streak > 0
      ? '<div class="ac-day__streakhead is-on">' + svg("flame", 18) + "<b>" + esc(t("home.streak.days", { n: s.streak })) + "</b><span>" + esc(t("home.streak.best", { n: s.bestStreak })) + "</span></div>"
      : '<div class="ac-day__streakhead">' + svg("flame", 18) + "<b>" + esc(s.streakLost ? t("home.streak.lost", { n: s.streakLost }) : t("home.streak.start")) + "</b></div>";
    var today = '<section class="ac-card ac-day" aria-labelledby="today-title"><div class="ac-day__head"><h2 id="today-title" class="ac-side__title">' + esc(t("home.today")) + "</h2>" +
      '<a class="ac-link ac-small" href="' + AC.url("settings") + '">' + esc(t("home.changeGoal")) + "</a></div>" +
      '<div class="ac-day__goal">' + ring(g.done, g.target) + "<span>" + goalLine + "</span></div>" +
      '<div class="ac-day__streak">' + streakHead + weekDots() + "</div></section>";
    var rankName = t("rank." + lv.rank);
    var rank = '<a class="ac-card ac-rankmini" style="--rk:var(--ac-rank-' + lv.rank + ')" href="' + AC.url(aud === "new" ? "how-it-works" : "me") + '" aria-label="' + esc(t("home.rank.aria", { rank: rankName, n: lv.level })) + '">' +
      '<span class="ac-rankmini__look"><img src="' + AC.rankLook(lv.rank) + '" alt=""></span><span class="ac-rankmini__text"><b>' + esc(t("home.rank.line", { rank: rankName, n: lv.level })) + "</b>" +
      '<span class="ac-rankmini__bar"><span style="width:' + Math.round(lv.progress * 100) + '%"></span></span>' +
      '<span class="ac-rankmini__xp"><b>' + esc(t("common.xp", { n: s.xp })) + "</b> · " + esc(t("home.rank.toGo", { n: AC.fmt.num(lv.levelTo - s.xp), lv: lv.level + 1 })) + "</span></span></a>";
    var gym;
    if (s.gymDue) {
      gym = '<section class="ac-card ac-gymcard" aria-labelledby="gym-title"><div class="ac-gymcard__head"><span class="ac-iconbox ac-iconbox--mint">' + svg("gym", 20) + "</span>" +
        '<span><b id="gym-title">' + esc(t("nav.gym")) + "</b><span>" + esc(t("home.gym.due", { n: s.gymDue, min: Math.max(1, Math.ceil(s.gymDue * 0.4)) })) + "</span></span>" +
        '<span class="ac-gymcard__xp">' + esc(t("home.gym.xp", { n: AC.progress.XP.gym })) + "</span></div>" +
        '<a class="ac-btn ac-btn--soft ac-btn--sm" href="' + AC.url("gym") + '">' + esc(t("home.gym.cta")) + "</a></section>";
    } else {
      var any = AC.progress.gymIdeas().length > 0 || s.lessonsDone > 0;
      gym = '<a class="ac-card ac-gymcard ac-gymcard--empty ac-side--link" href="' + AC.url("gym") + '"><span class="ac-gymcard__head"><span class="ac-iconbox">' + svg("gym", 18) + "</span>" +
        "<span><b>" + esc(t("nav.gym")) + "</b><span>" + esc(any ? t("home.gym.clear") : t("home.gym.empty")) + "</span></span></span></a>";
    }
    return today + rank + gym + topMini(s);
  }

  function board(s) {
    var list = (data().sample || []).map(function (p) { return Object.assign({}, p); });
    var u = AC.auth.user();
    if (u && s.monthXp > 0) list.push({ name: u.name || t("home.top.you"), me: true, xp: s.monthXp });
    list.sort(function (a, b) { return b.xp - a.xp; });
    return list;
  }

  function topMini(s) {
    var r = resets();
    // the title is the link, with a chevron (same pattern as the Home section titles)
    var head = '<div class="ac-topmini__head"><a class="ac-titlelink ac-titlelink--sm" href="' + AC.url("leaderboard") + '"><b>' + esc(t("home.top.mini", { month: monthName() })) + "</b>" + svg("chev", 16, 2.5) + "</a></div>";
    if (!s.monthXp) {
      return '<section class="ac-card ac-topmini">' + head + "<span>" + esc(t("home.top.join", { date: r.date })) + "</span></section>";
    }
    var list = board(s);
    var i = list.findIndex(function (p) { return p.me; });
    var from = Math.max(0, Math.min(i - 1, list.length - 3));
    var rows = list.slice(from, from + 3).map(function (p, k) {
      var pos = from + k + 1;
      return '<li class="' + (p.me ? "is-me" : "") + '"><a href="' + AC.url("leaderboard") + '"><span>' + pos + "</span>" + avatar(p, "ac-ava--sm") + (p.me ? "<b>" + esc(t("home.top.you")) + "</b>" : "<span>" + esc(p.name) + "</span>") +
        "<span>" + AC.fmt.num(p.xp) + "</span></a></li>";
    }).join("");
    var above = list[i - 1];
    var foot = above ? t("home.top.toPass", { xp: AC.fmt.num(above.xp - list[i].xp + 1), name: above.name, resets: r.text }) : t("home.top.lead", { resets: r.text });
    return '<section class="ac-card ac-topmini">' + head + "<ol>" + rows + "</ol><span>" + esc(foot) + "</span></section>";
  }

  /** Guest home: Top Learners podium + list (sample board until the leaderboard service exists). */
  function topBoard() {
    var sec = $("[data-top-board]");
    if (!sec) return;
    var r = resets();
    var list = (data().sample || []).slice().sort(function (a, b) { return b.xp - a.xp; });
    var board = AC.url("leaderboard");   // every entry opens the Leaderboard
    $("[data-top-eyebrow]", sec).textContent = t("home.top.eyebrow", { month: monthName() });
    var order = [1, 0, 2];
    $("[data-top-podium]", sec).innerHTML = order.map(function (i) {
      var p = list[i];
      if (!p) return "";
      return '<a class="ac-podium ac-podium--' + (i + 1) + '" href="' + board + '"><span class="ac-podium__place">' + (i + 1) + "</span>" + avatar(p) +
        "<b>" + esc(p.name) + '</b><span class="ac-podium__h">@' + esc(p.handle) + '</span><span class="ac-podium__xp">' + esc(t("common.xp", { n: p.xp })) + "</span></a>";
    }).join("");
    function row(rank, p, me) {
      return '<li><a class="ac-top__row' + (me ? " is-me" : "") + '" href="' + board + '"><span class="ac-top__rank">' + rank + "</span>" + avatar(p) +
        '<span class="ac-top__who"><b>' + esc(p.name) + "</b><span>" + esc(p.sub || "@" + p.handle) + "</span></span>" +
        '<span class="ac-top__lv">' + esc(t("level.short", { n: p.lv })) + '</span><span class="ac-top__xp">' + AC.fmt.num(p.xp) + " <small>XP</small></span></a></li>";
    }
    var rows = list.slice(3, 10).map(function (p, k) { return row(k + 4, p, false); }).join("");
    // a signed-in learner sees their own row pinned under the top 10 (as on the legacy board)
    if (!AC.auth.isGuest()) {
      var s = AC.progress.summary();
      var me = { name: t("home.top.you"), sub: t("home.top.yourMonth"), handle: "", xp: s.monthXp, lv: s.level.level, initials: "AP", me: true };
      var pos = list.filter(function (p) { return p.xp > s.monthXp; }).length + 1;
      rows += '<li class="ac-top__mine">' + row(pos, me, true).slice(4);
    }
    $("[data-top-list]", sec).innerHTML = rows;
  }

  /** Path map: honest state (filled only to the learner's progress), drawn once when it scrolls into view,
      then Rico stands at the current chapter with a bubble. Reduced motion: the end state, no animation. */
  function snakeMap() {
    var wrap = $("[data-snake]");
    if (!wrap) return;
    var st = AC.progress.state();
    var started = AC.progress.summary().started;
    var chs = AC.index().chapters || [];
    // current chapter: the first available one whose Challenge isn't passed
    var cur = chs.filter(function (c) { return c.available && !((st.chapters[c.id] || {}).challenge || {}).passed; })[0] || chs[0];
    var nodes = $$(".ac-snake__node", wrap);
    var node = nodes.filter(function (n) { return n.getAttribute("data-ch") === cur.id; })[0] || nodes[0];
    var at = started ? parseFloat(node.getAttribute("data-at")) : 0;
    nodes.forEach(function (n) {
      var c = chs.filter(function (x) { return x.id === n.getAttribute("data-ch"); })[0];
      var passed = c && ((st.chapters[c.id] || {}).challenge || {}).passed;
      n.classList.toggle("is-done", !!(started && passed));
      n.classList.toggle("is-current", n === node);
    });
    wrap.style.setProperty("--at", at);
    // bubble
    var next = cur.lessons.filter(function (l) { return !(st.lessons[l.id] && st.lessons[l.id].done); })[0];
    var bubble = !started ? t("home.map.hereGuest", { min: (cur.lessons[0] || {}).minutes || 4 })
      : next ? t("home.map.hereMember", { n: cur.lessons.indexOf(next) + 1 }) : t("home.map.hereDone", { n: cur.n });
    $("[data-snake-bubble]", wrap).textContent = bubble;
    var rico = $("[data-snake-rico]", wrap);
    rico.style.left = node.style.left; rico.style.top = node.style.top;
    // at Chapter 1 Rico stands in the gutter before the path and points at it
    rico.classList.toggle("is-gutter", node === nodes[0]);
    rico.classList.toggle("is-bottom", parseFloat(node.style.top) > 40);
    rico.hidden = false;
    function draw() { wrap.classList.add("is-drawn"); }
    if (AC.reducedMotion() || !("IntersectionObserver" in window)) { wrap.classList.add("is-static", "is-drawn"); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { draw(); io.disconnect(); } }, { threshold: .35 });
    io.observe(wrap);
  }

  // ================================================================== merged path page (canvas-path Path1-* / ProPath-*)
  // SSR = the guest first visit. Here: chapter states (passed / now / later / soon), lesson rows (done + Review, now +
  // Start, later + "Finish Lesson N first" hover tip / sheet), hero, side column, the phone extras (sticky banners,
  // "Back to Lesson N" pill, opening scrolled to the current lesson). Pro path pages reuse the same parts.
  var MQ = window.matchMedia ? window.matchMedia("(max-width: 860px)") : { matches: false };
  function phone() { return !!MQ.matches; }
  function setText(el, s) { if (el) el.textContent = s; }
  function showEl(el, on) { if (el) el.hidden = !on; }
  function mins(n) { return t("pm.min", { n: n }); }
  function byId(m, id) { return m.chapters.filter(function (c) { return c.id === id; })[0] || null; }
  function checkSvg(size, label) { return svg("check", size, 3, label ? ' role="img" aria-label="' + esc(label) + '"' : ""); }
  function isStarted(m) { return m.lessonsDone > 0 || m.passed > 0 || m.chapters.some(function (c) { return c.lessons.some(function (l) { return l.started; }); }); }

  /** The learner's place: the chapter they are in (or, when every ready chapter is done, the next one). */
  function placeOf(m) { return m.current || m.chapters.filter(function (c) { return !c.passed; })[0] || null; }

  /** What "go on" means right now: the next lesson / Challenge, as a sheet CTA. */
  function nextCta(m) {
    var a = m.action, link = actionLink(m);
    if (link.locked) return { href: link.href, locked: true, label: t("pm.sheet.signup") };
    if (a.kind === "lesson") return { href: link.href, label: t(a.l.started ? "pm.sheet.continue" : "pm.sheet.start", { n: a.l.n }) };
    if (a.kind === "challenge") return { href: link.href, label: t("pm.sheet.challenge", { n: a.c.n }) };
    return null;
  }

  /** The path's main call to action (path hero, the All paths card): label, phone label, link, note. */
  function heroAction(m) {
    var d = data(), started = isStarted(m), a = m.action, link = actionLink(m);
    if (m.chapters.length && m.passed === m.chapters.length) {
      var claimed = !!(AC.progress.state().paths || {})[d.path];
      return claimed ? { kind: "cert", label: t("pm.cta.viewCert"), href: AC.url("me/certificates"), locked: false }
        : { kind: "claim", label: t("pm.cta.claim"), href: AC.url(d.path + "/finish"), locked: false };
    }
    if (a.kind === "lesson") {
      var left = a.l.started ? minutesLeft(a.l) : 0;
      var label = !started ? t("pm.cta.start", { l: a.l.n }) : a.c.n === 1 ? t("pm.cta.continue", { l: a.l.n }) : t("pm.cta.continueCh", { n: a.c.n, l: a.l.n });
      return { kind: "lesson", label: label, short: a.c.n === 1 || !started ? label : t("pm.cta.continueChShort", { n: a.c.n, l: a.l.n }), href: link.href, locked: link.locked,
        note: isGuest() && !started ? t("pm.note.guest") : link.locked ? t("pm.note.signup")
          : left ? t("pm.note.lessonLeft", { title: a.l.title, min: mins(left) }) : t("pm.note.lesson", { title: a.l.title, min: mins(a.l.minutes) }) };
    }
    if (a.kind === "challenge") {
      var right = a.c.last && a.c.last.length ? a.c.last.filter(function (r) { return r.correct; }).length : null;
      var retry = a.c.attempts > 0 && right != null;
      return { kind: "challenge", label: t(retry ? "pm.cta.retry" : "pm.cta.challenge", { n: a.c.n }), short: t(retry ? "pm.cta.retryShort" : "pm.cta.challengeShort"), href: link.href, locked: link.locked,
        note: retry ? t("pm.note.retry", { right: right, total: a.c.last.length }) : t("pm.note.challenge", { n: a.c.questions }) };
    }
    var place = placeOf(m);
    return { kind: "gym", label: t("pm.cta.gym"), href: AC.url("gym"), locked: false, note: place ? t("pm.note.soon", { n: place.n }) : "" };
  }

  // ---- the sheet (phones: bottom sheet; desktop: small dialog)
  function sheet(root, o) {
    var d = $("[data-pm-sheet]", root);
    if (!d) return;
    setText($("[data-sheet-eb]", d), o.eb || "");
    d.classList.toggle("is-pro", !!o.pro);
    var sub = $("[data-sheet-sub]", d);
    if (sub) { setText(sub, o.sub || ""); sub.hidden = !o.sub; }
    setText($("[data-sheet-title]", d), o.title || "");
    setText($("[data-sheet-text]", d), o.text || "");
    var a = $("[data-sheet-cta]", d);
    if (o.cta) {
      a.hidden = false;
      $("[data-sheet-cta-label]", a).textContent = o.cta.label;
      setLink(a, o.cta.href || "#", !!o.cta.locked);
      a.onclick = function (e) { if (d.open && d.close) d.close(); if (o.cta.onClick) { e.preventDefault(); o.cta.onClick(); } };
    } else a.hidden = true;
    if (!d.dataset.wired) {
      d.dataset.wired = "1";
      $("[data-sheet-close]", d).addEventListener("click", function () { d.close ? d.close() : d.removeAttribute("open"); });
      d.addEventListener("click", function (e) { if (e.target === d && d.close) d.close(); });
    }
    if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute("open", "");
  }

  /** passed | soon (no published lessons) | now (the learner's place, open) | later */
  function chState(c, place) { return c.passed ? "passed" : !c.available ? "soon" : c === place && c.unlocked ? "now" : "later"; }

  // ---- one chapter of the free path
  function pmChapter(root, m, c, i, open, place) {
    var sec = $('[data-pmc="' + c.id + '"]', root);
    if (!sec) return;
    var prev = m.chapters[i - 1];
    // chapters without published lessons say "coming soon" wherever they are on the path
    var state = chState(c, place);
    sec.classList.remove("is-now", "is-passed", "is-later", "is-soon", "is-open");
    sec.classList.add("is-" + state);
    sec.classList.toggle("is-open", !!open);
    $("[data-toggle]", sec).setAttribute("aria-expanded", open || phone() ? "true" : "false");   // phones list every chapter open
    $("[data-badge]", sec).innerHTML = state === "passed" ? checkSvg(18, t("pm.passed")) : String(c.n);
    var plain = t("pm.ch.metaPlain", { lessons: t("path.lessons", { n: c.count }), min: c.minutes });
    var started = c.done > 0 || c.lessons.some(function (l) { return l.started; });
    var eb, meta = esc(plain);
    function mx(s) { return '<span class="ac-pmc__mx"> · ' + esc(s) + "</span>"; }
    if (state === "passed") {
      eb = t("pm.ch.eb.passed", { n: c.n });
      var all = m.passed === m.chapters.length;
      meta = esc(c.available && !c.testedOut && !all ? t("pm.ch.metaPassed", { done: c.done, total: c.count, xp: AC.fmt.num(c.earned) })
        : t("pm.ch.metaPassedShort", { done: c.done, total: c.count }));
    } else if (state === "now") {
      eb = t(c.done === c.count ? "pm.ch.eb.ready" : started ? "pm.ch.eb.now" : i === 0 ? "pm.ch.eb.start" : "pm.ch.eb.next", { n: c.n });
      meta += " · " + esc(started ? t("pm.ch.doneOf", { done: c.done, total: c.count }) : t("pm.ch.notStarted"));
    } else if (state === "soon") {
      eb = t("pm.ch.eb.soon", { n: c.n });
      meta += mx(t("pm.ch.soon"));
    } else {
      eb = t("pm.ch.eb.later", { n: c.n, p: prev ? prev.n : 1 });
      meta += mx(t("pm.ch.opensAfter", { p: prev ? prev.n : 1 }));
    }
    setText($("[data-eb]", sec), eb);
    $("[data-meta]", sec).innerHTML = meta;
    showEl($("[data-end]", sec), state === "passed");
    var bar = $("[data-bar]", sec);
    if (bar) bar.style.width = (c.count ? Math.round((c.done / c.count) * 100) : 0) + "%";
    showEl($("[data-barwrap]", sec), started);

    pmRows(sec, m, c, i, state);
  }

  /** The lesson rows and the Challenge row of one chapter (path page and Pro path accordions). state: passed | now | later | soon. */
  function pmRows(sec, m, c, i, state) {
    var prev = m.chapters[i - 1];
    // lesson rows
    var nowL = state === "now" && m.action.kind === "lesson" && m.action.c === c ? m.action.l : null;
    var open2 = c.passed || (c.available && c.unlocked);
    var cta = nextCta(m);
    function hint(l) {
      if (state === "soon") return t("pm.l.hint.soon");
      if (state === "now" && nowL) return lessonHint(m, nowL);
      if (state === "now" && m.action.kind === "challenge") return t("pm.l.hint.challenge", { n: c.n });
      return t("pm.l.hint.chapter", { n: prev ? prev.n : c.n });
    }
    var rows = $$("[data-pml]", sec), filled = 0, counting = true;
    rows.forEach(function (li) {
      var n = +li.getAttribute("data-n"), l = c.lessons[n - 1];
      if (!l) return;
      var st = open2 && l.done ? "done" : l === nowL ? "now" : open2 && (c.passed || c.testedOut) ? "open" : "later";
      if (counting && st === "done") filled++; else counting = false;
      li.className = "ac-pml is-" + st;
      var dot = $("[data-dot]", li), xp = $("[data-xp]", li), go = $("[data-go]", li), meta2 = $("[data-meta]", li), mgo = $("[data-mgo]", li);
      dot.innerHTML = st === "done" ? checkSvg(16, t("chapter.end.done")) : String(n);
      li.removeAttribute("aria-current");
      var href = l.id ? lessonUrl(c, l) : null, locked = !playable(m, l);
      if (st === "done") {
        var dtxt = l.best ? t("pm.l.done", { xp: l.best }) : c.testedOut ? t("pm.l.testedOut") : t("pm.l.doneNoXp");
        xp.textContent = dtxt;
        meta2.textContent = dtxt;
        if (go) { go.innerHTML = svg("replay", 15, 2.4) + esc(t("pm.review")); go.setAttribute("aria-label", t("pm.reviewAria", { title: l.title })); setLink(go, href, locked); }
      } else {
        xp.textContent = t("pm.l.upTo", { xp: XP.lesson });
        meta2.textContent = st === "now" && l.started ? t("pm.l.metaLeft", { min: mins(minutesLeft(l)), xp: XP.lesson }) : t("pm.l.meta", { min: l.minutes, xp: XP.lesson });
        if (go) { go.textContent = t(st === "now" && l.started ? "pm.l.continue" : "pm.l.start"); go.removeAttribute("aria-label"); setLink(go, href, locked); }
        if (mgo) { $("[data-mgo-label]", mgo).textContent = t(l.started ? "pm.l.continueLesson" : "pm.l.startLesson"); setLink(mgo, href, locked); }
        if (st === "now") li.setAttribute("aria-current", "step");
      }
      if (st === "later") {
        var h = hint(l);
        setText($("[data-tip]", li), h);
        li._hint = { eb: t("pm.sheet.eb", { c: c.n, n: n, xp: XP.lesson }), title: l.title, text: h, cta: state === "soon" ? null : cta };
        $("[data-hint]", li).setAttribute("aria-label", l.title + ". " + h);
      }
    });
    // Challenge row
    var ch = $("[data-pmch]", sec);
    if (ch) {
      var cs = c.passed ? "done" : c.unlocked && c.available && c.done === c.count ? "now" : "later";
      if (counting && cs === "done") filled++;
      ch.className = "ac-pml ac-pml--ch is-" + cs;
      var cgo = $("[data-go]", ch), sub = $("[data-chsub]", ch), cmeta = $("[data-chmeta]", ch), cxp = $("[data-xp]", ch);
      var res = challengeResult(c);
      $(".ac-pml__dot", ch).innerHTML = svg("shield", 18, 2);   // the shield in every state (design); a passed one turns mint via CSS
      ch.classList.toggle("is-failed", cs === "now" && c.attempts > 0);
      if (cs === "done") {
        // like a done lesson: the result on the right, Retake in its place on hover / focus (always on touch)
        var ptxt = c.testedOut && !c.attempts ? t("pm.l.testedOut") : res ? t("pm.ch.challengePassed", { right: res.right, total: res.total }) : t("pm.ch.challengePassedPlain");
        var pxp = c.paid.challenge ? t("pm.ch.passedXp", { xp: c.paid.challenge }) : t("pm.passed");
        sub.textContent = ptxt; cmeta.textContent = pxp; cxp.textContent = pxp;
        if (cgo && c.available) {
          cgo.hidden = false;
          cgo.innerHTML = svg("replay", 15, 2.4) + esc(t("pm.l.retake"));
          cgo.setAttribute("aria-label", t("pm.l.retakeAria", { n: c.n }));
          setLink(cgo, chapterUrl(c, "challenge"), isGuest());
        } else showEl(cgo, false);
      } else if (cs === "now") {
        var failed = c.attempts > 0 && res;
        var rtxt = failed ? t("pm.ch.challengeFailed", { right: res.right, total: res.total }) : t("pm.ch.challengeReady", { n: c.questions });
        sub.textContent = rtxt; cmeta.textContent = failed ? t("pm.ch.challengeReady", { n: c.questions }) : rtxt;
        // after a failed try a pass pays half (engine): say so instead of the full "up to"
        if (cxp) cxp.textContent = t("pm.l.upTo", { xp: failed ? Math.round((c.questions * XP.q + XP.perfect) / 2) : c.questions * XP.q + XP.perfect });
        if (cgo) { cgo.hidden = false; cgo.removeAttribute("aria-label"); cgo.textContent = t(c.attempts ? "pm.l.retry" : "pm.l.start"); setLink(cgo, chapterUrl(c, "challenge"), isGuest()); }
        ch.setAttribute("aria-current", "step");
      } else {
        showEl(cgo, false);
        var chint = state === "soon" ? t("pm.l.hint.soon") : c.unlocked ? t("pm.l.hint.challengeLessons") : t("pm.l.hint.chapterCh", { n: prev ? prev.n : c.n });
        setText($("[data-tip]", ch), chint);
        ch._hint = { eb: t("pm.sheet.ebCh", { n: c.n }), title: t("pm.ch.challenge"), text: chint, cta: state === "soon" ? null : cta };
        $("[data-hint]", ch).setAttribute("aria-label", t("pm.ch.challenge") + ". " + chint);
      }
    }
    var list = $(".ac-pmc__list", sec);
    if (list) list.style.setProperty("--fill", (rows.length ? Math.min(100, (filled / rows.length) * 100) : 0) + "%");
    }

  /** Fill one path card (path.py pm_hero: the path page, All paths, the home page) with the learner's state. */
  function pmHero(hero, m) {
    if (!hero) return;
    var d = data(), started = isStarted(m), all = m.chapters.length > 0 && m.passed === m.chapters.length, place = placeOf(m);
    var cta = $("[data-pm-cta]", hero), lbl = $("[data-pm-cta-label]", hero), cta2 = $("[data-pm-cta2]", hero), note = $("[data-pm-note]", hero);
    var prog = $("[data-pm-prog]", hero), facts = $("[data-pm-facts]", hero), count = $("[data-pm-count]", hero);
    var act = heroAction(m);
    if (all) {
      hero.classList.add("is-done");
      setText($("[data-pm-eb]", hero), t("pm.eb.complete", { n: 1 }));
      setText($("[data-pm-title]", hero), t("pm.done.title", { title: d.title }));
      setText($("[data-pm-lead]", hero), t("pm.done.lead", { chapters: m.chapters.length, lessons: m.lessonsTotal }));
      showEl(facts, false); showEl(prog, true);
      setText(count, t("path.count", { ch: m.passed, total: m.chapters.length, l: m.lessonsTotal, lt: m.lessonsTotal }));
      fillSegs(hero, m);
      $$("[data-seg]", hero).forEach(function (li) { li.classList.remove("is-now"); });
      lbl.textContent = act.label;
      setLink(cta, act.href, false);
      showEl(cta2, true); showEl(note, false);
      var rico = $("[data-pm-rico]", hero);
      if (rico) rico.src = AC.rico("star");
      return;
    }
    if (started) {
      showEl(facts, false); showEl(prog, true);
      setText(count, t("pm.count", { n: place ? place.n : 1, total: m.chapters.length, l: m.lessonsDone, lt: m.lessonsTotal }));
      fillSegs(hero, m);
    }
    // phones get the short label so "Continue · Chapter 2, Lesson 3" never breaks mid-phrase
    lbl.textContent = phone() && act.short ? act.short : act.label;
    if (act.short && act.short !== act.label) cta.setAttribute("aria-label", act.label);
    setLink(cta, act.href, act.locked);
    setText(note, act.note || "");
  }

  function pmRank(card, s, all) {
    if (!card) return;
    var lv = s.level, name = t("rank." + lv.rank);
    card.style.setProperty("--rk", "var(--ac-rank-" + lv.rank + ")");
    var img = $("[data-rank-img]", card);
    img.src = AC.rankLook(lv.rank);
    img.alt = t("home.m.rankAlt", { rank: name });
    setText($("[data-rank-line]", card), t("pm.rank.line", { rank: name, n: lv.level }));
    var toRank = all && lv.nextRank;
    setText($("[data-rank-sub]", card), toRank ? t("pm.rank.toRank", { xp: AC.fmt.num(s.xp), rank: t("rank." + lv.nextRank), at: AC.fmt.num(lv.nextRankAt) })
      : t("pm.rank.toLevel", { xp: AC.fmt.num(s.xp), left: AC.fmt.num(Math.max(0, lv.levelTo - s.xp)), next: lv.level + 1 }));
    $("[data-rank-bar]", card).style.width = Math.round(Math.min(1, toRank ? s.xp / lv.nextRankAt : lv.progress) * 100) + "%";
    setText($("[data-rank-streak]", card), s.streak > 0 ? t("pm.rank.streak", { n: s.streak }) : t("pm.rank.noStreak"));
    setText($("[data-rank-today]", card), all ? t("pm.rank.complete") : t("pm.rank.today", { done: Math.min(s.goal.done, s.goal.target), target: s.goal.target }));
    card.hidden = false;
  }

  /** Side column cards that follow the focused chapter (practice tool, key terms). */
  function pmFocus(root, id) {
    $$("[data-pm-practice]", root).forEach(function (el) { el.hidden = el.getAttribute("data-pm-practice") !== id; });
    $$("[data-pm-terms]", root).forEach(function (el) { el.hidden = el.getAttribute("data-pm-terms") !== id; });
  }

  function pmStats(box, s) {
    if (!box || isGuest()) return;
    box.innerHTML = '<span class="ac-mstats__streak">' + svg("flame", 14, 2.2) + esc(t("home.m.days", { n: s.streak })) + '</span><span class="ac-mstats__xp">' + esc(t("common.xp", { n: s.xp })) + "</span>" +
      '<span class="ac-mstats__goal">' + esc(t("home.m.today", { done: Math.min(s.goal.done, s.goal.target), target: s.goal.target })) + "</span>" +
      '<a class="ac-mstats__rank" href="' + AC.url("me") + '" style="--rk:var(--ac-rank-' + s.level.rank + ')"><img src="' + AC.rankLook(s.level.rank) + '" alt="' + esc(t("home.m.rankAlt", { rank: t("rank." + s.level.rank) })) + '"></a>';
  }

  /** Accordion, hints, sheet, sticky offset, the "Back to Lesson N" pill. */
  function pmWire(root, opts) {
    var nav = document.querySelector(".topnav");
    function stick() { root.style.setProperty("--pm-stick", (nav ? Math.round(nav.getBoundingClientRect().height) : 0) + "px"); }
    stick();
    window.addEventListener("resize", stick);
    root.addEventListener("click", function (e) {
      var tg = e.target.closest("[data-toggle]");
      if (tg && root.contains(tg)) {
        var sec = tg.closest("[data-pmc]");
        if (opts.allOpen && phone()) return;
        if (!sec) return;
        var on = !sec.classList.contains("is-open");
        sec.classList.toggle("is-open", on);
        $("[data-toggle]", sec).setAttribute("aria-expanded", on ? "true" : "false");
        if (on && opts.onOpen) opts.onOpen(sec);
        return;
      }
      var hb = e.target.closest("[data-hint]");
      if (hb) { var li = hb.closest(".ac-pml"); if (li && li._hint) sheet(root, li._hint); return; }
      // a finished lesson: the whole row opens it (the Review button stays the keyboard / hover target)
      var done = e.target.closest("[data-pml].is-done");
      if (done && root.contains(done) && !e.target.closest("a, button")) { var go = $("[data-go]", done); if (go && go.getAttribute("href")) go.click(); }
    });
  }

  function pmBack(root) {
    var pill = $("[data-pm-back]", root);
    var row = $(".ac-pmc .ac-pml.is-now", root);
    if (!pill || !row) return;
    var n = row.getAttribute("data-n");
    setText($("[data-pm-back-label]", pill), row.classList.contains("ac-pml--ch") ? t("pm.back.challenge") : t("pm.back.lesson", { n: n }));
    // shown while the current lesson is off screen (scroll listener: cheap, one rect read)
    function check() {
      var r = row.getBoundingClientRect(), top = parseInt(getComputedStyle(root).getPropertyValue("--pm-stick"), 10) || 0;
      var off = r.bottom < top + 40 || r.top > window.innerHeight - 80;
      pill.hidden = !(phone() && off);
      pill.classList.toggle("is-below", r.top > 0);
    }
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    check();
    pill.addEventListener("click", function (ev) {
      ev.preventDefault();
      row.scrollIntoView({ block: "center", behavior: AC.reducedMotion() ? "auto" : "smooth" });
    });
  }

  function pathPage() {
    var root = $(".ac-pm--free[data-pm]");
    if (!root) return;
    var m = model(), s = AC.progress.summary();
    var all = m.chapters.length > 0 && m.passed === m.chapters.length;
    var openId = root.getAttribute("data-open") || "";
    var place = placeOf(m);
    var openC = openId ? byId(m, openId) : all ? null : place;
    m.chapters.forEach(function (c, i) { pmChapter(root, m, c, i, c === openC, place); });
    pmHero($("[data-pm-hero]", root), m);
    if (!isGuest()) pmRank($("[data-pm-rank]", root), s, all);
    var earnT = $("[data-earn-title]", root);
    if (all && earnT && heroAction(m).kind === "claim") earnT.textContent = t("pm.earn.ready");
    if (all && earnT && heroAction(m).kind === "cert") {
      // finished: the card says what was earned and opens the certificate
      earnT.textContent = t("pm.earn.earned");
      var earnL = $("[data-earn-link]", root);
      if (earnL) { earnL.setAttribute("href", AC.url("me/certificates")); if (earnL.firstChild) earnL.firstChild.textContent = t("pm.cta.viewCert"); }
      var earnC = $("[data-pm-earn]", root); if (earnC) earnC.classList.add("is-earned");
    }
    var focus = openC || place;
    pmFocus(root, all || !focus ? "" : focus.id);
    showEl($("[data-pm-upnext]", root), all);
    pmStats($("[data-pm-mstats]", root), s);
    pmWire(root, {
      allOpen: true,
      onOpen: function (sec) { if (!all && $('[data-pm-practice="' + sec.getAttribute("data-pmc") + '"], [data-pm-terms="' + sec.getAttribute("data-pmc") + '"]', root)) pmFocus(root, sec.getAttribute("data-pmc")); },
    });
    pmBack(root);
    // a chapter route (/learn-to-trade/<chapter>) opens with that chapter in view just below the sticky topnav (desktop: the
    // chapter expanded; phones: the full-scroll path); phones on the path route open scrolled to the current lesson
    if (!location.hash) {
      var stickPx = parseInt(getComputedStyle(root).getPropertyValue("--pm-stick"), 10) || 0;
      var target = openId ? $('[data-pmc="' + openId + '"]', root) : phone() && isStarted(m) ? $(".ac-pml.is-now", root) : null;
      if (target) {
        var r = target.getBoundingClientRect();
        if (openId && (openId !== (m.chapters[0] || {}).id || r.top > window.innerHeight * 0.45)) window.scrollTo(0, window.pageYOffset + r.top - stickPx - (phone() ? 8 : 16));
        else if (!openId && r.bottom > window.innerHeight - 90) window.scrollTo(0, window.pageYOffset + r.top - window.innerHeight * 0.3);
      }
    }
  }


  // ---------------------------------------------------------------- Pro paths: coming soon
  // No Pro lesson content is published yet, so every Pro path is "coming soon": browsable chapters, and the upgrade prompts only for people without Pro. Pro members (AC.auth.isPro())
  // see "Included in your plan" and nothing to upgrade.

  /** Pro members: swap [data-pro-text] copy and hide [data-pro-hide] (Upgrade band, upgrade boxes and buttons). */
  function proSwap(root) {
    if (!AC.auth.isPro()) return;
    $$("[data-pro-text]", root).forEach(function (el) { el.textContent = el.getAttribute("data-pro-text"); });
    $$("[data-pro-hide]", root).forEach(function (el) { el.hidden = true; });
  }

  function proPage() {
    var root = $(".ac-pm--pro[data-propath]");
    if (!root) return;
    var pro = AC.auth.isPro(), guest = isGuest();
    proSwap(root);
    var s = AC.progress.summary();
    if (!guest) pmRank($("[data-pm-rank]", root), s, false);
    pmStats($("[data-pm-mstats]", root), s);
    if (root.classList.contains("is-soon")) return;
    var secs = $$("[data-pmc]", root);
    // Pro members: chapters are theirs once published, so no PRO padlocks
    if (pro) secs.forEach(function (sec) { sec.classList.remove("is-pro"); });
    secs.forEach(function (sec) {
      var cn = sec.getAttribute("data-n");
      $$(".ac-pml", sec).forEach(function (li) {
        var isCh = li.classList.contains("ac-pml--ch"), n = li.getAttribute("data-n"), min = li.getAttribute("data-min");
        var title = $(".ac-pml__title", li).textContent;
        setText($("[data-tip]", li), t(pro ? "pm.pro.lessonHintMember" : "pm.pro.lessonHint"));
        var sub = isCh ? t("pm.sheet.ebCh", { n: cn }) : t("pm.pro.sheetEbMember", { c: cn, l: n, min: min });
        li._hint = pro
          ? { eb: sub, title: title, text: t("pm.pro.sheetLessonMember"), cta: null }
          : { pro: true, eb: t("pm.pro.sheetEb"), sub: sub, title: title, text: t(guest ? "pm.pro.sheetLessonGuest" : "pm.pro.sheetLesson"), cta: { href: AC.url("pro"), label: t("pm.sheet.upgrade") } };
        $("[data-hint]", li).setAttribute("aria-label", title + ". " + t(pro ? "pm.pro.lessonHintMember" : "pm.pro.lessonHint"));
      });
    });
    pmWire(root, {
      onOpen: function (sec) { if ($('[data-pm-practice="' + sec.getAttribute("data-pmc") + '"]', root)) pmFocus(root, sec.getAttribute("data-pmc")); },
    });
  }

  // ------------------------------------------------------------------ paths catalog
  function pathsPage() {
    var root = $("[data-paths-page]");
    if (!root) return;
    proSwap(root);
    // the featured Trading Foundations card is the path card (pm_hero): the same states as on the path page
    var m = model(), started = isStarted(m), all = m.chapters.length > 0 && m.passed === m.chapters.length;
    var feat = $("[data-feat]", root);
    pmHero(feat, m);
    // a Pro path is in progress once it has a started chapter (records keyed "<path>/<chapter>")
    var rec = AC.progress.state();
    var proStarted = $$('.ac-pcard[data-path]', root).filter(function (card) {
      var id = card.getAttribute("data-path") + "/";
      return Object.keys(rec.chapters || {}).some(function (k) { return k.indexOf(id) === 0; });
    });
    var tfOn = started && !all;
    function apply(f) {
      $$(".ac-filter", root).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-filter") === f ? "true" : "false"); });
      var pro = $('.ac-prosec[data-tier="pro"]', root), empty = $("[data-paths-empty]", root);
      feat.hidden = f === "pro" || (f === "progress" && !tfOn);
      $$(".ac-pcard[data-path]", root).forEach(function (card) { card.hidden = f === "progress" && proStarted.indexOf(card) < 0; });
      pro.hidden = f === "free" || (f === "progress" && !proStarted.length);
      empty.hidden = !(f === "progress" && !tfOn && !proStarted.length);
    }
    root.addEventListener("click", function (e) { var b = e.target.closest(".ac-filter"); if (b) apply(b.getAttribute("data-filter")); });
  }

  /** Home: the Pro path cards (Pro member copy). */
  function proCards() {
    var root = $("[data-home]");
    if (!root) return;
    proSwap(root);
  }
  // ------------------------------------------------------------------ setup
  function radios(root, onChange) {
    $$("[role=radiogroup]", root).forEach(function (g) {
      var opts = $$("[role=radio]", g);
      function pick(b, focus) {
        opts.forEach(function (o) { var on = o === b; o.setAttribute("aria-checked", on ? "true" : "false"); o.tabIndex = on ? 0 : -1; });
        if (focus) b.focus();
        onChange(g, b);
      }
      g.addEventListener("click", function (e) { var b = e.target.closest("[role=radio]"); if (b) pick(b); });
      g.addEventListener("keydown", function (e) {
        var b = e.target.closest("[role=radio]");
        if (!b) return;
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        pick(opts[(opts.indexOf(b) + d + opts.length) % opts.length], true);
      });
    });
  }
  function setup() {
    var root = $("[data-setup]");
    if (!root || isGuest()) return;   // guests see the sign-up card (SSR [data-show="guest"])
    var st = { exp: "never", goal: "regular" };
    var saved = AC.progress.settings();
    if (saved.experience) st.exp = saved.experience;
    if (AC.progress.state().onboarded && saved.goal) st.goal = saved.goal;
    Object.keys(st).forEach(function (k) {
      var g = $('[data-group="' + k + '"]', root);
      if (!g) return;
      $$("[role=radio]", g).forEach(function (o) { var on = o.getAttribute("data-value") === st[k]; o.setAttribute("aria-checked", on ? "true" : "false"); o.tabIndex = on ? 0 : -1; });
    });
    // anyone who has traded before is pointed at the placement quiz (here and on the new-learner home)
    function sync() {
      var knows = st.exp !== "never";
      $("[data-suggest]", root).hidden = !knows;
      $("[data-suggest-link]", root).hidden = knows;
      if (knows) $("[data-suggest-text]", root).textContent = t("setup.suggest." + st.exp);
    }
    radios(root, function (g, b) { st[g.getAttribute("data-group")] = b.getAttribute("data-value"); sync(); });
    sync();
    var m = model(), a = m.action;
    var next = $('[data-go="next"]', root);
    if (a.kind === "lesson") {
      setLink(next, lessonUrl(a.c, a.l), !playable(m, a.l));
      $("[data-next-label]", root).textContent = m.lessonsDone ? t("setup.cta.continue", { n: a.l.n }) : t("setup.cta.start", { n: a.c.n });
      $("[data-next-sub]", root).textContent = t("setup.nextSubLesson", { n: a.c.n, l: a.l.n, title: a.l.title });
    }
    $$("[data-go]", root).forEach(function (el) {
      el.addEventListener("click", function () {
        AC.progress.settings({ experience: st.exp });
        AC.progress.setOnboarded(st.goal);
      });
    });
  }

  // ------------------------------------------------------------------ placement
  function placement() {
    var root = $("[data-placement]");
    if (!root) return;
    var qs = AC.data("ac-placement") || [];
    if (!qs.length) return;
    var i = 0, pick = null, answers = [];
    var quiz = $("[data-quiz]", root), result = $("[data-result]", root), next = $("[data-next]", root), prevBox = $("[data-prev]", root);
    function chOf(q) { return data().chapters.filter(function (c) { return c.id === q.chapter; })[0] || { n: q.n, short: q.short }; }
    // taken before: show that result first, with Retake (a retake never undoes a tested-out chapter)
    var prev = AC.progress.state().placement;
    if (prev && prevBox) {
      var outN = (prev.testedOut || []).length;
      $("[data-prev-text]", prevBox).textContent = (prev.d ? t("placement.prev.text", { date: AC.fmt.date(prev.d + "T12:00:00"), right: prev.right, total: prev.total }) + " " : "") +
        (outN ? t("placement.prev.out", { n: outN }) : t("placement.prev.none"));
      prevBox.hidden = false; quiz.hidden = true;
      $("[data-retake]", prevBox).addEventListener("click", function () {
        prevBox.hidden = true; quiz.hidden = false;
        var first = $("[role=radio]", quiz); if (first) first.focus();
      });
    }
    function render() {
      var q = qs[i];
      $("[data-dots]", root).innerHTML = qs.map(function (_, k) { return '<span class="' + (k < i ? "is-done" : k === i ? "is-now" : "") + '"></span>'; }).join("");
      var dots = $("[data-dots]", root);
      dots.setAttribute("aria-valuenow", String(i + 1));
      dots.setAttribute("aria-label", t("placement.qAria", { i: i + 1, n: qs.length }));
      $("[data-count]", root).textContent = t("placement.count", { i: i + 1, n: qs.length });
      $("[data-q-chapter]", root).textContent = t("placement.chapter", { n: q.n, short: q.short });
      $("[data-q]", root).innerHTML = AC.rich(q.q);
      pick = null;
      $("[data-opts]", root).innerHTML = q.options.map(function (o, k) {
        return '<button type="button" role="radio" class="ac-pl__opt" aria-checked="false" tabindex="' + (k ? -1 : 0) + '" data-value="' + k + '"><span class="ac-pl__key">' + "ABCD".charAt(k) + "</span><span>" + AC.rich(o) + "</span></button>";
      }).join("");
      next.setAttribute("aria-disabled", "true");
      next.textContent = t(i === qs.length - 1 ? "placement.finish" : "placement.next");
      $$("[data-cover]", root).forEach(function (li) {
        var id = li.getAttribute("data-cover"), stEl = $("[data-st]", li);
        var idxs = qs.map(function (x, k) { return x.chapter === id ? k : -1; }).filter(function (k) { return k >= 0; });
        var k = idxs.indexOf(i) >= 0 ? "now" : idxs.every(function (x) { return x < i; }) ? "answered" : "not";
        stEl.textContent = t("placement.st." + k);
        stEl.className = "ac-pl__st" + (k === "now" ? " is-now" : k === "answered" ? " is-done" : "");
      });
    }
    radios(quiz, function (g, b) { pick = +b.getAttribute("data-value"); next.setAttribute("aria-disabled", "false"); });
    function advance(val) {
      answers[i] = val;
      if (i < qs.length - 1) { i++; render(); var first = $("[role=radio]", quiz); if (first) first.focus(); return; }
      finish();
    }
    next.addEventListener("click", function () { if (pick == null) return; advance(pick); });
    $("[data-dunno]", root).addEventListener("click", function () { advance(null); });

    function finish() {
      var per = {}, order = [];
      qs.forEach(function (q, k) {
        if (!per[q.chapter]) { per[q.chapter] = { right: 0, total: 0, missed: [] }; order.push(q.chapter); }
        var ok = answers[k] === q.answer;
        per[q.chapter].total++;
        if (ok) per[q.chapter].right++; else if (q.idea) per[q.chapter].missed.push(q.idea);
      });
      var out = order.filter(function (id) { return per[id].right === per[id].total; });
      // test out (a chapter already passed stays as it is); misses everywhere else go to Rico's Gym
      out.forEach(function (id) { if (!(AC.progress.chapter(id).challenge || {}).passed) AC.progress.testOut(id); });
      var gym = 0;
      order.forEach(function (id) {
        if (out.indexOf(id) >= 0) return;
        per[id].missed.forEach(function (idea) { AC.progress.gymAnswer(idea, false); gym++; });
      });
      var m = model();
      var start = m.chapters.filter(function (c) { return c.available && !c.passed; })[0] || null;
      var res = AC.progress.setPlacement({ d: AC.progress.day(), testedOut: out, start: start ? start.id : null, score: per,
        right: qs.filter(function (q, k) { return answers[k] === q.answer; }).length, total: qs.length });
      // result
      quiz.hidden = true; result.hidden = false;
      var skip = $("[data-skip]", root);
      if (skip) skip.hidden = true;
      $$("[data-cover] [data-st]", root).forEach(function (el) { el.textContent = t("placement.st.answered"); el.className = "ac-pl__st is-done"; });
      $("[data-r-title]", root).textContent = start ? t("placement.result.start", { n: start.n, title: start.title }) : t("placement.result.all");
      $("[data-r-text]", root).textContent = (!start ? t("placement.result.allText") : out.length ? t("placement.result.some", { n: out.length }) : t("placement.result.none")) +
        (res && res.xp ? " " + t("placement.result.bonus", { xp: res.xp }) : "");
      $("[data-r-rico]", root).src = AC.rico(out.length ? "celebrate" : "thumbs");
      $("[data-r-rows]", root).innerHTML = order.map(function (id) {
        var c = chOf(qs.filter(function (q) { return q.chapter === id; })[0]), r = per[id];
        var tested = out.indexOf(id) >= 0, isStart = start && start.id === id;
        var chip = tested ? '<span class="ac-chip ac-chip--mint ac-chip--xs">' + esc(t("placement.row.out")) + "</span>"
          : isStart ? '<span class="ac-chip ac-chip--gold ac-chip--xs">' + esc(t("placement.row.start")) + "</span>"
          : '<span class="ac-chip ac-chip--xs">' + esc(t("placement.row.later")) + "</span>";
        return '<li class="' + (isStart ? "is-start" : "") + '"><span class="ac-iconbox' + (tested ? " ac-iconbox--mint" : "") + '">' + (tested ? svg("check", 18, 3) : c.n) + "</span>" +
          "<span><b>" + esc(t("placement.chapter", { n: c.n, short: c.short })) + "</b><span>" + esc(t("placement.row.score", { right: r.right, total: r.total })) + "</span></span>" + chip + "</li>";
      }).join("");
      var g = $("[data-r-gym]", root);
      if (gym) { g.textContent = t("placement.result.gym", { n: gym }); g.hidden = false; }
      var cta = $("[data-r-cta]", root);
      if (start) {
        var l = start.lessons[0], locked = !playable(m, l);
        setLink(cta, lessonUrl(start, l), locked);
        cta.textContent = t(locked ? "placement.result.ctaSignup" : "placement.result.cta", { n: start.n });
      } else {
        setLink(cta, AC.url("gym"), false);
        cta.textContent = t("placement.result.ctaGym");
      }
      result.focus();
    }
    render();
  }

  // ------------------------------------------------------------------ boot
  AC.ready(function () {
    XP = xpRules();
    home();
    proCards();
    pathPage();
    pathsPage();
    proPage();
    setup();
    placement();
  });
})();
