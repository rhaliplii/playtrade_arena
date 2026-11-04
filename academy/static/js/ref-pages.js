/* Profit.com Academy · reference & account pages: How progress works, Glossary, Guide, Search, Pro, Settings.
   The pages are SSR; this script adds the learner's state and the interactive bits. Reads #ac-ref (inlined by the build). */
(function () {
  "use strict";
  var AC = window.AC;

  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9%:+\- ]+/g, " ").replace(/\s+/g, " ").trim(); }

  // ---------------------------------------------------------------- How progress works
  function how(d) {
    var s = AC.progress.summary(), lv = s.level;
    var card = AC.$('.ac-how-rank[data-rank="' + lv.rank + '"]');
    if (card) card.classList.add("is-you");
    var you = AC.$("[data-how-you]");
    if (you) {
      you.dataset.rank = lv.rank;
      AC.$("[data-how-level]", you).textContent = AC.t("how.you.level", { n: lv.level });
      AC.$("[data-how-xp]", you).textContent = AC.t("how.you.xp", { n: s.xp });
      AC.$("[data-how-next]", you).textContent = lv.nextRank
        ? AC.t("how.you.toNext", { n: AC.fmt.num(Math.max(0, lv.nextRankAt - s.xp)), rank: AC.t("rank." + lv.nextRank) })
        : AC.t("how.you.top");
    }
    AC.$$(".ac-how-skill").forEach(function (el) {
      var on = false;
      var ch = el.dataset.skillChapter;
      if (ch) { var c = AC.progress.chapter(ch); on = !!(c.challenge && c.challenge.passed); }
      else if (el.dataset.skillFinish) { on = !!(AC.progress.state().paths || {})[d.path]; }
      el.classList.toggle("is-on", on);
      var st = AC.$(".ac-how-skill__state", el);
      if (on) st.textContent = st.dataset.on;
    });
  }

  // ---------------------------------------------------------------- Glossary (index + term pages)
  function glossary(d) {
    var input = AC.$("[data-gl-search]");
    if (!input) return;
    var terms = (d.terms || []).map(function (x) { return Object.assign({ n: norm(x.t), ns: norm(x.s) }, x); });
    var onIndex = d.page === "glossary";
    var cat = "";

    function rank(q) {
      if (!q) return [];
      return terms.map(function (x) {
        var sc = x.n === q ? 100 : x.n.indexOf(q) === 0 ? 60 : x.n.indexOf(q) >= 0 ? 40 : x.ns.indexOf(q) >= 0 ? 10 : 0;
        return { x: x, sc: sc };
      }).filter(function (r) { return r.sc > 0; }).sort(function (a, b) { return b.sc - a.sc || a.x.n.localeCompare(b.x.n); });
    }

    function filterIndex() {
      var q = norm(input.value), shown = 0;
      AC.$$("[data-gl-item]").forEach(function (li) {
        var ok = (!cat || li.dataset.cat === cat) && (!q || norm(li.dataset.q).indexOf(q) >= 0);
        li.hidden = !ok; if (ok) shown++;
      });
      AC.$$("[data-gl-letter]").forEach(function (sec) { sec.hidden = !AC.$$("[data-gl-item]", sec).some(function (li) { return !li.hidden; }); });
      // the A–Z nav only offers letters that still have visible terms
      AC.$$(".ac-gl-letter").forEach(function (a) {
        var id = (a.getAttribute("href") || "").split("#")[1];
        var sec = id && document.getElementById(id);
        a.hidden = !!(sec && sec.hidden);
      });
      var cnt = AC.$("[data-gl-count]");
      if (cnt) cnt.textContent = AC.t("glossary.count", { n: shown });
      var empty = AC.$("[data-gl-empty]");
      empty.hidden = shown > 0;
      if (!shown) empty.textContent = AC.t("glossary.empty", { q: input.value.trim() });
    }

    function filterAside() {
      var q = norm(input.value);
      var box = AC.$("[data-gl-matches]"), list = AC.$("[data-gl-match-list]"), none = AC.$("[data-gl-none]");
      AC.$$("[data-gl-group]").forEach(function (el) { el.hidden = !!q; });
      box.hidden = !q;
      if (!q) return;
      var hits = rank(q).slice(0, 12);
      list.innerHTML = hits.map(function (r) {
        return '<a class="ac-gl-navterm" href="' + AC.url("glossary/" + r.x.id) + '">' + AC.esc(r.x.t) + "</a>";
      }).join("");
      none.hidden = hits.length > 0;
      if (!hits.length) none.textContent = AC.t("glossary.empty", { q: input.value.trim() });
    }

    input.addEventListener("input", onIndex ? filterIndex : filterAside);
    input.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var hit = rank(norm(input.value))[0];
      if (hit) { e.preventDefault(); location.href = AC.url("glossary/" + hit.x.id); }
    });
    AC.$$("[data-gl-cat]").forEach(function (b) {
      b.addEventListener("click", function () {
        cat = b.dataset.glCat;
        AC.$$("[data-gl-cat]").forEach(function (o) { var on = o === b; o.classList.toggle("is-on", on); o.setAttribute("aria-pressed", on ? "true" : "false"); });
        filterIndex();
      });
    });
    var m = location.search.match(/[?&]q=([^&]*)/);
    if (m) { input.value = decodeURIComponent(m[1].replace(/\+/g, " ")); (onIndex ? filterIndex : filterAside)(); }
  }

  // ---------------------------------------------------------------- Guide (direct download)
  /* The PDF link is a plain <a download> for everyone (works without JS). After a guest's click, a soft follow-up
     appears under it in a polite live region: practice it in the Academy. Its button is the home hero's
     "Start learning free": Lesson 1, or (Lesson 1 already played) the sign-up sheet, as guestHome does. Focus stays put. */
  function guide() {
    var dl = AC.$("[data-guide-dl]"), next = AC.$("[data-guide-next]");
    if (!dl) return;
    dl.addEventListener("click", function () {
      var guest = AC.auth.isGuest();
      AC.analytics.track("guide_download", { member: !guest });
      if (!guest || !next || !next.hidden) return;
      var l1 = next.dataset.first && AC.progress.lesson(next.dataset.first);
      if (l1 && l1.done) {
        AC.$("[data-guide-next-text]", next).textContent = AC.t("guide.next.textStarted");
        AC.$("[data-guide-next-cta]", next).setAttribute("data-action", "signup");
      }
      next.hidden = false;
    });
  }

  // ---------------------------------------------------------------- Search
  function search(d) {
    var input = AC.$("[data-search-input]"), out = AC.$("[data-search-results]");
    if (!input) return;
    var tab = "all";
    var guest = AC.auth.isGuest();
    var CH = {}; d.chapters.forEach(function (c) { CH[c.id] = c; });
    var TERM = {}; d.terms.forEach(function (x) { TERM[x.id] = x; });
    var playable = d.lessons.filter(function (l) { return !l.soon; });

    function chapterOpen(c) {
      if (!c.a) return false;
      var i = d.chapters.indexOf(c);
      if (i <= 0) return true;
      var prev = AC.progress.chapter(d.chapters[i - 1].id);
      return !!(prev.testedOut || (prev.challenge && prev.challenge.passed));
    }
    var nextId = null;
    for (var i = 0; i < playable.length; i++) {
      var st = AC.progress.lesson(playable[i].id);
      if (!st || !st.done) { nextId = playable[i].id; break; }
    }
    function lessonState(l) {
      if (l.soon) return "soon";
      var st = AC.progress.lesson(l.id);
      if (st && st.done) return "done";
      if (l.id === nextId) return "next";
      if (guest && l.i > 0) return "locked";
      return chapterOpen(CH[l.c]) ? "open" : "locked";
    }

    function score(q, words, fields) {
      // fields: [[text, weight]]; every word must match somewhere
      var total = 0;
      for (var w = 0; w < words.length; w++) {
        var best = 0;
        fields.forEach(function (f) {
          var s = norm(f[0]); if (!s) return;
          var at = s.indexOf(words[w]);
          if (at < 0) return;
          var v = f[1] * (at === 0 || s.charAt(at - 1) === " " ? 2 : 1);
          if (v > best) best = v;
        });
        if (!best) return 0;
        total += best;
      }
      fields.forEach(function (f) { if (norm(f[0]) === q) total += f[1] * 4; });
      return total;
    }
    function find(q) {
      var words = q.split(" ").filter(Boolean);
      function by(list, fn) { return list.map(function (x) { return { x: x, sc: score(q, words, fn(x)) }; }).filter(function (r) { return r.sc > 0; }).sort(function (a, b) { return b.sc - a.sc; }).map(function (r) { return r.x; }); }
      return {
        lessons: by(d.lessons, function (l) { var w = l.soon ? 0.25 : 1; return [[l.t, 10 * w], [l.d, 3 * w], [l.k, 2 * w], [l.cs, 1 * w]]; }).slice(0, 20),
        terms: by(d.terms, function (x) { return [[x.t, 10], [x.d, 2]]; }).slice(0, 12),
        chapters: by(d.chapters, function (c) { return [[c.t, 8], [c.s, 8], [c.d, 2]]; }),
        paths: by(d.paths, function (p) { return [[p.t, 8], [p.d, 2]]; }),
      };
    }

    var PILL = { next: "mint", done: "done", locked: "muted", soon: "muted", open: "muted" };
    function lessonCard(l) {
      var s = lessonState(l);
      var c = CH[l.c];
      var st = AC.progress.lesson(l.id) || {};
      var status = s === "open" ? (st.card ? AC.t("search.status.progress") : AC.t("search.status.notStarted")) : AC.t("search.status." + s);
      var meta = s === "done" ? AC.t("search.meta.done", { n: l.m, xp: AC.fmt.num(st.best || 60) }) : l.m ? AC.t("search.meta.next", { n: l.m, xp: 90 }) : "";
      var icon = s === "next" || s === "open" ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5-12-7.5Z"/></svg>'
        : s === "done" ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
      var tag = s === "soon" ? "div" : "a";
      var href = s === "soon" ? "" : ' href="' + AC.url(d.path.id + "/" + l.c + "/" + l.id) + '"';
      return "<" + tag + ' class="ac-search-item ac-search-item--' + s + '"' + href + ">" +
        '<span class="ac-search-item__icon">' + icon + "</span>" +
        '<span class="ac-search-item__text"><span class="ac-search-item__where">' + AC.esc(AC.t("search.lesson.where", { path: d.path.t, n: c ? c.n : l.cn, short: l.cs, l: l.n })) + "</span>" +
        "<b>" + AC.esc(l.t) + "</b>" + (l.d ? '<span class="ac-search-item__snip">' + AC.rich(l.d) + "</span>" : "") + "</span>" +
        '<span class="ac-search-item__side"><span class="ac-search-pill ac-search-pill--' + PILL[s] + '">' + AC.esc(status) + "</span>" +
        (meta ? '<span class="ac-search-item__meta">' + AC.esc(meta) + "</span>" : "") + "</span></" + tag + ">";
    }
    function termCard(x) {
      var seen = x.ch.length ? AC.t("search.term.seen", { list: x.ch.map(function (n) { return AC.t("search.term.ch", { n: n }); }).join(AC.t("search.term.and")) }) : "";
      return '<a class="ac-search-term" href="' + AC.url("glossary/" + x.id) + '"><b>' + AC.esc(x.t) + "</b><span>" + AC.esc(x.d) + "</span>" +
        (seen ? '<span class="ac-search-term__seen">' + AC.esc(seen) + "</span>" : "") + "</a>";
    }
    function chapterCard(c) {
      var done = c.l.filter(function (id) { var s = AC.progress.lesson(id); return s && s.done; }).length;
      var cs = AC.progress.chapter(c.id);
      var passed = !!(cs.challenge && cs.challenge.passed);
      var state = !c.a ? "soon" : passed ? "passed" : done > 0 ? "progress" : chapterOpen(c) ? "notStarted" : "locked";
      var line = c.d + (state === "progress" ? " " + AC.t("search.chapter.progress", { n: Math.min(done + 1, c.nl), total: c.nl }) : "");
      var bar = state === "progress" ? '<span class="ac-search-bar"><span style="width:' + Math.round(done / Math.max(1, c.nl) * 100) + '%"></span></span>' : "";
      var tag = c.a ? "a" : "div";
      return "<" + tag + ' class="ac-search-item ac-search-item--chapter' + (state === "progress" ? " ac-search-item--next" : "") + (c.a ? "" : " ac-search-item--soon") + '"' +
        (c.a ? ' href="' + AC.url(d.path.id + "/" + c.id) + '"' : "") + ">" +
        '<span class="ac-search-item__icon ac-search-item__icon--n ac-num">' + AC.fmt.num(c.n) + "</span>" +
        '<span class="ac-search-item__text"><span class="ac-search-item__where">' + AC.esc(AC.t("search.chapter.where", { path: d.path.t, n: c.n })) + "</span>" +
        "<b>" + AC.esc(c.t) + '</b><span class="ac-search-item__snip">' + AC.esc(line) + "</span></span>" +
        '<span class="ac-search-item__side"><span class="ac-search-pill ac-search-pill--' + (state === "progress" || state === "passed" ? "mint" : "muted") + '">' + AC.esc(AC.t("search.status." + state)) + "</span>" + bar + "</span></" + tag + ">";
    }
    function pathCard(p) {
      var tag = p.soon ? "div" : "a";
      return "<" + tag + ' class="ac-search-item' + (p.soon ? " ac-search-item--soon" : "") + '"' + (p.soon ? "" : ' href="' + AC.url(p.href) + '"') + ">" +
        '<span class="ac-search-item__text"><b>' + AC.esc(p.t) + '</b><span class="ac-search-item__snip">' + AC.esc(p.d) + "</span></span>" +
        '<span class="ac-search-item__side"><span class="ac-search-pill ac-search-pill--' + (p.tier === "pro" ? "pro" : "mint") + '">' + AC.esc(AC.t(p.soon ? "search.status.soon" : "search.status." + (p.tier === "pro" ? "pro" : "free"))) + "</span>" +
        (p.nc ? '<span class="ac-search-item__meta">' + AC.esc(AC.t("search.path.chapters", { n: p.nc })) + "</span>" : "") + "</span></" + tag + ">";
    }

    function chips(list) {
      return list.map(function (w) { return '<a class="ac-ref-chip" href="' + AC.url("search?q=" + encodeURIComponent(w)) + '">' + AC.esc(w) + "</a>"; }).join("");
    }
    function section(key, items, html, grid) {
      if (!items.length) return "";
      return '<section class="ac-search-sec" data-sec="' + key + '" aria-labelledby="h-' + key + '"><h2 id="h-' + key + '" class="ac-ref-label">' + AC.esc(AC.t("search.h." + key, { n: items.length })) + "</h2>" +
        (grid ? '<div class="ac-search-terms">' : "") + items.map(html).join("") + (grid ? "</div>" : "") + "</section>";
    }

    function tip() {
      var box = AC.$("[data-search-tip]");
      var l = null;
      for (var i = 0; i < playable.length; i++) if (playable[i].id === nextId) l = playable[i];
      if (!l) { box.hidden = true; return; }
      var st = AC.progress.lesson(l.id);
      AC.$("[data-tip-title]", box).textContent = guest && l.i === 0 && !st ? AC.t("search.tip.guestTitle") : AC.t("search.tip.title", { title: l.t });
      AC.$("[data-tip-text]", box).innerHTML = AC.rich(l.d);
      var cta = AC.$("[data-tip-cta]", box);
      cta.textContent = AC.t(st && st.card ? "search.tip.resume" : "search.tip.start");
      cta.href = AC.url(d.path.id + "/" + l.c + "/" + l.id);
      box.hidden = false;
    }

    function render() {
      var raw = input.value.trim(), q = norm(raw);
      var tabs = AC.$("[data-search-tabs]"), count = AC.$("[data-search-count]");
      var related = AC.$("[data-search-related]");
      if (!q) {
        tabs.hidden = true; count.textContent = "";
        out.innerHTML = '<div class="ac-card ac-search-empty"><h2 class="ac-h2">' + AC.esc(AC.t("search.start.title")) + '</h2><p class="ac-ref-note">' + AC.esc(AC.t("search.start.text")) + '</p><div class="ac-ref-chips">' + chips(d.suggest) + "</div></div>";
        related.hidden = true;
        return;
      }
      var r = find(q);
      var n = { lessons: r.lessons.length, terms: r.terms.length, chapters: r.chapters.length, paths: r.paths.length };
      n.all = n.lessons + n.terms + n.chapters + n.paths;
      count.textContent = AC.t("search.results", { n: n.all });
      if (tab !== "all" && !n[tab]) tab = "all";
      AC.$$("[data-tab]", tabs).forEach(function (b) {
        var k = b.dataset.tab, on = k === tab;
        b.classList.toggle("is-on", on); b.setAttribute("aria-selected", on ? "true" : "false");
        AC.$("[data-tab-n]", b).textContent = AC.fmt.num(n[k]);
        b.hidden = k !== "all" && !n[k];
      });
      tabs.hidden = !n.all;
      if (!n.all) {
        out.innerHTML = '<div class="ac-card ac-search-empty"><h2 class="ac-h2">' + AC.esc(AC.t("search.empty.title", { q: raw })) + '</h2><p class="ac-ref-note">' + AC.esc(AC.t("search.empty.text")) + '</p><div class="ac-ref-chips">' + chips(d.suggest) + "</div></div>";
        related.hidden = true;
        return;
      }
      function on(k) { return tab === "all" || tab === k; }
      out.innerHTML = (on("lessons") ? section("lessons", r.lessons, lessonCard) : "") + (on("terms") ? section("terms", r.terms, termCard, true) : "") +
        (on("chapters") ? section("chapters", r.chapters, chapterCard) : "") + (on("paths") ? section("paths", r.paths, pathCard) : "");
      // related searches: related terms of the best term matches, then chapter names
      var rel = [];
      r.terms.slice(0, 3).forEach(function (x) { x.r.forEach(function (id) { var y = TERM[id]; if (y && rel.indexOf(y.t) < 0 && norm(y.t) !== q) rel.push(y.t); }); });
      r.lessons.slice(0, 3).forEach(function (l) { var c = CH[l.c]; if (c && rel.indexOf(c.s) < 0 && norm(c.s) !== q) rel.push(c.s); });
      rel = rel.slice(0, 4);
      AC.$("[data-related-list]").innerHTML = chips(rel);
      related.hidden = !rel.length;
    }

    AC.$$("[data-tab]").forEach(function (b) { b.addEventListener("click", function () { tab = b.dataset.tab; render(); }); });
    AC.$("[data-search-tabs]").addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var list = AC.$$("[data-tab]").filter(function (b) { return !b.hidden; });
      var i = list.indexOf(document.activeElement); if (i < 0) return;
      var nx = list[(i + (e.key === "ArrowRight" ? 1 : list.length - 1)) % list.length];
      nx.focus(); nx.click();
    });
    var timer;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        render();
        try { var u = new URL(location.href); if (input.value.trim()) u.searchParams.set("q", input.value.trim()); else u.searchParams.delete("q"); history.replaceState(null, "", u); } catch (e) {}
      }, 120);
    });
    AC.$("[data-search-form]").addEventListener("submit", function (e) { e.preventDefault(); render(); });
    var m = location.search.match(/[?&]q=([^&]*)/);
    if (m) input.value = decodeURIComponent(m[1].replace(/\+/g, " "));
    tip();
    render();
    if (!m) input.focus();
  }

  // ---------------------------------------------------------------- Settings
  function settings(d) {
    var root = AC.$(".ac-set");
    if (!root) return;
    var s = AC.progress.settings();
    var saved = AC.$("[data-set-saved]"), savedT;
    function save(patch) {
      AC.progress.settings(patch);
      saved.hidden = false;
      clearTimeout(savedT); savedT = setTimeout(function () { saved.hidden = true; }, 1600);
    }
    function value(key) {
      if (key === "reduceMotion") return s.motion === false;
      if (key === "publicProfile") return s.publicProfile === true;
      if (key === "sound") return s.sound !== false;   // on by default   // off by default; Top Learners is on by default
      return !!s[key];
    }
    function remFields() { AC.$$("[data-rem-fields] input, [data-rem-fields] select").forEach(function (el) { el.disabled = !value("reminders"); }); }

    // goal
    function setGoal(k) {
      AC.$$("[data-goal]").forEach(function (b) { var on = b.dataset.goal === k; b.classList.toggle("is-on", on); b.setAttribute("aria-checked", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; });
      AC.$("[data-goal-note]").textContent = d.notes[k] || "";
    }
    setGoal(s.goal || "regular");
    var goals = AC.$$("[data-goal]");
    goals.forEach(function (b, i) {
      b.addEventListener("click", function () { setGoal(b.dataset.goal); save({ goal: b.dataset.goal }); });
      b.addEventListener("keydown", function (e) {
        var dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        var nx = goals[(i + dir + goals.length) % goals.length]; nx.focus(); nx.click();
      });
    });

    // switches
    AC.$$("[data-set]").forEach(function (b) {
      var key = b.dataset.set;
      b.setAttribute("aria-checked", value(key) ? "true" : "false");
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-checked") !== "true";
        b.setAttribute("aria-checked", on ? "true" : "false");
        var patch = {};
        if (key === "reduceMotion") patch.motion = !on; else patch[key] = on;
        save(patch); s = AC.progress.settings();
        if (key === "sound" && on && AC.sound) AC.sound.play("toggle");   // (after saving: muted until then)
        if (key === "reminders") remFields();
        if (key === "reduceMotion") document.documentElement.classList.toggle("ac-reduce-motion", on);
      });
    });
    remFields();
    document.documentElement.classList.toggle("ac-reduce-motion", value("reduceMotion"));

    // reminder time / channel
    AC.$$("[data-set-input]").forEach(function (el) {
      var key = el.dataset.setInput;
      if (s[key]) el.value = s[key];
      el.addEventListener("change", function () { var p = {}; p[key] = el.value; save(p); });
    });

    // account
    var u = AC.auth.user();
    if (u) {
      var sum = AC.progress.summary(), rec = AC.progress.state();
      var initials = (u.name || "").split(/\s+/).map(function (w) { return w.charAt(0); }).join("").slice(0, 2).toUpperCase();
      var av = AC.$("[data-acc-avatar]"); av.textContent = initials; av.setAttribute("aria-label", u.name || "");
      AC.$("[data-acc-line]").textContent = AC.t("settings.acc.line", { name: u.name, rank: AC.t("rank." + sum.level.rank), n: sum.level.level });
      var since = u.since || (rec.created ? rec.created + "T12:00:00" : null);
      AC.$("[data-acc-joined]").textContent = AC.t("settings.acc.joined", { date: since ? AC.fmt.date(since, { month: "long", year: "numeric" }) : "" });
      var prof = AC.$("[data-profile-link]");
      if (prof && u.handle) prof.href = AC.url("u?h=" + encodeURIComponent(u.handle));
      AC.$("[data-acc-download]").addEventListener("click", function () {
        var blob = new Blob([JSON.stringify({ account: { name: u.name, handle: u.handle }, academy: AC.progress.state() }, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = "profit-academy-" + (u.handle || "data") + ".json";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      });
      // reset Academy progress: confirm first, then wipe (the account itself stays)
      var dlg = AC.$("[data-reset-dialog]"), resetBtn = AC.$("[data-acc-reset]");
      if (dlg && resetBtn) {
        var close = function () { if (dlg.open) dlg.close(); resetBtn.focus(); };
        resetBtn.addEventListener("click", function () {
          if (typeof dlg.showModal === "function") { dlg.showModal(); AC.$("[data-reset-cancel]", dlg).focus(); }
          else if (window.confirm(AC.t("settings.reset.text"))) doReset();
        });
        AC.$("[data-reset-cancel]", dlg).addEventListener("click", close);
        AC.$("[data-reset-ok]", dlg).addEventListener("click", function () { if (dlg.open) dlg.close(); doReset(); });
      }
    }
    function doReset() {
      if (AC.progress.reset) AC.progress.reset();
      location.reload();
    }
  }

  AC.ready(function () {
    var d = AC.data("ac-ref");
    if (!d) return;
    // Pro path cards (shared component): Pro members see "Included in your plan"
    if (AC.auth.isPro()) AC.$$("[data-pro-text]").forEach(function (el) { el.textContent = el.getAttribute("data-pro-text"); });
    if (d.page === "how") how(d);
    else if (d.page === "glossary" || d.page === "term") glossary(d);
    else if (d.page === "guide") guide();
    else if (d.page === "search") search(d);
    else if (d.page === "settings") settings(d);
  });
})();
