/* Profit.com Academy · core: namespace, i18n, formatting, small DOM helpers.
   Loaded first on every Academy page. Plain script (no modules) so file:// works. */
(function () {
  "use strict";
  var AC = (window.AC = window.AC || {});
  var doc = document.documentElement;

  AC.root = doc.getAttribute("data-root") || "";          // relative path to the site root
  AC.base = doc.getAttribute("data-academy") || "";       // relative path to /academy/
  AC.locale = doc.getAttribute("lang") || "en";

  // ---------- i18n: strings are inlined by the build as <script type="application/json" id="ac-i18n">
  var STR = {};
  try { STR = JSON.parse(document.getElementById("ac-i18n").textContent); } catch (e) { STR = {}; }
  AC.strings = STR;

  function plural(n, forms) {
    // forms: {one, other} (CLDR subset; Intl.PluralRules picks the category)
    var cat = "other";
    try { cat = new Intl.PluralRules(AC.locale).select(n); } catch (e) { cat = n === 1 ? "one" : "other"; }
    return forms[cat] != null ? forms[cat] : forms.other;
  }

  /** AC.t("home.hero.title", {n: 3}) · values: {name} placeholders; plural objects {one, other} with {n}. */
  AC.t = function (key, vars) {
    var v = STR[key];
    if (v == null) {
      if (window.console) console.warn("[academy] missing string", key);
      return key.split(".").pop().replace(/[-_]/g, " ");
    }
    if (typeof v === "object") v = plural(vars && vars.n != null ? vars.n : 1, v);
    if (vars) v = v.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? (typeof vars[k] === "number" ? AC.fmt.num(vars[k]) : vars[k]) : m; });
    return v;
  };

  // ---------- locale formatting
  AC.fmt = {
    num: function (n, opts) { try { return new Intl.NumberFormat(AC.locale, opts).format(n); } catch (e) { return String(n); } },
    money: function (n, cur, digits) {
      try { return new Intl.NumberFormat(AC.locale, { style: "currency", currency: cur || "USD", maximumFractionDigits: digits == null ? 2 : digits, minimumFractionDigits: digits == null ? undefined : digits }).format(n); }
      catch (e) { return "$" + n; }
    },
    pct: function (n, digits) { try { return new Intl.NumberFormat(AC.locale, { style: "percent", maximumFractionDigits: digits || 0 }).format(n); } catch (e) { return Math.round(n * 100) + "%"; } },
    date: function (d, opts) { try { return new Intl.DateTimeFormat(AC.locale, opts || { month: "short", day: "numeric", year: "numeric" }).format(new Date(d)); } catch (e) { return String(d); } },
  };

  // ---------- helpers
  AC.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
  /** Inline content markup → safe HTML: **bold**, {up}x{/up}, {down}x{/down}, [[term|text]] */
  AC.rich = function (s) {
    var out = AC.esc(s || "");
    out = out.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    out = out.replace(/\{up\}(.+?)\{\/up\}/g, '<b class="ac-up">$1</b>').replace(/\{down\}(.+?)\{\/down\}/g, '<b class="ac-down">$1</b>');
    out = out.replace(/\[\[([a-z0-9-]+)\|(.+?)\]\]/g, '<button type="button" class="ac-term" data-term="$1">$2</button>');
    return out;
  };
  AC.$ = function (sel, el) { return (el || document).querySelector(sel); };
  AC.$$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  AC.h = function (html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  /** AC.url("learn-to-trade/how-markets-work") → "../learn-to-trade/how-markets-work/index.html" (works on file:// too).
      A query or hash is kept: AC.url("u?h=mira") → ".../u/index.html?h=mira". */
  AC.url = function (route) {
    var m = String(route || "").replace(/^\/+|\/+$/g, "").match(/^([^?#]*)(.*)$/);
    var path = m[1].replace(/\/+$/, "");
    return AC.base + (path ? path + "/" : "") + "index.html" + m[2];
  };
  AC.data = function (id) { try { return JSON.parse(document.getElementById(id).textContent); } catch (e) { return null; } };

  // Rico poses (the coach, hoodie) and rank looks
  AC.rico = function (pose) { return AC.base + "static/img/rico/" + pose + ".webp"; };
  AC.rankLook = function (rank) { return AC.base + "static/img/ranks/" + rank + ".webp"; };
  /** The OS setting, or Settings › Reduce motion (html.ac-reduce-motion, kept in sync by lib.py's head script and shell.js). */
  AC.reducedMotion = function () {
    return doc.classList.contains("ac-reduce-motion") || !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };

  // pages register an init function; it runs after all scripts load
  var inits = [];
  AC.ready = function (fn) { inits.push(fn); };
  document.addEventListener("DOMContentLoaded", function () { inits.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } }); });
})();
