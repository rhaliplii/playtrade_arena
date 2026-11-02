/* Profit.com Academy · guest onboarding (canvas Onb-01…06).
   - Guest home hero (home.py): always "Take the quiz" → /academy/start + "Start learning free" (→ the Trading Foundations path page); the quiz page opens where the
     guest is (question 1, the next question, or the saved result).
   - /academy/start: 5 questions, one per screen. Tapping an option answers it (no Check button); Rico's feedback right
     away (right: "Good call · +10 XP"; not right: the idea + "You'll learn this in Chapter N"; the right option is never
     shown). Exit asks first; answers are kept and the next visit resumes. A finished quiz opens on its result:
     score, the 5 topics with their chapter, XP "waiting", Continue with Google / Apple, Use email instead, Not now.
   - /academy/welcome: after sign-up. The saved result + welcome bonus (credited by AC.progress.onbCredit in
     AC.auth's startSession), level, Day 1 streak, the chapters the questions came from, Start Lesson 1, See the full path.
   Prototype sign-in: Google / Apple are simulated (an instant sign-in with a demo account, no OAuth). Members are never
   offered the quiz. The data lives in the progress record (rec.onboarding), see engine.js. */
(function () {
  "use strict";
  var AC = window.AC;
  var esc = function (s) { return AC.esc(s); };
  var t = function (k, v) { return AC.t(k, v); };
  var P = function () { return AC.progress; };
  var CHEV = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  var TICK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17 19 7"/></svg>';
  var FLAME = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path class="ac-onb-flame" d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z"/></svg>';
  // brand marks (colours are tokens: --ac-google-*, --ac-apple-*)
  var GOOGLE = '<svg class="ac-onb-g" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path class="ac-onb-g__y" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path class="ac-onb-g__r" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path class="ac-onb-g__g" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path class="ac-onb-g__b" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  var APPLE = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.5 1.3-.1 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-3.1-4.2zM13.9 4.9c.7-.8 1.1-1.9 1-3-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.6 2.9-1.4z"/></svg>';

  function D() { return AC.data("ac-onb"); }
  function chapterN(n) { return (AC.index().chapters || []).filter(function (c) { return c.n === n; })[0] || { n: n, short: "", title: "" }; }
  function firstName() { var u = AC.auth.user(); return String((u && u.name) || "").trim().split(/\s+/)[0] || ""; }

  // ---------------------------------------------------------------- sign-in (prototype: Google / Apple simulated)
  var DEMO = { google: "jordan.lee@gmail.com", apple: "jordan.lee@icloud.com" };
  function saving(email, xp) {
    var el = AC.h('<div class="ac-onbsave" role="status" aria-live="polite"><span class="ac-onbsave__spin" aria-hidden="true"></span>' +
      "<b>" + esc(AC.reducedMotion() ? t("onb.savingPlain") : t("onb.saving", { n: AC.fmt.num(xp) })) + "</b><span>" + esc(t("onb.savingAs", { email: email })) + "</span></div>");
    document.body.appendChild(el);
  }
  /** Google / Apple: one tap → signed in (a new account, or the one made with that address on this device), the result
      and XP saved (startSession → onbCredit), then the welcome screen. */
  function signIn(provider) {
    var email = DEMO[provider] || DEMO.google, st = P().onboarding();
    saving(email, st.xp + st.bonus);
    AC.auth.logIn(email);
    AC.analytics.track("signup_from_academy", { from: "onboarding", provider: provider });
    setTimeout(function () { location.href = AC.url("welcome"); }, AC.reducedMotion() ? 100 : 700);
  }
  function emailSignUp() { AC.signupSheet(t("onb.auth.reason"), { next: AC.url("welcome") }); }
  function authButtons() {
    return '<button type="button" class="ac-btn ac-btn--lg ac-onb-auth ac-onb-auth--google" data-onb-auth="google">' + GOOGLE + "<span>" + esc(t("onb.auth.google")) + "</span></button>" +
      '<button type="button" class="ac-btn ac-btn--lg ac-onb-auth ac-onb-auth--apple" data-onb-auth="apple">' + APPLE + "<span>" + esc(t("onb.auth.apple")) + "</span></button>";
  }
  function bindAuth(root) {
    AC.$$("[data-onb-auth]", root).forEach(function (b) { b.addEventListener("click", function () { signIn(b.getAttribute("data-onb-auth")); }); });
    AC.$$("[data-onb-email]", root).forEach(function (b) { b.addEventListener("click", emailSignUp); });
  }

  // ---------------------------------------------------------------- the question charts (boards 02a / 02b)
  /** One chart as drawn on the board: candles ([open, high, low, close] measured up from the bottom of the viewBox) and
      marks (text, line, rect, units). Colours are tones → site tokens; text roles → the site's chart type scale (onboarding.css). */
  function chartSvg(s, cls) {
    var W = s.view[0], H = s.view[1], out = "", under = "", c = s.candles;
    var r = function (n) { return Math.round(n * 10) / 10; };
    if (c) c.ohlc.forEach(function (v, k) {
      var x = r(c.x0 + c.step * k), up = v[3] >= v[0], top = r(H - Math.max(v[0], v[3])), h = r(Math.max(1, Math.abs(v[3] - v[0])));
      var tn = up ? "up" : "down";
      out += '<line class="is-' + tn + '" x1="' + x + '" x2="' + x + '" y1="' + r(H - v[1]) + '" y2="' + r(H - v[2]) + '" stroke-width="' + c.wick + '" stroke-linecap="round"/>' +
        '<rect class="is-' + tn + '" x="' + r(x - c.body / 2) + '" y="' + top + '" width="' + c.body + '" height="' + h + '" rx="' + (c.rx || 2) + '"/>';
    });
    (s.marks || []).forEach(function (m) {
      var tn = ' class="is-' + (m.tone || "muted") + '"', top = out;
      if (m.under) out = under;   // guide lines go behind the candles
      if (m.t === "text") out += '<text class="is-' + (m.tone || "muted") + " ac-onbch__t--" + (m.role || "label") + '" x="' + m.x + '" y="' + m.y + '"' + (m.anchor ? ' text-anchor="' + m.anchor + '"' : "") + ">" + esc(m.text) + "</text>";
      else if (m.t === "line") out += "<line" + tn + ' x1="' + m.x1 + '" y1="' + m.y1 + '" x2="' + m.x2 + '" y2="' + m.y2 + '" stroke-width="' + (m.w || 1) + '"' + (m.dash ? ' stroke-dasharray="' + m.dash + '"' : "") + "/>";
      else if (m.t === "rect") out += "<rect" + tn + ' x="' + m.x + '" y="' + m.y + '" width="' + m.w + '" height="' + m.h + '" rx="' + (m.rx || 0) + '"/>';
      else if (m.t === "units") for (var i = 0; i < m.n; i++) out += "<rect" + tn + ' x="' + r(m.x0 + m.step * i) + '" y="' + m.y + '" width="' + m.w + '" height="' + m.h + '" rx="3"/>';
      if (m.under) { under = out; out = top; }
    });
    out = under + out;
    // drawn 1:1 (width = viewBox width, never wider) so the text keeps the site's sizes
    return '<svg class="ac-onbch__svg ' + cls + '" width="' + W + '" viewBox="0 0 ' + W + " " + H + '" aria-hidden="true" focusable="false">' + out + "</svg>";
  }
  function chart(ch) {
    return '<div class="ac-onbch" role="img" aria-label="' + esc(ch.label) + '">' + chartSvg(ch.d, "ac-onbch__d") + chartSvg(ch.m, "ac-onbch__m") + "</div>";
  }

  // ---------------------------------------------------------------- /academy/start: the onboarding quiz + result
  function startPage() {
    var host = document.getElementById("acPlayer"), d = D();
    if (!host || !d || !AC.cards) return;
    var st = P().onboarding();
    // members are never offered it: a result taken as a guest is on the welcome screen
    if (!AC.auth.isGuest()) { location.replace(st.state === "credited" ? AC.url("welcome") : AC.url("")); return; }
    var Q = d.questions, n = Q.length, qi = 0, onCta = null, onResult = false, keyCtl = null;
    // keys: A–C / 1–3 pick an option, Enter presses the main button (AC.cards.frame)
    var F = AC.cards.frame({ close: AC.url(""), closeLabel: t("onb.exit"), count: true, segments: n, sheetDock: true, keys: function () { return keyCtl; } });
    F.el.classList.add("ac-pl--onb");
    host.innerHTML = "";
    host.appendChild(F.el);
    F.cta.addEventListener("click", function () { if (!F.cta.disabled && onCta) onCta(); });
    // Exit: asks first while questions are open (answers are kept either way); the result just leaves
    var close = AC.$(".ac-pl__close", F.el);
    function askExit() {
      AC.confirmSheet({ title: t("onb.exit.title"), text: t("onb.exit.text"), ok: t("onb.exit.leave"), cancel: t("onb.exit.stay"), onOk: function () { location.href = AC.url(""); } });
    }
    close.addEventListener("click", function (e) { if (onResult) return; e.preventDefault(); askExit(); });
    window.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || onResult || document.querySelector("dialog[open]") || document.querySelector(".ac-pop")) return;
      e.preventDefault(); askExit();
    }, true);

    function question(i) {
      qi = i;
      var q = Q[i], answered = false;
      F.clear(); F.layout("card"); F.setProgress(i, false);
      F.cta.hidden = true; onCta = null;
      var el = AC.h('<section class="ac-c ac-onbq" aria-labelledby="onbQ">' +
        '<div class="ac-eb ac-tone--primary"><span class="ac-eb__label">' + esc(t("onb.q.eyebrow", { area: q.area, n: i + 1 })) + "</span></div>" +
        '<h1 class="ac-c__title ac-onbq__title" id="onbQ">' + esc(q.q) + "</h1>" +
        (q.chart ? chart(q.chart) : "") +
        AC.cards.options(q.options.map(function (o) { return { text: o }; })) + "</section>");
      var group = AC.$(".ac-opts", el);
      keyCtl = { optionCount: q.options.length, answered: false, pick: function (k) { var b = AC.$('.ac-opt[data-i="' + k + '"]', el); if (b) b.click(); } };
      group.setAttribute("aria-labelledby", "onbQ");
      F.main.appendChild(el);
      // Rico only on question 1, desktop side column (boards 02a / 02b)
      F.setRico(null, i === 0 ? AC.h('<div class="ac-side ac-onbq__rico">' + AC.cards.bubble(t("onb.q.rico"), "present", true) + "</div>") : null);
      AC.cards.bindOptions(el, function (pick) {
        if (answered) return;
        answered = true; keyCtl.answered = true;
        var ok = pick === q.answer, res = P().onbAnswer(i, pick, ok);
        // only the learner's pick is marked (green when right, amber when not); the right option is never shown
        group.classList.add("is-locked");
        AC.$$(".ac-opt", group).forEach(function (b) {
          var k = +b.dataset.i;
          b.classList.remove("is-sel"); b.removeAttribute("aria-pressed"); b.setAttribute("aria-disabled", "true");
          if (k === pick) {
            b.classList.add(ok ? "is-right" : "is-mine");
            var note = AC.$(".ac-opt__note", b);
            note.innerHTML = ok ? '<span aria-hidden="true">✓</span> ' + esc(t("onb.fb.right")) : esc(t("onb.fb.yours"));
            note.hidden = false;
          } else b.classList.add("is-dim");
        });
        var ch = chapterN(q.chapter);
        var sheet = AC.cards.sheet({ ok: ok, title: t(ok ? "onb.fb.right" : "onb.fb.miss"), text: q.why, xp: ok ? (res.xp || P().ONB.perRight) : 0 });
        sheet.classList.add("ac-onbfb");
        var rico = AC.$(".ac-sheet__rico", sheet); if (rico) rico.src = AC.rico(ok ? "thumbs" : "hero");   // board 03: thumbs up / holding his book
        if (!ok) AC.$(".ac-sheet__body", sheet).appendChild(AC.h('<p class="ac-onbfb__ch">' + esc(t("onb.fb.chapter", { n: ch.n, short: ch.short })) + "</p>"));
        if (AC.reducedMotion()) sheet.classList.add("ac-onbfb--still");
        var side = AC.$(".ac-onbq__rico", F.el); if (side) side.remove();
        F.setRico(null, null);
        F.placeSheet(sheet);
        F.setProgress(i, true);
        var last = i + 1 >= n;
        F.cta.hidden = false;
        F.setCta({ label: t(last ? "onb.fb.result" : "onb.fb.next"), arrow: true });
        onCta = function () { if (last) { P().onbFinish(); result(); } else question(i + 1); };
        sheet.focus({ preventScroll: true });
      });
      if (i) { var h = AC.$("#onbQ", el); h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    }

    function result() {
      onResult = true; keyCtl = null;
      var s = P().onboarding();
      F.clear(); F.layout("results");
      F.cta.hidden = true; onCta = null;
      F.setProgress(n - 1, true);
      AC.$$(".ac-pl__prog span", F.el).forEach(function (x) { x.className = "is-done"; });
      var rows = Q.map(function (q, i) {
        var ok = s.answers[i] && s.answers[i].correct;
        return '<li class="' + (ok ? "is-right" : "is-learn") + '"><span class="ac-onbr__ic" aria-hidden="true">' + (ok ? TICK : "") + "</span>" +
          '<span class="ac-onbr__topic">' + esc(q.topic) + '<span class="ac-visually-hidden"> · ' + esc(t(ok ? "onb.r.right" : "onb.r.learn")) + "</span></span>" +
          '<span class="ac-onbr__ch">' + esc(t("onb.r.chapter", { n: q.chapter })) + "</span></li>";
      }).join("");
      F.main.innerHTML = '<section class="ac-onbr" aria-labelledby="onbR">' +
        '<div class="ac-onbr__head"><div class="ac-onbr__copy"><h1 class="ac-onbr__title" id="onbR" tabindex="-1">' + esc(t("onb.r.title", { right: s.right, total: s.total })) + " <span>" + esc(t("onb.r.sub")) + "</span></h1>" +
        '<span class="ac-onbr__xp">' + esc(t("onb.r.xp", { n: AC.fmt.num(s.xp) })) + "</span></div>" +
        AC.cards.rico("celebrate", "ac-onbr__rico", t("onb.r.ricoAlt")) + "</div>" +
        '<h2 class="ac-visually-hidden">' + esc(t("onb.r.topics")) + '</h2><ol class="ac-onbr__topics">' + rows + "</ol>" +
        '<div class="ac-onbr__auth"><p class="ac-onbr__save">' + esc(t("onb.r.save")) + "</p>" + authButtons() +
        '<div class="ac-onbr__links"><button type="button" class="ac-onb-link" data-onb-email>' + esc(t("onb.auth.email")) + "</button>" +
        '<a class="ac-onb-link ac-onb-link--quiet" href="' + AC.url("") + '">' + esc(t("onb.r.notNow")) + "</a></div></div></section>";
      bindAuth(F.main);
      AC.$("#onbR", F.main).focus({ preventScroll: true });
    }

    if (st.state === "waiting") result();
    else question(Math.min(st.next, n - 1));
  }

  // ---------------------------------------------------------------- /academy/welcome
  function welcomePage() {
    var host = document.getElementById("acWelcome"), d = D();
    if (!host || !d) return;
    var st = P().onboarding();
    if (AC.auth.isGuest()) { location.replace(st.state === "none" ? AC.url("") : AC.url("start")); return; }
    if (st.state !== "credited") { location.replace(AC.url("")); return; }
    var s = P().summary(), lv = s.level, name = firstName();
    var hits = {}; d.questions.forEach(function (q) { hits[q.chapter] = true; });
    var hitList = Object.keys(hits).map(Number).sort(function (a, b) { return a - b; });
    var chs = AC.index().chapters || [], l1 = (chs[0] && chs[0].lessons && chs[0].lessons[0]) || { title: "", minutes: 3 };
    var pct = Math.max(0, Math.min(100, Math.round(lv.progress * 100)));
    var map = chs.map(function (c) {
      return '<li class="' + (hits[c.n] ? "is-hit" : "") + '"><span class="ac-onbw__n">' + c.n + '</span><span class="ac-onbw__name">' + esc(c.short) + "</span></li>";
    }).join("");
    var startBtn = '<a class="ac-btn ac-btn--primary ac-btn--lg ac-onbw__start" href="' + esc(d.first.href) + '" data-onb-start>' + esc(t("onb.w.start")) + CHEV + "</a>";
    // every score: Start Lesson 1 + outline "See the full path" (Chapter 1 can't be skipped)
    var ctas = '<div class="ac-onbw__ctas">' + startBtn + '<a class="ac-btn ac-btn--ghost ac-btn--lg" href="' + esc(d.path.href) + '">' + esc(t("onb.w.path")) + "</a></div>";
    host.innerHTML = '<section class="ac-card ac-onbw__card" aria-labelledby="onbW">' +
      '<div class="ac-onbw__top">' + '<img class="ac-onbw__rico" src="' + AC.rico("star") + '" alt="' + esc(t("onb.w.ricoAlt")) + '" width="150" height="150">' +
      '<div class="ac-onbw__hello"><h1 class="ac-onbw__title" id="onbW">' + esc(name ? t("onb.w.title", { name: name }) : t("onb.w.titleNoName")) + " <span>" + esc(t("onb.w.in")) + "</span></h1>" +
      '<div class="ac-onbw__chips"><span class="ac-onbw__chip ac-onbw__chip--saved">' + TICK + esc(t("onb.w.saved", { right: st.right, total: st.total, xp: AC.fmt.num(st.xp) })) + "</span>" +
      '<span class="ac-onbw__chip ac-onbw__chip--bonus">' + esc(t("onb.w.bonus", { n: AC.fmt.num(st.bonus) })) + "</span></div></div></div>" +
      '<div class="ac-onbw__stats"><div class="ac-onbw__lvl"><div class="ac-onbw__lvlhead"><b>' + esc(t("onb.w.level", { n: lv.level })) + '</b><span class="ac-num">' + esc(t("onb.w.levelXp", { xp: AC.fmt.num(s.xp), to: AC.fmt.num(lv.levelTo) })) + "</span></div>" +
      '<div class="ac-onbw__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="' + esc(t("onb.w.level", { n: lv.level })) + '"><i style="--w:' + pct + '%"></i></div></div>' +
      '<div class="ac-onbw__streak">' + FLAME + "<b>" + esc(t("onb.w.day", { n: Math.max(1, s.streak) })) + "</b><span>" + esc(t("onb.w.streak")) + "</span></div></div>" +
      '<div class="ac-onbw__map"><div class="ac-onbw__maphead"><b>' + esc(d.path.title) + "</b><span>" + esc(t("onb.w.mapSub")) + "</span></div>" +
      '<ol class="ac-onbw__chs" aria-label="' + esc(t("onb.w.mapAria", { list: hitList.join(", ") })) + '">' + map + "</ol></div>" +
      '<div class="ac-onbw__next"><b>' + esc(t("onb.w.upNext", { title: l1.title })) + "</b><span>" + esc(t("onb.w.upMeta", { n: l1.minutes })) + "</span></div>" +
      ctas +
      '<p class="ac-onbw__bubble">' + esc(t("onb.w.rico")) + "</p></section>";
  }

  AC.ready(function () {
    startPage();
    welcomePage();
  });
})();
