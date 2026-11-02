/* Profit.com Academy · certificates service (AC.certs).
   Issues certificate IDs and looks them up. In this build the registry lives in the browser: certificates issued on
   this device (AC.store "cert_registry") plus the demo registry the build inlines on the verify and certificate pages
   (content/demo/certificates.json → #ac-cert-seed). On Profit.com the server owns it (backend/API.md):
   POST /academy/paths/:id/finish issues the certificate in the same transaction, GET /academy/certificates/:id looks
   one up. The rules are the same on both sides:
   - ID = PREFIX-XXXX-XXXX. PREFIX per path (catalog.json `certPrefix`, reaches every page as #ac-index certPrefix),
     X from an unambiguous alphabet (no 0/O/1/I/L). Regenerated on a collision with the registry.
   - Lookup: trim, uppercase, drop spaces and dashes, then an EXACT match on that canonical form. Never partial. */
(function () {
  "use strict";
  var AC = (window.AC = window.AC || {});

  var ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  var REG = "cert_registry";
  // the public verify address (QR codes, LinkedIn, shared links). A server rewrite maps /academy/verify/<ID> to
  // /academy/verify/?id=<ID> (ARCHITECTURE.md › Certificates).
  var ORIGIN = "https://www.profit.com";
  var VERIFY_PATH = "/academy/verify/";

  function index() { return (AC.index ? AC.index() : null) || {}; }
  function prefixOf(path) {
    var map = index().certPrefix || {};
    if (map[path]) return map[path];
    // a path the catalog doesn't know (tests, drafts): its initials
    var p = String(path || "").split(/[^a-z0-9]+/i).filter(Boolean).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
    return (p + "AC").slice(0, 2);
  }
  /** "  tf-7k2q 9d4m " → "TF7K2Q9D4M" (the stored key). */
  function canonical(raw) { return String(raw == null ? "" : raw).trim().toUpperCase().replace(/[\s-]+/g, ""); }
  /** "TF7K2Q9D4M" → "TF-7K2Q-9D4M" (the printed form): the last 8 characters are the code, the rest the prefix. */
  function pretty(canon) {
    var c = canonical(canon);
    if (c.length <= 8) return c;
    var code = c.slice(-8), pre = c.slice(0, -8);
    return pre + "-" + code.slice(0, 4) + "-" + code.slice(4);
  }
  function rand(n) {
    var out = "", buf = null;
    try { buf = new Uint32Array(n); (window.crypto || window.msCrypto).getRandomValues(buf); } catch (e) { buf = null; }
    for (var i = 0; i < n; i++) out += ALPHABET.charAt((buf ? buf[i] : Math.floor(Math.random() * 1e9)) % ALPHABET.length);
    return out;
  }
  function registry() { return AC.store.get(REG) || {}; }
  function seed() {
    var out = {};
    var s = AC.data ? AC.data("ac-cert-seed") : null;
    ((s && s.certificates) || []).forEach(function (c) { out[canonical(c.id)] = c; });
    return out;
  }
  function find(canon) {
    if (!canon) return null;
    var r = registry();
    if (Object.prototype.hasOwnProperty.call(r, canon)) return r[canon];
    var s = seed();
    return Object.prototype.hasOwnProperty.call(s, canon) ? s[canon] : null;
  }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  AC.certs = {
    ALPHABET: ALPHABET,
    prefix: prefixOf,
    canonical: canonical,
    pretty: pretty,
    /** A fresh ID for a path, unique against the registry. */
    newId: function (path) {
      var id;
      do { id = prefixOf(path) + "-" + rand(4) + "-" + rand(4); } while (find(canonical(id)));
      return id;
    },
    /** Issue a certificate: {path, userId, name, d?} → {id, path, user_id, name, issued_at}. Production: done by the
        server inside the path-finish transaction; the client never issues. */
    issue: function (o) {
      var id = AC.certs.newId(o.path);
      var row = { id: id, path: o.path, user_id: o.userId || null, name: String(o.name || "").trim(), issued_at: o.d || today() };
      var r = registry();
      r[canonical(id)] = row;
      AC.store.set(REG, r);
      return row;
    },
    /** Make sure a certificate already held in a learner record is in the registry (records from before the
        registry, or a cleared one). */
    register: function (c, userId) {
      var k = canonical(c.id);
      if (!k || find(k)) return;
      var r = registry();
      r[k] = { id: pretty(k), path: c.path, user_id: userId || null, name: c.name || "", issued_at: c.d };
      AC.store.set(REG, r);
    },
    /** Public lookup: {id, name, path, issued_at} or null. Exact match on the canonical form only. */
    lookup: function (raw) {
      var row = find(canonical(raw));
      return row ? { id: pretty(row.id), name: row.name, path: row.path, issued_at: row.issued_at } : null;
    },
    /** The public verify address of an ID (QR codes, LinkedIn, share links). */
    verifyUrl: function (id) { return ORIGIN + VERIFY_PATH + encodeURIComponent(pretty(id)); },
    /** "profit.com/academy/verify" for print. */
    verifyHost: function () { return (ORIGIN + VERIFY_PATH).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""); },
    /** The verify page to open from here: the public address on profit.com, the built page anywhere else (:8790, file://). */
    pageUrl: function (id) {
      if (id && /(^|\.)profit\.com$/.test(location.hostname)) return AC.certs.verifyUrl(id);
      return id ? AC.url("verify?id=" + encodeURIComponent(pretty(id))) : AC.url("verify");
    },
  };
})();
