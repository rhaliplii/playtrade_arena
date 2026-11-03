/* Profit.com Academy · page shell behaviour shared by every route:
   guest/member blocks, side-nav collapse, live values bound into SSR markup, sign-up / log-in sheets,
   [data-action=signup|login|logout|delete-account], glossary pops. */
(function () {
  "use strict";
  var AC = window.AC;

  /** Show [data-show="guest|member|new|learning"] blocks for the current learner. */
  AC.applyAudience = function () {
    var guest = AC.auth.isGuest();
    var s = AC.progress.summary();
    var state = guest ? "guest" : (s.started ? "learning" : "new");
    if (AC.auth.preview === "new") state = "new";
    if (AC.auth.preview === "member" || AC.auth.preview === "pro" || AC.auth.preview === "certified") state = "learning";
    document.body.dataset.audience = state;
    AC.$$("[data-show]").forEach(function (el) {
      var want = el.getAttribute("data-show").split(/\s+/);
      var on = want.indexOf(state) >= 0 || (want.indexOf("member") >= 0 && !guest);
      el.hidden = !on;
    });
    return state;
  };

  /** Fill [data-bind] elements from the progress summary (SSR ships neutral defaults). */
  AC.bind = function () {
    var s = AC.progress.summary();
    var lv = s.level;
    var values = {
      "xp": AC.fmt.num(s.xp), "month-xp": AC.fmt.num(s.monthXp), "coins": AC.fmt.num(AC.wallet.balance()),
      "level": AC.fmt.num(lv.level), "rank": AC.t("rank." + lv.rank), "streak": AC.fmt.num(s.streak),
      "goal-done": AC.fmt.num(Math.min(s.goal.done, s.goal.target)), "goal-target": AC.fmt.num(s.goal.target),
      "gym-due": s.gymDue ? AC.fmt.num(s.gymDue) : "", "name": (AC.auth.user() || {}).name || "",
      "level-to-go": AC.fmt.num(Math.max(0, lv.levelTo - s.xp)),
    };
    AC.$$("[data-bind]").forEach(function (el) {
      var k = el.getAttribute("data-bind");
      if (!(k in values)) return;
      el.textContent = values[k];
      if (k === "gym-due") el.hidden = !s.gymDue;
    });
    AC.$$("[data-bind-width]").forEach(function (el) {
      var k = el.getAttribute("data-bind-width");
      var pct = k === "level" ? lv.progress : k === "goal" ? Math.min(1, s.goal.done / s.goal.target) : 0;
      el.style.width = Math.round(pct * 100) + "%";
    });
    AC.$$("[data-bind-src]").forEach(function (el) { if (el.getAttribute("data-bind-src") === "rank-look") el.src = AC.rankLook(lv.rank); });
  };

  // ---------------------------------------------------------------- side nav collapse (same key as the platform nav)
  function sideNav() {
    var nav = document.getElementById("acNav");
    if (!nav) return;
    var toggle = nav.querySelector(".side-nav__toggle");
    var KEY = "ac_nav_collapsed";
    var collapsed = false;
    try { collapsed = localStorage.getItem(KEY) === "1"; } catch (e) {}
    function apply(c) {
      nav.classList.toggle("is-collapsed", c);
      toggle.setAttribute("aria-expanded", String(!c));
      toggle.setAttribute("aria-label", AC.t(c ? "nav.expand" : "nav.collapse"));
      AC.$$(".side-nav__item", nav).forEach(function (a) {
        if (c) { a.title = a.dataset.label; a.setAttribute("aria-label", a.dataset.label); } else { a.removeAttribute("title"); a.removeAttribute("aria-label"); }
      });
    }
    apply(collapsed);
    toggle.addEventListener("click", function () { collapsed = !collapsed; apply(collapsed); try { localStorage.setItem(KEY, collapsed ? "1" : "0"); } catch (e) {} });
  }

  // ---------------------------------------------------------------- account sheets: sign up, log in, delete
  var X_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  function sheet(id, inner) {
    var dlg = AC.h('<dialog class="ac-dialog ac-acct" id="' + id + '" aria-labelledby="' + id + 'T">' +
      '<form method="dialog" class="ac-dialog__box ac-acct__box">' + inner + "</form></dialog>");
    document.body.appendChild(dlg);
    AC.$("[data-x]", dlg).addEventListener("click", function () { dlg.close("cancel"); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close("cancel"); });   // backdrop
    return dlg;
  }
  function head(id, title) {
    return '<div class="ac-acct__head"><h2 id="' + id + 'T" class="ac-h2">' + AC.esc(title) + '</h2>' +
      '<button type="button" class="ac-share__x" data-x aria-label="' + AC.esc(AC.t("common.close")) + '">' + X_ICON + "</button></div>";
  }
  function open(dlg) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
  function swap(from, to) { from.close("swap"); to(); }
  /** The current page without a ?as= preview (so a sign-in is not overridden by it). */
  function here() { return location.href.replace(/([?&])as=[a-z]+&?/, "$1").replace(/[?&](#|$)/, "$1"); }

  /** "Save your progress": create a free account. */
  AC.signupSheet = function (reason, opts) {
    var dlg = document.getElementById("acSignup");
    if (!dlg) {
      dlg = sheet("acSignup", head("acSignup", AC.t("signup.title")) +
        '<p class="ac-muted ac-acct__lead" data-reason></p>' +
        '<label class="ac-field"><span>' + AC.esc(AC.t("signup.name")) + '</span><input name="name" autocomplete="name" required></label>' +
        '<label class="ac-field"><span>' + AC.esc(AC.t("signup.email")) + '</span><input name="email" type="email" autocomplete="email" required></label>' +
        '<button class="ac-btn ac-btn--primary ac-btn--block" value="ok">' + AC.esc(AC.t("signup.cta")) + "</button>" +
        '<p class="ac-acct__alt">' + AC.esc(AC.t("signup.haveAccount")) + ' <button type="button" class="ac-acct__link" data-to-login>' + AC.esc(AC.t("signup.loginLink")) + "</button></p>" +
        '<p class="ac-fine">' + AC.esc(AC.t("signup.terms")) + " " + AC.esc(AC.t("signup.note")) + "</p>");
      AC.$("[data-to-login]", dlg).addEventListener("click", function () { var oc = dlg._onCancel; swap(dlg, function () { AC.loginSheet({ onCancel: oc }); }); });
      dlg.addEventListener("close", function () {
        if (dlg.returnValue === "ok") {
          AC.auth.signUp(dlg.querySelector("[name=name]").value.trim(), dlg.querySelector("[name=email]").value.trim());
          location.href = dlg._next || AC.url("setup");
        } else if (dlg._onCancel && dlg.returnValue !== "swap") dlg._onCancel();
      });
    }
    dlg._onCancel = opts && opts.onCancel;   // e.g. a guest who opened a locked lesson goes back to the chapter
    dlg._next = opts && opts.next;           // where to go once signed up (default: /setup; the quick challenge: /welcome)
    dlg.returnValue = "";
    dlg.querySelector("[data-reason]").textContent = reason || AC.t("signup.text");
    open(dlg);
  };

  /** "Log in": a returning learner signs in with their email. */
  AC.loginSheet = function (opts) {
    var dlg = document.getElementById("acLogin");
    if (!dlg) {
      dlg = sheet("acLogin", head("acLogin", AC.t("login.title")) +
        '<p class="ac-muted ac-acct__lead">' + AC.esc(AC.t("login.text")) + "</p>" +
        '<label class="ac-field"><span>' + AC.esc(AC.t("login.email")) + '</span><input name="email" type="email" autocomplete="email" required></label>' +
        '<button class="ac-btn ac-btn--primary ac-btn--block" value="ok">' + AC.esc(AC.t("login.cta")) + "</button>" +
        '<p class="ac-acct__alt">' + AC.esc(AC.t("login.new")) + ' <button type="button" class="ac-acct__link" data-to-signup>' + AC.esc(AC.t("login.signupLink")) + "</button></p>" +
        '<p class="ac-fine">' + AC.esc(AC.t("login.note")) + "</p>");
      AC.$("[data-to-signup]", dlg).addEventListener("click", function () { var oc = dlg._onCancel; swap(dlg, function () { AC.signupSheet(null, { onCancel: oc }); }); });
      dlg.addEventListener("close", function () {
        if (dlg.returnValue === "ok") {
          AC.auth.logIn(dlg.querySelector("[name=email]").value.trim());
          location.replace(here());
        } else if (dlg._onCancel && dlg.returnValue !== "swap") dlg._onCancel();
      });
    }
    dlg._onCancel = opts && opts.onCancel;
    dlg.returnValue = "";
    open(dlg);
  };

  /** A small confirm sheet: {title, text, ok, cancel, onOk}. Keyboard: Escape (or the backdrop) cancels. */
  AC.confirmSheet = function (o) {
    var old = document.getElementById("acConfirm");
    if (old) old.remove();
    var dlg = sheet("acConfirm", head("acConfirm", o.title) + (o.text ? '<p class="ac-muted ac-acct__lead">' + AC.esc(o.text) + "</p>" : "") +
      '<div class="ac-acct__btns"><button class="ac-btn ac-btn--primary" value="ok">' + AC.esc(o.ok) + "</button>" +
      '<button type="button" class="ac-btn ac-btn--ghost" data-keep>' + AC.esc(o.cancel) + "</button></div>");
    AC.$("[data-keep]", dlg).addEventListener("click", function () { dlg.close("cancel"); });
    dlg.addEventListener("close", function () { if (dlg.returnValue === "ok" && o.onOk) o.onOk(); });
    dlg.returnValue = "";
    open(dlg);
    var keep = AC.$("[data-keep]", dlg); if (keep) keep.focus();
  };

  /** Confirm, then delete the account and its progress from this device. */
  AC.deleteAccountSheet = function () {
    var dlg = document.getElementById("acDelete");
    if (!dlg) {
      dlg = sheet("acDelete", head("acDelete", AC.t("account.delete.title")) +
        '<p class="ac-muted ac-acct__lead">' + AC.esc(AC.t("account.delete.text")) + "</p>" +
        '<div class="ac-acct__btns"><button class="ac-btn ac-btn--danger" value="ok">' + AC.esc(AC.t("account.delete.confirm")) + "</button>" +
        '<button type="button" class="ac-btn ac-btn--ghost" data-keep>' + AC.esc(AC.t("account.delete.cancel")) + "</button></div>");
      AC.$("[data-keep]", dlg).addEventListener("click", function () { dlg.close("cancel"); });
      dlg.addEventListener("close", function () {
        if (dlg.returnValue === "ok") { AC.auth.deleteAccount(); location.href = AC.url(""); }
      });
    }
    dlg.returnValue = "";
    open(dlg);
  };

  // ---------------------------------------------------------------- glossary pop (Term on tap)
  // A small non-modal dialog under the term: focus moves in, Escape or a click outside closes it and focus returns to the term.
  function terms() {
    var g = AC.data("ac-glossary");
    if (!g) return;
    var pop = null, from = null;
    AC.$$(".ac-term").forEach(function (b) { b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-haspopup", "dialog"); });
    function close(refocus) {
      if (!pop) return;
      pop.remove(); pop = null;
      if (from) { from.setAttribute("aria-expanded", "false"); from.removeAttribute("aria-controls"); if (refocus) from.focus(); }
      from = null;
    }
    document.addEventListener("click", function (e) {
      var b = e.target.closest(".ac-term");
      if (pop && pop.contains(e.target)) return;
      var same = b && b === from;
      close(false);
      if (!b || same) return;
      var term = g[b.dataset.term];
      if (!term) return;
      pop = AC.h('<div class="ac-pop" id="acPop" role="dialog" tabindex="-1" aria-label="' + AC.esc(term.term) + '"><b>' + AC.esc(term.term) + "</b><span>" + AC.esc(term.short) + '</span><a href="' + AC.url("glossary/" + b.dataset.term) + '">' + AC.esc(AC.t("glossary.more")) + "</a></div>");
      document.body.appendChild(pop);
      from = b;
      b.setAttribute("aria-expanded", "true"); b.setAttribute("aria-haspopup", "dialog"); b.setAttribute("aria-controls", "acPop");
      var r = b.getBoundingClientRect();
      pop.style.left = Math.max(12, Math.min(window.innerWidth - pop.offsetWidth - 12, r.left + window.scrollX)) + "px";
      pop.style.top = r.bottom + window.scrollY + 8 + "px";
      pop.focus({ preventScroll: true });
      pop.addEventListener("focusout", function (ev) {
        var to = ev.relatedTarget;
        if (to && pop && !pop.contains(to) && to !== from) close(false);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && pop) { e.preventDefault(); e.stopPropagation(); close(true); }
    }, true);
  }

  /** Path index (#ac-index): chapters and lesson ids in order. */
  AC.index = function () { return AC.data("ac-index") || { chapters: [] }; };
  AC.allLessons = function () {
    var out = [];
    AC.index().chapters.forEach(function (c) { c.lessons.forEach(function (l) { out.push(Object.assign({ chapter: c.id, chapterN: c.n }, l)); }); });
    return out;
  };

  /** Share sheet: {title, text, url, image, heading, sub}. LinkedIn, X, Facebook, WhatsApp, Telegram, email, copy link. */
  AC.share = function (o) {
    var url = o.url || (location.origin && location.origin !== "null" ? location.origin : "https://www.profit.com") + "/academy/";
    var enc = encodeURIComponent, text = o.text || "";
    var nets = [
      ["linkedin", "LinkedIn", "https://www.linkedin.com/sharing/share-offsite/?url=" + enc(url), "ft-linkedin.svg"],
      ["x", "X", "https://twitter.com/intent/tweet?text=" + enc(text) + "&url=" + enc(url), "ft-x.svg"],
      ["facebook", "Facebook", "https://www.facebook.com/sharer/sharer.php?u=" + enc(url), "ft-facebook.svg"],
      ["whatsapp", "WhatsApp", "https://wa.me/?text=" + enc(text + " " + url), null],
      ["telegram", "Telegram", "https://t.me/share/url?url=" + enc(url) + "&text=" + enc(text), "ft-telegram.svg"],
      ["email", AC.t("share.email"), "mailto:?subject=" + enc(o.title || text) + "&body=" + enc(text + "\n\n" + url), null],
    ];
    var ICON = { whatsapp: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 9.5c.3 2 2.3 4.3 4.6 5 .6.2 1.4-.5 1.6-1l-1.6-1.2-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1L9.8 8z"/></svg>',
      email: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>' };
    var dlg = AC.h('<dialog class="ac-dialog ac-share" aria-labelledby="acShareT"><div class="ac-dialog__box ac-share__box">' +
      '<div class="ac-share__head"><h2 id="acShareT" class="ac-h2">' + AC.esc(o.heading || AC.t("share.title")) + '</h2><button type="button" class="ac-share__x" data-x aria-label="' + AC.esc(AC.t("common.close")) + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
      (o.image || o.sub ? '<div class="ac-share__preview">' + (o.image ? '<img src="' + AC.esc(o.image) + '" alt="">' : "") + "<div><b>" + AC.esc(o.title || "") + "</b><span>" + AC.esc(o.sub || "") + "</span></div></div>" : "") +
      '<div class="ac-share__grid">' + nets.map(function (n) {
        return '<a class="ac-share__net" href="' + AC.esc(n[2]) + '" target="_blank" rel="noopener" data-net="' + n[0] + '"><span class="ac-share__ic">' + (n[3] ? '<img src="' + AC.root + "assets/" + n[3] + '" alt="">' : ICON[n[0]]) + "</span>" + AC.esc(n[1]) + "</a>";
      }).join("") + "</div>" +
      '<div class="ac-share__link"><input readonly value="' + AC.esc(url) + '" aria-label="' + AC.esc(AC.t("share.link")) + '"><button type="button" class="ac-btn ac-btn--primary ac-btn--sm" data-copy>' + AC.esc(AC.t("share.copy")) + "</button></div>" +
      (navigator.share ? '<button type="button" class="ac-btn ac-btn--ghost" data-native>' + AC.esc(AC.t("share.more")) + "</button>" : "") +
      "</div></dialog>");
    document.body.appendChild(dlg);
    AC.$("[data-x]", dlg).addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    AC.$("[data-copy]", dlg).addEventListener("click", function () {
      var b = this, inp = AC.$("input", dlg);
      var ok = function () { b.textContent = AC.t("share.copied"); setTimeout(function () { b.textContent = AC.t("share.copy"); }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { inp.select(); document.execCommand("copy"); ok(); });
      else { inp.select(); document.execCommand("copy"); ok(); }
    });
    var nat = AC.$("[data-native]", dlg);
    if (nat) nat.addEventListener("click", function () { navigator.share({ title: o.title, text: text, url: url }).catch(function () {}); });
    AC.$$("[data-net]", dlg).forEach(function (a) { a.addEventListener("click", function () { AC.analytics.track("share", { net: a.dataset.net, what: o.what || "" }); }); });
    dlg.addEventListener("close", function () { dlg.remove(); });
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  };

  /** Prototype only: switch the whole app between Guest / New / Member / Pro (and back to your real progress, "Me").
      A small tab on the left edge that opens the choices on tap, so it never covers page content. */
  function viewSwitcher() {
    if (document.body.classList.contains("ac-public")) return;   // public pages (certificate verify) are the same for everyone
    var cur = AC.auth.preview || "real";
    var opts = [["guest", "switch.guest"], ["new", "switch.new"], ["member", "switch.member"], ["pro", "switch.pro"], ["certified", "switch.certified"], ["real", "switch.real"]];
    var curLabel = AC.t((opts.filter(function (o) { return o[0] === cur; })[0] || opts[opts.length - 1])[1]);
    var el = AC.h('<div class="ac-viewas">' +
      '<button type="button" class="ac-viewas__chip" aria-expanded="false" aria-controls="acViewasOpts" aria-label="' + AC.esc(AC.t("switch.open", { view: curLabel })) + '">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button>' +
      '<div class="ac-viewas__opts" id="acViewasOpts" role="group" aria-label="' + AC.esc(AC.t("switch.aria")) + '"><span class="ac-viewas__label">' + AC.esc(AC.t("switch.label")) + "</span>" +
      opts.map(function (o) { return '<button type="button" data-view="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '"' + (cur === o[0] ? ' class="is-on"' : "") + ">" + AC.esc(AC.t(o[1])) + "</button>"; }).join("") + "</div></div>");
    var chip = AC.$(".ac-viewas__chip", el);
    function setOpen(on) { el.classList.toggle("is-open", on); chip.setAttribute("aria-expanded", String(on)); }
    chip.addEventListener("click", function () { setOpen(!el.classList.contains("is-open")); });
    document.addEventListener("click", function (e) { if (!el.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && el.classList.contains("is-open")) { setOpen(false); chip.focus(); } });
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-view]");
      if (b) AC.auth.setPreview(b.getAttribute("data-view"));   // the current one again = start that preview over
    });
    document.body.appendChild(el);
  }

  /** The learner's avatar, the same one the platform top bar shows: the account photo (`user.photo`; the Member / Pro
      previews use the platform's sample photo, like the top bar), else initials (a new account), else a neutral
      guest figure. `cls` adds classes (e.g. the rank card's size). Decorative: the name is always next to it. */
  AC.initials = function (name) {
    return String(name || "").trim().split(/\s+/).map(function (w) { return w.charAt(0); }).join("").replace(/\./g, "").slice(0, 2).toUpperCase() || "?";
  };
  AC.userAvatar = function (cls) {
    var u = AC.auth.user(), c = "ac-initials " + (cls || "");
    if (!u) return '<span class="' + c + ' ac-initials--guest" aria-hidden="true"><svg width="60%" height="60%" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4.2"/><path d="M3.8 21a8.2 8.2 0 0 1 16.4 0z"/></svg></span>';
    var demo = u.preview && AC.auth.preview !== "new";
    var photo = u.photo || (demo ? AC.root + "assets/nav-avatar.png" : "");
    if (photo) return '<img class="' + c + ' ac-initials--photo" src="' + AC.esc(photo) + '" alt="" aria-hidden="true">';
    return '<span class="' + c + '" aria-hidden="true">' + AC.esc(AC.initials(u.name)) + "</span>";
  };

  /** Platform top bar on Academy pages: search opens the global search panel (gsearch.js, Academy tab first); a new account shows no sample
      alerts and gets an initials avatar (the bell / messages counts and the stock photo are platform demo data). */
  function topbar() {
    var bar = document.querySelector(".topnav");
    if (!bar) return;
    var search = bar.querySelector('.topnav__right > button[aria-label="Search"]');
    if (search) {
      search.setAttribute("aria-haspopup", "dialog");
      search.addEventListener("click", function () { AC.gsearch.open(search); });
    }
    var u = AC.auth.user();
    var fresh = AC.auth.preview === "new" || (u && !u.preview);
    if (!u || !fresh) return;
    AC.$$(".icon-btn .badge", bar).forEach(function (b) { b.remove(); });
    var img = bar.querySelector("img.topnav__avatar");
    if (img) {
      var a = AC.h('<a class="topnav__avatar ac-initials" href="' + AC.url("me") + '" aria-label="' + AC.esc(AC.t("nav.progress")) + '"><span aria-hidden="true">' + AC.esc(AC.initials(u.name)) + "</span></a>");
      img.replaceWith(a);
    }
  }

  AC.ready(function () {
    viewSwitcher();
    var demoLessons = function () { return AC.allLessons().map(function (l) { return l.id; }); };
    var demoChapters = function () { return AC.index().chapters.filter(function (c) { return c.available; }).map(function (c) { return c.id; }); };
    if (AC.auth.preview === "member" || AC.auth.preview === "pro") AC.progress.seedDemo(demoLessons(), demoChapters());
    // Pro · certified: Trading Foundations finished, its certificate earned
    if (AC.auth.preview === "certified") AC.progress.seedGraduate(demoLessons(), demoChapters(), AC.index().path);
    sideNav();
    AC.applyAudience();
    AC.bind();
    terms();
    topbar();
    document.addEventListener("click", function (e) {
      var a = e.target.closest("[data-action], .topnav__login, .topnav__cta, .is-guest .mnav__util--account");
      if (!a) return;
      var act = a.getAttribute("data-action") || (a.matches(".topnav__cta") ? "signup" : "login");
      if (act === "signup") {
        e.preventDefault();
        var to = a.tagName === "A" && a.getAttribute("href") && a.getAttribute("href") !== "#" ? a.href : null;
        AC.signupSheet(a.getAttribute("data-reason"), to ? { next: to } : null);
      }
      else if (act === "login") { e.preventDefault(); AC.loginSheet(); }
      else if (act === "logout") { e.preventDefault(); AC.auth.logOut(); location.href = AC.url(""); }
      else if (act === "delete-account") { e.preventDefault(); AC.deleteAccountSheet(); }
    });
    // Settings › Reduce motion follows the learner (the head script set it before paint; this keeps it in sync)
    function motion() { document.documentElement.classList.toggle("ac-reduce-motion", (AC.progress.state().settings || {}).motion === false); }
    motion();
    AC.progress.onChange(function () { AC.bind(); motion(); });
    // Offline: never blocking, a quiet banner (spec: edge states)
    var banner = null;
    function net() {
      if (navigator.onLine === false && !banner) {
        banner = AC.h('<div class="ac-offline" role="status">' + AC.esc(AC.t("offline.banner")) + "</div>");
        document.body.appendChild(banner);
      } else if (navigator.onLine !== false && banner) { banner.remove(); banner = null; }
    }
    window.addEventListener("online", net); window.addEventListener("offline", net); net();
  });
})();
