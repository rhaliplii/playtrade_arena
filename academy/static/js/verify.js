/* Profit.com Academy · certificate verify page (/academy/verify; canvas Certificate-Verify).
   The ID comes from ?id= or from the path after /verify/ (server rewrite of /academy/verify/<ID>). AC.certs.lookup
   normalizes it (trim, uppercase, no spaces or dashes) and matches it EXACTLY: a near miss is "No certificate found",
   never a partial match. States: search (no ID), verified, not found. Always noindex. */
(function () {
  "use strict";
  var AC = window.AC;
  var t = function (k, v) { return AC.t(k, v); };
  var esc = AC.esc;
  var DEMO = "TF-7K2Q-9D4M";   // the sample certificate in the search state's picture (content/demo/certificates.json)

  function check(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  }
  function idFromUrl() {
    var q = (location.search.match(/[?&]id=([^&#]*)/) || [])[1];
    if (q != null) { try { return decodeURIComponent(q.replace(/\+/g, " ")); } catch (e) { return q; } }
    var p = location.pathname.match(/\/verify\/([^/?#]+)\/?$/);
    if (p && !/^index\.html?$/i.test(p[1])) { try { return decodeURIComponent(p[1]); } catch (e) { return p[1]; } }
    return null;
  }
  function meta(title, description) {
    document.title = title;
    var d = document.querySelector('meta[name="description"]');
    if (d) d.setAttribute("content", description);
    ["og:title", "og:description"].forEach(function (k, i) {
      var m = document.querySelector('meta[property="' + k + '"]');
      if (m) m.setAttribute("content", i ? description : title);
    });
  }
  function form(value, button, small) {
    return '<form class="vf-form' + (small ? " vf-form--sm" : "") + '" action="index.html" method="get" role="search" novalidate><label class="vf-field">' +
      (small ? "" : '<svg class="vf-field__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>') +
      '<span class="vf-vh">' + esc(t("verify.label")) + '</span><input class="vf-field__input" name="id" type="text" value="' + esc(value || "") + '" placeholder="' + esc(t("verify.placeholder")) +
      '" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" aria-describedby="vfHint"></label><button class="vf-btn" type="submit">' + esc(t(button)) + "</button></form>";
  }

  // ---------------------------------------------------------------- states
  function sample(root) {
    var box = AC.$("[data-vf-sample]", root);
    if (!box) return;
    var row = AC.certs.lookup(DEMO);
    if (!row) return;
    box.insertAdjacentHTML("afterbegin", AC.cert.html(AC.cert.model(row)));
    var fig = AC.$(".ac-cert", box);
    if (fig) { fig.setAttribute("aria-hidden", "true"); fig.removeAttribute("aria-label"); }
  }
  function valid(root, row) {
    var m = AC.cert.model(row);
    var pro = m.tier === "pro";
    meta(t("verify.meta.valid", { name: m.name, path: m.title }), t("verify.meta.validText", { name: m.name, path: m.title, date: m.date, id: m.id }));
    var facts = [["verify.f.to", m.name], ["verify.f.path", t(pro ? "verify.f.pro" : "verify.f.free", { path: m.title })], ["verify.f.date", m.date],
      ["verify.f.id", m.id], ["verify.f.by", t("cert.issuer")]];
    var stats = [[AC.fmt.num(m.lessons), t("verify.took.lessons")], [AC.fmt.num(m.chapters) + "/" + AC.fmt.num(m.chapters), t("verify.took.challenges")],
      pro ? [m.level, t("verify.took.level")] : ["1", t("verify.took.plan")]];
    root.innerHTML = '<div class="vf-valid vf-valid--' + m.tier + '">' +
      '<div class="vf-ok" role="status"><span class="vf-ok__ic">' + check(24) + '</span><span class="vf-ok__text"><b>' + esc(t("verify.ok.title")) + "</b><span>" + esc(t("verify.ok.text")) + "</span></span></div>" +
      '<div class="vf-cert">' + AC.cert.html(m).replace("ac-cert ", "ac-cert ac-cert--lift ") + "</div>" +
      '<section class="vf-card vf-took" aria-labelledby="vfTook"><h2 class="vf-h3" id="vfTook">' + esc(t("verify.took")) + "</h2>" +
      '<div class="vf-stats">' + stats.map(function (s) { return '<span class="vf-stat"><b>' + esc(s[0]) + "</b><span>" + esc(s[1]) + "</span></span>"; }).join("") + "</div>" +
      '<ul class="vf-chips" aria-label="' + esc(t("verify.took.chapters")) + '">' + m.chapterNames.map(function (n, i) {
        return '<li class="vf-chip"><span class="vf-chip__ic">' + check(12) + "</span>" + esc((i + 1) + ". " + n) + "</li>";
      }).join("") + "</ul>" +
      '<p class="vf-note">' + esc(t("verify.took.note")) + "</p></section>" +
      '<aside class="vf-side">' +
      '<dl class="vf-card vf-facts" aria-label="' + esc(t("verify.facts")) + '">' + facts.map(function (f) { return '<div class="vf-fact"><dt>' + esc(t(f[0])) + "</dt><dd>" + esc(f[1]) + "</dd></div>"; }).join("") + "</dl>" +
      '<section class="vf-cta' + (pro ? " vf-cta--pro" : "") + '" aria-labelledby="vfCta"><span class="vf-cta__text"><b id="vfCta">' + esc(t("verify.cta.title")) + "</b><span>" + esc(t(pro ? "verify.cta.pro" : "verify.cta.free", { path: m.title })) + "</span></span>" +
      '<a class="vf-btn vf-btn--white" href="' + (pro ? AC.url("pro") : AC.url("")) + '">' + esc(t(pro ? "verify.cta.btnPro" : "verify.cta.btn")) + "</a></section>" +
      '<button type="button" class="vf-copy" data-cert-act="copy">' + esc(t("verify.copy")) + "</button>" +
      "</aside></div>";
    AC.cert.bind(root, m);
    // show the canonical ID in the address bar (a lowercase or dash-less ID resolves to the same certificate)
    try { if (idFromUrl() !== m.id && /[?&]id=/.test(location.search)) history.replaceState(null, "", location.pathname + "?id=" + encodeURIComponent(m.id)); } catch (e) {}
  }
  function missing(root, raw) {
    var shown = String(raw).trim().toUpperCase().slice(0, 40);
    meta(t("verify.meta.missing"), t("verify.meta.missingText"));
    var text = esc(t("verify.no.text", { id: "\u0000" })).replace("\u0000", "<b>" + esc(shown) + "</b>");
    root.innerHTML = '<section class="vf-none" aria-labelledby="vfNone"><span class="vf-none__ic" aria-hidden="true">!</span>' +
      '<h1 class="vf-h2" id="vfNone">' + esc(t("verify.no.title")) + '</h1><p class="vf-none__text">' + text + "</p>" +
      form(shown, "verify.no.btn", true) + '<p class="vf-hint vf-hint--center" id="vfHint">' + esc(t("verify.hint")) + "</p></section>";
  }

  AC.ready(function () {
    var root = document.getElementById("vfRoot");
    if (!root) return;
    var raw = idFromUrl();
    if (raw == null || !String(raw).trim()) { meta(t("verify.meta.title"), t("verify.meta.description")); sample(root); }
    else {
      var row = AC.certs.lookup(raw);
      if (row) valid(root, row); else missing(root, raw);
    }
    // a search goes to the ID's own address (the verify link); an empty one says what's missing
    root.addEventListener("submit", function (e) {
      var f = e.target.closest(".vf-form");
      if (!f) return;
      e.preventDefault();
      var input = AC.$("input", f), v = String(input.value || "").trim();
      if (!v) { input.setAttribute("aria-invalid", "true"); var h = document.getElementById("vfHint"); if (h) h.textContent = t("verify.empty"); input.focus(); return; }
      location.href = AC.certs.lookup(v) ? AC.certs.pageUrl(v) : AC.url("verify?id=" + encodeURIComponent(v));
    });
  });
})();
