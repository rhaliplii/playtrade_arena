/* Profit.com Academy · progress & social pages: My progress, My rewards, Certificates, My notes, My Trading Plan,
   Top Learners, public profile, Rico's Gym overview, path finale. Plain script on window.AC.
   Python renders the frame and the guest gate; this file renders the learner's state from AC.progress. */
(function () {
  "use strict";
  var AC = window.AC;
  var t = function (k, v) { return AC.t(k, v); };
  var esc = AC.esc;
  var num = function (n) { return AC.fmt.num(n); };

  // ---------------------------------------------------------------- icons (24px stroke, from the canvas)
  var I = {
    flame: "M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z",
    book: "M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM4 17a3 3 0 0 1 3-3h11",
    target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    shield: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z",
    shieldOk: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM8.5 12l2.5 2.5 4.5-5",
    check: "m5 12 5 5 9-10",
    lock: "M7 11h10v9H7zM9 11V8a3 3 0 0 1 6 0v3",
    chart: "M4 19V5M4 19h16M8 15l3-4 3 2 4-6",
    plan: "M9 4h6v3H9zM7 5H5v16h14V5h-2M8 12l2 2 4-4M8 17h8",
    doc: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
    bookmark: "M6 3h12v18l-6-4-6 4z",
    gift: "M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8c-2-4-6-4-6-1.5S10 8 12 8zm0 0c2-4 6-4 6-1.5S14 8 12 8z",
    medal: "M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM8.5 14 7 22l5-3 5 3-1.5-8",
    chevron: "m9 6 6 6-6 6",
    info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01",
    search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
    pen: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
    clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
    download: "M12 4v11M7 10l5 5 5-5M5 20h14",
    calendar: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    link: "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
    case: "M4 8h16v11H4zM9 8V5h6v3M4 13h16",
    bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
    coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9.5 9.5h3.5a1.5 1.5 0 0 1 0 3h-2a1.5 1.5 0 0 0 0 3H14.5",
    list: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
    trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
    games: "M6 9h12a4 4 0 0 1 4 4v1a3 3 0 0 1-5.5 1.6L15 14H9l-1.5 1.6A3 3 0 0 1 2 14v-1a4 4 0 0 1 4-4zM8 11v4M6 13h4M16 12h.01M18 14h.01",
    trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4",
    cap: "M4 16a8 8 0 0 1 16 0zM12 8V6M20 16h2",
    scarf: "M5 6c4 2 10 2 14 0v4c-4 2-10 2-14 0zM14 11v9l-2-1.5-2 1.5v-9",
    phones: "M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H4zM17 15h3v5h-3z",
  };
  function icon(name, size, sw) {
    return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + I[name] + '"/></svg>';
  }
  function coinSvg(size) {
    return '<svg class="me-coin" width="' + size + '" height="' + size + '" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" class="me-coin__face"/>' +
      '<circle cx="24" cy="24" r="16.5" fill="none" class="me-coin__ring" stroke-width="2.5"/><path d="M20 16.5h5.5a5 5 0 0 1 0 10H20M20 16.5V32" fill="none" class="me-coin__mark" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }


  // ---------------------------------------------------------------- learner model
  var PATH = AC.data("me-path") || { id: "learn-to-trade", title: "", chapters: [], lessons: 0, skills: [], finale: { xp: 500, coins: 500 } };

  function dateOf(ds) { return new Date(String(ds).length <= 10 ? ds + "T12:00:00" : ds); }
  function fmtDate(ds) { return AC.fmt.date(dateOf(ds)); }
  function monthYear(ds) { return AC.fmt.date(dateOf(ds.length === 7 ? ds + "-01" : ds), { month: "long", year: "numeric" }); }
  function initials(name) {
    return String(name || "").split(/\s+/).filter(Boolean).map(function (w) { return w.charAt(0); }).join("").replace(/\./g, "").slice(0, 2).toUpperCase();
  }
  function rankName(r) { return t("rank." + r); }
  function lessonUrl(chapter, lesson) { return AC.url(PATH.id + "/" + chapter + "/" + lesson); }

  /** Everything the pages show, computed from the engine state + the path outline. */
  function model() {
    var st = AC.progress.state(), s = AC.progress.summary();
    var idx = AC.index().chapters || [];
    var byId = {};
    idx.forEach(function (c) { byId[c.id] = c; });
    var current = null;
    var chapters = PATH.chapters.map(function (c) {
      var ix = byId[c.id] || { lessons: [] };
      var done = (ix.lessons || []).filter(function (l) { return st.lessons[l.id] && st.lessons[l.id].done; }).length;
      var cs = st.chapters[c.id] || {};
      var passed = !!(cs.challenge && cs.challenge.passed);
      var next = (ix.lessons || []).filter(function (l) { return !(st.lessons[l.id] && st.lessons[l.id].done); })[0] || null;
      var m = { id: c.id, n: c.n, short: c.short, title: c.title, count: c.count, available: c.available, done: passed ? c.count : done, lessonsDone: done, passed: passed, next: next };
      if (!passed && !current) current = m;
      return m;
    });
    chapters.forEach(function (c) { c.state = c.passed ? "passed" : (c === current && (c.lessonsDone > 0 || c.available)) ? "now" : "todo"; });
    var passedN = chapters.filter(function (c) { return c.passed; }).length;
    // "right first try" counts played lessons only: a tested-out lesson had no answers to get right (engine stats())
    var stats = AC.progress.stats();
    var skills = PATH.skills.map(function (sk) {
      var ch = chapters.filter(function (c) { return c.n === sk.after; })[0];
      return { name: sk.name, after: sk.after, got: !!(ch && ch.passed) };
    });
    var plan = AC.progress.plan();
    var user = AC.auth.user() || { name: "", handle: "" };
    var nextLesson = null;
    chapters.some(function (c) { if (c.available && c.next) { nextLesson = { chapter: c.id, id: c.next.id, title: c.next.title, n: c.n }; return true; } return false; });
    return {
      st: st, s: s, lv: s.level, user: user, chapters: chapters, current: current, passed: passedN, total: chapters.length,
      firstPct: stats.firstTryPct, gymSessions: stats.gymSessions, skills: skills,
      skillsGot: skills.filter(function (x) { return x.got; }).length, plan: plan, planFilled: plan.filled, planTotal: plan.total, planDone: plan.complete,
      lessonsDone: s.lessonsDone, gymIdeas: AC.progress.gymIdeas().length, nextLesson: nextLesson,
      finished: !!(st.paths && st.paths[PATH.id]),
      cert: (st.certificates || []).filter(function (c) { return c.path === PATH.id; })[0] || null,
    };
  }
  function continueHref(m) { return m.nextLesson ? lessonUrl(m.nextLesson.chapter, m.nextLesson.id) : AC.url(PATH.id); }

  // ---------------------------------------------------------------- shared bits
  function rankStyle(rank) { return "me-rank-" + rank; }
  function bar(pct, cls) { return '<div class="me-bar ' + (cls || "") + '"><span style="width:' + Math.round(Math.max(0, Math.min(1, pct)) * 100) + '%"></span></div>'; }
  function avatar(p, size) {
    var cls = "me-ava me-ava--" + size + (p.you ? " me-ava--you" : "");
    if (p.avatar) return '<img class="' + cls + '" src="' + AC.base + "static/img/avatars/" + esc(p.avatar) + '" alt="' + esc(p.name) + '">';
    var tone = p.you ? "" : " me-ava--t" + (Math.abs(hash(p.handle || p.name)) % 6);
    return '<span class="' + cls + tone + '" role="img" aria-label="' + esc(p.name) + '">' + esc(initials(p.name)) + "</span>";
  }
  function hash(s) { var h = 0; for (var i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) | 0; return h; }
  function nextRankLine(lv) {
    if (!lv.nextRank) return { title: t("me.next.none.title"), text: t("me.next.none.text") };
    return { title: t("me.next.title", { rank: rankName(lv.nextRank), xp: num(lv.nextRankAt) }), text: t("me.next." + lv.nextRank) };
  }
  function linkCard(href, ic, title, text) {
    return '<a class="me-link" href="' + href + '"><span class="me-link__icon">' + icon(ic, 18) + '</span><span class="me-link__text"><b>' + esc(title) + "</b><span>" + esc(text) + "</span></span></a>";
  }
  function root() { return document.getElementById("meRoot"); }

  // ================================================================= My progress
  function renderProgress() {
    var m = model(), lv = m.lv, s = m.s;
    var since = m.st.created ? monthYear(m.st.created) : "";
    var sub = AC.$(".me-head .ac-lead");
    if (sub) sub.textContent = t("me.lead.user", { name: m.user.name, since: since });
    var pl = document.getElementById("meProfileLink");
    if (pl) pl.href = AC.url("u?h=" + encodeURIComponent(m.user.handle || ""));
    var nr = nextRankLine(lv);
    var lastSkill = m.skills.filter(function (x) { return x.got; }).pop();
    var html = "";
    // rank card
    html += '<section class="me-rank ' + rankStyle(lv.rank) + '" aria-label="' + esc(t("me.rank.eyebrow")) + '">' +
      '<img class="me-rank__look" src="' + AC.rankLook(lv.rank) + '" alt="' + esc(t("me.rank.alt", { rank: rankName(lv.rank) })) + '">' +
      '<div class="me-rank__main"><span class="me-eyebrow-light">' + esc(t("me.rank.eyebrow")) + "</span>" +
      '<h2 class="me-rank__title">' + esc(t("me.rank.title", { rank: rankName(lv.rank), n: lv.level })) + "</h2>" +
      '<div class="me-rank__level"><div class="me-rank__row"><span>' + esc(t("me.rank.level", { n: lv.level })) + '</span><span class="ac-num"><b>' + num(m.s.xp) + "</b> / " + esc(t("common.xp", { n: lv.levelTo })) + "</span></div>" +
      bar(lv.progress, "me-bar--light") +
      '<b class="ac-num me-rank__togo">' + esc(t("me.rank.togo", { xp: num(Math.max(0, lv.levelTo - s.xp)), n: lv.level + 1 })) + "</b></div>" +
      (lastSkill ? '<div class="ac-row"><span class="ac-chip ac-chip--hero">' + icon("chart", 14) + esc(t("me.rank.skill", { name: lastSkill.name })) + "</span></div>" : "") +
      "</div>" +
      '<div class="me-rank__next"><span class="me-eyebrow-light">' + esc(t("me.next.eyebrow")) + "</span><b>" + esc(nr.title) + "</b><span>" + esc(nr.text) + "</span>" +
      '<a href="' + AC.url("how-it-works") + '">' + esc(t("me.next.how")) + "</a></div></section>";
    // stats
    var stats = [
      ["flame", "streak", num(s.streak), t("me.stat.streak", { n: s.bestStreak })],
      ["book", "mint", num(m.lessonsDone), t("me.stat.lessons", { n: m.lessonsDone })],
      ["target", "sky", m.firstPct == null ? "–" : AC.fmt.pct(m.firstPct), t("me.stat.first")],
      ["shield", "amber", num(m.passed) + "/" + num(m.total), t("me.stat.challenges")],
    ];
    html += '<div class="me-stats">' + stats.map(function (x) {
      return '<div class="me-stat"><span class="me-icon-dot me-tone-' + x[1] + '">' + icon(x[0], 20) + '</span><span class="me-stat__text"><b class="ac-num">' + esc(x[2]) + "</b><span>" + esc(x[3]) + "</span></span></div>";
    }).join("") + "</div>";
    // chapters + skills/certificate
    var rows = m.chapters.map(function (c) {
      var status = c.state === "passed" ? '<span class="me-tick" title="' + esc(t("me.ch.passed")) + '">' + icon("check", 14, 3) + "</span>"
        : c.state === "now" ? '<b class="me-ch__frac ac-num">' + esc(t("me.ch.frac", { done: num(c.lessonsDone), total: num(c.count) })) + "</b>"
          : '<span class="me-ch__lock">' + icon("clock", 16) + "</span>";
      var label = c.state === "passed" ? t("me.ch.passed") : c.state === "now" ? t("me.ch.nowLabel", { done: c.lessonsDone, total: c.count }) : t("me.ch.todo");
      return '<li class="me-ch me-ch--' + c.state + '"><span class="me-ch__n ac-num">' + String(c.n).padStart(2, "0") + '</span><span class="me-ch__name">' + esc(c.short) + "</span>" +
        bar(c.count ? c.done / c.count : 0) + '<span class="me-ch__status" aria-label="' + esc(label) + '">' + status + "</span></li>";
    }).join("");
    var gymLine = m.gymIdeas ? '<a class="me-legend__gym" href="' + AC.url("gym") + '">' + esc(t("me.ch.gym", { n: m.gymIdeas })) + "</a>" : "";
    html += '<div class="me-split">' +
      '<section class="ac-card me-chapters" aria-labelledby="meChTitle"><div class="me-card-head"><div><h2 class="ac-h2" id="meChTitle">' + esc(PATH.title) + "</h2>" +
      '<span class="me-meta">' + esc(t("me.ch.sub", { done: num(m.lessonsDone), total: num(PATH.lessons), passed: num(m.passed), chapters: num(m.total) })) + "</span></div>" +
      '<a class="ac-link" href="' + AC.url(PATH.id) + '">' + esc(t("me.ch.map")) + "</a></div>" +
      (m.lessonsDone ? "" : '<div class="me-startrow"><a class="ac-btn ac-btn--primary" href="' + continueHref(m) + '">' + esc(t("me.ch.start")) + icon("chevron", 18, 2.4) + '</a><span class="me-meta">' + esc(t("me.ch.startNote")) + "</span></div>") +
      '<ol class="me-ch-list">' + rows + "</ol>" +
      '<div class="me-legend"><span><span class="me-tick me-tick--sm">' + icon("check", 10, 3.4) + "</span>" + esc(t("me.ch.passed")) + "</span>" +
      '<span><b class="me-legend__frac">' + esc(t("me.ch.frac", { done: 2, total: 5 })) + "</b>" + esc(t("me.ch.legendLessons")) + "</span>" +
      "<span>" + icon("clock", 14) + esc(t("me.ch.todo")) + "</span>" + gymLine + "</div></section>" +
      '<div class="me-col">' +
      '<section class="ac-card me-skills" aria-labelledby="meSkTitle"><div class="me-card-head me-card-head--base"><h2 class="ac-h2" id="meSkTitle">' + esc(t("me.skills.title")) + '</h2><span class="me-meta ac-num">' + esc(t("me.skills.count", { n: m.skillsGot, total: m.skills.length })) + "</span></div>" +
      m.skills.map(function (sk) {
        return '<div class="me-skill' + (sk.got ? " is-got" : "") + '"><span class="me-skill__icon">' + icon(sk.got ? "check" : "clock", 16, sk.got ? 3 : 2) + '</span><span class="me-skill__text"><b>' + esc(sk.name) + "</b><span>" +
          esc(sk.got ? t("me.skills.got", { n: sk.after }) : (sk.after >= m.total ? t("me.skills.finish", { path: PATH.title }) : t("me.skills.how", { n: sk.after }))) + "</span></span></div>";
      }).join("") + "</section>" +
      '<section class="ac-card me-certcard" aria-labelledby="meCertTitle"><div class="me-card-head me-card-head--base"><h2 class="ac-h2" id="meCertTitle">' + esc(t("me.cert.title")) + '</h2><a class="ac-link" href="' + AC.url("me/certificates") + '">' + esc(t("me.seeAll")) + "</a></div>" +
      '<div class="me-certcard__row"><span>' + esc(PATH.title) + '</span><span class="ac-num me-meta">' + esc(t("me.frac", { a: num(m.passed), b: num(m.total) })) + "</span></div>" + bar(m.passed / m.total) +
      '<span class="me-meta">' + esc(m.finished ? t("me.cert.earned", { date: fmtDate(m.cert ? m.cert.d : m.st.paths[PATH.id].finished) }) : t("me.cert.how")) + "</span>" +
      '<div class="me-perks"><span class="ac-eyebrow">' + esc(t("me.cert.when")) + "</span>" +
      '<span class="me-perks__row"><span>' + esc(t("me.cert.xp")) + '</span><b class="me-up ac-num">' + esc(t("me.plusXp", { n: PATH.finale.xp })) + "</b></span>" +
      '<span class="me-perks__row"><span>' + esc(t("me.cert.coins")) + '</span><b class="me-amber ac-num">+' + num(PATH.finale.coins) + "</b></span>" +
      '<span class="me-perks__row"><span>' + esc(t("me.cert.skill")) + "</span><b>" + esc((PATH.skills[PATH.skills.length - 1] || {}).name || "") + "</b></span></div></section>" +
      "</div></div>";
    // week
    var today = AC.progress.day();
    var d0 = dateOf(today); var dow = (d0.getDay() + 6) % 7;
    var week = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(d0); d.setDate(d0.getDate() - dow + i);
      var key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      var xp = m.st.history.filter(function (h) { return h.d === key; }).reduce(function (a, h) { return a + h.xp; }, 0);
      week.push({ key: key, xp: xp, today: key === today, future: key > today, label: AC.fmt.date(d, { weekday: "short" }) });
    }
    var max = Math.max.apply(null, week.map(function (w) { return w.xp; }).concat([90]));
    var wtotal = week.reduce(function (a, w) { return a + w.xp; }, 0);
    var goalLeft = Math.max(0, s.goal.target - s.goal.done);
    html += '<div class="me-split">' +
      '<section class="ac-card me-week" aria-labelledby="meWkTitle"><div class="me-card-head me-card-head--base"><h2 class="ac-h2" id="meWkTitle">' + esc(t("me.week.title")) + '</h2><b class="me-week__total ac-num">' + esc(t("common.xp", { n: wtotal })) + "</b></div>" +
      '<div class="me-week__bars" role="img" aria-label="' + esc(t("me.week.aria", { n: wtotal })) + '">' + week.map(function (w) {
        var h = w.xp ? Math.max(8, Math.round(w.xp / max * 96)) : (w.today ? 24 : 4);
        var cls = w.xp ? "is-xp" : w.today ? "is-today" : "is-empty";
        return '<div class="me-week__day' + (w.today ? " is-now" : "") + '"><span class="me-week__val ac-num">' + (w.xp ? num(w.xp) : w.today ? esc(t("me.week.today")) : "") + "</span>" +
          '<span class="me-week__bar ' + cls + '" style="height:' + h + 'px"></span><span class="me-week__lbl">' + esc(w.label) + "</span></div>";
      }).join("") + "</div>" +
      '<span class="me-meta">' + esc(s.goal.met ? t("me.week.met") : t("me.week.goal", { n: goalLeft, done: s.goal.done, target: s.goal.target })) + "</span></section>" +
      '<nav class="me-links" aria-label="' + esc(t("me.links.aria")) + '">' +
      linkCard(AC.url("my-plan"), "doc", t("me.links.plan"), t("me.links.planText", { n: m.planFilled, total: m.planTotal })) +
      linkCard(AC.url("me/notes"), "bookmark", t("me.links.notes"), t("me.links.notesText", { n: m.st.notes.length })) +
      linkCard(AC.url("me/rewards"), "gift", t("me.links.rewards"), t("me.links.rewardsText")) +
      linkCard(AC.url("me/certificates"), "medal", t("me.links.certs"), t("me.links.certsText")) +
      "</nav></div>";
    root().innerHTML = html;
  }

  // ================================================================= My rewards
  var SHOP = [["games", "games", 100], ["playtrade", "trophy", 150], ["cap", "cap", 200], ["scarf", "scarf", 150], ["phones", "phones", 250]];
  function renderRewards() {
    var m = model(), lv = m.lv;
    var bal = AC.wallet.balance();
    var own = m.st.coins || 0;
    var html = '<section class="me-coins" aria-labelledby="meCoinsTitle">' + coinSvg(76) +
      '<div class="me-coins__main"><span class="me-eyebrow-light" id="meCoinsTitle">' + esc(t("rewards.balance")) + "</span>" +
      '<b class="me-coins__num ac-num">' + num(bal) + "</b>" +
      '<span class="me-coins__split"><span class="me-coins__chip ac-num">' + coinSvg(16) + esc(t("rewards.academy", { n: num(own) })) + "</span>" + esc(t("rewards.balanceNote")) + "</span>" +
      "<span>" + esc(own ? t("rewards.earned", { n: num(own), path: PATH.title }) : t("rewards.firstChallenge", { c: (AC.progress.COINS || {}).challenge || 50, n: PATH.finale.coins, path: PATH.title })) + "</span>" +
      (m.finished ? "" : '<div class="me-coins__prog"><div class="me-rank__row"><span>' + esc(t("rewards.prog")) + '</span><b class="ac-num">' + esc(t("me.of", { a: num(m.passed), b: num(m.total) })) + "</b></div>" +
        bar(m.passed / m.total, "me-bar--light") + "<span>" + esc(t("rewards.progHow", { n: m.total })) + "</span></div>") +
      "</div>" +
      '<div class="me-coins__note">' + icon("info", 18) + "<span>" + esc(t("rewards.note")) + "</span></div>" +
      '<img class="me-coins__rico" src="' + AC.rico("thumbs") + '" alt="' + esc(t("rewards.ricoAlt")) + '"></section>';
    html += '<section class="me-section" aria-labelledby="meSpend"><div class="ac-section-head"><h2 class="ac-h2" id="meSpend">' + esc(t("rewards.spend")) + '</h2><span class="me-meta">' +
      esc(m.finished ? t("rewards.spendHint.done") : t("rewards.spendHintChallenge", { c: (AC.progress.COINS || {}).challenge || 50, n: PATH.finale.coins, path: PATH.title })) + "</span></div>" +
      '<ul class="me-shop" aria-label="' + esc(t("rewards.spend")) + '">' + SHOP.map(function (x) {
        return '<li class="me-shop__item"><span class="me-shop__icon">' + icon(x[1], 22) + '</span><span class="me-shop__text"><span class="ac-eyebrow">' + esc(t("rewards.shop." + x[0] + ".kind")) + "</span><b>" +
          esc(t("rewards.shop." + x[0] + ".name")) + '</b></span><span class="me-price ac-num">' + coinSvg(16) + num(x[2]) + "</span></li>";
      }).join("") + "</ul></section>";
    html += '<div class="me-split me-split--even">' +
      '<section class="ac-card me-look ' + rankStyle(lv.rank) + '" aria-labelledby="meLook"><img class="me-look__img" src="' + AC.rankLook(lv.rank) + '" alt="' + esc(t("me.rank.alt", { rank: rankName(lv.rank) })) + '">' +
      '<div class="me-look__text"><span class="ac-eyebrow me-look__eyebrow">' + esc(t("rewards.look")) + '</span><h2 class="ac-h2" id="meLook">' + esc(t("me.rank.title", { rank: rankName(lv.rank), n: lv.level })) + "</h2>" +
      '<span class="me-meta me-meta--14">' + esc(lv.nextRank ? t("rewards.lookText", { rank: rankName(lv.nextRank), xp: num(lv.nextRankAt) }) : t("rewards.lookTop")) + "</span>" +
      '<a class="ac-link" href="' + AC.url("how-it-works") + '">' + esc(t("me.next.how")) + "</a></div></section>" +
      '<section class="ac-card me-certmini" aria-labelledby="meCerts"><div class="me-card-head me-card-head--base"><h2 class="ac-h2" id="meCerts">' + esc(t("certs.title")) + '</h2><a class="ac-link" href="' + AC.url("me/certificates") + '">' + esc(t("me.seeAll")) + "</a></div>" +
      '<div class="me-tilebox"><div class="me-certcard__row"><span>' + esc(PATH.title) + '</span><span class="ac-num me-meta">' + esc(m.finished ? t("certs.earnedShort") : t("me.frac", { a: num(m.passed), b: num(m.total) })) + "</span></div>" +
      bar(m.passed / m.total) + '<span class="me-meta">' + esc(m.finished ? t("me.cert.earned", { date: fmtDate(m.cert.d) }) : t("rewards.certHow", { n: m.total })) + "</span></div>" +
      '<span class="me-meta me-push">' + esc(t("rewards.certNote")) + "</span></section></div>";
    root().innerHTML = html;
  }

  // ================================================================= Certificates
  // the Pro paths in catalog order (build/pages/certificates.py cert_catalog → #me-catalog)
  function proCatalog() {
    return (AC.data("me-catalog") || []).filter(function (x) { return x.id && x.tier === "pro"; });
  }
  /** The certificate this learner has (or will get) for the path, for AC.cert (static/js/cert.js). Not earned yet:
      a preview with their name, no date, ID or QR. */
  function certModel(m) {
    var earned = m.finished && m.cert;
    return AC.cert.model(earned ? { id: m.cert.id, name: m.cert.name || m.user.name, path: PATH.id, d: m.cert.d } : { name: m.user.name, path: PATH.id, preview: true });
  }
  /** The certificate's actions: PDF, share image, verify page, LinkedIn, share sheet (wired by AC.cert.bind). */
  function certButtons(cm, size) {
    var sm = size ? " ac-btn--" + size : "";
    return '<button type="button" class="ac-btn ac-btn--primary' + sm + '" data-cert-act="pdf">' + icon("download", 18) + esc(t("cert.act.pdf")) + "</button>" +
      '<button type="button" class="ac-btn ac-btn--ghost' + sm + '" data-cert-act="png">' + icon("download", 18) + esc(t("cert.act.png")) + "</button>" +
      '<a class="ac-btn ac-btn--ghost' + sm + '" href="' + esc(AC.certs.pageUrl(cm.id)) + '">' + icon("shieldOk", 18) + esc(t("cert.act.open")) + "</a>" +
      '<a class="ac-btn ac-btn--ghost' + sm + '" href="' + esc(AC.cert.linkedIn(cm)) + '" target="_blank" rel="noopener">' + icon("case", 18) + esc(t("cert.act.li")) + "</a>" +
      '<button type="button" class="ac-btn ac-btn--ghost' + sm + '" data-cert-act="share">' + icon("link", 18) + esc(t("cert.act.share")) + "</button>";
  }
  function renderCerts() {
    var m = model();
    var html = '<header class="me-hero me-hero--green"><div class="me-hero__text"><nav class="me-crumb me-crumb--light" aria-label="' + esc(t("me.crumb.aria")) + '"><a href="' + AC.url("me") + '">' + esc(t("me.title")) +
      '</a><span aria-hidden="true">/</span><span aria-current="page">' + esc(t("certs.title")) + "</span></nav>" +
      '<h1 class="ac-h1">' + esc(t("certs.title")) + '</h1><p class="ac-lead">' + esc(t("certs.lead")) + "</p></div>" +
      '<img class="me-hero__rico" src="' + AC.rico("star") + '" alt="' + esc(t("certs.ricoAlt")) + '"></header>';
    var earned = m.finished && m.cert;
    var cm = certModel(m);
    var todo = [];
    var passedChs = m.chapters.filter(function (c) { return c.passed; });
    if (passedChs.length) todo.push(["done", passedChs.length === 1 ? t("certs.todo.passedOne", { n: passedChs[0].n }) : t("certs.todo.passed", { a: passedChs[0].n, b: passedChs[passedChs.length - 1].n }), t("certs.todo.passedNote")]);
    if (!earned && m.current) {
      todo.push(["now", t("certs.todo.now", { n: m.current.n, name: m.current.short }), m.current.available ? t("certs.todo.nowNote") : t("certs.todo.soonNote")]);
      var left = m.total - m.passed - 1;
      if (left > 0) todo.push(["todo", t("certs.todo.rest", { a: m.current.n + 1, b: m.total }), t("certs.todo.restNote", { n: left })]);
    }
    todo.push([m.planDone ? "done" : "todo", t("certs.todo.plan"), m.planDone ? t("certs.todo.planDone") : t("certs.todo.planNote", { n: m.total, a: m.planFilled, b: m.planTotal })]);
    html += '<section class="ac-card me-certmain" aria-label="' + esc(t("certs.aria", { path: PATH.title })) + '"><div class="me-certmain__stage"><span class="me-certtag' + (earned ? " is-yours" : "") + '">' + esc(earned ? t("certs.tag.earned") : t("certs.tag.progress")) + "</span>" + AC.cert.html(cm).replace("ac-cert ", "ac-cert ac-cert--lift ") + "</div>" +
      '<div class="me-certmain__side"><div class="me-stack-6"><span class="me-tag">' + esc(earned ? t("certs.badge.earned") : t("certs.badge.progress")) + "</span>" +
      '<h2 class="ac-h2">' + esc(PATH.title) + '</h2><span class="me-meta me-meta--14">' + esc(earned ? t("me.cert.earned", { date: fmtDate(m.cert.d) }) : t("certs.status", { a: num(m.passed), b: num(m.total) }) + (m.planDone ? "" : t("certs.statusPlan"))) + "</span></div>" +
      '<div class="me-segs" role="img" aria-label="' + esc(t("certs.segs", { a: m.passed, b: m.total })) + '">' + m.chapters.map(function (c) {
        return '<span class="me-seg me-seg--' + c.state + '" title="' + esc(t("certs.segTitle", { n: c.n, name: c.short })) + '"></span>';
      }).join("") + "</div>" +
      (earned ? "" : '<div class="me-todo">' + todo.map(function (x) {
        return '<div class="me-todo__row"><span class="me-todo__dot me-todo__dot--' + x[0] + '">' + (x[0] === "done" ? icon("check", 14, 3) : x[0] === "now" ? "<b>" + (m.current ? m.current.n : "") + "</b>" : "") + "</span>" +
          '<span class="me-todo__text"><b>' + esc(x[1]) + "</b><span>" + esc(x[2]) + "</span></span></div>";
      }).join("") + "</div>") +
      '<div class="ac-row me-certbtns">' + (earned
        ? certButtons(cm, "sm")
        : '<a class="ac-btn ac-btn--primary" href="' + continueHref(m) + '">' + esc(m.current ? t("certs.continue", { n: m.current.n }) : t("certs.continuePath")) + '</a><a class="ac-btn ac-btn--ghost" href="' + AC.url("my-plan") + '">' + esc(t("certs.seePlan")) + "</a>") + "</div>" +
      (earned ? '<span class="me-meta">' + esc(t("certs.verifyAt", { url: cm.url.replace(/^https:\/\/www\./, "") })) + "</span>" : '<span class="me-meta">' + esc(t("certs.whenFinish", { xp: num(PATH.finale.xp), coins: num(PATH.finale.coins), skill: (PATH.skills[PATH.skills.length - 1] || {}).name || "" })) + "</span>") +
      "</div></section>";
    // all paths
    var free = '<div class="me-pathcert is-current"><div class="me-pathcert__cover"><img src="' + AC.base + 'static/img/art/path-ltt.webp" alt=""><span class="me-pathcert__tag me-pathcert__tag--free">' + esc(t("certs.free")) + "</span></div>" +
      '<div class="me-pathcert__text"><b>' + esc(PATH.title) + '</b><span class="me-up">' + esc(earned ? t("certs.earnedShort") : t("certs.inProgress", { a: m.passed, b: m.total })) + "</span></div></div>";
    var isPro = !!(AC.auth.isPro && AC.auth.isPro());
    var pro = proCatalog().map(function (c) {
      var name = c.title || "";
      var live = !!c.live;   // a Pro path opens once its lessons exist
      var tag = isPro ? esc(t("certs.included")) : icon("lock", 12, 2.4) + esc(t("certs.pro"));
      var line = isPro ? (live ? t("certs.includedLive") : t("certs.includedSoon")) : (live ? t("certs.proLocked") : t("certs.proSoon"));
      return '<div class="me-pathcert' + (live ? "" : " is-soon") + (isPro ? " is-included" : "") + '"><div class="me-pathcert__cover"><img src="' + AC.base + "static/img/art/" + c.art + '" alt="">' +
        '<span class="me-pathcert__tag">' + tag + "</span></div>" +
        '<div class="me-pathcert__text"><b>' + esc(name) + '</b><span class="me-faint">' + esc(line) + "</span></div></div>";
    }).join("");
    html += '<section class="me-section" aria-labelledby="meAllCerts"><div class="ac-section-head"><h2 class="ac-h2" id="meAllCerts">' + esc(t("certs.all")) + '</h2><span class="me-meta">' + esc(isPro ? t("certs.allNotePro", { path: PATH.title }) : t("certs.allNote", { path: PATH.title })) + "</span></div>" +
      '<div class="me-pathcerts">' + free + pro + (isPro ? "" : '<div class="me-procard"><b>' + esc(t("certs.proTitle")) + '</b><span class="me-meta">' + esc(t("certs.proText")) + '</span><a class="ac-btn ac-btn--pro ac-btn--sm" href="' + AC.url("pro") + '">' + esc(t("nav.pro.cta")) + "</a></div>") + "</div></section>";
    // sharing
    var share = [["link", "verify"], ["case", "li"], ["download", "pdf"]];
    html += '<section class="ac-card me-share" aria-labelledby="meShare"><div class="me-stack-16"><div class="me-stack-4"><h2 class="ac-h2" id="meShare">' + esc(t("certs.share.title")) + '</h2><p class="me-meta me-meta--14">' + esc(t("certs.share.lead")) + "</p></div>" +
      '<div class="me-share__grid">' + share.map(function (x) {
        return '<div class="me-tilebox me-share__item"><span class="me-icon-sq me-tone-mint">' + icon(x[0], 18) + "</span><b>" + esc(t("certs.share." + x[1])) + '</b><span class="me-meta">' + esc(t("certs.share." + x[1] + ".text")) + '</span><span class="me-share__detail">' + esc(t("certs.share." + x[1] + ".detail")) + "</span></div>";
      }).join("") + "</div></div>" +
      '<figure class="me-sample"><div class="me-sample__head"><figcaption class="ac-eyebrow">' + esc(earned ? t("certs.yours") : t("certs.example")) + "</figcaption>" + (earned ? "" : '<span class="me-sample__chip">' + esc(t("certs.sample")) + "</span>") + "</div>" +
      AC.cert.html(earned ? cm : AC.cert.model({ name: m.user.name, path: PATH.id, preview: true })) + '<span class="me-meta">' + esc(earned ? t("certs.yoursNote") : t("certs.exampleNote")) + "</span></figure></section>";
    html += '<p class="ac-fine">' + esc(t("certs.disclaimer")) + "</p>";
    root().innerHTML = html;
    AC.cert.bind(root(), cm);
  }

  // ================================================================= My notes
  function renderNotes() {
    var m = model();
    var LES = AC.data("me-lessons") || {};
    var chN = {}; PATH.chapters.forEach(function (c) { chN[c.id] = c; });
    function info(lessonId, chapterId) {
      var l = LES[lessonId] || {};
      var ch = chN[chapterId || l.ch] || null;
      return { ch: ch, l: l };
    }
    var notes = (m.st.notes || []).map(function (n) { var x = info(n.lesson, n.chapter); return { kind: "note", ch: x.ch, l: x.l, lesson: n.lesson, text: n.text, d: n.d }; });
    var answers = (m.st.answers || []).map(function (a) { var x = info(a.lesson, a.chapter); return { kind: "answer", ch: x.ch, l: x.l, lesson: a.lesson, q: a.q, text: a.text, d: a.d }; });
    var state = { ch: "all", q: "" };
    var chips = PATH.chapters.filter(function (c) { return c.available || notes.concat(answers).some(function (n) { return n.ch && n.ch.id === c.id; }); });
    function where(n) { return n.ch ? t("notes.where", { ch: n.ch.n, l: n.l.n || "?" }) : t("notes.whereUnknown"); }
    function open(n) { return n.ch ? '<a class="me-small-link" href="' + lessonUrl(n.ch.id, n.lesson) + '">' + esc(t("notes.open")) + "</a>" : ""; }
    var el = root();
    el.innerHTML = '<div class="me-notes"><div class="me-notes__main">' +
      '<div class="me-chips" role="group" aria-label="' + esc(t("notes.filter")) + '">' +
      '<button type="button" class="me-chipbtn" data-ch="all" aria-pressed="true">' + esc(t("notes.all")) + "</button>" +
      chips.map(function (c) { return '<button type="button" class="me-chipbtn" data-ch="' + esc(c.id) + '" aria-pressed="false">' + esc(t("notes.chip", { n: c.n, name: c.short })) + "</button>"; }).join("") + "</div>" +
      '<section class="me-section me-notes__kept" aria-labelledby="meKept"><div class="ac-section-head"><h2 class="ac-h2" id="meKept">' + esc(t("notes.kept")) + '</h2><span class="me-meta ac-num" data-count="note"></span></div><div class="me-notegrid" data-list="note"></div></section>' +
      '<section class="me-section" aria-labelledby="meAns"><div class="ac-section-head"><h2 class="ac-h2" id="meAns">' + esc(t("notes.answers")) + '</h2><span class="me-meta ac-num" data-count="answer"></span></div><div class="me-stack-16" data-list="answer"></div></section>' +
      "</div>" +
      '<aside class="me-notes__side"><label class="me-search">' + icon("search", 18) + '<input type="search" placeholder="' + esc(t("notes.search")) + '" aria-label="' + esc(t("notes.search")) + '"></label>' +
      '<section class="ac-card me-bych" aria-labelledby="meByCh"><h2 class="ac-h3" id="meByCh">' + esc(t("notes.byCh")) + "</h2>" +
      chips.map(function (c) { var k = notes.filter(function (n) { return n.ch && n.ch.id === c.id; }).length; return '<div class="me-bych__row"><span>' + esc(t("notes.byChName", { n: c.n, name: c.short })) + '</span><b class="ac-num">' + num(k) + "</b></div>"; }).join("") + "</section>" +
      '<section class="ac-banner me-tip"><div class="me-tip__text"><span class="me-eyebrow-light">' + esc(t("notes.tip.eyebrow")) + "</span><b>" + esc(t("notes.tip.title")) + "</b><span>" + esc(t("notes.tip.text")) + "</span></div>" +
      '<img class="me-tip__rico" src="' + AC.rico("point") + '" alt="' + esc(t("notes.ricoAlt")) + '"></section>' +
      '<section class="ac-card me-stack-8"><b class="ac-h3">' + esc(t("notes.plan.title")) + '</b><span class="me-meta me-meta--14">' + esc(t("notes.plan.text")) + '</span><a class="ac-link" href="' + AC.url("my-plan") + '">' + esc(t("notes.plan.cta")) + "</a></section>" +
      '<span class="me-private">' + icon("shield", 16) + esc(t("notes.private")) + "</span></aside></div>";
    function match(n) {
      if (state.ch !== "all" && (!n.ch || n.ch.id !== state.ch)) return false;
      if (!state.q) return true;
      return [n.text, n.q, n.l.t].join(" ").toLowerCase().indexOf(state.q) >= 0;
    }
    function draw() {
      var ns = notes.filter(match), as = answers.filter(match);
      AC.$('[data-count="note"]', el).textContent = t("notes.count", { n: ns.length });
      AC.$('[data-count="answer"]', el).textContent = t("notes.answerCount", { n: as.length });
      var filtered = state.ch !== "all" || state.q;
      AC.$('[data-list="note"]', el).innerHTML = ns.length ? ns.slice().reverse().map(function (n) {
        return '<article class="me-note"><div class="me-note__top"><span class="me-note__where">' + esc(where(n)) + '</span><span class="me-note__date">' + esc(fmtDate(n.d)) + "</span></div>" +
          '<p class="me-note__text">' + AC.rich(n.text) + '</p><div class="me-note__foot"><span>' + esc(n.l.t || "") + "</span>" + open(n) + "</div></article>";
      }).join("") : '<div class="me-empty"><b>' + esc(filtered ? t("notes.none.filtered") : t("notes.none.title")) + "</b><span>" + esc(filtered ? t("notes.none.filteredText") : t("notes.none.text")) + "</span></div>";
      AC.$('[data-list="answer"]', el).innerHTML = as.length ? as.slice().reverse().map(function (a) {
        return '<article class="me-note me-answer"><div class="me-note__top"><span class="me-note__where">' + esc(where(a)) + '</span><span class="me-note__date">' + esc(fmtDate(a.d)) + "</span></div>" +
          '<b class="ac-h3">' + esc(a.q) + '</b><p class="me-answer__text">' + esc(a.text) + '</p><div class="me-note__foot me-note__foot--plain"><span>' + esc(a.l.t || "") + "</span>" + open(a) + "</div></article>";
      }).join("") : '<div class="me-empty"><b>' + esc(filtered ? t("notes.none.filtered") : t("notes.noAnswers.title")) + "</b><span>" + esc(filtered ? t("notes.none.filteredText") : t("notes.noAnswers.text")) + "</span></div>";
    }
    el.addEventListener("click", function (e) {
      var b = e.target.closest(".me-chipbtn");
      if (!b) return;
      state.ch = b.dataset.ch;
      AC.$$(".me-chipbtn", el).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      draw();
    });
    AC.$(".me-search input", el).addEventListener("input", function (e) { state.q = e.target.value.trim().toLowerCase(); draw(); });
    draw();
  }

  // ================================================================= My Trading Plan
  // Five sections, one per lesson of the last chapter (#ac-index plan). A finished lesson fills its section with
  // Rico's default (engine); the learner edits any filled section and saves.
  function planChapter(m) { var id = m.plan.chapter; return m.chapters.filter(function (c) { return c.id === id; })[0] || m.chapters[m.chapters.length - 1] || null; }
  function planHint(m, sec) {
    var ch = planChapter(m);
    return t("plan.fillsIn", { n: ch ? ch.n : 10, l: sec.n });
  }
  function renderPlan() {
    var el = root(), justSaved = false;
    function draw(focusKey, into) {
      var m = model(), pl = m.plan, ch = planChapter(m);
      var nextSec = pl.sections.filter(function (x) { return !x.filled && !x.done; })[0] || null;
      var playable = nextSec && nextSec.lesson && ch && AC.progress.canPlay(ch.id, nextSec.lesson);
      var rows = pl.sections.map(function (x) {
        var id = "plan-" + x.key, lab = t("plan.f." + x.key, { label: x.label });
        var open = x.filled || x.done;
        var right = open
          ? '<span class="me-from' + (x.filled ? " is-filled" : "") + '">' + esc(t(x.filled && !x.auto ? "plan.fromEdited" : "plan.from", { n: ch ? ch.n : 10, l: x.n })) + "</span>"
          : '<span class="me-lockchip">' + icon("clock", 13, 2.2) + esc(planHint(m, x)) + "</span>";
        var body = open
          ? '<div class="me-planinput"><input id="' + id + '" type="text" data-key="' + esc(x.key) + '" value="' + esc(x.value) + '" placeholder="' + esc(x.fallback ? t("plan.ph", { v: x.fallback }) : "") + '" maxlength="140">' +
            '<button type="button" class="me-planinput__edit" data-edit="' + id + '" aria-label="' + esc(t("plan.edit", { field: lab })) + '">' + icon("pen", 16) + "</button></div>"
          : x === nextSec ? '<div class="me-plan__hint">' + icon("clock", 16) + "<span>" + esc(t("plan.next", { l: x.n, name: lab })) + "</span>" +
            (playable ? '<a class="ac-link me-plan__play" href="' + lessonUrl(ch.id, x.lesson) + '">' + esc(t("plan.play", { l: x.n })) + "</a>" : "") + "</div>" : "";
        return '<div class="me-planrow' + (open ? "" : " is-locked") + '"><div class="me-planrow__head"><label' + (open ? ' for="' + id + '"' : "") + ">" +
          '<span class="me-planrow__n ac-num">' + x.n + "</span>" + esc(lab) + "</label>" + right + "</div>" + body + "</div>";
      }).join("");
      var doc = pl.sections.map(function (x) {
        return '<div class="me-doc__row"><span>' + esc(x.label) + "</span>" + (x.filled ? "<b>" + esc(x.value) + "</b>" : "<i>" + esc(x.done ? t("plan.doc.open") : planHint(m, x)) + "</i>") + "</div>";
      }).join("");
      // after a save: on to the finale when it's ready
      var fin = AC.progress.finishStatus(m.chapters.map(function (c) { return c.id; }));
      var nextBtn = fin.ready && !m.finished ? '<a class="ac-btn ac-btn--ghost" href="' + AC.url(PATH.id + "/finish") + '">' + esc(t("plan.toFinish")) + "</a>" : "";
      var anyOpen = pl.sections.some(function (x) { return x.filled || x.done; });
      var status = justSaved ? t("plan.saved") : pl.saved ? t("plan.savedOn", { date: fmtDate(pl.saved) }) : t("plan.saveHint");
      var saveRow = anyOpen ? '<div class="me-plan__save"><div class="ac-row"><button type="button" class="ac-btn ac-btn--primary" id="mePlanSave">' + icon("check", 18, 2.4) + esc(t("plan.save")) + "</button>" + (justSaved || pl.saved ? nextBtn : "") + "</div>" +
        '<span class="me-meta" role="status" id="mePlanStatus">' + esc(status) + "</span></div>" : "";
      (into || el).innerHTML = '<div class="me-plan"><section class="ac-card me-plan__parts" aria-labelledby="mePlanParts"><div class="me-plan__top"><h2 class="ac-h2" id="mePlanParts">' + esc(t("plan.parts")) + "</h2>" +
        '<div class="me-plan__meter">' + bar(pl.filled / pl.total) + '<span class="ac-num">' + esc(t("plan.filled", { n: pl.filled, total: pl.total })) + "</span></div></div>" + rows +
        (!anyOpen ? '<p class="me-plan__hint">' + icon("clock", 16) + esc(t("plan.allLocked", { n: ch ? ch.n : 10 })) + "</p>" : "") + saveRow + "</section>" +
        '<aside class="me-plan__side"><section class="me-doc" aria-label="' + esc(t("plan.preview")) + '" id="mePlanDoc"><span class="me-doc__brand">' + esc(t("plan.doc.brand", { path: PATH.title })) + "</span>" +
        "<b class=\"me-doc__title\">" + esc(t("plan.doc.title", { name: m.user.name })) + '</b><span class="me-doc__meta">' + esc((pl.complete ? t("plan.doc.complete") : t("plan.doc.draft")) + (pl.saved ? " · " + t("plan.doc.saved", { date: fmtDate(pl.saved) }) : "")) + "</span>" + doc + "</section>" +
        '<div class="me-stack-8"><button type="button" class="ac-btn ac-btn--soft ac-btn--block" id="mePlanPdf"' + (pl.complete ? "" : ' disabled aria-disabled="true"') + ">" + icon("download", 18) + esc(t("plan.pdf")) + "</button>" +
        '<span class="me-meta me-center">' + esc(pl.complete ? t("plan.pdfReady") : t("plan.pdfLater")) + "</span></div>" +
        '<p class="ac-fine">' + esc(t("plan.disclaimer")) + "</p></aside></div>";
      if (focusKey) { var f = document.getElementById("plan-" + focusKey); if (f) f.focus(); }
    }
    el.addEventListener("change", function (e) {
      var inp = e.target.closest("input[data-key]");
      if (!inp) return;
      AC.progress.setPlan(inp.dataset.key, inp.value.trim());
      justSaved = false;
      // refresh the meter, the row chips and the preview in place: a full redraw here would swallow the click
      // (on Save, or on another field) that caused this change
      var tmp = document.createElement("div");
      draw(null, tmp);
      [".me-plan__meter", "#mePlanDoc", "#mePlanPdf", "#mePlanStatus"].forEach(function (sel) {
        var a = AC.$(sel, el), b = AC.$(sel, tmp);
        if (a && b) { a.innerHTML = b.innerHTML; ["disabled", "aria-disabled"].forEach(function (k) { if (b.hasAttribute(k)) a.setAttribute(k, b.getAttribute(k)); else a.removeAttribute(k); }); }
      });
      AC.$$(".me-planrow__head", el).forEach(function (h, i) { var b = AC.$$(".me-planrow__head", tmp)[i]; if (b && h.lastElementChild && b.lastElementChild) h.lastElementChild.outerHTML = b.lastElementChild.outerHTML; });
    });
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-edit]");
      if (b) { var i = document.getElementById(b.dataset.edit); if (i) { i.focus(); i.select(); } }
      if (e.target.closest("#mePlanSave")) {
        var vals = {};
        AC.$$("input[data-key]", el).forEach(function (inp) { vals[inp.dataset.key] = inp.value; });
        AC.progress.savePlan(vals);
        justSaved = true;
        draw();
      }
      if (e.target.closest("#mePlanPdf:not([disabled])")) window.print();
    });
    draw();
  }

  // ================================================================= Top Learners
  function boardList(m) {
    var data = AC.data("me-peers") || { peers: [] };
    var list = data.peers.filter(function (p) { return p.public !== false; }).map(function (p) {
      var lv = AC.progress.levelOf(p.xp);
      return { handle: p.handle, name: p.name, avatar: p.avatar, monthXp: p.monthXp, level: lv.level, rank: lv.rank };
    });
    var settings = AC.progress.settings();
    var guest = AC.auth.isGuest();
    var eligible = !guest && m.lessonsDone > 0;
    var shown = eligible && settings.leaderboard !== false;
    var user = m.user || {};
    var me = { you: true, handle: user.handle || "", name: user.name || "", monthXp: m.s.monthXp, level: m.lv.level, rank: m.lv.rank };
    if (shown) list.push(me);
    list.sort(function (a, b) { return b.monthXp - a.monthXp || (a.you ? -1 : b.you ? 1 : 0); });
    list.forEach(function (p, i) { p.pos = i + 1; });
    return { list: list, me: shown ? me : null, eligible: eligible, guest: guest, optedOut: settings.leaderboard === false };
  }
  function renderBoard() {
    var el = root();
    function draw() {
      var m = model(), b = boardList(m), L = b.list;
      var now = dateOf(AC.progress.day());
      var reset = new Date(now.getFullYear(), now.getMonth() + 1, 1, 12);
      var last = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12);
      var days = Math.max(1, Math.round((reset - now) / 864e5));
      var month = AC.fmt.date(now, { month: "long" });
      var head = '<header class="me-head"><div class="me-head__text"><nav class="me-crumb" aria-label="' + esc(t("me.crumb.aria")) + '"><a href="' + AC.url("") + '">' + esc(t("board.crumbHome")) + '</a><span aria-hidden="true">/</span><span aria-current="page">' + esc(t("board.title")) + '</span></nav><h1 class="ac-h1">' + esc(t("board.title")) + '</h1><p class="ac-lead">' + esc(t("board.lead", { month: month })) + "</p></div>" +
        '<div class="me-head__tools"><span class="me-pill">' + icon("calendar", 16) + "<b>" + esc(t("board.resets", { date: AC.fmt.date(reset, { month: "short", day: "numeric" }) })) + "</b>" + esc(t("board.in", { n: days })) + "</span>" +
        (b.eligible ? '<button type="button" class="me-check" role="switch" aria-checked="' + String(!b.optedOut) + '" id="meBoardToggle"><span class="me-check__box">' + icon("check", 14, 3) + "</span>" + esc(t("board.show")) + "</button>" : "") + "</div></header>";
      // legacy podium: one rounded column per place, tinted by its medal colour, medal on the top edge
      var podium = [L[1], L[0], L[2]].map(function (p) {
        if (!p) return "<div></div>";
        return '<div class="me-podcol me-podcol--' + p.pos + (p.you ? " is-you" : "") + '"><span class="me-podcol__medal">' + p.pos + "</span>" +
          '<span class="me-podcol__ava">' + avatar(p, p.pos === 1 ? "lg" : "md") + "</span>" +
          '<b class="me-podcol__name">' + esc(p.you ? t("board.you") : p.name) + '</b><span class="me-podcol__rank">' + esc(t("board.rankLv", { rank: rankName(p.rank), n: p.level })) + "</span>" +
          '<span class="me-podcol__xp">' + num(p.monthXp) + " " + esc(t("board.xp")) + "</span></div>";
      }).join("");
      var third = L[2];
      var topNote = b.me && b.me.pos <= 3 ? t("board.top3.you") : (b.me && third ? t("board.top3.gap", { xp: num(third.monthXp - b.me.monthXp) }) : t("board.top3.lead"));
      function row(p) {
        if (p.you) {
          return '<li class="me-row is-you"><span class="me-row__pos ac-num">' + p.pos + "</span>" + avatar(p, "md") + '<b class="me-row__name">' + esc(t("board.you")) + "</b>" +
            '<span class="me-rankchip ' + rankStyle(p.rank) + '"><span class="me-dot"></span>' + esc(t("board.rankLv", { rank: rankName(p.rank), n: p.level })) + "</span>" +
            '<span class="me-row__xp"><b class="ac-num">' + num(p.monthXp) + "</b> <span>" + esc(t("board.xp")) + "</span></span></li>";
        }
        // guests can't open profiles (sign-up gate), so their board shows names without a link
        var name = b.guest ? '<span class="me-row__name">' + esc(p.name) + "</span>" : '<a class="me-row__name" href="' + AC.url("u?h=" + encodeURIComponent(p.handle)) + '">' + esc(p.name) + "</a>";
        return '<li class="me-row"><span class="me-row__pos ac-num">' + p.pos + "</span>" + avatar(p, "md") + name +
          '<span class="me-row__rank">' + esc(t("board.rankLv", { rank: rankName(p.rank), n: p.level })) + '</span><span class="me-row__xp"><b class="ac-num">' + num(p.monthXp) + "</b> <span>" + esc(t("board.xp")) + "</span></span></li>";
      }
      // every place below the podium, in one list (legacy layout); your row stays pinned while you scroll
      var top = L.slice(3).map(row).join("");
      var extra = "";   // guests get the sign-up nudge below instead
      if (!b.guest && !b.eligible) extra = '<div class="me-boardnote me-boardnote--cta"><b>' + esc(t("board.empty.title")) + "</b><span>" + esc(t("board.empty.text")) + "</span></div>";
      else if (!b.guest && b.optedOut) extra = '<p class="me-boardnote">' + esc(t("board.hidden")) + "</p>";
      // Rico's nudge
      var nudge;
      if (b.guest) {
        nudge = { title: t("board.nudge.guest"), text: t("board.nudge.guestText"), cta: t("board.cta.signup"), signup: true };
      } else if (!b.eligible) {
        nudge = { title: t("board.nudge.new"), text: t("board.nudge.newText"), cta: t("board.cta.start") };
      } else if (b.me && b.me.pos > 1) {
        var above = L[b.me.pos - 2], gap = above.monthXp - b.me.monthXp + 1;
        nudge = { title: t("board.nudge.pass", { xp: num(gap), name: above.name }), text: gap <= 90 ? (gap <= 30 ? t("board.nudge.gym") : t("board.nudge.one")) : t("board.nudge.many", { n: Math.ceil(gap / 75) }), cta: t("board.cta.continue") };
      } else if (b.me) {
        nudge = { title: t("board.nudge.first"), text: t("board.nudge.firstText"), cta: t("board.cta.continue") };
      } else {
        nudge = { title: t("board.nudge.hidden"), text: t("board.nudge.hiddenText"), cta: t("board.cta.continue") };
      }
      var html = head + '<div class="me-board me-board--stack">' +
        '<section class="ac-card me-podium" aria-labelledby="meTop3"><div class="me-card-head me-card-head--center"><span class="ac-eyebrow" id="meTop3">' + esc(t("board.top3", { month: month })) + '</span><span class="me-meta me-meta--600">' + esc(t("board.final", { date: AC.fmt.date(last, { month: "short", day: "numeric" }) })) + "</span></div>" +
        '<p class="me-meta me-meta--14 me-podium__note">' + esc(t("board.top3.rule")) + " " + esc(topNote) + "</p>" +
        '<div class="me-podium__stage">' + podium + "</div></section>" +
        '<section class="ac-card me-list" aria-label="' + esc(t("board.listAria")) + '"><ol class="me-rows" start="4">' + top + "</ol>" + extra + "</section>" +
        '<section class="ac-banner me-nudge"><div class="me-nudge__text"><b class="ac-h2">' + esc(nudge.title) + "</b><span>" + esc(nudge.text) + '</span><div class="ac-row">' +
        (nudge.signup ? '<button type="button" class="ac-btn ac-btn--white ac-btn--sm" data-action="signup" data-reason="' + esc(t("board.nudge.guestText")) + '">' + esc(nudge.cta) + "</button>" +
          '<a class="ac-btn ac-btn--outline-light ac-btn--sm" href="' + AC.url("learn-to-trade/how-markets-work/bulls-vs-bears") + '">' + esc(t("board.cta.tryLesson")) + "</a>"
          : '<a class="ac-btn ac-btn--white ac-btn--sm" href="' + continueHref(m) + '">' + esc(nudge.cta) + "</a>") +
        (b.eligible ? '<a class="ac-btn ac-btn--outline-light ac-btn--sm" href="' + AC.url("gym") + '">' + esc(t("board.cta.gym", { n: AC.progress.XP.gym })) + "</a>" : "") + "</div></div>" +
        '<img class="me-nudge__rico" src="' + AC.rico("thumbs") + '" alt="' + esc(t("board.ricoAlt")) + '"></section></div>' +
        '<section class="ac-card me-how" aria-label="' + esc(t("board.how")) + '"><b class="ac-eyebrow">' + esc(t("board.how")) + "</b>" +
        ["monthly", "reset", "podium", "hide"].map(function (k) { return '<span class="me-how__item"><span class="me-dot me-dot--mint"></span>' + esc(t("board.how." + k)) + "</span>"; }).join("") +
        '<a class="ac-link me-how__link" href="' + AC.url("how-it-works") + '">' + esc(t("board.howLink")) + "</a></section>";
      el.innerHTML = html;
    }
    el.addEventListener("click", function (e) {
      var b = e.target.closest("#meBoardToggle");
      if (!b) return;
      var on = b.getAttribute("aria-checked") === "true";
      AC.progress.settings({ leaderboard: !on });
      draw();
      var nb = document.getElementById("meBoardToggle"); if (nb) nb.focus();
    });
    draw();
  }

  // ================================================================= Public profile
  function renderProfile() {
    var m = model();
    var h = (location.search.match(/[?&]h=([^&#]+)/) || [])[1];
    h = h ? decodeURIComponent(h) : "";
    var self = !h || h === m.user.handle;
    var p;
    if (self) {
      p = { you: true, name: m.user.name, handle: m.user.handle, xp: m.s.xp, streak: m.s.streak, best: m.s.bestStreak, lessons: m.lessonsDone, challenges: m.passed,
        joined: m.st.created, certs: m.finished ? [PATH.id] : [], certId: m.cert ? m.cert.id : "", chapters: m.chapters };
    } else {
      var peer = ((AC.data("me-peers") || {}).peers || []).filter(function (x) { return x.handle === h; })[0];
      if (!peer || peer.public === false) {
        root().innerHTML = '<nav class="me-crumb"><a href="' + AC.url("leaderboard") + '">' + esc(t("board.title")) + '</a><span aria-hidden="true">/</span><span>' + esc(t("profile.crumb")) + "</span></nav>" +
          '<section class="ac-card me-empty me-empty--big"><b class="ac-h2">' + esc(t("profile.missing.title")) + "</b><span>" + esc(t("profile.missing.text")) + '</span><a class="ac-btn ac-btn--ghost" href="' + AC.url("leaderboard") + '">' + esc(t("profile.missing.cta")) + "</a></section>";
        return;
      }
      p = { name: peer.name, handle: peer.handle, avatar: peer.avatar, xp: peer.xp, streak: peer.streak, best: peer.bestStreak, lessons: Math.min(peer.lessons, PATH.lessons), challenges: peer.challenges,
        joined: peer.joined, certs: peer.certificates || [], certId: (peer.certIds || {})[PATH.id] || "" };
      var left = peer.lessons;
      p.chapters = PATH.chapters.map(function (c, i) {
        var d = Math.max(0, Math.min(c.count, left)); left -= d;
        return { n: c.n, short: c.short, count: c.count, lessonsDone: d, passed: i < peer.challenges, state: i < peer.challenges ? "passed" : d > 0 ? "now" : "todo" };
      });
    }
    var lv = AC.progress.levelOf(p.xp);
    var cur = p.chapters.filter(function (c) { return !c.passed; })[0];
    var pct = PATH.lessons ? p.lessons / PATH.lessons : 0;
    var passed = p.chapters.filter(function (c) { return c.passed; }).length;
    var skills = PATH.skills.map(function (s) { return { name: s.name, after: s.after, got: passed >= s.after }; });
    var skIcons = ["chart", "shield", "plan"];
    var isPublic = AC.progress.settings().publicProfile === true;   // off by default (Settings > Privacy)
    var html = '<div class="me-proftop"><nav class="me-crumb" aria-label="' + esc(t("me.crumb.aria")) + '">' +
      (self ? '<a href="' + AC.url("me") + '">' + esc(t("me.title")) + "</a>" : '<a href="' + AC.url("leaderboard") + '">' + esc(t("board.title")) + "</a>") +
      '<span aria-hidden="true">/</span><span aria-current="page">' + esc(t("profile.crumb")) + "</span></nav>" +
      (self ? '<span class="me-pill">' + icon(isPublic ? "eye" : "shield", 16) + "<span>" + esc(isPublic ? t("profile.visible") : t("profile.visibleOff")) + ' <a href="' + AC.url("settings") + '">' + esc(t("profile.settings")) + "</a></span></span>" : "") + "</div>";
    html += '<section class="me-prof ' + rankStyle(lv.rank) + '" aria-labelledby="meProfName">' + avatar(p, "hero") +
      '<div class="me-prof__id"><span class="me-prof__chip"><span class="me-dot me-dot--white"></span>' + esc(t("me.rank.title", { rank: rankName(lv.rank), n: lv.level })) + "</span>" +
      '<h1 class="ac-h1" id="meProfName">' + esc(p.name) + "</h1><span>" + esc(t("profile.joined", { date: monthYear(String(p.joined).slice(0, 7)), handle: p.handle || "" })) + "</span></div>" +
      '<div class="me-rank__next me-prof__lvl"><div class="me-rank__row"><b>' + esc(t("me.rank.level", { n: lv.level })) + '</b><b class="ac-num">' + num(p.xp) + " <span>/ " + esc(t("common.xp", { n: lv.levelTo })) + "</span></b></div>" +
      bar(lv.progress, "me-bar--light") + '<div class="me-rank__row"><span>' + esc(t("me.rank.togo", { xp: num(lv.levelTo - p.xp), n: lv.level + 1 })) + "</span>" +
      (lv.nextRank ? "<span>" + esc(t("profile.nextAt", { rank: rankName(lv.nextRank), xp: num(lv.nextRankAt) })) + "</span>" : "") + "</div></div>" +
      '<img class="me-prof__look" src="' + AC.rankLook(lv.rank) + '" alt="' + esc(t("profile.lookAlt", { name: p.name, rank: rankName(lv.rank) })) + '"></section>';
    var stats = [["flame", "streak", t("profile.streak", { n: p.streak }), t("profile.best", { n: p.best }), true],
      ["book", "mint", t("profile.lessons", { n: p.lessons }), t("profile.lessonsIn", { path: PATH.title })],
      ["shieldOk", "mint", t("me.frac", { a: num(passed), b: num(PATH.chapters.length) }), t("profile.challenges")]];
    html += '<section class="me-stats me-stats--3" aria-label="' + esc(t("profile.statsAria")) + '">' + stats.map(function (x) {
      return '<div class="me-stat"><span class="me-icon-sq me-icon-sq--48 me-tone-' + x[1] + '">' + icon(x[0], 22) + '</span><span class="me-stat__text"><b class="ac-num' + (x[4] ? " me-streak" : "") + '">' + esc(x[2]) + "</b><span>" + esc(x[3]) + "</span></span></div>";
    }).join("") + "</section>";
    var finishedPath = passed >= PATH.chapters.length;
    html += '<div class="me-split me-split--prof"><section class="me-pathcard" aria-labelledby="meProfPath"><div class="me-pathcard__cover"><img src="' + AC.base + 'static/img/art/path-ltt.webp" alt=""></div>' +
      '<div class="me-pathcard__body"><span class="ac-eyebrow">' + esc(finishedPath ? t("profile.pathDone") : t("profile.pathNow")) + '</span><div class="me-card-head me-card-head--base"><h2 class="ac-h2" id="meProfPath">' + esc(PATH.title) + '</h2><b class="me-up me-pathcard__pct ac-num">' + AC.fmt.pct(pct) + "</b></div>" +
      '<div class="me-segs me-segs--thin" aria-hidden="true">' + p.chapters.map(function (c) {
        var w = c.passed ? 100 : Math.round(c.lessonsDone / c.count * 100);
        return '<span class="me-seg me-seg--track"><i style="width:' + w + '%"></i></span>';
      }).join("") + "</div>" +
      '<div class="me-tiles3"><div class="me-tilebox"><b class="ac-num">' + esc(t("me.ofTotal", { a: num(p.lessons), b: num(PATH.lessons) })) + '</b><span class="me-meta">' + esc(t("profile.tile.lessons")) + "</span></div>" +
      (cur ? '<div class="me-tilebox"><b>' + esc(t("profile.tile.chapter", { n: cur.n })) + '</b><span class="me-meta">' + esc(t("profile.tile.chapterText", { name: cur.short, n: Math.min(cur.lessonsDone + 1, cur.count), total: cur.count })) + "</span></div>" : "") +
      (finishedPath ? '<div class="me-tilebox"><b>' + esc(t("profile.tile.cert")) + '</b><span class="me-meta">' + esc(t("profile.tile.certText")) + "</span></div>"
        : '<div class="me-tilebox"><b>' + esc(t("profile.tile.left", { n: PATH.chapters.length - passed })) + '</b><span class="me-meta">' + esc(t("profile.tile.leftText")) + "</span></div>") + "</div></div></section>" +
      '<div class="me-col"><section class="ac-card me-profskills" aria-labelledby="meProfSk"><div class="me-card-head me-card-head--base"><h2 class="ac-h3" id="meProfSk">' + esc(t("me.skills.title")) + '</h2><span class="me-meta">' + esc(t("me.skills.count", { n: skills.filter(function (s) { return s.got; }).length, total: skills.length })) + "</span></div>" +
      skills.map(function (s, i) {
        return '<div class="me-pskill' + (s.got ? " is-got" : "") + '"><span class="me-pskill__icon">' + icon(skIcons[i] || "chart", 18) + '</span><span class="me-skill__text"><b>' + esc(s.name) + "</b><span>" +
          esc(s.got ? (s.after >= PATH.chapters.length ? t("profile.skillFinished", { path: PATH.title }) : t("profile.skillGot", { n: s.after })) : (s.after >= PATH.chapters.length ? t("me.skills.finish", { path: PATH.title }) : t("me.skills.how", { n: s.after }))) + '</span></span><span class="me-pskill__tag">' + esc(s.got ? t("profile.unlocked") : t("profile.locked")) + "</span></div>";
      }).join("") + "</section>" +
      '<section class="ac-card me-profcert" aria-labelledby="meProfCert"><span class="me-icon-sq me-icon-sq--44">' + icon("medal", 22) + '</span><span class="me-skill__text"><h2 class="ac-h3" id="meProfCert">' +
      esc(p.certs.length ? t("profile.certs", { n: p.certs.length }) : t("profile.certsNone")) + "</h2><span>" + esc(p.certs.length ? t("profile.certsText", { path: PATH.title }) : t("profile.certsNoneText")) + "</span>" +
      (p.certId ? '<a class="ac-link me-profcert__link" href="' + esc(AC.certs.pageUrl(p.certId)) + '">' + esc(t("profile.viewCert")) + "</a>" : "") + "</span></section></div></div>";
    if (self) html += '<div class="ac-card me-privacy">' + '<span class="me-privacy__text">' + icon("shield", 18) + esc(isPublic ? t("profile.privacy") : t("profile.privacyOff")) + '</span><a class="ac-link" href="' + AC.url("settings") + '">' + esc(t("profile.edit")) + "</a></div>";
    root().innerHTML = html;
  }

  // ================================================================= Rico's Gym overview
  function renderGym() {
    var m = model();
    var IDEAS = AC.data("me-ideas") || {};
    var today = AC.progress.day();
    var due = AC.progress.gymQueue();
    var all = AC.progress.gymIdeas();
    var later = all.filter(function (g) { return g.due > today; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
    var week = later.filter(function (g) { return (dateOf(g.due) - dateOf(today)) / 864e5 <= 7; });
    var sessions = m.gymSessions;   // every session counts (a day can hold several; only the first pays XP)
    function title(id) { if (IDEAS[id] && IDEAS[id].name) return IDEAS[id].name; return id.replace(/-/g, " ").replace(/^./, function (c) { return c.toUpperCase(); }); }
    function from(id) { var x = IDEAS[id]; return x ? (x.l ? t("gym.from", { n: x.ch, name: x.short, l: x.l }) : t("gym.fromCh", { n: x.ch, name: x.short })) : t("gym.fromUnknown"); }
    function when(g) {
      var d = Math.round((dateOf(g.due) - dateOf(today)) / 864e5);
      return d <= 0 ? t("gym.when.today") : d === 1 ? t("gym.when.tomorrow") : t("gym.when.days", { n: d });
    }
    function row(g, kind) {
      var r = (g.rights || []).length;
      return '<div class="me-idea me-idea--' + kind + '"><span class="me-idea__text"><b>' + esc(title(g.idea)) + "</b><span>" + esc(from(g.idea)) + "</span></span>" +
        '<span class="me-idea__pips" aria-label="' + esc(t("gym.right", { n: r })) + '"><i class="' + (r >= 1 ? "on" : "") + '"></i><i class="' + (r >= 2 ? "on" : "") + '"></i>' + esc(t("gym.right", { n: r })) + "</span>" +
        '<span class="me-idea__when">' + esc(when(g)) + "</span></div>";
    }
    var n = due.length;
    var html;
    if (n) {
      html = '<section class="me-hero me-hero--green me-gymhero" aria-labelledby="meGymToday"><div class="me-hero__text"><span class="me-eyebrow-light">' + esc(t("gym.today")) + "</span>" +
        '<h2 class="ac-h1" id="meGymToday">' + esc(t("gym.session", { cards: t("gym.cards", { n: n }), minutes: t("gym.minutes", { n: Math.max(1, Math.round(n * 0.4)) }) })) + '</h2><p class="ac-lead">' + esc(t("gym.todayText")) + "</p>" +
        '<div class="ac-row"><a class="ac-btn ac-btn--white ac-btn--lg" href="' + AC.url("gym/today") + '">' + esc(t("gym.start")) + icon("chevron", 18, 2.4) + '</a><span class="ac-chip ac-chip--hero ac-num">' + esc(t("me.plusXp", { n: AC.progress.XP.gym })) + "</span></div></div>" +
        '<div class="me-gymhero__rico"><p class="me-bubble">' + esc(t("gym.bubble", { n: n, idea: title(due[0].idea) })) + '</p><img src="' + AC.rico("point") + '" alt="' + esc(t("gym.ricoAlt")) + '"></div></section>';
    } else {
      // nothing due: a brand-new learner (nothing played yet) gets a "play a lesson first" state, not "all caught up"
      var fresh = !all.length && !m.lessonsDone;
      var k = fresh ? "gym.empty" : "gym.done";
      html = '<section class="me-hero me-hero--green me-gymhero" aria-labelledby="meGymToday"><div class="me-hero__text"><span class="me-eyebrow-light">' + esc(t("gym.today")) + "</span>" +
        '<h2 class="ac-h1" id="meGymToday">' + esc(t(k + ".title")) + '</h2><p class="ac-lead">' + esc(fresh ? t("gym.empty.text") : all.length ? t("gym.done.textLater", { n: all.length }) : t("gym.done.text")) + "</p>" +
        '<div class="ac-row"><a class="ac-btn ac-btn--white ac-btn--lg" href="' + continueHref(m) + '">' + esc(t(k + ".cta")) + icon("chevron", 18, 2.4) + "</a></div></div>" +
        '<div class="me-gymhero__rico"><p class="me-bubble">' + esc(t(k + ".bubble")) + '</p><img src="' + AC.rico(fresh ? "point" : "thumbs") + '" alt="' + esc(fresh ? t("gym.ricoAlt") : t("gym.ricoThumbs")) + '"></div></section>';
    }
    var stats = [[num(n), t("gym.stat.due"), "streak"], [num(week.length), t("gym.stat.week"), ""], [num(all.length), t("gym.stat.review"), "mint"], [num(sessions), t("gym.stat.sessions"), ""]];
    html += '<section class="me-stats" aria-label="' + esc(t("gym.statsAria")) + '">' + stats.map(function (x) {
      return '<div class="me-stat me-stat--col"><b class="ac-num me-big me-tone-text-' + (x[2] || "plain") + '">' + x[0] + "</b><span>" + esc(x[1]) + "</span></div>";
    }).join("") + "</section>";
    var src = {};
    due.forEach(function (g) { var x = IDEAS[g.idea]; var k = x ? t("gym.srcName", { n: x.ch, name: x.short }) : t("gym.srcOther"); src[k] = (src[k] || 0) + 1; });
    var srcKeys = Object.keys(src).sort(function (a, b) { return src[b] - src[a]; });
    var srcMax = Math.max.apply(null, srcKeys.map(function (k) { return src[k]; }).concat([1]));
    var revCh = m.current && m.current.available ? m.current : m.chapters.filter(function (c) { return c.available; }).pop();
    html += '<div class="me-split me-split--gym"><section class="ac-card me-due" aria-labelledby="meDue"><div class="me-card-head me-card-head--base"><h2 class="ac-h2" id="meDue">' + esc(t("gym.due")) + '</h2><span class="me-meta me-meta--600">' + esc(t("gym.dueMeta", { n: n })) + "</span></div>" +
      (n ? '<div class="me-stack-8">' + due.map(function (g) { return row(g, "due"); }).join("") + "</div>" : '<div class="me-empty"><b>' + esc(t("gym.dueNone")) + "</b><span>" + esc(t("gym.dueNoneText")) + "</span></div>") +
      (later.length ? '<h3 class="ac-eyebrow me-due__later">' + esc(t("gym.later")) + '</h3><div class="me-stack-8">' + later.slice(0, 5).map(function (g) { return row(g, "later"); }).join("") + "</div>" +
        (later.length > 5 ? '<p class="me-meta me-due__more">' + esc(t("gym.laterMore", { n: later.length - 5 })) + "</p>" : "") : "") + "</section>" +
      '<aside class="me-col">' +
      (srcKeys.length && !(srcKeys.length === 1 && srcKeys[0] === t("gym.srcOther")) ? '<section class="ac-card me-src" aria-labelledby="meSrc"><h2 class="ac-h3" id="meSrc">' + esc(t("gym.src")) + "</h2>" + srcKeys.map(function (k) {
        return '<div class="me-src__row"><span>' + esc(k) + '</span><span class="me-src__bar"><i style="width:' + Math.round(src[k] / srcMax * 100) + '%"></i></span><b class="ac-num">' + num(src[k]) + "</b></div>";
      }).join("") + "</section>" : "") +
      '<section class="ac-card me-howlist" aria-labelledby="meGymHow"><h2 class="ac-h3" id="meGymHow">' + esc(t("gym.how")) + "</h2>" + [1, 2, 3].map(function (i) {
        return '<div class="me-howlist__row"><span class="me-howlist__n">' + i + '</span><p class="me-meta me-meta--14">' + esc(t("gym.how." + i)) + "</p></div>";
      }).join("") + "</section>" +
      (revCh ? '<section class="ac-card me-stack-12 me-grow" aria-labelledby="meRev"><h2 class="ac-h3" id="meRev">' + esc(t("gym.review")) + '</h2><p class="me-meta me-meta--14">' + esc(t("gym.reviewText")) + "</p>" +
        '<a class="ac-btn ac-btn--ghost ac-btn--sm me-self-start" href="' + AC.url("gym/today?chapter=" + encodeURIComponent(revCh.id)) + '">' + esc(t("gym.reviewCta", { n: revCh.n, name: revCh.short })) + "</a></section>" : "") +
      "</aside></div>";
    root().innerHTML = html;
  }

  // ================================================================= Path finale
  function renderFinish() {
    var el = root();
    var justFinished = null;
    function draw() {
      var m = model();
      var ready = m.passed === m.total;
      var planDone = m.planDone;
      var done = m.finished;
      var canFinish = ready && planDone && !done;
      var heroTitle = done ? t("finish.done.title", { path: PATH.title }) : ready ? t("finish.ready.title") : t("finish.locked.title", { path: PATH.title });
      var heroText = done ? t("finish.done.text") : ready ? t("finish.ready.text") : t("finish.locked.text", { n: m.total - m.passed });
      var pose = done || ready ? "celebrate" : "point2";
      var html = '<header class="me-hero me-hero--green me-finhero"><div class="me-hero__text"><nav class="me-crumb me-crumb--light" aria-label="' + esc(t("me.crumb.aria")) + '"><a href="' + AC.url(PATH.id) + '">' + esc(PATH.title) +
        '</a><span aria-hidden="true">/</span><span aria-current="page">' + esc(t("finish.crumb")) + "</span></nav>" +
        '<h1 class="ac-h1">' + esc(heroTitle) + '</h1><p class="ac-lead">' + esc(heroText) + "</p>" +
        '<div class="me-finchs" aria-label="' + esc(t("finish.passed", { a: m.passed, b: m.total })) + '"><div class="me-finchs__row">' + m.chapters.map(function (c) {
          return '<span class="me-finch' + (c.passed ? " is-passed" : c.state === "now" ? " is-now" : "") + '" title="' + esc(t("finish.chTitle", { n: c.n, name: c.short }) + " · " + (c.passed ? t("me.ch.passed") : c.state === "now" ? t("finish.inProgress") : t("me.ch.todo"))) + '">' + (c.passed ? icon("check", 14, 3) : c.n) + "</span>";
        }).join("") + '</div><b>' + esc(t("finish.passed", { a: num(m.passed), b: num(m.total) })) + "</b></div></div>" +
        '<img class="me-hero__rico me-hero__rico--lg" src="' + AC.rico(pose) + '" alt="' + esc(done || ready ? t("finish.ricoCelebrate") : t("finish.ricoPoint")) + '"></header>';
      if (justFinished) {
        // the finale moment: what you just collected, in big numbers
        html += '<section class="ac-card me-finale" role="status" aria-labelledby="meFinale"><div class="me-finale__head"><span class="me-icon-round me-icon-round--lg">' + icon("medal", 28) + "</span>" +
          '<div class="me-stack-4"><span class="ac-eyebrow me-up">' + esc(t("finish.finale.eyebrow")) + '</span><h2 class="ac-h2" id="meFinale">' + esc(t("finish.finale.title", { path: PATH.title })) + "</h2></div></div>" +
          '<div class="me-finale__grid">' +
          '<div class="me-finale__item"><span class="me-icon-sq me-icon-sq--44 me-tone-mint">' + icon("medal", 22) + '</span><b>' + esc(t("finish.finale.cert")) + "</b><span>" + esc(m.cert ? t("finish.dated", { date: fmtDate(m.cert.d) }) : "") + "</span></div>" +
          '<div class="me-finale__item"><span class="me-icon-sq me-icon-sq--44 me-tone-mint">' + icon("bolt", 22) + '</span><b class="ac-num me-up">' + esc(t("me.plusXp", { n: num(justFinished.xp || PATH.finale.xp) })) + "</b><span>" + esc(t("finish.r.xp")) + "</span></div>" +
          '<div class="me-finale__item"><span class="me-icon-sq me-icon-sq--44 me-tone-amber">' + coinSvg(24) + '</span><b class="ac-num me-amber">' + esc(t("finish.r.coins", { n: num(justFinished.coins || PATH.finale.coins) })) + "</b><span>" + esc(t("finish.r.coinsText")) + "</span></div>" +
          '</div><div class="ac-row"><a class="ac-btn ac-btn--primary" href="' + AC.url("me/certificates") + '">' + esc(t("finish.btn.cert")) + '</a><a class="ac-btn ac-btn--ghost" href="' + AC.url("me/rewards") + '">' + esc(t("finish.finale.rewards")) + "</a></div></section>";
      }
      // step 1: plan
      var planRows = m.plan.sections.map(function (x) {
        return '<div class="me-finplan__row"><span>' + esc(x.label) + "</span>" + (x.filled ? "<b>" + esc(x.value) + "</b>" : "<i>" + esc(x.done ? t("plan.doc.open") : planHint(m, x)) + "</i>") + "</div>";
      }).join("");
      html += '<div class="me-split me-split--even"><section class="ac-card me-step" aria-labelledby="meS1"><div class="me-step__head"><span class="me-step__n">1</span><h2 class="ac-h2" id="meS1">' + esc(t("finish.s1")) + "</h2>" +
        (planDone ? '<span class="me-tag me-tag--ok">' + icon("check", 14, 3) + esc(t("finish.complete")) + "</span>" : '<span class="me-tag me-tag--muted">' + esc(t("plan.filled", { n: m.planFilled, total: m.planTotal })) + "</span>") + "</div>" +
        '<div class="me-finplan">' + planRows + "</div>" +
        '<div class="me-step__foot"><a class="ac-btn ac-btn--ghost ac-btn--sm" href="' + AC.url("my-plan") + '">' + icon("pen", 16) + esc(planDone ? t("finish.editPlan") : t("finish.openPlan")) + '</a><span class="me-meta">' + esc(planDone ? t("finish.changeAny") : t("finish.planLater")) + "</span></div></section>";
      // step 2: finish
      var rewards = [["bolt", "mint", t("me.plusXp", { n: PATH.finale.xp }), t("finish.r.xp")], ["coin", "amber", t("finish.r.coins", { n: num(PATH.finale.coins) }), t("finish.r.coinsText")],
        ["medal", "mint", t("finish.r.cert"), t("finish.r.certText")], ["list", "mint", (PATH.skills[PATH.skills.length - 1] || {}).name || "", t("finish.r.skill")]];
      var lockMsg = done ? t("finish.btn.done") : !ready ? t("finish.btn.locked", { n: m.total - m.passed }) : !planDone ? t("finish.btn.plan") : "";
      html += '<section class="ac-card me-step me-step--glow' + (done ? " is-done" : "") + '" aria-labelledby="meS2"><div class="me-step__intro"><div class="me-stack-12"><div class="me-step__head"><span class="me-step__n me-step__n--on">2</span><h2 class="ac-h2" id="meS2">' + esc(t("finish.s2")) + "</h2></div>" +
        '<p class="me-meta me-meta--15">' + esc(done ? t("finish.s2.done") : t("finish.s2.text")) + "</p></div></div>" +
        '<div class="me-rewards">' + rewards.map(function (r) {
          return '<div class="me-reward"><span class="me-icon-sq me-icon-sq--40 me-tone-' + r[1] + '">' + icon(r[0], 20) + '</span><span class="me-stat__text"><b class="ac-num">' + esc(r[2]) + "</b><span>" + esc(r[3]) + "</span></span></div>";
        }).join("") + "</div>" +
        (canFinish ? '<button type="button" class="ac-btn ac-btn--primary ac-btn--lg ac-btn--block" id="meFinish">' + esc(t("finish.btn")) + "</button>"
          : done ? '<a class="ac-btn ac-btn--soft ac-btn--lg ac-btn--block" href="' + AC.url("me/certificates") + '">' + esc(t("finish.btn.cert")) + "</a>"
            : '<button type="button" class="ac-btn ac-btn--lg ac-btn--block" disabled aria-disabled="true" aria-describedby="meFinishWhy">' + icon("clock", 18) + esc(t("finish.btn")) + "</button>") +
        '<span class="me-meta me-center" id="meFinishWhy">' + esc(lockMsg || t("finish.free", { path: PATH.title })) + "</span></section></div>";
      // certificate preview
      var cm = certModel(m);
      html += '<section class="ac-card me-finCert" aria-labelledby="meFinCert"><div class="me-finCert__stage"><span class="me-certtag' + (done ? " is-yours" : "") + '">' + esc(done ? t("finish.tag.yours") : t("finish.tag.preview")) + "</span>" + AC.cert.html(cm).replace("ac-cert ", "ac-cert ac-cert--lift ") + "</div>" +
        '<div class="me-stack-12"><span class="ac-eyebrow">' + esc(t("finish.after")) + '</span><h2 class="ac-h2" id="meFinCert">' + esc(t("finish.share.title")) + '</h2><p class="me-meta me-meta--15">' + esc(done ? t("finish.share.done") : t("finish.share.text")) + "</p>" +
        '<div class="ac-row me-certbtns">' + (done && m.cert
          ? certButtons(cm, "sm")
          : '<button type="button" class="ac-btn ac-btn--ghost ac-btn--sm" disabled aria-disabled="true">' + esc(t("cert.act.li")) + '</button><button type="button" class="ac-btn ac-btn--ghost ac-btn--sm" disabled aria-disabled="true">' + esc(t("cert.act.pdf")) + "</button>") + "</div>" +
        (done && m.cert ? '<span class="me-meta">' + esc(t("certs.verifyAt", { url: cm.url.replace(/^https:\/\/www\./, "") })) + "</span>" : "") + "</div></section>";
      // what's next
      var next = proCatalog().filter(function (p) { return !p.live; }).slice(0, 3);   // the first Pro paths, in catalog order
      html += '<section class="me-section" aria-labelledby="meNext"><div class="ac-section-head"><h2 class="ac-h2" id="meNext">' + esc(t("finish.next")) + '</h2><a class="ac-link" href="' + AC.url("paths") + '">' + esc(t("finish.allPaths")) + "</a></div>" +
        '<div class="me-nextgrid"><div class="ac-card me-practice"><span class="me-icon-sq me-icon-sq--44 me-tone-mint">' + icon("trend", 22) + '</span><span class="ac-eyebrow me-up">' + esc(t("finish.practice")) + '</span><b class="ac-h3">' + esc(t("finish.practice.title")) + '</b><span class="me-meta me-meta--14">' + esc(t("finish.practice.text")) + "</span>" +
        '<a class="ac-btn ac-btn--primary ac-btn--sm me-push" href="' + AC.root + 'index.html">' + esc(t("finish.practice.cta")) + "</a></div>" +
        next.map(function (p) {
          return '<a class="me-nextpath" href="' + AC.url("paths/" + p.id) + '"><span class="me-nextpath__cover"><img src="' + AC.base + "static/img/art/" + p.art + '" alt=""></span><span class="me-nextpath__body"><span class="ac-eyebrow me-pro">' + esc(t("finish.proFree")) + "</span><b>" + esc(p.title) + '</b><span class="me-meta me-meta--14">' + esc(p.outcome) + "</span></span></a>";
        }).join("") + '</div><span class="me-meta">' + esc(t("finish.strategist")) + "</span></section>";
      html += '<p class="ac-fine">' + esc(t("footer.disclaimer")) + "</p>";
      el.innerHTML = html;
    }
    AC.cert.bind(el, function () { var m = model(); return m.finished && m.cert ? certModel(m) : null; });
    el.addEventListener("click", function (e) {
      if (!e.target.closest("#meFinish")) return;
      var res = AC.progress.finishPath(PATH.id, PATH.chapters.map(function (c) { return c.id; }));
      if (res.ok) justFinished = res;
      draw();
      window.scrollTo({ top: 0, behavior: AC.reducedMotion() ? "auto" : "smooth" });
      // +500 XP can cross a rank: show the rank-up (static/js/rankup.js) on top of the finale
      if (res.ok && res.rankUp && typeof AC.rankUp === "function") AC.rankUp(res);
      // coin + confetti burst from the finale card (static/js/celebrate.js; nothing under reduced motion)
      if (res.ok && res.xp && typeof AC.celebrate === "function") AC.celebrate(AC.$(".me-finale", el) || el, { coins: 8, pieces: 36 });
    });
    draw();
  }

  // ---------------------------------------------------------------- boot
  var PAGES = { me: renderProgress, rewards: renderRewards, certs: renderCerts, notes: renderNotes, plan: renderPlan, board: renderBoard, profile: renderProfile, gym: renderGym, finish: renderFinish };
  AC.ready(function () {
    var wrap = AC.$("[data-me-page]");
    if (!wrap) return;
    var area = wrap.getAttribute("data-me-page");
    if (AC.auth.isGuest() && area !== "board") return;   // Top Learners is open to guests; the rest need an account
    var fn = PAGES[area];
    if (fn) fn();
  });
})();
