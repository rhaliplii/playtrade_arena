/* Profit.com Academy · paths for the platform shell.
   topnav.js (and the footer) write root-relative URLs (assets/…, index.html, academy/…) because they were made
   for pages at the site root. Academy pages sit deeper, so URLs inside platform markup (.topnav, its dropdowns,
   the mobile menu, the footer) are rewritten with <html data-root>. Academy markup is never touched.
   Loaded in <head>, before topnav.js renders (it builds lazily, so new nodes are watched). Same idea as
   trading_calculators/calc-shell.js. */
(function () {
  "use strict";
  var ROOT = document.documentElement.getAttribute("data-root") || "";
  if (!ROOT) return;
  var PLATFORM = ".topnav, .nav-dd, .mnav, .pf-footer, .lang-dd";
  var PAGE = /^[a-z0-9-]+\.html([#?].*)?$/i;
  function fixNode(n) {
    if (!n.getAttribute || !n.closest || !n.closest(PLATFORM)) return;
    var s = n.getAttribute("src");
    if (s && (s.indexOf("assets/") === 0 || s.indexOf("academy/") === 0)) n.setAttribute("src", ROOT + s);
    var h = n.getAttribute("href");
    if (h && (h.indexOf("assets/") === 0 || h.indexOf("trading_calculators/") === 0 || h.indexOf("academy/") === 0 || PAGE.test(h))) n.setAttribute("href", ROOT + h);
  }
  function fix(el) {
    if (!el || el.nodeType !== 1) return;
    fixNode(el);
    Array.prototype.forEach.call(el.querySelectorAll("[src],[href]"), fixNode);
  }
  new MutationObserver(function (recs) {
    recs.forEach(function (r) {
      if (r.type === "attributes") fixNode(r.target);
      else Array.prototype.forEach.call(r.addedNodes, fix);
    });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "href"] });
  document.addEventListener("DOMContentLoaded", function () { fix(document.body); });
})();
