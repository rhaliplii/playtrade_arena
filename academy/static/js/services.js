/* Profit.com Academy · platform services (auth, wallet, analytics).
   Stand-ins with the same surface the Profit.com services would expose. Replace per service in production. */
(function () {
  "use strict";
  var AC = (window.AC = window.AC || {});

  // ---------------------------------------------------------------- analytics
  var EVENTS = ["lesson_start", "card_answer", "lesson_complete", "challenge_start", "challenge_pass", "challenge_fail",
    "gym_session", "signup_from_academy", "streak_day", "placement_complete",
    "rank_up", "path_finish", "coins_award", "guide_request", "share"];
  AC.analytics = {
    track: function (name, props) {
      if (EVENTS.indexOf(name) < 0 && window.console) console.warn("[academy] unknown analytics event", name);
      var payload = Object.assign({ event: "academy_" + name, ts: Date.now(), account: AC.auth && AC.auth.account() }, props || {});
      (window.dataLayer = window.dataLayer || []).push(payload);
      if (/[?&]debug=1/.test(location.search) && window.console) console.info("[analytics]", payload);
    },
  };

  // ---------------------------------------------------------------- auth
  // Guest ↔ member. Signing up moves the guest record into the new account (the engine merges it).
  // `?as=guest|new|member` previews a state without touching saved progress.
  var SESSION = "session";
  function session() { return AC.store.get(SESSION) || { user: null }; }
  // Prototype switcher (bottom-left): the chosen view is remembered across pages; ?as= sets it too; "real" (alias "me") clears it.
  var PREVIEW_KEY = "ac_preview";
  var asParam = (location.search.match(/[?&]as=(guest|new|member|pro|real|me)\b/) || [])[1] || null;
  if (asParam === "me") asParam = "real";
  try {
    if (asParam === "real") localStorage.removeItem(PREVIEW_KEY);
    else if (asParam) localStorage.setItem(PREVIEW_KEY, asParam);
  } catch (e) {}
  var preview = null;
  try { preview = asParam === "real" ? null : (asParam || localStorage.getItem(PREVIEW_KEY)); } catch (e) { preview = asParam; }
  if (preview === "real" || preview === "me") preview = null;

  // Prototype accounts: email → user, so "Log in" finds the account made on this device.
  // Production: Profit.com auth owns accounts; the Academy only reads the signed-in user.
  var ACCOUNTS = "accounts";
  function accounts() { return AC.store.get(ACCOUNTS) || {}; }
  function clearPreview() {
    try { localStorage.removeItem(PREVIEW_KEY); } catch (e) {}
    preview = null; AC.auth.preview = null;
  }
  function handleOf(s) { return String(s || "jordan").toLowerCase().replace(/[^a-z0-9]+/g, "") || "jordan"; }
  function newUser(name, email) {
    return { id: "m_" + Math.random().toString(36).slice(2, 10), name: name || "Jordan E.", handle: handleOf(name), email: email || "", since: new Date().toISOString() };
  }
  function startSession(user) {
    var from = preview === "guest" ? "preview-guest" : "guest";   // the guest record this sign-up came from
    AC.store.set(SESSION, { user: user });
    clearPreview();
    // a new account (or one without progress yet) keeps what the learner did as a guest
    if (AC.progress && !AC.store.load(user.id)) AC.progress.mergeGuestInto(user.id, from);
  }

  AC.auth = {
    preview: preview,
    setPreview: function (v) {
      try { if (v && v !== "real" && v !== "me") localStorage.setItem(PREVIEW_KEY, v); else localStorage.removeItem(PREVIEW_KEY); } catch (e) {}
      // choosing a preview starts it over: Guest = a first-time guest, New = a fresh account, Member/Pro = the demo again
      if (v && v !== "real" && v !== "me") AC.store.clear("preview-" + v);
      var url = location.href.replace(/([?&])as=[a-z]+&?/, "$1").replace(/[?&]$/, "");
      location.replace(url);
    },
    user: function () {
      if (preview === "guest") return null;
      if (preview) return { id: "preview-" + preview, name: "Jordan E.", handle: "jordan", preview: true };
      return session().user;
    },
    isGuest: function () { return !AC.auth.user(); },
    /** Profit.com Pro subscription (production: from the platform account). `?as=pro` previews it. */
    isPro: function () { return preview === "pro" || !!(session().user && session().user.pro); },
    /** The progress record in use: a member id, "guest" (a real guest), or "preview-guest" (the View as › Guest preview,
        kept apart so previewing never touches the real guest's progress). */
    account: function () { var u = AC.auth.user(); return u ? u.id : preview === "guest" ? "preview-guest" : "guest"; },
    /** Create an account and sign in (guest progress moves into it). Clears any "View as" preview. */
    signUp: function (name, email) {
      var key = String(email || "").trim().toLowerCase();
      var list = accounts();
      var user = newUser(name, key);
      if (key) { list[key] = user; AC.store.set(ACCOUNTS, list); }
      startSession(user);
      AC.analytics.track("signup_from_academy", { from: location.pathname });
      return user;
    },
    /** Log in with an email. Prototype: the account made with that email on this device, or else a new session for it. */
    logIn: function (email) {
      var key = String(email || "").trim().toLowerCase();
      var list = accounts();
      var user = list[key];
      if (!user) {
        user = newUser(key.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); }), key);
        list[key] = user; AC.store.set(ACCOUNTS, list);
      }
      startSession(user);
      return user;
    },
    /** Sign out: back to a guest on this device (any "View as" preview is cleared too). */
    logOut: function () { AC.store.set(SESSION, { user: null }); clearPreview(); },
    /** Delete the signed-in account and its progress from this device, then sign out. */
    deleteAccount: function () {
      var u = session().user;
      if (u) {
        AC.store.clear(u.id);
        var list = accounts();
        Object.keys(list).forEach(function (k) { if (list[k].id === u.id) delete list[k]; });
        AC.store.set(ACCOUNTS, list);
      } else {
        AC.store.clear("guest");
      }
      AC.auth.logOut();
    },
  };

  // ---------------------------------------------------------------- wallet (Profit Coins)
  // Profit Coins already exist on Profit.com; the Academy only awards them (500 per finished path).
  var WALLET_BASE = 54930; // the balance the platform shows in its side nav (sample)
  AC.wallet = {
    balance: function () { return (AC.auth.isGuest() ? 0 : WALLET_BASE) + ((AC.progress && AC.progress.state().coins) || 0); },
    award: function (amount, reason) { AC.analytics.track("coins_award", { amount: amount, reason: reason }); },
  };
})();
