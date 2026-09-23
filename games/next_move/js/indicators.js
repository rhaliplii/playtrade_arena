/* =========================================================
   Next Move · indicators.js
   Indicators are computed from the candles, never hand-waved.

   A scenario's `indicators` block decides what the player SEES;
   everything here is calculated from the full series, including the
   backdrop bars that sit off-screen to the left. That's why MA50 and
   MA200 mean something on a 60-bar view.
   ========================================================= */
(function (NM) {
  'use strict';

  /** Simple moving average of closes. Returns null for bars before warm-up. */
  function sma(bars, period, key = 'c') {
    const out = new Array(bars.length).fill(null);
    let sum = 0;
    for (let i = 0; i < bars.length; i++) {
      sum += bars[i][key];
      if (i >= period) sum -= bars[i - period][key];
      if (i >= period - 1) out[i] = sum / period;
    }
    return out;
  }

  /** Exponential moving average — the basis of MACD. */
  function ema(bars, period, key = 'c') {
    const out = new Array(bars.length).fill(null);
    if (bars.length < period) return out;
    const k = 2 / (period + 1);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += bars[i][key];
    let prev = sum / period;
    out[period - 1] = prev;
    for (let i = period; i < bars.length; i++) {
      prev = bars[i][key] * k + prev * (1 - k);
      out[i] = prev;
    }
    return out;
  }

  /**
   * MACD: the distance between two EMAs, its signal line, and the
   * histogram between them. Reads as momentum, not as a buy button.
   */
  function macd(bars, fast = 12, slow = 26, signal = 9) {
    const ef = ema(bars, fast);
    const es = ema(bars, slow);
    const line = bars.map((_, i) => (ef[i] == null || es[i] == null ? null : ef[i] - es[i]));

    /* Signal is an EMA of the MACD line, so it needs its own warm-up. */
    const sig = new Array(bars.length).fill(null);
    const k = 2 / (signal + 1);
    let started = false, prev = 0, count = 0, sum = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] == null) continue;
      if (!started) {
        sum += line[i]; count++;
        if (count === signal) { prev = sum / signal; sig[i] = prev; started = true; }
      } else {
        prev = line[i] * k + prev * (1 - k);
        sig[i] = prev;
      }
    }
    const hist = line.map((v, i) => (v == null || sig[i] == null ? null : v - sig[i]));
    return { line, signal: sig, hist };
  }

  /**
   * Bollinger Bands: a moving average plus/minus a multiple of standard
   * deviation. Band width is volatility — it says when, never which way.
   */
  function bollinger(bars, period = 20, mult = 2) {
    const mid = sma(bars, period);
    const upper = new Array(bars.length).fill(null);
    const lower = new Array(bars.length).fill(null);
    const width = new Array(bars.length).fill(null);
    for (let i = period - 1; i < bars.length; i++) {
      let v = 0;
      for (let j = i - period + 1; j <= i; j++) v += Math.pow(bars[j].c - mid[i], 2);
      const sd = Math.sqrt(v / period);
      upper[i] = mid[i] + sd * mult;
      lower[i] = mid[i] - sd * mult;
      width[i] = mid[i] ? (upper[i] - lower[i]) / mid[i] : null;
    }
    return { mid, upper, lower, width };
  }

  /** Wilder-smoothed RSI. */
  function rsi(bars, period = 14) {
    const out = new Array(bars.length).fill(null);
    if (bars.length < period + 1) return out;
    let gain = 0, loss = 0;
    for (let i = 1; i <= period; i++) {
      const d = bars[i].c - bars[i - 1].c;
      if (d >= 0) gain += d; else loss -= d;
    }
    gain /= period; loss /= period;
    out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    for (let i = period + 1; i < bars.length; i++) {
      const d = bars[i].c - bars[i - 1].c;
      gain = (gain * (period - 1) + Math.max(0, d)) / period;
      loss = (loss * (period - 1) + Math.max(0, -d)) / period;
      out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    }
    return out;
  }

  /** Volume moving average — the baseline that makes "high volume" mean something. */
  function volumeAvg(bars, period = 20) {
    return sma(bars, period, 'v');
  }

  /**
   * Slow stochastic. %K is where the close sits inside the recent range,
   * smoothed; %D is a moving average of %K. Unlike RSI it is bounded by
   * the actual high/low of the lookback, so it pins at the extremes during
   * a trend — which is a lesson in itself.
   */
  function stochastic(bars, period = 14, kSmooth = 3, dPeriod = 3) {
    const raw = new Array(bars.length).fill(null);
    for (let i = period - 1; i < bars.length; i++) {
      let hi = -Infinity, lo = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (bars[j].h > hi) hi = bars[j].h;
        if (bars[j].l < lo) lo = bars[j].l;
      }
      raw[i] = hi === lo ? 50 : ((bars[i].c - lo) / (hi - lo)) * 100;
    }
    const smooth = (arr, n) => {
      const out = new Array(arr.length).fill(null);
      let sum = 0, count = 0;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] == null) continue;
        sum += arr[i]; count++;
        if (count > n) { sum -= arr[i - n]; count = n; }
        if (count === n) out[i] = sum / n;
      }
      return out;
    };
    const k = smooth(raw, kSmooth);
    return { k, d: smooth(k, dPeriod) };
  }

  /** Average true range, as a fraction of price. Used for risk/reward talk. */
  function atr(bars, period = 14) {
    const out = new Array(bars.length).fill(null);
    let sum = 0;
    const tr = bars.map((b, i) => {
      if (i === 0) return b.h - b.l;
      const p = bars[i - 1].c;
      return Math.max(b.h - b.l, Math.abs(b.h - p), Math.abs(b.l - p));
    });
    for (let i = 0; i < bars.length; i++) {
      sum += tr[i];
      if (i >= period) sum -= tr[i - period];
      if (i >= period - 1) out[i] = sum / period;
    }
    return out;
  }

  /**
   * Everything a chart or an explanation might need, computed once per
   * scenario at load time.
   */
  function computeAll(bars) {
    const bb = bollinger(bars, 20, 2);
    const m = macd(bars, 12, 26, 9);
    const st = stochastic(bars, 14, 3, 3);
    const atr14 = atr(bars, 14);
    return {
      stochK: st.k,
      stochD: st.d,
      /* ATR as a percentage of price, so the pane reads the same whether the
         chart is EUR/USD at 1.08 or BTC at 96,000. */
      atrPct: atr14.map((v, i) => (v == null ? null : (v / bars[i].c) * 100)),
      ma20: sma(bars, 20),
      ma50: sma(bars, 50),
      ma200: sma(bars, 200),
      rsi: rsi(bars, 14),
      volAvg: volumeAvg(bars, 20),
      atr: atr(bars, 14),
      bbUpper: bb.upper,
      bbMid: bb.mid,
      bbLower: bb.lower,
      bbWidth: bb.width,
      macd: m.line,
      macdSignal: m.signal,
      macdHist: m.hist,
    };
  }

  /** Series lookup by name, for chart overlays that follow an indicator. */
  function seriesFor(ind, bars, name) {
    if (name === 'high') return bars.map((b) => b.h);
    if (name === 'low') return bars.map((b) => b.l);
    if (name === 'close') return bars.map((b) => b.c);
    return ind[name] || null;
  }

  /**
   * Facts about the last visible bar, used for the Analyst Insight
   * power-up and for generated fallback hints. Everything here is
   * measured, so it can never contradict the chart.
   */
  function readout(bars, cutIndex, ind) {
    const i = cutIndex - 1;
    const bar = bars[i];
    if (!bar) return {};
    const volAvg = ind.volAvg[i];
    const r = {
      close: bar.c,
      volume: bar.v,
      volVsAvg: volAvg ? bar.v / volAvg - 1 : 0,
      rsi: ind.rsi[i],
      atrPct: ind.atr[i] ? ind.atr[i] / bar.c : 0,
    };
    if (ind.bbWidth[i] != null) {
      r.bbWidth = ind.bbWidth[i];
      /* Where this squeeze sits against the last 100 bars of volatility. */
      const hist = ind.bbWidth.slice(Math.max(0, i - 99), i + 1).filter((v) => v != null);
      r.bbWidthRank = hist.length ? hist.filter((v) => v < r.bbWidth).length / hist.length : null;
      r.bbPos = (bar.c - ind.bbLower[i]) / ((ind.bbUpper[i] - ind.bbLower[i]) || 1);
    }
    if (ind.stochK[i] != null) {
      r.stochK = ind.stochK[i];
      r.stochD = ind.stochD[i];
    }
    if (ind.atrPct[i] != null) {
      r.atrPct14 = ind.atrPct[i];
      /* Where current volatility sits against the last 100 bars. */
      const hist = ind.atrPct.slice(Math.max(0, i - 99), i + 1).filter((v) => v != null);
      r.atrRank = hist.length ? hist.filter((v) => v < r.atrPct14).length / hist.length : null;
    }
    if (ind.macd[i] != null) {
      r.macd = ind.macd[i];
      r.macdSignal = ind.macdSignal[i];
      r.macdHist = ind.macdHist[i];
    }
    ['ma20', 'ma50', 'ma200'].forEach((k) => {
      const v = ind[k][i];
      if (v == null) return;
      r[k] = v;
      r[k + 'Dist'] = bar.c / v - 1;
      const prev = ind[k][i - 10];
      r[k + 'Slope'] = prev == null ? 0 : v / prev - 1;
    });
    return r;
  }

  NM.Indicators = { sma, ema, macd, bollinger, rsi, stochastic, volumeAvg, atr, computeAll, readout, seriesFor };
})(window.NM = window.NM || {});
