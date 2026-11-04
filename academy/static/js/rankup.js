/* Profit.com Academy · rank-up screen, rank card and XP count-up. Standalone: works on any Academy page that loads
   rankup.css (lesson, Challenge, Gym session, path finish). Needs core.js, engine.js and shell.js (AC.share).
   AC.rankUp(res, onDone)  · res: an engine result with rankUp (+ level, totalXp). One Rico: the new rank look.
   AC.rankCard(res, gained) · rank badge, rank · level, XP to the next level and the bar (before + this gain).
   AC.countUp(el, to, fmt, ms) */
(function () {
  "use strict";
  var AC = (window.AC = window.AC || {});
  var esc = function (s) { return AC.esc(s); };
  var ARROW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  /** Count a number up inside el (XP totals) in ≤ 300 ms, always ending on exactly `to` (the engine's number).
      Instant under reduced motion. The final value is in the accessible name from the start. */
  AC.countUp = function (el, to, fmt, ms) {
    if (!el) return;
    fmt = fmt || function (v) { return AC.fmt.num(v); };
    to = Math.round(+to || 0);
    el.setAttribute("aria-label", fmt(to));
    if (el.__acCount) clearTimeout(el.__acCount);
    if (AC.reducedMotion() || !to) { el.textContent = fmt(to); return; }
    var t0 = null, dur = Math.min(300, ms || 300);
    el.textContent = fmt(0);
    function step() {
      var t = Date.now();
      if (t0 == null) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      if (k >= 1) { el.textContent = fmt(to); el.__acCount = null; return; }
      el.textContent = fmt(Math.floor(to * (1 - Math.pow(1 - k, 3))));
      el.__acCount = setTimeout(step, 16);
    }
    step();
  };

  /** The link a rank share points to: the learner's public profile when it is on, else the Academy home (this site). */
  function shareUrl() {
    var u = AC.auth && AC.auth.user(), s = AC.progress.settings();
    var route = u && u.handle && s.publicProfile ? "u?h=" + encodeURIComponent(u.handle) : "";
    try {
      if (!location.origin || location.origin === "null") throw 0;
      return new URL(AC.url(route), location.href).href.replace(/index\.html(?=$|\?)/, "");
    } catch (e) { return "https://www.profit.com/academy/" + (route ? "u/?h=" + encodeURIComponent(u.handle) : ""); }
  }

  /** Rank-up overlay (canvas Rank-Up / Rank-Up-Desktop). */
  AC.rankUp = function (res, onDone) {
    AC.sound.play("rankup");
    var ranks = AC.progress.RANKS.map(function (r) { return r.id; });
    var now = res.rankUp, prev = ranks[Math.max(0, ranks.indexOf(now) - 1)], lv = res.level || {};
    var name = AC.t("rank." + now), line = AC.t("player.rank.line", { n: lv.level || 1, xp: AC.fmt.num(res.totalXp || 0) });
    var dlg = AC.h('<dialog class="ac-rankup" aria-labelledby="acRankT"><div class="ac-rankup__box">' +
      '<span class="ac-rankup__eb">' + esc(AC.t("player.rank.eyebrow")) + "</span>" +
      '<img class="ac-rankup__new" src="' + AC.rankLook(now) + '" alt="">' +
      (prev !== now ? '<span class="ac-rankup__path"><span>' + esc(AC.t("rank." + prev)) + '</span><span class="ac-rankup__arrow" aria-hidden="true">' + ARROW + "</span><b>" + esc(name) + "</b></span>" : "") +
      '<h2 class="ac-rankup__name" id="acRankT">' + esc(name) + "</h2>" +
      '<p class="ac-rankup__text">' + esc(line) + " " + esc(AC.t("player.rank.blurb." + now)) + "</p>" +
      '<div class="ac-rankup__look"><span class="ac-rankup__ico" aria-hidden="true">★</span><span><b>' + esc(AC.t("player.rank.look." + now)) + "</b><span>" + esc(AC.t("player.rank.lookSub")) + "</span></span></div>" +
      (lv.nextRank ? '<p class="ac-rankup__fine">' + esc(AC.t("player.rank.next", { rank: AC.t("rank." + lv.nextRank), xp: AC.fmt.num(lv.nextRankAt) })) + "</p>" : "") +
      '<div class="ac-rankup__btns"><button type="button" class="ac-btn ac-btn--lg ac-btn--gold" data-share>' + esc(AC.t("player.rank.share")) + '</button><button type="button" class="ac-btn ac-btn--lg ac-btn--ghost" data-close>' + esc(AC.t("common.continue")) + "</button></div></div></dialog>");
    document.body.appendChild(dlg);
    AC.$("[data-share]", dlg).addEventListener("click", function () {
      // the preview carries the rank and level in text; Rico is already on the screen behind it
      AC.share({ what: "rank", heading: AC.t("player.rank.shareHeading"), title: name, sub: line,
        text: AC.t("player.rank.shareText", { rank: name, n: lv.level || 1 }), url: shareUrl() });
    });
    AC.$("[data-close]", dlg).addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("close", function () { dlg.remove(); if (onDone) onDone(); });
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    var c = AC.$("[data-close]", dlg); if (c) c.focus({ preventScroll: true });
  };

  /** New-level cue for result screens without a rank card (Challenge passed): "Level up! You reached level N". */
  AC.levelCue = function (res) {
    return res && res.levelReached ? '<span class="ac-lvlup" role="status"><span class="ac-lvlup__badge ac-num" aria-hidden="true">' + AC.fmt.num(res.levelReached) + "</span>" +
      esc(AC.t("player.done.levelReached", { n: res.levelReached })) + "</span>" : "";
  };

  /** Rank card: the learner's avatar (AC.userAvatar) with the level on its corner in the rank colour, rank · level, XP to the next level, the bar (before + today's gain). */
  AC.rankCard = function (res, gained) {
    var lv = res.level, total = res.totalXp != null ? res.totalXp : res.xp;
    var span = Math.max(1, lv.levelTo - lv.levelFrom), before = Math.max(lv.levelFrom, total - gained);
    var p0 = Math.max(0, Math.min(100, (before - lv.levelFrom) / span * 100)), p1 = Math.max(0, Math.min(100, (total - lv.levelFrom) / span * 100));
    return '<div class="ac-done__card ac-rkcard ac-rank--' + lv.rank + (res.levelReached ? " is-up" : "") + '">' +
      '<div class="ac-rkcard__row"><span class="ac-rkcard__badge">' + (AC.userAvatar ? AC.userAvatar("ac-rkcard__ava") : "") + '<span class="ac-rkcard__lv ac-num" aria-hidden="true">' + AC.fmt.num(lv.level) + '</span></span><span class="ac-rkcard__who"><b>' + esc(AC.t("player.done.rank", { rank: AC.t("rank." + lv.rank), n: lv.level })) + "</b>" +
      "<span>" + esc(res.levelReached ? AC.t("player.done.levelReached", { n: res.levelReached }) : AC.t("player.done.toNext", { xp: AC.fmt.num(Math.max(0, lv.levelTo - total)), n: lv.level + 1 })) + "</span></span>" +
      '<b class="ac-rkcard__xp ac-num">' + esc(AC.t("common.xp", { n: total })) + "</b></div>" +
      '<div class="ac-rkcard__bar" aria-hidden="true"><span class="ac-rkcard__before" style="width:' + p0.toFixed(1) + '%"></span><span class="ac-rkcard__gain" style="left:' + p0.toFixed(1) + "%;width:" + Math.max(gained ? 2 : 0, p1 - p0).toFixed(1) + '%"></span></div>' +
      '<div class="ac-rkcard__ticks ac-num"><span>' + AC.fmt.num(lv.levelFrom) + "</span>" + (gained ? '<span class="ac-up">' + esc(AC.t("player.done.today", { n: gained })) + "</span>" : "") + "<span>" + AC.fmt.num(lv.levelTo) + "</span></div></div>";
  };
})();
