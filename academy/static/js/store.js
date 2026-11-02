/* Profit.com Academy · storage adapter.
   The progress engine only talks to AC.store. Here it is localStorage, one record per account
   ("guest" or a member id). On Profit.com replace this file with calls to the Academy API; the
   server then owns the record and runs the same rules as js/engine.js. */
(function () {
  "use strict";
  var AC = (window.AC = window.AC || {});
  var PREFIX = "ac_v1_";
  var mem = {}; // fallback when storage is blocked (private mode, previews)

  function read(key) {
    try { var v = localStorage.getItem(PREFIX + key); return v ? JSON.parse(v) : null; }
    catch (e) { return mem[key] ? JSON.parse(mem[key]) : null; }
  }
  function write(key, val) {
    var s = JSON.stringify(val);
    try { localStorage.setItem(PREFIX + key, s); } catch (e) { mem[key] = s; }
  }
  function remove(key) { try { localStorage.removeItem(PREFIX + key); } catch (e) { delete mem[key]; } }

  AC.store = {
    load: function (account) { return read("record_" + account); },
    /** Writes the record and its revision stamp (`record.rev`) under a small key, so other tabs can tell cheaply
        whether the stored record changed since they read it (AC.store.rev). */
    save: function (account, record) { write("record_" + account, record); write("rev_" + account, record && record.rev != null ? record.rev : null); },
    rev: function (account) { var r = read("rev_" + account); return r == null ? null : r; },
    clear: function (account) { remove("record_" + account); remove("rev_" + account); },
    get: read,
    set: write,
    remove: remove,
  };
})();
