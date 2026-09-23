/* =========================================================
   Next Move · analytics.js
   Event bus. Pushes to window.dataLayer, same as the other
   Playtrade mini-games, so a tag manager can pick it up later.
   No backend, no network calls (spec §50).
   ========================================================= */
(function (NM) {
  'use strict';

  const PREFIX = 'next_move_';
  const listeners = [];

  function track(name, props = {}) {
    const payload = { event: PREFIX + name, ...props };
    (window.dataLayer = window.dataLayer || []).push(payload);
    listeners.forEach((fn) => { try { fn(name, props); } catch { /* a listener must never break the game */ } });
    if (NM.DEBUG) console.log('[next_move]', name, props);
  }

  /** Standard payload for anything scenario-related. */
  function scenarioProps(scn, extra = {}) {
    return {
      scenario_id: scn.id,
      category: scn.category,
      concept: scn.concept,
      difficulty: scn.difficulty,
      correct_answer: scn.answer,
      ...extra,
    };
  }

  NM.Analytics = { track, scenarioProps, onEvent: (fn) => listeners.push(fn) };
})(window.NM = window.NM || {});
