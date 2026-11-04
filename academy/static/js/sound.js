/* Profit.com Academy · sound cues (AC.sound). Same approach as the Playtrade market games (next_move/js/audio.js):
   synthesised with Web Audio, so there are no audio files and nothing to load. Short, quiet, tonal: a lesson is
   learning, not a game, so a wrong answer is a soft low note, never a buzzer.
   AC.sound.play(name) · names: correct, wrong, done, goal, pass, rankup, toggle
   On by default; Settings › Sound (and the speaker button in the lesson player) turn it off, saved with the
   learner's settings (AC.progress.settings().sound). Browsers only allow audio after a tap or key press. */
(function () {
  "use strict";
  var AC = window.AC;
  var ctx = null;

  function enabled() {
    try { return !AC.progress || AC.progress.settings().sound !== false; } catch (e) { return true; }
  }
  function ensure() {
    if (ctx) return ctx;
    var A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    try { ctx = new A(); } catch (e) { return null; }
    return ctx;
  }
  function unlock() {
    var c = ensure();
    if (c && c.state === "suspended") c.resume();
  }
  ["pointerdown", "keydown"].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });

  function tone(freq, dur, o) {
    o = o || {};
    var c = ensure();
    if (!c) return;
    var t0 = c.currentTime + (o.at || 0);
    var osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.05, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  var SFX = {
    // a right answer: a bright two-note "ding"
    correct: function () { tone(660, 0.1, { gain: 0.05 }); tone(990, 0.16, { at: 0.07, gain: 0.045 }); },
    // a wrong answer: one soft low note sliding down
    wrong: function () { tone(220, 0.2, { type: "triangle", gain: 0.05, slideTo: 165 }); },
    // a lesson or Gym session done: a short rising arpeggio
    done: function () { [523, 659, 784].forEach(function (f, i) { tone(f, 0.16, { at: i * 0.08, gain: 0.045 }); }); },
    // today's goal met: a two-note chime
    goal: function () { tone(784, 0.14, { gain: 0.045 }); tone(1175, 0.22, { at: 0.1, gain: 0.04 }); },
    // a Chapter Challenge passed, a path finished: the fuller fanfare
    pass: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.18, { at: i * 0.08, gain: 0.05 }); }); tone(1047, 0.4, { at: 0.34, gain: 0.035, type: "triangle" }); },
    // a new rank
    rankup: function () { [392, 523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.2, { at: i * 0.09, gain: 0.05 }); }); tone(1319, 0.5, { at: 0.48, gain: 0.035, type: "triangle" }); },
    // sound switched back on (confirms it works)
    toggle: function () { tone(880, 0.08, { gain: 0.035 }); },
  };

  AC.sound = {
    enabled: enabled,
    set: function (on) { if (AC.progress) AC.progress.settings({ sound: !!on }); if (on) { unlock(); SFX.toggle(); } },
    play: function (name) {
      if (!enabled() || !SFX[name]) return;
      try { unlock(); SFX[name](); } catch (e) { /* audio is a nicety: never break a lesson over it */ }
    },
  };
})();
