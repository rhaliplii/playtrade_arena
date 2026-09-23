/* =========================================================
   Next Move · audio.js
   Small WebAudio cues — synthesised, so the game ships with no
   audio assets and no loading delay. Muted state persists.

   Deliberately restrained: short, quiet, tonal. No casino jingles
   (spec §34).
   ========================================================= */
(function (NM) {
  'use strict';

  let ctx = null;
  let enabled = true;
  let unlocked = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
    return ctx;
  }

  /** Browsers require a gesture before audio can start. */
  function unlock() {
    if (unlocked) return;
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    unlocked = true;
  }

  function tone(freq, dur, { type = 'sine', gain = 0.06, at = 0, slideTo = null } = {}) {
    if (!enabled) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + at;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, { gain = 0.05, at = 0 } = {}) {
    if (!enabled) return;
    const c = ensure();
    if (!c) return;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    g.gain.value = gain;
    src.buffer = buf;
    src.connect(f).connect(g).connect(c.destination);
    src.start(c.currentTime + at);
  }

  const SFX = {
    correct() { tone(660, 0.1, { gain: 0.05 }); tone(990, 0.16, { at: 0.07, gain: 0.045 }); },
    wrong() { tone(200, 0.18, { type: 'triangle', gain: 0.06, slideTo: 130 }); },
    noTradeRight() { tone(520, 0.1, { gain: 0.04 }); tone(700, 0.14, { at: 0.08, gain: 0.035 }); },
    streak(n) { const base = 620 + Math.min(n, 12) * 40; tone(base, 0.09, { gain: 0.05 }); tone(base * 1.5, 0.12, { at: 0.06, gain: 0.04 }); },
    lifeLost() { tone(320, 0.1, { type: 'square', gain: 0.035, slideTo: 180 }); noise(0.18, { gain: 0.035, at: 0.02 }); },
    candle() { tone(1400, 0.022, { type: 'square', gain: 0.012 }); },
    levelUp() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { at: i * 0.075, gain: 0.05 })); },
    gameOver() { [440, 349, 262].forEach((f, i) => tone(f, 0.3, { at: i * 0.14, gain: 0.05, type: 'triangle' })); },
    tick() { tone(880, 0.03, { type: 'square', gain: 0.02 }); },
    click() { tone(520, 0.03, { type: 'square', gain: 0.022 }); },
    count() { tone(480, 0.09, { type: 'triangle', gain: 0.04 }); },
    go() { tone(720, 0.1, { gain: 0.05 }); tone(1080, 0.18, { at: 0.07, gain: 0.045 }); },
    powerup() { tone(700, 0.08, { gain: 0.045 }); tone(1050, 0.12, { at: 0.06, gain: 0.04 }); },
  };

  function play(name, arg) {
    if (!enabled) return;
    const fn = SFX[name];
    if (fn) { try { fn(arg); } catch { /* audio must never break the game */ } }
  }

  NM.Audio = {
    play,
    unlock,
    setEnabled(v) { enabled = !!v; if (enabled) unlock(); },
    isEnabled: () => enabled,
  };
})(window.NM = window.NM || {});
