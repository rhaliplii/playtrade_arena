/* Global search (Figma "Global search", node 7587:18283): the panel the top bar's search button opens on every
   Academy page. The platform's tabs (Tickers, Billionaires, News, Events, Playtraders) plus an Academy tab, which is
   selected first here. Academy results come from static/data/search-index.js (written by the build from the
   same index as /academy/search), loaded as a script on first open (fetch is blocked on file://); Enter or "See all" opens the full search page. The ticker
   rows are the design's sample data; the other platform tabs belong to Profit.com and show a pointer here. */
(function () {
  "use strict";

  var TABS = ["tickers", "billionaires", "news", "events", "playtraders", "academy"];
  var TICKER_F = ["trending", "crypto", "stocks", "forex", "indices", "commodities", "etfs"];
  var ACADEMY_F = ["all", "lessons", "terms", "chapters"];
  // the design's sample rows (one per instrument): logo, ticker, name, filter, type label, exchange
  var TICKERS = [
    ["tsla", "TSLA", "Tesla Inc", "stocks", "NASDAQ"],
    ["amzn", "AMZN", "Amazon.com Inc", "stocks", "NASDAQ"],
    ["btc", "BTC", "Bitcoin", "crypto", "AGR"],
    ["us", "VTI", "Vanguard Total Stock Market Index Fund ETF Shares", "etfs", "NYSE Arca"],
    ["msft", "MSFT", "Microsoft Corporation", "stocks", "NASDAQ"],
    ["eth", "ETH", "Ethereum", "crypto", "AGR"]
  ];
  var RECENT_KEY = "ac_gs_recent";

  var root, input, list, pills, brokers, opener, data = null, loading = false, failed = false;
  var state = { tab: "academy", back: "academy", f: { tickers: "trending", academy: "all" } };

  function t(k, o) { return AC.t(k, o); }
  function esc(s) { return AC.esc(s); }
  function img(name, cls) { return '<img class="' + cls + '" src="' + AC.base + "static/img/search/" + name + '.svg" alt="">'; }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9%:+\- ]+/g, " ").replace(/\s+/g, " ").trim(); }

  function recent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (e) { return []; } }
  function remember(q) {
    q = q.trim(); if (!q) return;
    var r = recent().filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); });
    r.unshift(q);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0, 8))); } catch (e) { /* private mode */ }
  }

  // ---------------------------------------------------------------- markup
  function build() {
    var tabs = TABS.map(function (k) {
      return '<button type="button" role="tab" class="gs-tab" data-gs-tab="' + k + '" aria-selected="false">' + esc(t("gs.tab." + k)) + "</button>";
    }).join("");
    root = AC.h('<div class="gs" data-gs hidden>' +
      '<div class="gs__scrim" data-gs-close></div>' +
      '<div class="gs__panel" role="dialog" aria-modal="true" aria-label="' + esc(t("gs.title")) + '">' +
        '<div class="gs__top"><div class="gs__field">' + img("search", "gs__ic gs__ic--white") +
          '<input type="search" class="gs__input" autocomplete="off" spellcheck="false" aria-label="' + esc(t("gs.title")) + '" data-gs-input>' +
          '<button type="button" class="gs__clear" data-gs-clear hidden>' + esc(t("gs.clear")) + "</button></div>" +
          '<button type="button" class="gs__x" data-gs-close aria-label="' + esc(t("gs.close")) + '">' + img("close", "gs__ic gs__ic--white") + "</button></div>" +
        '<div class="gs__tabs" role="tablist" aria-label="' + esc(t("gs.tabs")) + '"><span class="gs__tabs-edge" aria-hidden="true"></span>' +
          '<button type="button" role="tab" class="gs-tab gs-tab--icon" data-gs-tab="recent" aria-selected="false" aria-label="' + esc(t("gs.recent")) + '">' + img("history", "gs__ic16") + "</button>" +
          tabs + "</div>" +
        '<div class="gs__bar"><div class="gs__pills" role="group" aria-label="' + esc(t("gs.filters")) + '" data-gs-pills></div>' +
          '<button type="button" class="gs__brokers" data-gs-brokers>' + esc(t("gs.brokers")) + img("arrow", "gs__ic16") + "</button></div>" +
        '<div class="gs__list" data-gs-list aria-live="polite"></div>' +
      "</div></div>");
    document.body.appendChild(root);
    input = AC.$("[data-gs-input]", root);
    list = AC.$("[data-gs-list]", root);
    pills = AC.$("[data-gs-pills]", root);
    brokers = AC.$("[data-gs-brokers]", root);

    AC.$$("[data-gs-close]", root).forEach(function (b) { b.addEventListener("click", close); });
    AC.$$("[data-gs-tab]", root).forEach(function (b) {
      b.addEventListener("click", function () { setTab(b.getAttribute("data-gs-tab")); input.focus(); });
    });
    pills.addEventListener("click", function (e) {
      var b = e.target.closest("[data-gs-f]"); if (!b) return;
      state.f[state.tab] = b.getAttribute("data-gs-f"); render();
    });
    list.addEventListener("click", function (e) {
      var r = e.target.closest("[data-gs-q]");
      if (r) { input.value = r.getAttribute("data-gs-q"); setTab(state.back); input.focus(); return; }
      if (e.target.closest("a[href]")) remember(input.value);
    });
    AC.$("[data-gs-clear]", root).addEventListener("click", function () { input.value = ""; render(); input.focus(); });
    input.addEventListener("input", render);
    input.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      var q = input.value.trim();
      remember(q);
      if (q && state.tab === "academy") location.href = AC.url("search?q=" + encodeURIComponent(q));
    });
    root.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      var f = AC.$$("a[href], button:not([hidden]), input", AC.$(".gs__panel", root)).filter(function (x) { return x.offsetParent; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function setTab(k) {
    state.tab = k;
    if (k !== "recent") state.back = k;
    AC.$$("[data-gs-tab]", root).forEach(function (b) {
      var on = b.getAttribute("data-gs-tab") === k;
      b.classList.toggle("is-on", on); b.setAttribute("aria-selected", on ? "true" : "false");
      // phones: the tab row scrolls sideways, so keep the selected tab (Academy sits last) in view
      if (on) { var row = b.parentNode; row.scrollLeft = Math.max(0, b.offsetLeft + b.offsetWidth - row.clientWidth + 16); }
    });
    input.placeholder = t(k === "academy" ? "gs.placeholderAcademy" : "gs.placeholder");
    if (k === "academy") { failed = false; load(); }   // opening the tab again retries a failed load
    render();
  }

  // ---------------------------------------------------------------- Academy index
  function load() {
    if (data || loading) return;
    if (window.AC_SEARCH_INDEX) { data = window.AC_SEARCH_INDEX; return; }
    loading = true; failed = false;
    var s = document.createElement("script");
    s.src = AC.base + "static/data/search-index.js";
    s.onload = function () { loading = false; data = window.AC_SEARCH_INDEX || null; failed = !data; if (root && !root.hidden) render(); };
    s.onerror = function () { loading = false; failed = true; s.remove(); if (root && !root.hidden) render(); };
    document.head.appendChild(s);
  }
  function score(q, words, fields) {
    var total = 0;
    for (var w = 0; w < words.length; w++) {
      var best = 0;
      fields.forEach(function (f) {
        var s = norm(f[0]); if (!s) return;
        var at = s.indexOf(words[w]); if (at < 0) return;
        var v = f[1] * (at === 0 || s.charAt(at - 1) === " " ? 2 : 1);
        if (v > best) best = v;
      });
      if (!best) return 0;
      total += best;
    }
    fields.forEach(function (f) { if (norm(f[0]) === q) total += f[1] * 4; });
    return total;
  }
  function rank(items, q, fn) {
    if (!q) return items.slice();
    var words = q.split(" ").filter(Boolean);
    return items.map(function (x) { return { x: x, sc: score(q, words, fn(x)) }; }).filter(function (r) { return r.sc > 0; })
      .sort(function (a, b) { return b.sc - a.sc; }).map(function (r) { return r.x; });
  }
  function academyResults(q) {
    return {
      lessons: rank(data.lessons, q, function (l) { var w = l.soon ? 0.25 : 1; return [[l.t, 10 * w], [l.d, 3 * w], [l.k, 2 * w], [l.cs, w]]; }),
      terms: rank(q ? data.terms : data.terms.slice().sort(function (a, b) { return a.t.localeCompare(b.t); }), q, function (x) { return [[x.t, 10], [x.d, 2]]; }),
      chapters: rank(data.chapters, q, function (c) { return [[c.t, 8], [c.s, 8], [c.d, 2]]; })
    };
  }

  // lessons: an open book (they're interactive cards, not videos, so no play icon); terms: "Aa", as in a dictionary
  var ICON = {
    lesson: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5.5c2.5-1.2 5.5-1 9 1 3.5-2 6.5-2.2 9-1V19c-2.5-1.2-5.5-1-9 1-3.5-2-6.5-2.2-9-1z"/><path d="M12 6.5V20"/></svg>',
    term: '<span class="gs-logo__aa" aria-hidden="true">Aa</span>'
  };
  function row(o) {
    var tag = o.href ? "a" : "div";
    return "<" + tag + ' class="gs-row' + (o.dim ? " gs-row--dim" : "") + '"' + (o.href ? ' href="' + esc(o.href) + '"' : "") + ">" +
      '<span class="gs-row__id">' + o.logo + '<span class="gs-row__code">' + esc(o.code) + "</span></span>" +
      '<span class="gs-row__name">' + esc(o.name) + "</span>" +
      '<span class="gs-row__meta"><span class="gs-row__kind">' + esc(o.kind) + '</span><span class="gs-row__ex">' + esc(o.ex) + "</span></span></" + tag + ">";
  }
  function lessonRow(l) {
    var st = l.id && AC.progress.lesson(l.id);
    return row({
      logo: '<span class="gs-logo gs-logo--academy">' + ICON.lesson + "</span>", code: t("gs.code.lesson", { c: l.cn, l: l.n }), name: l.t,
      kind: t("gs.kind.lesson"), ex: l.soon ? t("gs.soon") : st && st.done ? t("gs.done") : t("gs.min", { n: l.m }),
      href: l.soon ? "" : AC.url(data.path.id + "/" + l.c + "/" + l.id), dim: l.soon
    });
  }
  function termRow(x) {
    return row({ logo: '<span class="gs-logo gs-logo--academy">' + ICON.term + "</span>", code: t("gs.code.term"), name: x.t,
      kind: t("gs.kind.term"), ex: x.ch.length ? t("gs.code.chapter", { n: x.ch[0] }) : "", href: AC.url("glossary/" + x.id) });
  }
  function chapterRow(c) {
    return row({ logo: '<span class="gs-logo gs-logo--academy gs-logo--n">' + c.n + "</span>", code: t("gs.code.chapter", { n: c.n }), name: c.t,
      kind: t("gs.kind.chapter"), ex: c.a ? t("gs.lessons", { n: c.nl }) : t("gs.soon"), href: c.a ? AC.url(data.path.id + "/" + c.id) : "", dim: !c.a });
  }

  // ---------------------------------------------------------------- render
  function pill(k, label, n, on) {
    return '<button type="button" class="gs-pill' + (on ? " is-on" : "") + '" data-gs-f="' + k + '" aria-pressed="' + (on ? "true" : "false") + '">' +
      esc(label) + (n ? '<span class="gs-pill__n">' + n + "</span>" : "") + "</button>";
  }
  function note(text) { return '<p class="gs__note">' + esc(text) + "</p>"; }

  function render() {
    var raw = input.value, q = norm(raw), tab = state.tab;
    AC.$("[data-gs-clear]", root).hidden = !raw;
    list.classList.toggle("gs__list--academy", tab === "academy");
    brokers.hidden = tab !== "tickers";
    pills.parentNode.hidden = !(tab === "tickers" || tab === "academy");

    if (tab === "recent") {
      var r = recent();
      list.innerHTML = r.length ? '<div class="gs__recent">' + r.map(function (x) {
        return '<button type="button" class="gs-recent" data-gs-q="' + esc(x) + '">' + img("history", "gs__ic16") + "<span>" + esc(x) + "</span></button>";
      }).join("") + "</div>" : note(t("gs.recentEmpty"));
      return;
    }
    if (tab === "tickers") {
      var match = TICKERS.filter(function (x) { return !q || norm(x[1] + " " + x[2]).indexOf(q) >= 0; });
      var f = state.f.tickers;
      pills.innerHTML = TICKER_F.map(function (k) {
        var n = k === "trending" ? match.length : match.filter(function (x) { return x[3] === k; }).length;
        return pill(k, t("gs.f." + k), n, f === k);
      }).join("");
      var rows = f === "trending" ? match : match.filter(function (x) { return x[3] === f; });
      list.innerHTML = rows.length ? rows.map(function (x) {
        return row({ logo: '<span class="gs-logo gs-logo--' + x[0] + '">' + img(x[0], "gs-logo__img") + "</span>", code: x[1], name: x[2], kind: t("gs.f." + x[3]), ex: x[4] });
      }).join("") : note(t("gs.none", { q: raw.trim() }));
      return;
    }
    if (tab !== "academy") { list.innerHTML = note(t("gs.other", { tab: t("gs.tab." + tab) })); return; }

    if (!data) {
      pills.innerHTML = "";
      if (failed) { list.innerHTML = note(t("gs.failed")); return; }
      load();
      if (!data) { list.innerHTML = note(t("gs.loading")); return; }
    }
    var res = academyResults(q), fa = state.f.academy;
    pills.innerHTML = ACADEMY_F.map(function (k) {
      var n = !q ? 0 : k === "all" ? res.lessons.length + res.terms.length + res.chapters.length : res[k].length;
      return pill(k, t("gs.f." + k), n, fa === k);
    }).join("");
    var html;
    if (fa === "lessons") html = res.lessons.map(lessonRow).join("");
    else if (fa === "terms") html = res.terms.map(termRow).join("");
    else if (fa === "chapters" || !q) html = res.chapters.map(chapterRow).join("");
    else html = res.lessons.slice(0, 8).map(lessonRow).join("") + res.terms.slice(0, 6).map(termRow).join("") + res.chapters.slice(0, 4).map(chapterRow).join("");
    if (!html) html = note(t("gs.none", { q: raw.trim() }));
    if (q) html += '<a class="gs__all" href="' + AC.url("search?q=" + encodeURIComponent(raw.trim())) + '">' + esc(t("gs.all", { q: raw.trim() })) + "</a>";
    list.innerHTML = html;
    list.scrollTop = 0;
  }

  // ---------------------------------------------------------------- open / close
  function open(from) {
    if (!root) build();
    opener = from || document.activeElement;
    root.hidden = false;
    document.documentElement.classList.add("has-gs");
    setTab("academy");
    input.focus();
    input.select();
  }
  function close() {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.documentElement.classList.remove("has-gs");
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }

  AC.gsearch = { open: open, close: close };
})();
