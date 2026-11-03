/* Profit.com Academy · Rico's Gym session (route gym/today).
   Up to 5 due ideas from AC.progress.gymQueue(), each shown as one of its questions (inlined idea index), with the
   same option rows and feedback sheet as lessons. gymAnswer per card; finish → completeGym (+30 XP once a day).
   ?chapter=<id> (Gym page "Chapter review"): that chapter's ideas, up to 5, even if not due.
   ?idea=<idea> (a row on the Gym page, due or coming up): just that idea's card, then back to the Gym.
   Preview: ?state=right|wrong (first card) · ?state=done · ?state=empty (on a throwaway copy of progress, never saved) */
(function () {
  "use strict";
  var AC = window.AC;
  var esc = function (s) { return AC.esc(s); };
  var MAX = 5;

  AC.ready(function () {
    var D = AC.data("ac-gym");
    var host = document.getElementById("acPlayer");
    if (!D || !host) return;
    var gymUrl = AC.url("gym");
    var st = AC.cards.param("state"), only = AC.cards.param("chapter"), one = AC.cards.param("idea");
    if (st) AC.progress.sandbox();

    // ---------------------------------------------------------------- which ideas, which question
    var dayN = Math.floor(Date.now() / 864e5);
    function isScorable(q) { return q.challenge || (q.card && (q.card.options || q.card.kind === "sort")); }
    function pickQuestion(idea, k) {
      var qs = (D.ideas[idea] || []).filter(isScorable);
      return qs.length ? qs[(dayN + k) % qs.length] : null;
    }
    var queue;
    if (only && D.chapters[only]) {
      var seen = {};
      queue = Object.keys(D.ideas).filter(function (idea) { return D.ideas[idea].some(function (q) { return q.chapter === only; }); })
        .filter(function (i) { return !seen[i] && (seen[i] = 1); });
      var due = AC.progress.gymIdeas().map(function (g) { return g.idea; });
      queue.sort(function (a, b) { return (due.indexOf(b) >= 0) - (due.indexOf(a) >= 0); });
      queue = queue.slice(0, MAX);
    } else if (one && D.ideas[one]) {
      queue = [one];
    } else {
      queue = AC.progress.gymQueue().map(function (g) { return g.idea; });
    }
    if (st === "empty") queue = [];
    if (!queue.length && (st === "right" || st === "wrong" || st === "done")) queue = Object.keys(D.ideas).slice(0, MAX);   // preview with sample ideas
    var cards = queue.map(function (idea, k) { var q = pickQuestion(idea, k); if (!q && only) return null; return q ? { idea: idea, q: q } : null; }).filter(Boolean).slice(0, MAX);

    var ctl = null;
    var F = AC.cards.frame({ close: gymUrl, closeLabel: AC.t("gym.session.close"), heading: AC.t("gym.session.heading"), aside: cards.length ? AC.t("gym.session.count", { i: 1, n: cards.length }) : "", segments: cards.length,
      keys: function () { return ctl; } });
    host.innerHTML = "";
    host.appendChild(F.el);
    var onCta = null;
    F.cta.addEventListener("click", function () { if (!F.cta.disabled && onCta) onCta(); });

    function where(q) {
      var c = D.chapters[q.chapter] || {};
      if (q.challenge) return AC.t("gym.session.fromChallenge", { ch: c.n, short: c.short });
      var l = D.lessons[q.lesson] || {};
      return AC.t("gym.session.fromLesson", { ch: c.n, short: c.short, n: l.n });
    }

    // ---------------------------------------------------------------- empty: all caught up
    if (!cards.length) {
      F.layout("card");
      F.main.innerHTML = '<section class="ac-c ac-cele">' + AC.cards.rico("thumbs", "ac-cele__rico") + '<span class="ac-cele__eb ac-cele__eb--mint">' + esc(AC.t("gym.session.heading")) + "</span>" +
        '<h1 class="ac-c__title">' + esc(AC.t("gym.session.empty.title")) + '</h1><p class="ac-c__text">' + esc(AC.t("gym.session.empty.text")) + "</p></section>";
      F.setCta({ label: AC.t("gym.session.empty.cta") }); onCta = function () { F.go(AC.url("learn-to-trade")); };
      F.extra.appendChild(AC.cards.ghost(AC.t("gym.session.done.back"), gymUrl));
      return;
    }

    var i = 0, right = 0;
    function show() {
      var item = cards[i], q = item.q;
      F.clear(); F.layout("card"); F.setProgress(i, false); F.setAside(AC.t("gym.session.count", { i: i + 1, n: cards.length }));
      var ctx = {
        mode: "gym",
        answer: function (slot, ok) { AC.progress.gymAnswer(item.idea, ok); if (ok) right++; return {}; },
        changed: function () { F.setCta(ctl.cta()); },
      };
      var name = (D.names && D.names[item.idea]) || "";
      var meta = '<div class="ac-gym-meta"><span>' + esc(AC.t("gym.session.from", { where: where(q) })) + "</span>" + (name ? '<span class="ac-eb__chip">' + esc(name) + "</span>" : "") + "</div>";
      if (q.challenge) {
        var c = q.challenge;
        ctl = AC.cards.mcq({ type: "challenge", title: c.q }, {
          eyebrow: AC.t("gym.session.eyebrow"), tone: "primary", head: meta + '<h2 class="ac-c__title">' + AC.rich(c.q) + "</h2>",
          options: c.options.map(function (o) { return { text: o }; }), answer: c.answer, why: c.why, gym: false, slot: "gym", idea: item.idea,
        }, ctx);
        ctl.el.classList.add("ac-ch-q");
      } else {
        ctl = AC.cards.render(q.card, ctx);
        ctl.el.insertBefore(AC.h(meta), ctl.el.children[1] || null);
      }
      F.main.appendChild(ctl.el);
      F.setRico(ctl.bubble, ctl.side);
      F.setCta(ctl.cta());
      onCta = function () {
        var r = ctl.primary();
        if (r === "next") { i++; return i < cards.length ? show() : finish(); }
        if (ctl.sheet && !ctl.sheetPlaced) { ctl.sheetPlaced = true; F.placeSheet(ctl.sheet); F.setProgress(i, true); }
        var c2 = ctl.cta();
        if (ctl.answered) c2 = { label: i + 1 < cards.length ? AC.t("gym.session.next") : AC.t("gym.session.finish") };
        F.setCta(c2);
      };
      if (i) { var h = AC.$(".ac-c__title", ctl.el); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } }
    }

    // ---------------------------------------------------------------- session done
    function finish() {
      var res = AC.progress.completeGym(cards.length);
      F.clear(); F.layout("done");
      AC.$$(".ac-pl__prog span", F.el).forEach(function (s) { s.className = "is-done"; });
      F.setAside("");
      F.main.innerHTML = '<div class="ac-done"><div class="ac-done__hero">' + AC.cards.rico("celebrate", "ac-done__rico") + '<div class="ac-done__head"><span class="ac-done__eb ac-done__eb--mint">' + esc(AC.t("gym.session.done.eyebrow")) + "</span>" +
        '<h1 class="ac-done__title">' + esc(AC.t(right ? "gym.session.done.title" : "gym.session.done.titleZero")) + '</h1><p class="ac-done__sub">' + esc(AC.t("gym.session.done.text")) + "</p></div></div>" +
        '<div class="ac-done__cards"><div class="ac-done__card ac-done__xp"><div class="ac-done__row"><span>' + esc(AC.t("gym.session.done.right", { right: right, n: cards.length })) + "</span></div>" +
        (res.xp ? '<div class="ac-done__total"><b>' + esc(AC.t("player.done.total")) + '</b><b class="ac-done__big ac-num">' + esc(AC.t("cards.sheet.xp", { n: res.xp })) + "</b></div>" : '<p class="ac-fine">' + esc(AC.t("gym.session.done.noXp")) + "</p>") + "</div>" +
        AC.rankCard(res, res.xp || 0) + AC.streakTiles(res) + "</div></div>";
      F.setCta({ label: AC.t("gym.session.done.back") }); onCta = function () { F.go(gymUrl); };
      F.extra.appendChild(AC.cards.ghost(AC.t("gym.session.done.learn"), AC.url("learn-to-trade")));
      var h = AC.$(".ac-done__title", F.main); h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true });
      if (res.rankUp) AC.rankUp(res);
    }

    show();
    if (st === "right" || st === "wrong") { if (AC.cards.drive(ctl, st)) onCta(); }
    if (st === "done") { i = cards.length - 1; finish(); }
  });
})();
