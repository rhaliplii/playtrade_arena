/* =========================================================
   Next Move · scenarios.js

   60 authored technical setups. Each one declares its story as price
   action (`chart`) AND as teaching material (concept, explanation,
   learning points, hints). The answer is a consequence of the story,
   never a label stuck on random candles.

   Each scenario also declares the analysis tools its lesson needs, and
   the chart renders exactly those — nothing more. A support-and-
   resistance question shows levels and candles; an RSI question shows
   price and an RSI pane; a Bollinger question shows bands. Putting
   every indicator on every chart would be noise, and would teach the
   habit of ignoring most of what is on screen.

   Symbols are deliberately fictional. These are constructed teaching
   scenarios, not historical replays — the architecture (see build())
   is ready for real market history later, but the prototype must not
   pretend its charts are real (spec §42).
   ========================================================= */
(function (NM) {
  'use strict';

  const UP = 'UP', DOWN = 'DOWN', NO_TRADE = 'NO_TRADE';

  /* ---------- taxonomy ---------- */

  const SKILLS = {
    trend: 'Trend Reading',
    sr: 'Support & Resistance',
    breakout: 'Breakouts',
    pattern: 'Chart Patterns',
    reversal: 'Reversals',
    ma: 'Moving Averages',
    momentum: 'Momentum (RSI / MACD / Stoch)',
    volatility: 'Volatility & Bands',
    fibonacci: 'Fibonacci Levels',
    volume: 'Volume',
    candlestick: 'Candlestick Reading',
    discipline: 'Market Discipline',
  };

  const CATEGORIES = {
    trend: { label: 'Trend', skill: 'trend', color: '#07d8a2' },
    sr: { label: 'Support & Resistance', skill: 'sr', color: '#87bfff' },
    breakout: { label: 'Breakouts', skill: 'breakout', color: '#ffc700' },
    pattern: { label: 'Chart Patterns', skill: 'pattern', color: '#f0a6ca' },
    reversal: { label: 'Reversals', skill: 'reversal', color: '#fd6f8e' },
    ma: { label: 'Moving Averages', skill: 'ma', color: '#b39ddb' },
    rsi: { label: 'RSI', skill: 'momentum', color: '#4dd0e1' },
    macd: { label: 'MACD', skill: 'momentum', color: '#7fd1ae' },
    bollinger: { label: 'Bollinger Bands', skill: 'volatility', color: '#9d8ff0' },
    fibonacci: { label: 'Fibonacci', skill: 'fibonacci', color: '#d8b24a' },
    stochastic: { label: 'Stochastic', skill: 'momentum', color: '#4dd0e1' },
    atr: { label: 'ATR & Volatility', skill: 'volatility', color: '#f0a6ca' },
    volume: { label: 'Volume', skill: 'volume', color: '#ff9100' },
    candlestick: { label: 'Candlesticks', skill: 'candlestick', color: '#ffd28a' },
    notrade: { label: 'Market Discipline', skill: 'discipline', color: '#9ba1a8' },
  };

  /* Practice is organised as a learning path (spec §45). */
  const CHAPTERS = [
    { id: 'trend', n: 1, title: 'Trend', blurb: 'Direction, structure and when a trend is still intact.' },
    { id: 'sr', n: 2, title: 'Support & Resistance', blurb: 'Levels that matter, and what happens when they break.' },
    { id: 'ma', n: 3, title: 'Moving Averages', blurb: 'Dynamic levels — and why a crossover is not a signal by itself.' },
    { id: 'breakout', n: 4, title: 'Breakouts', blurb: 'Real breakouts, weak ones, and traps.' },
    { id: 'volume', n: 5, title: 'Volume', blurb: 'The conviction behind a move.' },
    { id: 'rsi', n: 6, title: 'RSI', blurb: 'Momentum, divergence — and why overbought is not a sell signal.' },
    { id: 'macd', n: 7, title: 'MACD', blurb: 'Crossovers, the zero line, and fading momentum.' },
    { id: 'stochastic', n: 8, title: 'Stochastic', blurb: 'Crossovers, extremes, and why a trend keeps them pinned.' },
    { id: 'bollinger', n: 9, title: 'Bollinger Bands', blurb: 'Volatility squeezes, band walks and mean reversion.' },
    { id: 'atr', n: 10, title: 'ATR & Volatility', blurb: 'How much a market moves — and why that is not a direction.' },
    { id: 'fibonacci', n: 11, title: 'Fibonacci', blurb: 'Retracement levels, confluence, and when they mean nothing.' },
    { id: 'pattern', n: 12, title: 'Chart Patterns', blurb: 'Triangles, wedges, flags and channels.' },
    { id: 'reversal', n: 13, title: 'Reversals', blurb: 'Tops, bottoms, and patterns that never complete.' },
    { id: 'candlestick', n: 14, title: 'Candlesticks', blurb: 'Why the same candle means different things in different places.' },
    { id: 'notrade', n: 15, title: 'Market Discipline', blurb: 'Recognising when there is no edge at all.' },
    { id: 'mixed', n: 16, title: 'Mixed Setups', blurb: 'Everything together, no category hints.' },
  ];

  /*
   * Familiar symbols, so a chart reads instantly instead of asking the
   * player to place a made-up ticker first.
   *
   * These remain CONSTRUCTED teaching scenarios — the price action is
   * authored to demonstrate a concept, not replayed from the tape. The
   * SIMULATED badge stays on every chart and the menu says so in plain
   * words. The reference price only exists so the axis looks sane for the
   * instrument: a chart labelled AAPL should not trade at 12.
   */
  const SYMBOLS = {
    'AAPL': 234, 'MSFT': 478, 'NVDA': 176, 'TSLA': 352, 'AMZN': 228,
    'META': 682, 'GOOGL': 246, 'AMD': 148, 'SPY': 638, 'QQQ': 562,
    'BTC/USD': 96400, 'ETH/USD': 3180, 'EUR/USD': 1.085, 'XAU/USD': 2648,
  };

  /**
   * Scale a finished series so its last visible close lands near the
   * symbol's typical price. Every technical relationship in the game is
   * proportional — percentage moves, band width, RSI, distance to a moving
   * average — so a uniform multiplier leaves the lesson untouched.
   */
  function applyScale(b, symbol, seed) {
    const ref = SYMBOLS[symbol];
    const last = b.bars[b.cutIndex - 1];
    if (!ref || !last || !last.c) return;

    /* A little deterministic spread so repeat symbols don't all close at
       exactly the same number. */
    const jitter = 0.9 + NM.Rng.create(seed + ':scale').next() * 0.2;
    const k = (ref * jitter) / last.c;
    if (!isFinite(k) || k <= 0) return;

    b.bars.forEach((bar) => { bar.o *= k; bar.h *= k; bar.l *= k; bar.c *= k; });
    b.draw.forEach((d) => {
      if (d.type === 'level') d.price *= k;
      else if (d.type === 'zone') { d.lo *= k; d.hi *= k; }
      else if (d.type === 'fib') { d.lo *= k; d.hi *= k; }
      else if (d.type === 'trendline') {
        /* Endpoints given as numbers are prices; keyword endpoints such as
           'low' or 'rsi' resolve from the data at draw time. */
        [d.a, d.b].forEach((pt) => { if (pt && typeof pt[1] === 'number') pt[1] *= k; });
      }
      if (d.type === 'note' && typeof d.value === 'number') d.value *= k;
    });
  }

  /*
   * Chart patterns the game teaches. A scenario names its pattern and,
   * just as importantly, how far along it is:
   *
   *   confirmed   the trigger has happened — a neckline broke, a rail gave way
   *   incomplete  the shape is there but the trigger has not fired yet
   *   failed      the trigger fired and immediately went the other way
   *
   * That last distinction is most of the lesson. A textbook shape with no
   * confirmation is not a setup, and the player has to learn to wait.
   */
  const PATTERNS = {
    'head-and-shoulders': 'Head & Shoulders',
    'inverse-head-and-shoulders': 'Inverse Head & Shoulders',
    'double-top': 'Double Top', 'double-bottom': 'Double Bottom',
    'triple-top': 'Triple Top', 'triple-bottom': 'Triple Bottom',
    'rounded-top': 'Rounded Top', 'rounded-bottom': 'Rounded Bottom',
    'cup-and-handle': 'Cup & Handle',
    'bull-flag': 'Bull Flag', 'bear-flag': 'Bear Flag', 'pennant': 'Pennant',
    'rectangle': 'Rectangle', 'range': 'Horizontal Range', 'retest': 'Breakout Retest',
    'ascending-triangle': 'Ascending Triangle', 'descending-triangle': 'Descending Triangle',
    'symmetrical-triangle': 'Symmetrical Triangle',
    'rising-channel': 'Rising Channel', 'falling-channel': 'Falling Channel',
    'rising-wedge': 'Rising Wedge', 'falling-wedge': 'Falling Wedge',
    'contracting-wedge': 'Contracting Wedge',
    'broadening': 'Broadening Formation',
    'bull-trap': 'Bull Trap', 'bear-trap': 'Bear Trap',
    'blow-off-top': 'Blow-off Top', 'capitulation': 'Capitulation Low',
  };

  const CONFIRMATION = {
    confirmed: { label: 'Confirmed', color: '#1fc47a' },
    incomplete: { label: 'Not confirmed yet', color: '#ffc700' },
    failed: { label: 'Failed', color: '#f2456f' },
  };

  const DIFFICULTY = {
    1: { label: 'Beginner', mult: 1, time: 15 },
    2: { label: 'Intermediate', mult: 1.25, time: 12 },
    3: { label: 'Advanced', mult: 1.5, time: 9.5 },
    4: { label: 'Expert', mult: 2, time: 8 },
  };

  /* =========================================================
     Scenario definitions
     ========================================================= */
  const DEFS = [

    /* ---------------- TREND ---------------- */
    {
      id: 'trend_001', title: 'Pullback in an Uptrend', category: 'trend', difficulty: 1,
      symbol: 'AAPL', timeframe: '1D', answer: UP,
      indicators: { ma: [20], volume: true },
      concept: 'Trend continuation',
      explanation: 'Higher highs and higher lows were intact, and the pullback was shallow and quiet — volume fell while price drifted back to the rising 20-day average. That is a pause in a trend, not a change of direction.',
      learningPoints: ['Higher highs and higher lows', 'Pullback on falling volume', 'Rising 20-day average held'],
      hints: [{ k: 'Structure', v: 'Higher highs, higher lows' }, { k: 'MA20', v: 'Rising, price just above it' }, { k: 'Volume', v: 'Falling through the pullback' }],
      insight: 'Pullback volume is running about 55% below the 20-day average — sellers are not pressing.',
      chart(b) {
        b.vola(0.014).at(72).backdrop(190, 92, { swings: 7 });
        b.zig([[100, 8, { volMul: 1.25 }], [96, 4, { volMul: 0.7 }], [108, 9, { volMul: 1.25 }], [103.5, 4, { volMul: 0.7 }], [114, 8, { volMul: 1.2 }]]);
        b.to(109.2, 5, { volMul: 0.6, volEnd: 0.42, curve: 'ease' });
        b.support(103.5, 'Prior higher low');
        b.cut();
        b.zig([[113, 3, { volMul: 1.1 }], [119.5, 5, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'trend_002', title: 'Bounce Into a Falling Average', category: 'trend', difficulty: 1,
      symbol: 'TSLA', timeframe: '1D', answer: DOWN,
      indicators: { ma: [20] },
      concept: 'Trend continuation (downside)',
      explanation: 'Lower highs and lower lows were firmly in place. The bounce stalled exactly where the previous lower high sat, and the rejection candle closed near its low. Nothing in the structure had changed.',
      learningPoints: ['Lower highs and lower lows', 'Bounce stalled at a prior lower high', 'Long upper wick into resistance'],
      hints: [{ k: 'Structure', v: 'Lower highs, lower lows' }, { k: 'MA20', v: 'Falling, price testing it from below' }, { k: 'Last candle', v: 'Long upper wick, weak close' }],
      insight: 'Each bounce in this sequence has stalled below the previous lower high.',
      chart(b) {
        b.vola(0.015).at(140).backdrop(190, 122, { swings: 7 });
        b.zig([[112, 8, { volMul: 1.2 }], [118, 4, { volMul: 0.7 }], [104, 9, { volMul: 1.25 }], [110, 5, { volMul: 0.7 }], [97, 8, { volMul: 1.25 }]]);
        b.to(102.5, 5, { volMul: 0.75, curve: 'ease' });
        b.pattern('shootingStar', { volMul: 1.1 });
        b.resistance(110, 'Prior lower high');
        b.cut();
        b.zig([[98, 3, { volMul: 1.2 }], [89.5, 6, { volMul: 1.45 }]]);
      },
    },
    {
      id: 'trend_003', title: 'Parabolic Extension', category: 'trend', difficulty: 3,
      symbol: 'NVDA', timeframe: '1D', answer: NO_TRADE,
      patternType: 'blow-off-top', confirmationState: 'incomplete',
      indicators: { ma: [20], volume: true },
      concept: 'Overextension without confirmation',
      explanation: 'The trend was strong but the last leg went vertical and closed with a huge upper wick on climax volume. Buying here means chasing; shorting means fighting a live uptrend with no lower high yet. Neither side had an edge — and the next stretch whipsawed both.',
      myth: 'Overextended does not mean "about to reverse". It means the risk on both sides just got worse.',
      learningPoints: ['Price far above the 20-day average', 'Climax volume with a long upper wick', 'No confirmed lower high yet'],
      hints: [{ k: 'Extension', v: 'Price well above MA20' }, { k: 'Volume', v: 'Climax on the last push' }, { k: 'Structure', v: 'Uptrend intact — no lower high' }],
      insight: 'Price is roughly 19% above its 20-day average — the widest gap on this chart.',
      chart(b) {
        b.vola(0.016).at(60).backdrop(190, 78, { swings: 7 });
        b.zig([[88, 10, { volMul: 1.1 }], [84, 4, { volMul: 0.8 }], [100, 8, { volMul: 1.35, curve: 'accel' }], [118, 6, { volMul: 1.9, curve: 'accel' }]]);
        b.pattern('climaxUp', { volMul: 1.4 });
        b.to(118, 2, { volMul: 1.7 });
        b.cut();
        b.chop(9, { amp: 0.032, volMul: 1.5 });
      },
    },
    {
      id: 'trend_004', title: 'The Higher Low Gives Way', category: 'trend', difficulty: 3,
      symbol: 'MSFT', timeframe: '1D', answer: DOWN,
      indicators: {},
      concept: 'Trend structure break',
      explanation: 'The last push up barely cleared the previous high and took far longer to do it, then price broke the previous higher low. That is the moment an uptrend stops being an uptrend — the sequence of higher lows is what defined it, and nothing else was needed to see it.',
      learningPoints: ['A final high that barely clears the last one', 'Break of the prior higher low', 'Structure alone defines a trend'],
      hints: [{ k: 'Last high', v: 'Barely higher, took longer' }, { k: 'Level', v: 'The prior higher low' }, { k: 'Close', v: 'Below that level' }],
      insight: 'The final high exceeded the previous one by less than 1.5%, after taking twice as long.',
      chart(b) {
        b.vola(0.014).at(70).backdrop(190, 88, { swings: 7 });
        b.zig([[104, 10, { volMul: 1.25 }], [99, 4, { volMul: 0.8 }], [112, 8, { volMul: 1.15 }], [106.2, 5, { volMul: 0.85 }], [113.5, 7, { volMul: 0.7 }]]);
        b.to(109, 4, { volMul: 0.8 });
        b.to(104.6, 3, { volMul: 1.5, curve: 'accel' });
        b.support(106.2, 'Higher-low zone');
        b.cut();
        b.zig([[101, 4, { volMul: 1.45 }], [94.5, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'trend_005', title: 'Tight Flag After an Impulse', category: 'pattern', difficulty: 2,
      symbol: 'AMD', timeframe: '4H', answer: UP,
      patternType: 'bull-flag', confirmationState: 'confirmed',
      indicators: {},
      concept: 'Continuation pattern',
      explanation: 'A steep one-way impulse followed by a shallow drift between two tight parallel rails is a flag: buyers stopped buying, but sellers never showed up either. The giveaway is that the pullback gave back only a fraction of the leg, in progressively narrower bars.',
      learningPoints: ['Steep, one-way impulse leg', 'Shallow drift between parallel rails', 'Each pause bar narrower than the last'],
      hints: [{ k: 'Impulse', v: 'Steep, one-way leg' }, { k: 'Pause', v: 'Shallow, between two rails' }, { k: 'Range', v: 'Narrowing bar by bar' }],
      insight: 'The flag has given back less than a quarter of the impulse leg.',
      chart(b) {
        b.vola(0.013).at(52).backdrop(190, 64, { swings: 7 });
        b.to(82, 12, { volMul: 1.7, curve: 'accel' });
        const f0 = b.mark();
        b.to(78.5, 9, { volMul: 0.8, volEnd: 0.38, noise: 0.35 });
        const f1 = b.len() - 1;
        /* The two rails are the pattern — draw them, not a bare level. */
        b.trendline([f0, 'high'], [f1, 'high'], { kind: 'resistance', label: 'Flag' });
        b.trendline([f0, 'low'], [f1, 'low'], { kind: 'support' });
        b.cut();
        b.zig([[82.5, 3, { volMul: 1.7 }], [89, 6, { volMul: 1.5 }]]);
      },
    },
    {
      id: 'trend_006', title: 'Riding the 20-Day Average', category: 'trend', difficulty: 1,
      symbol: 'SPY', timeframe: '1D', answer: UP,
      indicators: { ma: [20] },
      concept: 'Trend continuation',
      explanation: 'Every dip in this sequence found buyers at the rising 20-day average, and this one was no different — shallow, quiet, and held. Strong trends tend to keep using the same average as support until something breaks it.',
      learningPoints: ['Repeated dips held by the rising MA20', 'Each low higher than the last', 'Dips stayed shallow every time'],
      hints: [{ k: 'MA20', v: 'Rising steadily' }, { k: 'Dips', v: 'Each one held the average' }, { k: 'Depth', v: 'Shallow — the average held again' }],
      insight: 'This pullback stopped within 1% of the 20-day average, as the last two did.',
      chart(b) {
        b.vola(0.011).at(60).backdrop(190, 72, { swings: 7 });
        b.zig([[78, 8, { volMul: 1.15 }], [76, 3, { volMul: 0.7 }], [84, 8, { volMul: 1.15 }], [82, 3, { volMul: 0.65 }], [90, 8, { volMul: 1.15 }]]);
        b.to(b.ma(20) * 1.008, 4, { volMul: 0.6, volEnd: 0.45, curve: 'ease' });
        b.cut();
        b.zig([[88, 3, { volMul: 1.2 }], [94.5, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'trend_007', title: 'Undercut and Reclaim', category: 'trend', difficulty: 2,
      symbol: 'AMZN', timeframe: '1D', answer: UP,
      indicators: { volume: true },
      concept: 'Failed breakdown in an uptrend',
      explanation: 'Price dipped under the previous higher low, found no sellers there, and closed back above it on heavy volume. A level that breaks and immediately gets reclaimed usually means the break was a stop run, not a change of trend.',
      learningPoints: ['Brief undercut of a known low', 'Close back above on heavy volume', 'Broader uptrend still intact'],
      hints: [{ k: 'Level', v: 'The prior higher low' }, { k: 'Break', v: 'Undercut, then closed back above' }, { k: 'Volume', v: 'Doubled on the reclaim bar' }],
      insight: 'The reclaim bar traded roughly 2.1× the 20-day average volume.',
      chart(b) {
        b.vola(0.014).at(150).backdrop(190, 176, { swings: 7 });
        b.zig([[196, 9, { volMul: 1.2 }], [186, 5, { volMul: 0.8 }], [212, 9, { volMul: 1.25 }]]);
        b.to(188, 6, { volMul: 1.0 });
        b.poke(186, { above: false, overshoot: 0.018, closeAt: 191, volMul: 2.2 });
        b.pattern('marubozuUp', { volMul: 1.5, body: 0.02 });
        b.support(186, 'Prior higher low');
        b.cut();
        b.zig([[200, 4, { volMul: 1.35 }], [216, 6, { volMul: 1.3 }]]);
      },
    },

    /* ---------------- SUPPORT & RESISTANCE ---------------- */
    {
      id: 'sr_001', title: 'Third Test of Support', category: 'sr', difficulty: 1,
      symbol: 'GOOGL', timeframe: '1D', answer: UP,
      indicators: { volume: true },
      concept: 'Support holding',
      explanation: 'The same price floor rejected sellers three times, and the last test left a long lower wick with a jump in volume — buyers were defending it actively. Until that floor closes below, the range favours a move back toward its top.',
      learningPoints: ['A level tested three times', 'Long lower wicks at the level', 'Volume expanding on the bounce'],
      hints: [{ k: 'Level', v: 'Support, tested three times' }, { k: 'Wicks', v: 'Long lower shadows each test' }, { k: 'Volume', v: 'Rising on the bounce bar' }],
      insight: 'The bounce off the level came on roughly 1.6× the 20-day average volume.',
      chart(b) {
        b.vola(0.015).at(50).backdrop(190, 62, { swings: 7 });
        b.zig([[54.2, 6, { dnWick: 1.6 }], [62, 7], [54.4, 7, { dnWick: 1.8 }], [61, 6], [54.3, 6, { dnWick: 2.0, volMul: 0.8 }]]);
        b.pattern('hammer', { volMul: 1.9 });
        b.to(56.5, 2, { volMul: 1.5 });
        b.support(54.3, 'Support · 3 tests');
        b.resistance(62, 'Range high');
        b.cut();
        b.zig([[58.5, 3, { volMul: 1.3 }], [62.8, 5, { volMul: 1.25 }]]);
      },
    },
    {
      id: 'sr_002', title: 'Rejected at the Ceiling', category: 'sr', difficulty: 1,
      symbol: 'EUR/USD', timeframe: '1D', answer: DOWN,
      indicators: {},
      concept: 'Resistance holding',
      explanation: 'Three attempts at the same ceiling, three failures — and the last one left a long upper wick with a close near the low of the candle. Sellers kept meeting buyers at exactly the same price, which points back toward the other side of the range.',
      learningPoints: ['A level rejected three times', 'Long upper wicks at the level', 'Each push closed weaker than the last'],
      hints: [{ k: 'Level', v: 'Resistance, tested three times' }, { k: 'Wicks', v: 'Long upper shadows' }, { k: 'Closes', v: 'Each one weaker into the level' }],
      insight: 'All three highs sit within 0.2% of each other — the level is exact, not approximate.',
      chart(b) {
        b.vola(0.014).at(130).backdrop(190, 118, { swings: 7 });
        b.zig([[125.8, 6, { upWick: 1.6 }], [117, 7], [125.6, 7, { upWick: 1.8 }], [118.5, 6], [125.7, 6, { upWick: 2.0, volMul: 0.8 }]]);
        b.pattern('shootingStar', { volMul: 0.7 });
        b.to(123, 2, { volMul: 0.75 });
        b.resistance(125.7, 'Resistance · 3 tests');
        b.support(117.5, 'Range low');
        b.cut();
        b.zig([[120, 3, { volMul: 1.3 }], [115.5, 5, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'sr_003', title: 'Middle of the Range', category: 'sr', difficulty: 2,
      symbol: 'XAU/USD', timeframe: '1D', answer: NO_TRADE,
      patternType: 'range', confirmationState: 'incomplete',
      indicators: {},
      concept: 'No edge in mid-range',
      explanation: 'Price sat almost exactly between a well-defined floor and ceiling. Both directions had similar room, so there was no favourable place to be wrong — the useful decisions in a range happen at its edges, not its middle.',
      learningPoints: ['Price equidistant from both boundaries', 'No level nearby to lean on', 'Wait for the edges of a range'],
      hints: [{ k: 'Position', v: 'Mid-range, ~50% of the way up' }, { k: 'Distance', v: 'Similar room either way' }, { k: 'Candles', v: 'Small and mixed' }],
      insight: 'Price is within 4% of both the range high and the range low.',
      chart(b) {
        b.vola(0.013).at(40).backdrop(190, 44, { swings: 8 });
        b.range(30, 41.5, 47.5, { touches: 5 });
        b.to(44.5, 4, { volMul: 0.8 });
        b.support(41.5, 'Range low');
        b.resistance(47.5, 'Range high');
        b.cut();
        b.flat(8, { amp: 0.013, volMul: 0.8 });
      },
    },
    {
      id: 'sr_004', title: 'Broken Support, Retested', category: 'sr', difficulty: 3,
      symbol: 'META', timeframe: '1D', answer: DOWN,
      patternType: 'retest', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Support becomes resistance',
      explanation: 'Support broke on a clear jump in volume, then price returned to it from underneath and was rejected with a bearish engulfing candle. A level that flips from floor to ceiling, and then holds as a ceiling, is one of the more reliable continuations in technical analysis.',
      learningPoints: ['Break of support on expanding volume', 'Retest from below', 'Rejection confirms the flip'],
      hints: [{ k: 'Level', v: 'The old support shelf' }, { k: 'Break', v: 'Closed below on 2.4× volume' }, { k: 'Retest', v: 'Rejected from underneath' }],
      insight: 'The breakdown bar carried 2.4× average volume; the retest came on 40% less.',
      chart(b) {
        b.vola(0.014).at(96).backdrop(190, 88, { swings: 7 });
        b.zig([[82.4, 6, { dnWick: 1.4 }], [89, 6], [82.2, 6, { dnWick: 1.5 }], [88, 5]]);
        b.to(79.5, 3, { volMul: 2.5, curve: 'accel' });
        b.to(81.8, 4, { volMul: 0.9, volEnd: 0.6 });
        b.pattern('engulfBear', { volMul: 1.4 });
        b.resistance(82.2, 'Support → resistance');
        b.cut();
        b.zig([[78, 4, { volMul: 1.5 }], [72.8, 5, { volMul: 1.4 }]]);
      },
    },
    {
      id: 'sr_005', title: 'Pressing on the Floor', category: 'pattern', difficulty: 3,
      symbol: 'AMD', timeframe: '1D', answer: DOWN,
      patternType: 'descending-triangle', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Descending triangle',
      explanation: 'Support held four times, but each bounce was weaker and the highs kept stepping down onto it. Repeated tests do not strengthen a level — they consume the buyers defending it, and the compression into the floor resolved downward.',
      myth: 'A level tested many times is often described as "strong". In practice, each test uses up the demand sitting there.',
      learningPoints: ['Flat support with descending highs', 'Each bounce smaller than the last', 'Volume contracting into the apex'],
      hints: [{ k: 'Support', v: 'Flat, tested four times' }, { k: 'Highs', v: 'Stepping lower each time' }, { k: 'Range', v: 'Compressing into the level' }],
      insight: 'Bounce size from support: 17%, then 13%, then 8%, then 3%.',
      chart(b) {
        b.vola(0.015).at(30).backdrop(190, 34, { swings: 7 });
        b.to(31.3, 5, { dnWick: 1.4 });
        b.to(36.5, 5); const h1 = b.len() - 1;
        b.to(31.25, 5, { dnWick: 1.3 });
        b.to(35.2, 5);
        b.to(31.3, 5, { dnWick: 1.2 });
        b.to(33.9, 4); const h3 = b.len() - 1;
        b.to(31.45, 4, { dnWick: 0.9, volMul: 0.7 });
        b.taper(4, { from: 0.009, to: 0.004, volMul: 0.6, volEnd: 0.4 });
        b.support(31.28, 'Support · 4 tests');
        b.trendline([h1, 'high'], [h3, 'high'], { kind: 'resistance', label: 'Lower highs' });
        b.cut();
        b.to(30.2, 2, { volMul: 2.7, curve: 'accel' });
        b.to(27.4, 6, { volMul: 1.7 });
      },
    },
    {
      id: 'sr_006', title: 'Old Ceiling, New Floor', category: 'sr', difficulty: 1,
      symbol: 'QQQ', timeframe: '1D', answer: UP,
      patternType: 'retest', confirmationState: 'confirmed',
      indicators: {},
      concept: 'Resistance becomes support',
      explanation: 'Price broke a level it had failed at twice, came back to it, and held — the pullback candles got smaller and smaller into the level. Buyers who missed the breakout tend to defend that price on the first retest, which is why a clean hold often resolves in the direction of the break.',
      learningPoints: ['Breakout above a twice-tested level', 'Pullback narrowed into the level', 'The old ceiling held as a floor'],
      hints: [{ k: 'Level', v: 'The old resistance shelf' }, { k: 'Breakout', v: 'Closed decisively above it' }, { k: 'Retest', v: 'Held, candles narrowing' }],
      insight: 'The retest low stopped within 0.9% of the old resistance line.',
      chart(b) {
        b.vola(0.014).at(9).backdrop(190, 10.4, { swings: 7 });
        b.zig([[11.15, 6, { upWick: 1.4 }], [10.2, 6], [11.18, 6, { upWick: 1.3 }]]);
        b.to(12.1, 3, { volMul: 2.4, curve: 'accel' });
        b.to(11.3, 4, { volMul: 0.7, volEnd: 0.45 });
        b.to(11.7, 3, { volMul: 1.2 });
        b.support(11.2, 'Resistance → support');
        b.cut();
        b.zig([[12.3, 3, { volMul: 1.3 }], [13.4, 5, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'sr_007', title: 'The Floor Gives Way', category: 'sr', difficulty: 1,
      symbol: 'TSLA', timeframe: '1D', answer: DOWN,
      indicators: { volume: true },
      concept: 'Support breakdown',
      explanation: 'A level that had held three times finally broke, and it broke decisively — a wide candle closing at its low on nearly three times average volume. That combination of decisive close and volume expansion is what separates a real break from a probe.',
      learningPoints: ['Decisive close below a known level', 'Candle closes at its low', 'Volume expansion confirms the break'],
      hints: [{ k: 'Level', v: 'Support, held three times' }, { k: 'Candle', v: 'Wide body, closes at the low' }, { k: 'Volume', v: '2.8× the 20-day average' }],
      insight: 'The breakdown bar is the highest-volume candle anywhere on this chart.',
      chart(b) {
        b.vola(0.014).at(46).backdrop(190, 42, { swings: 7 });
        b.zig([[38.3, 6, { dnWick: 1.4 }], [43, 6], [38.2, 6, { dnWick: 1.3 }], [42, 5], [38.4, 5, { dnWick: 1.1, volMul: 0.8 }]]);
        b.pattern('marubozuDown', { volMul: 1.6, body: 0.033 });
        b.support(38.25, 'Support · 3 tests');
        b.cut();
        b.zig([[36.4, 3, { volMul: 1.6 }], [33.6, 6, { volMul: 1.45 }]]);
      },
    },

    /* ---------------- BREAKOUTS ---------------- */
    {
      id: 'bo_001', title: 'Breakout on Heavy Volume', category: 'breakout', difficulty: 2,
      symbol: 'NVDA', timeframe: '1D', answer: UP,
      patternType: 'range', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Confirmed breakout',
      explanation: 'A long, quiet range resolved with a wide candle closing well above the ceiling on more than three times its average volume. Volume is what separates a breakout from a poke: it shows buyers were willing to pay up rather than wait.',
      learningPoints: ['Extended range builds pressure', 'Close well beyond the level, not just through it', 'Volume expansion confirms intent'],
      hints: [{ k: 'Range', v: 'Well defined, many weeks long' }, { k: 'Close', v: '3% above the ceiling' }, { k: 'Volume', v: '~3.5× the 20-day average' }],
      insight: 'Breakout volume is 3.7× the 20-day average — the heaviest reading on the chart.',
      chart(b) {
        b.vola(0.012).at(180).backdrop(190, 196, { swings: 7 });
        b.range(26, 192, 205, { touches: 4, volMul: 0.8 });
        b.taper(6, { from: 0.01, to: 0.005, volMul: 0.55, volEnd: 0.4, mid: 202 });
        b.to(212, 2, { volMul: 3.1, curve: 'accel' });
        b.resistance(205, 'Range high');
        b.cut();
        b.zig([[210, 2, { volMul: 1.4 }], [227, 7, { volMul: 1.5 }]]);
      },
    },
    {
      id: 'bo_002', title: 'Breakout Nobody Turned Up For', category: 'breakout', difficulty: 3,
      symbol: 'AAPL', timeframe: '1D', answer: DOWN,
      patternType: 'range', confirmationState: 'failed',
      indicators: { volume: true },
      concept: 'Failed breakout',
      explanation: 'Price cleared the range high, but only just — and on below-average volume, followed by a doji. A breakout without participation usually traps the people who bought it, and their exits become the fuel for the move back down.',
      myth: 'Trading above a level is not a breakout. A breakout needs a decisive close and volume behind it.',
      learningPoints: ['Marginal close above the level', 'Volume below average on the break', 'Immediate indecision candle'],
      hints: [{ k: 'Close', v: 'Barely above the range high' }, { k: 'Volume', v: 'Below the 20-day average' }, { k: 'Next bar', v: 'Doji — no follow-through' }],
      insight: 'Breakout volume is 45% BELOW the 20-day average.',
      chart(b) {
        b.vola(0.013).at(22).backdrop(190, 25, { swings: 7 });
        b.range(24, 24.2, 27.4, { touches: 4, volMul: 0.9 });
        b.to(27.6, 3, { volMul: 0.55, volEnd: 0.5 });
        b.pattern('doji', { volMul: 0.5 });
        b.resistance(27.4, 'Range high');
        b.support(24.2, 'Range low');
        b.cut();
        b.to(26.5, 2, { volMul: 1.3 });
        b.to(24.3, 5, { volMul: 1.7 });
      },
    },
    {
      id: 'bo_003', title: 'Breakout, Then Retest', category: 'breakout', difficulty: 2,
      symbol: 'ETH/USD', timeframe: '4H', answer: UP,
      patternType: 'retest', confirmationState: 'confirmed',
      indicators: {},
      concept: 'Breakout retest',
      explanation: 'Price broke out decisively, then drifted back to the broken level and stopped there — a hammer, then an inside bar sitting entirely inside it. Ranges that narrow at a level are showing you that sellers have run out of size.',
      learningPoints: ['Decisive break above the range', 'Pullback stopped exactly at the level', 'Narrowing bars show sellers exhausted'],
      hints: [{ k: 'Breakout', v: 'Closed ~6% above the level' }, { k: 'Pullback', v: 'Stopped right at the level' }, { k: 'Candles', v: 'Hammer, then inside bar' }],
      insight: 'The last two candles have the narrowest ranges of the pullback.',
      chart(b) {
        b.vola(0.013).at(58).backdrop(190, 64, { swings: 7 });
        b.range(20, 63.5, 70, { touches: 3 });
        b.to(74, 3, { volMul: 2.5, curve: 'accel' });
        b.to(70.4, 5, { volMul: 0.7, volEnd: 0.42, curve: 'ease' });
        b.pattern('hammer', { volMul: 0.9 });
        b.pattern('inside', { volMul: 0.6 });
        b.support(70, 'Broken resistance');
        b.cut();
        b.zig([[73, 3, { volMul: 1.4 }], [80, 6, { volMul: 1.4 }]]);
      },
    },
    {
      id: 'bo_004', title: 'Break Below, Snap Back', category: 'breakout', difficulty: 3,
      symbol: 'BTC/USD', timeframe: '1D', answer: UP,
      patternType: 'bear-trap', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Failed breakdown',
      explanation: 'Price broke the range low, ran the obvious stops, and closed back inside the range on heavy volume — then followed with a strong up candle. A break that reverses this fast usually means the sellers who needed that level were already done.',
      learningPoints: ['Break of an obvious level', 'Close back inside on the same bar', 'Heavy volume on the reclaim'],
      hints: [{ k: 'Break', v: 'Traded below the range low' }, { k: 'Close', v: 'Back inside the range' }, { k: 'Volume', v: 'Over 2× average on the reversal' }],
      insight: 'The reversal bar has the widest range on the chart and closed in its top quarter.',
      chart(b) {
        b.vola(0.014).at(150).backdrop(190, 142, { swings: 7 });
        b.range(22, 134, 146, { touches: 3 });
        b.to(135.5, 4, { volMul: 0.9 });
        b.poke(134, { above: false, overshoot: 0.022, closeAt: 136.8, volMul: 2.9 });
        b.pattern('marubozuUp', { volMul: 1.6, body: 0.018 });
        b.support(134, 'Range low');
        b.resistance(146, 'Range high');
        b.cut();
        b.zig([[141, 4, { volMul: 1.35 }], [149.5, 5, { volMul: 1.4 }]]);
      },
    },
    {
      id: 'bo_005', title: 'Poking at the Ceiling', category: 'breakout', difficulty: 4,
      symbol: 'SPY', timeframe: '1D', answer: NO_TRADE,
      patternType: 'range', confirmationState: 'incomplete',
      indicators: { volume: true },
      concept: 'Unconfirmed breakout',
      explanation: 'Price traded above the ceiling during the session and closed back inside it, on ordinary volume, with flat moving averages. Nothing was confirmed in either direction — and price spent the following stretch going nowhere, exactly as an unresolved level tends to.',
      myth: 'An intraday poke above a level is not a breakout until the candle closes there.',
      learningPoints: ['Trading through a level ≠ closing through it', 'No volume expansion', 'Flat averages mean no trend to join'],
      hints: [{ k: 'High', v: 'Above resistance' }, { k: 'Close', v: 'Back inside the range' }, { k: 'Volume', v: 'Ordinary — no expansion' }],
      insight: 'Volume on the probe bar is within 10% of its 20-day average.',
      chart(b) {
        b.vola(0.012).at(15).backdrop(190, 16.5, { swings: 8 });
        b.range(26, 16.2, 17.8, { touches: 4, volMul: 0.75 });
        b.poke(17.8, { above: true, overshoot: 0.009, closeAt: 17.7, volMul: 0.7 });
        b.pattern('spinningTop', { volMul: 0.85 });
        b.resistance(17.8, 'Range high');
        b.support(16.2, 'Range low');
        b.cut();
        b.flat(9, { amp: 0.013, volMul: 0.9, mid: 17.5 });
      },
    },

    /* ---------------- REVERSALS ---------------- */
    {
      id: 'rev_001', title: 'Two Lows, One Neckline', category: 'reversal', difficulty: 2,
      symbol: 'AMZN', timeframe: '1D', answer: UP,
      patternType: 'double-bottom', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Double bottom',
      explanation: 'Two lows at the same price, the second holding on lighter selling, then a close above the high between them on expanding volume. The pattern only became actionable at that neckline close — before it, this was just a range.',
      learningPoints: ['Two lows at a similar level', 'Lighter volume on the second low', 'Confirmation is the neckline close'],
      hints: [{ k: 'Lows', v: 'Two at the same price' }, { k: 'Neckline', v: 'The high between them' }, { k: 'Volume', v: 'Expanding on the break' }],
      insight: 'The second low traded roughly 40% less volume than the first — selling pressure was drying up.',
      chart(b) {
        b.vola(0.015).at(64).backdrop(190, 52, { swings: 7 });
        b.to(44, 10, { volMul: 1.35 });
        b.to(44.3, 3, { dnWick: 2.0, volMul: 1.5 });
        b.to(50, 6, { volMul: 1.0 });
        b.to(44.6, 6, { volMul: 0.8, volEnd: 0.6 });
        b.pattern('hammer', { volMul: 1.7 });
        b.to(50.4, 5, { volMul: 1.7 });
        b.support(44.3, 'Double bottom');
        b.level(50, 'Neckline');
        b.cut();
        b.zig([[49.5, 2, { volMul: 1.0 }], [57, 7, { volMul: 1.45 }]]);
      },
    },
    {
      id: 'rev_002', title: 'Two Highs, Then a Break', category: 'reversal', difficulty: 2,
      symbol: 'META', timeframe: '1D', answer: DOWN,
      patternType: 'double-top', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Double top',
      explanation: 'The second attempt at the highs came on noticeably lighter volume, and price then closed below the low between the two peaks. That neckline break is the confirmation — the two highs alone would not have been enough.',
      learningPoints: ['Two highs at a similar level', 'Lighter volume on the second attempt', 'Neckline break confirms'],
      hints: [{ k: 'Highs', v: 'Two at the same price' }, { k: 'Volume', v: 'Much lighter on the second' }, { k: 'Neckline', v: 'Just broken' }],
      insight: 'The second peak came on 45% less volume than the first.',
      chart(b) {
        b.vola(0.014).at(88).backdrop(190, 104, { swings: 7 });
        b.to(122, 10, { volMul: 1.4 });
        b.to(121.6, 3, { upWick: 2.0, volMul: 1.6 });
        b.to(110, 6, { volMul: 1.1 });
        b.to(121.4, 7, { volMul: 0.7, volEnd: 0.5 });
        b.pattern('shootingStar', { volMul: 0.9 });
        b.to(109.4, 5, { volMul: 1.6 });
        b.resistance(121.5, 'Double top');
        b.level(110, 'Neckline');
        b.cut();
        b.zig([[111, 2, { volMul: 1.0 }], [98.5, 7, { volMul: 1.45 }]]);
      },
    },
    {
      id: 'rev_003', title: 'Three Peaks, Middle Highest', category: 'pattern', difficulty: 3,
      symbol: 'MSFT', timeframe: '1D', answer: DOWN,
      patternType: 'head-and-shoulders', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Head and shoulders',
      explanation: 'A higher middle peak between two lower ones, with the right shoulder forming on clearly reduced volume, and now a close below the neckline. The volume profile is what makes this credible: each rally attracted fewer buyers than the last.',
      learningPoints: ['Middle peak highest, shoulders lower', 'Right shoulder on light volume', 'Neckline break is the trigger'],
      hints: [{ k: 'Shape', v: 'Three peaks, middle highest' }, { k: 'Right shoulder', v: 'Formed on light volume' }, { k: 'Neckline', v: 'Just closed below it' }],
      insight: 'Volume on each peak: heavy, then moderate, then 55% below average.',
      chart(b) {
        b.vola(0.015).at(26).backdrop(190, 34, { swings: 7 });
        b.to(41, 8, { volMul: 1.5 }); const ls = b.len() - 1;
        b.to(36.5, 4, { volMul: 0.9 });
        b.to(46, 7, { volMul: 1.2 }); const head = b.len() - 1;
        b.to(36.2, 6, { volMul: 1.1 });
        b.to(41.2, 6, { volMul: 0.55, volEnd: 0.45 }); const rs = b.len() - 1;
        b.to(36.4, 4, { volMul: 1.2 });
        b.to(35.1, 2, { volMul: 2.3, curve: 'accel' });
        b.level(36.3, 'Neckline');
        b.note(ls, null, 'LS'); b.note(head, null, 'HEAD'); b.note(rs, null, 'RS');
        b.cut();
        b.zig([[36.2, 2, { volMul: 1.0 }], [30.3, 7, { volMul: 1.45 }]]);
      },
    },
    {
      id: 'rev_004', title: 'A Bottom That Never Confirmed', category: 'reversal', difficulty: 4,
      symbol: 'GOOGL', timeframe: '1D', answer: NO_TRADE,
      patternType: 'inverse-head-and-shoulders', confirmationState: 'incomplete',
      indicators: { ma: [50, 200] },
      concept: 'Unconfirmed reversal pattern',
      explanation: 'The shape of an inverse head and shoulders was there, but the neckline was never broken and both the 50- and 200-day averages were still falling. A pattern is a hypothesis; the confirmation level is what turns it into a setup. This one never got there.',
      myth: 'Spotting a reversal pattern early is not an edge. Most of them fail before they complete.',
      learningPoints: ['Pattern shape without confirmation', 'Neckline still overhead', 'Longer-term averages still declining'],
      hints: [{ k: 'Shape', v: 'Inverse head and shoulders forming' }, { k: 'Neckline', v: 'Not yet broken' }, { k: 'MA200', v: 'Still declining overhead' }],
      insight: 'Price is 3% below the neckline and 19% below a falling 200-day average.',
      chart(b) {
        b.vola(0.014).at(200).backdrop(190, 150, { swings: 8 });
        b.to(124, 10, { volMul: 1.35 });
        b.to(136, 5, { volMul: 0.9 });
        b.to(118, 7, { volMul: 1.45 });
        b.to(135, 6, { volMul: 1.0 });
        b.to(124.5, 6, { volMul: 0.7 });
        b.to(132, 4, { volMul: 0.75 });
        b.resistance(136, 'Neckline · unbroken');
        b.cut();
        b.to(127, 4, { volMul: 1.0 });
        b.to(134, 4, { volMul: 0.95 });
        b.to(130.5, 3, { volMul: 0.9 });
      },
    },

    /* ---------------- MOVING AVERAGES ---------------- */
    {
      id: 'ma_001', title: 'Back to the 50-Day', category: 'ma', difficulty: 2,
      symbol: 'MSFT', timeframe: '1D', answer: UP,
      indicators: { ma: [50] },
      concept: 'Dynamic support',
      explanation: 'The pullback ran exactly into a rising 50-day average and stopped there, leaving a long lower wick. In a healthy uptrend a rising average often acts as the level buyers are waiting for — the trend structure above it never broke.',
      learningPoints: ['Uptrend with a rising 50-day average', 'Pullback stopped exactly at the average', 'Long lower wick where it touched'],
      hints: [{ k: 'MA50', v: 'Rising, price just touched it' }, { k: 'Candle', v: 'Long lower wick off the average' }, { k: 'Structure', v: 'Higher highs still intact' }],
      insight: 'Price closed within 0.5% of the 50-day average and bounced off it intrabar.',
      chart(b) {
        b.vola(0.013).at(210).backdrop(190, 250, { swings: 7 });
        b.zig([[278, 12, { volMul: 1.2 }], [268, 5, { volMul: 0.75 }], [302, 12, { volMul: 1.25 }]]);
        b.to(b.ma(50) * 1.006, 7, { volMul: 0.65, volEnd: 0.45, curve: 'ease' });
        b.pattern('hammer', { volMul: 1.2 });
        b.cut();
        b.zig([[278, 3, { volMul: 1.25 }], [297, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'ma_002', title: 'Losing the 200-Day', category: 'ma', difficulty: 3,
      symbol: 'TSLA', timeframe: '1D', answer: DOWN,
      indicators: { ma: [20, 50, 200], volume: true },
      concept: 'Long-term average lost',
      explanation: 'Price had already made a lower high, the 20-day average had crossed below the 50, and now a wide candle closed decisively below a flattening 200-day average on heavy volume. Three things agreeing is different from one indicator firing.',
      learningPoints: ['Lower high already in place', 'Short-term average below the medium-term', 'Decisive close below the 200-day on volume'],
      hints: [{ k: 'Structure', v: 'A lower high has formed' }, { k: 'MA20 / MA50', v: 'Crossed downward' }, { k: 'MA200', v: 'Flattening, price closing below' }],
      insight: 'The breakdown bar closed 2.8% below the 200-day average on roughly 2× average volume.',
      chart(b) {
        b.vola(0.014).at(40).backdrop(190, 58, { swings: 8 });
        b.to(63, 10, { volMul: 1.0 });
        b.to(55, 8, { volMul: 1.15 });
        b.to(59, 5, { volMul: 0.7 });
        b.to(b.ma(200) * 0.978, 5, { volMul: 2.2, curve: 'accel' });
        b.cut();
        b.zig([[51, 4, { volMul: 1.4 }], [46.5, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'ma_003', title: 'Everything Tangled Together', category: 'ma', difficulty: 3,
      symbol: 'EUR/USD', timeframe: '1D', answer: NO_TRADE,
      indicators: { ma: [20, 50, 200] },
      concept: 'Moving average compression',
      explanation: 'All three averages were flat and sitting on top of each other, with price weaving through them. A crossover happened here — and meant nothing, because a crossover only describes the trend that already exists. When the averages are tangled, there is no trend to describe.',
      myth: 'A moving-average crossover is not a trade. In a flat market it fires constantly and means nothing.',
      learningPoints: ['Flat, overlapping averages = no trend', 'Crossovers in compression are noise', 'Wait for the averages to separate'],
      hints: [{ k: 'MA20/50/200', v: 'Flat and overlapping' }, { k: 'Price', v: 'Weaving through all three' }, { k: 'Slope', v: 'None of them are trending' }],
      insight: 'The three averages are within 1.5% of each other — the tightest on this chart.',
      chart(b) {
        b.vola(0.012).at(76).backdrop(190, 78, { swings: 10 });
        b.range(30, 74, 82, { touches: 5, volMul: 0.7 });
        b.to(78, 4, { volMul: 0.7 });
        b.cut();
        b.flat(9, { amp: 0.015, volMul: 0.8 });
      },
    },
    {
      id: 'ma_004', title: 'The Cross Everyone Waited For', category: 'ma', difficulty: 4,
      symbol: 'NVDA', timeframe: '1D', answer: NO_TRADE,
      indicators: { ma: [20, 50] },
      concept: 'Crossover without location',
      explanation: 'The bullish crossover was real, but it arrived after a near-vertical run that left price far above both averages and directly under an old supply zone. The signal was late, the reward to resistance was small and the risk back to the averages was large — and the following stretch whipsawed.',
      myth: 'A golden cross tells you what already happened. It says nothing about whether this price is a good place to act.',
      learningPoints: ['Crossovers are lagging by construction', 'Location matters more than the signal', 'Poor reward against overhead supply'],
      hints: [{ k: 'Signal', v: 'MA20 crossed above MA50' }, { k: 'Extension', v: 'Price far above both averages' }, { k: 'Overhead', v: 'Old supply zone just above' }],
      insight: 'Price is 19% above the 50-day average, with resistance only 2% overhead.',
      chart(b) {
        b.vola(0.015).at(120).backdrop(190, 96, { swings: 8 });
        b.range(24, 92, 100, { touches: 4 });
        b.to(118, 14, { volMul: 1.7, curve: 'accel' });
        b.resistance(120, 'Old supply zone');
        b.cut();
        b.to(122, 2, { volMul: 1.2 });
        b.to(111, 4, { volMul: 1.35 });
        b.to(117, 4, { volMul: 1.1 });
      },
    },

    /* ---------------- VOLUME ---------------- */
    {
      id: 'vol_001', title: 'Selling Climax', category: 'volume', difficulty: 3,
      symbol: 'BTC/USD', timeframe: '1D', answer: UP,
      patternType: 'capitulation', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Volume climax',
      explanation: 'A vertical decline ended with the heaviest volume on the chart and a long lower wick — the bar where the last urgent sellers got out. What confirmed it was the next few days: price held above that low while volume collapsed, meaning nobody was left to sell.',
      learningPoints: ['Accelerating decline into a volume spike', 'Long lower wick on the climax bar', 'Volume drying up while price holds'],
      hints: [{ k: 'Volume', v: 'Largest spike on the chart' }, { k: 'Candle', v: 'Long lower wick, closed well off the low' }, { k: 'Since', v: 'Holding above the low on light volume' }],
      insight: 'Climax volume was 3.6× the 20-day average; the three bars since averaged 0.5×.',
      chart(b) {
        b.vola(0.016).at(60).backdrop(190, 46, { swings: 7 });
        b.to(34, 10, { volMul: 1.6, curve: 'accel' });
        b.pattern('climaxDown', { volMul: 1.25 });
        b.to(35.5, 2, { volMul: 1.6 });
        b.to(35.9, 4, { volMul: 0.55, volEnd: 0.4 });
        b.support(b.low(b.len() - 7), 'Capitulation low');
        b.cut();
        b.zig([[38, 4, { volMul: 1.25 }], [40.6, 5, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'vol_002', title: 'Rising Price, Falling Volume', category: 'volume', difficulty: 3,
      symbol: 'AAPL', timeframe: '1D', answer: DOWN,
      indicators: { volume: true },
      concept: 'Volume divergence',
      explanation: 'Price ground higher for weeks while volume shrank almost every step — fewer and fewer buyers were needed to move it. Arriving at a prior high in that state, the rejection candle had very little demand behind it to absorb the selling.',
      learningPoints: ['Advance on steadily contracting volume', 'Arrival at a known resistance level', 'Rejection candle confirms the weakness'],
      hints: [{ k: 'Price', v: 'Grinding higher for weeks' }, { k: 'Volume', v: 'Falling the whole way up' }, { k: 'Level', v: 'Prior high just overhead' }],
      insight: 'Volume has declined roughly 70% across the advance while price rose 9%.',
      chart(b) {
        b.vola(0.012).at(400).backdrop(190, 430, { swings: 7 });
        b.to(466, 16, { volMul: 1.4, volEnd: 0.42, noise: 0.4 });
        b.to(470, 3, { volMul: 0.4 });
        b.pattern('shootingStar', { volMul: 0.7 });
        b.to(462, 2, { volMul: 1.1 });
        b.resistance(470, 'Prior high');
        b.cut();
        b.zig([[452, 4, { volMul: 1.35 }], [429, 6, { volMul: 1.45 }]]);
      },
    },
    {
      id: 'vol_003', title: 'The Range Cracks', category: 'volume', difficulty: 2,
      symbol: 'AMD', timeframe: '1D', answer: DOWN,
      indicators: { volume: true },
      concept: 'Volume expansion on a break',
      explanation: 'Weeks of quiet, then a wide candle closing at its low below the range floor on more than three times average volume. Quiet ranges store energy; the volume on the break is what tells you which way it got released.',
      learningPoints: ['Low-volume range beforehand', 'Wide candle closing at its low', 'Volume over 3× average on the break'],
      hints: [{ k: 'Before', v: 'Quiet, low-volume range' }, { k: 'Break', v: 'Closed below the floor' }, { k: 'Volume', v: '~3.5× the 20-day average' }],
      insight: 'The breakdown bar traded more volume than the previous four bars combined.',
      chart(b) {
        b.vola(0.013).at(19).backdrop(190, 21, { swings: 7 });
        b.range(26, 20.4, 22.6, { touches: 4, volMul: 0.8 });
        b.to(21, 3, { volMul: 0.7 });
        b.pattern('marubozuDown', { volMul: 1.5, body: 0.036 });
        b.support(20.4, 'Range low');
        b.cut();
        b.zig([[19.6, 3, { volMul: 1.6 }], [17.8, 6, { volMul: 1.45 }]]);
      },
    },

    /* ---------------- CANDLESTICK / CONTEXT ---------------- */
    {
      id: 'cs_001', title: 'A Textbook Hammer', category: 'candlestick', difficulty: 4,
      symbol: 'QQQ', timeframe: '1D', answer: NO_TRADE,
      indicators: {},
      concept: 'Candle without context',
      explanation: 'The candle was a perfect hammer. But it formed in the middle of a clean downtrend with no level anywhere near it — so there was nothing for buyers to lean on and nothing for the candle to mean. The shape of one session is not a setup.',
      myth: 'A reversal candle is only meaningful where a reversal could plausibly start — at a level, or after an exhaustion move. In open space it is just one green day.',
      learningPoints: ['One candle is not a setup', 'A reversal signal needs a level to work from', 'Location decides whether a shape matters'],
      hints: [{ k: 'Candle', v: 'Textbook hammer' }, { k: 'Location', v: 'Mid-trend, no level nearby' }, { k: 'Context', v: 'Nothing close to react to' }],
      insight: 'Nothing on this chart marks a level anywhere near the current price.',
      chart(b) {
        b.vola(0.015).at(88).backdrop(190, 70, { swings: 7 });
        b.zig([[62, 8, { volMul: 1.2 }], [66, 4, { volMul: 0.8 }], [57, 8, { volMul: 1.2 }], [60.5, 4, { volMul: 0.8 }], [52.2, 7, { volMul: 1.15 }]]);
        b.pattern('hammer', { volMul: 1.0 });
        b.cut();
        b.to(54.5, 3, { volMul: 0.95 });
        b.to(51.5, 4, { volMul: 1.05 });
        b.to(53.2, 3, { volMul: 0.9 });
      },
    },
    {
      id: 'cs_002', title: 'Engulfing at a Level', category: 'candlestick', difficulty: 2,
      symbol: 'GOOGL', timeframe: '1D', answer: UP,
      indicators: { volume: true },
      concept: 'Candle with context',
      explanation: 'The same bullish engulfing candle that means little in open space means a great deal here: it formed at a level that had already held twice, and it came on nearly twice its average volume. The level gives the candle something to prove.',
      learningPoints: ['Engulfing candle at a tested level', 'Volume expansion on the signal bar', 'Context is what makes a candle tradeable'],
      hints: [{ k: 'Level', v: 'Support tested twice before' }, { k: 'Candle', v: 'Bullish engulfing' }, { k: 'Volume', v: '1.8× the 20-day average' }],
      insight: 'The engulfing bar traded 1.8× average volume and closed above the prior two sessions.',
      chart(b) {
        b.vola(0.014).at(140).backdrop(190, 165, { swings: 7 });
        b.zig([[158.4, 6, { dnWick: 1.5 }], [172, 7], [158.2, 7, { dnWick: 1.6, volMul: 0.8 }]]);
        b.to(157.6, 2, { volMul: 0.9 });
        b.pattern('engulfBull', { volMul: 1.45 });
        b.support(158, 'Support · 2 tests');
        b.cut();
        b.zig([[166, 4, { volMul: 1.35 }], [175, 5, { volMul: 1.3 }]]);
      },
    },

    /* ---------------- NO TRADE / DISCIPLINE ---------------- */
    {
      id: 'nt_001', title: 'Nothing Is Happening', category: 'notrade', difficulty: 1,
      symbol: 'XAU/USD', timeframe: '1D', answer: NO_TRADE,
      indicators: { ma: [20, 50] },
      concept: 'No directional edge',
      explanation: 'Narrow bodies, flat averages sitting on top of each other, and no level anywhere close. There is nothing here to be right or wrong about — and recognising that in two seconds is a skill in itself.',
      learningPoints: ['Flat averages and tiny candles', 'No structure to lean on', 'No level in play'],
      hints: [{ k: 'Candles', v: 'Very small bodies' }, { k: 'MAs', v: 'Flat and overlapping' }, { k: 'Range', v: 'Barely moved in weeks' }],
      insight: 'The last 20 bars have a total range of under 6%.',
      chart(b) {
        b.vola(0.009).at(12).backdrop(190, 12.8, { swings: 9 });
        b.flat(30, { amp: 0.008, volMul: 0.45, mid: 12.8 });
        b.cut();
        b.flat(8, { amp: 0.009, volMul: 0.45 });
      },
    },
    {
      id: 'nt_002', title: 'Signals That Disagree', category: 'notrade', difficulty: 3,
      symbol: 'SPY', timeframe: '1D', answer: NO_TRADE,
      indicators: { ma: [20, 200] },
      concept: 'Conflicting timeframes',
      explanation: 'The short-term average was rising while the 200-day was still falling, and price sat between them with no level close by. When the timeframes disagree this directly, the honest read is that there is no edge — not that you should pick the one you prefer.',
      learningPoints: ['Short and long-term averages disagree', 'Price sits between the two', 'Conflicting signals are information, not noise'],
      hints: [{ k: 'MA20', v: 'Rising' }, { k: 'MA200', v: 'Still falling, overhead' }, { k: 'Price', v: 'Between them' }],
      insight: 'Price is 3% above a rising 20-day average and 11% below a falling 200-day.',
      chart(b) {
        b.vola(0.014).at(300).backdrop(190, 240, { swings: 8 });
        b.to(210, 12, { volMul: 1.25 });
        b.to(238, 14, { volMul: 1.0 });
        b.to(232, 4, { volMul: 0.8 });
        b.cut();
        b.chop(9, { amp: 0.019, volMul: 1.0 });
      },
    },
    {
      id: 'nt_003', title: 'Whipsaw', category: 'notrade', difficulty: 2,
      symbol: 'ETH/USD', timeframe: '1H', answer: NO_TRADE,
      indicators: {},
      concept: 'Choppy price action',
      explanation: 'Big candles in both directions, one after another, with no net progress. Volatility is not direction — this kind of tape produces confident-looking signals in both directions and then takes them back.',
      learningPoints: ['Large candles, no net movement', 'Direction reverses bar to bar', 'Volatility ≠ opportunity'],
      hints: [{ k: 'Candles', v: 'Large, alternating colours' }, { k: 'Net move', v: 'Effectively zero' }, { k: 'Structure', v: 'No highs or lows to work from' }],
      insight: 'The last 20 candles span a 9% range and have gone nowhere inside it.',
      chart(b) {
        b.vola(0.016).at(7.5).backdrop(190, 8.2, { swings: 9 });
        b.chop(26, { amp: 0.028, volMul: 1.1, mid: 8.2 });
        b.cut();
        b.chop(8, { amp: 0.03, volMul: 1.1, mid: 8.2 });
      },
    },
    {
      id: 'nt_004', title: 'Overbought in an Uptrend', category: 'rsi', difficulty: 4,
      symbol: 'NVDA', timeframe: '1D', answer: NO_TRADE,
      indicators: { rsi: true },
      concept: 'Overbought ≠ reversal',
      explanation: 'RSI near 90 does not mean sell — strong trends spend weeks overbought, and every short taken on that reading alone got run over on the way up. But chasing here is also poor: price is stretched far from any support. High RSI removed the easy trade in both directions.',
      myth: 'Overbought is not a sell signal. It is a description of momentum, and momentum persists in trends.',
      learningPoints: ['Strong trends stay overbought', 'RSI alone is not a reversal signal', 'Stretched price means poor entry, not a short'],
      hints: [{ k: 'RSI', v: 'Near 90 — deeply overbought' }, { k: 'Trend', v: 'Intact — no lower high' }, { k: 'Support', v: 'Far below current price' }],
      insight: 'RSI has held above 70 for ten straight bars — and price rose through every one of them.',
      chart(b) {
        b.vola(0.014).at(26).backdrop(190, 38, { swings: 7 });
        b.zig([[46, 10, { volMul: 1.3 }], [44, 4, { volMul: 0.8 }], [56, 10, { volMul: 1.4 }], [54, 3, { volMul: 0.8 }], [64, 9, { volMul: 1.5 }]]);
        b.cut();
        b.to(66.8, 3, { volMul: 1.1 });
        b.to(60.5, 4, { volMul: 1.2 });
        b.to(64, 4, { volMul: 1.0 });
      },
    },
    {
      id: 'nt_005', title: 'Gapped Into Open Space', category: 'notrade', difficulty: 3,
      symbol: 'TSLA', timeframe: '1D', answer: NO_TRADE,
      indicators: { volume: true },
      concept: 'Poor risk placement',
      explanation: 'A huge gap left price far above every reference level on the chart, followed by two indecision candles. There is no nearby level to define where the idea would be wrong, so any position here is a guess with an expensive stop.',
      learningPoints: ['Gaps leave price without reference levels', 'No level = no place to be wrong', 'Indecision candles after a gap'],
      hints: [{ k: 'Gap', v: 'Roughly 10%, on huge volume' }, { k: 'Levels', v: 'Nearest is 10% below' }, { k: 'Since', v: 'Two indecision candles' }],
      insight: 'The nearest reference level is roughly 10% below — a stop there risks far more than the move offers.',
      chart(b) {
        b.vola(0.014).at(78).backdrop(190, 84, { swings: 7 });
        b.range(22, 82, 90, { touches: 4 });
        b.to(86, 3, { volMul: 0.8 });
        b.to(101, 1, { gap: 0.1, volMul: 4.2 });
        b.pattern('spinningTop', { volMul: 2.0 });
        b.pattern('doji', { volMul: 1.6 });
        b.resistance(90, 'Old range high');
        b.cut();
        b.chop(8, { amp: 0.025, volMul: 1.5, mid: 100 });
      },
    },
    {
      id: 'nt_006', title: 'Right Idea, Wrong Price', category: 'notrade', difficulty: 2,
      symbol: 'AAPL', timeframe: '1D', answer: NO_TRADE,
      indicators: {},
      concept: 'Risk and reward',
      explanation: 'The bounce off support was real — but price has already travelled most of the way to the ceiling. About 1.5% of room remains overhead, while the level that would prove the idea wrong is nearly 4% below. A good setup at a bad price is not a good setup.',
      learningPoints: ['Measure the reward before the signal', 'Distance to resistance vs distance to invalidation', 'Late entries turn good setups bad'],
      hints: [{ k: 'Setup', v: 'Valid bounce off support' }, { k: 'Overhead', v: 'Resistance ~1.5% away' }, { k: 'Invalidation', v: 'Support ~4% below' }],
      insight: 'Reward to the range high is 1.5%; risk to below support is 3.7%.',
      chart(b) {
        b.vola(0.012).at(240).backdrop(190, 252, { swings: 7 });
        b.zig([[248.5, 6, { dnWick: 1.5 }], [261.6, 7, { upWick: 1.6 }], [249, 7, { dnWick: 1.4 }]]);
        b.pattern('hammer', { volMul: 1.3 });
        b.to(258, 4, { volMul: 1.0 });
        b.support(248.7, 'Support · invalidation');
        b.resistance(262, 'Heavy resistance');
        b.zone(258, 262, { kind: 'resistance', label: 'All the room that is left' });
        b.cut();
        b.to(261, 3, { volMul: 0.95 });
        b.to(252, 4, { volMul: 1.1 });
        b.to(256, 3, { volMul: 0.9 });
      },
    },

    /* ---------------- RSI ---------------- */
    {
      id: 'rsi_001', title: 'A Lower Low That Did Not Stick', category: 'rsi', difficulty: 3,
      symbol: 'AMZN', timeframe: '1D', answer: UP,
      indicators: { rsi: true },
      concept: 'Bullish divergence',
      explanation: 'Price made a marginally lower low, but RSI made a clearly higher one — the second decline took far longer and carried much less force than the first. Divergence is not a signal on its own; what made it usable here was the prior low holding as a reference and a reversal candle at the level.',
      learningPoints: ['Price lower low, RSI higher low', 'The second decline was slower and weaker', 'Divergence needs a level and a trigger'],
      hints: [{ k: 'Price', v: 'Marginally lower low' }, { k: 'RSI', v: 'Clearly higher low' }, { k: 'Candle', v: 'Hammer at the level' }],
      insight: 'The first decline covered the same ground in 9 bars that the second needed 14 to cover.',
      chart(b) {
        b.vola(0.016).at(120).backdrop(190, 96, { swings: 7 });
        b.to(72, 9, { volMul: 1.5, curve: 'accel' });
        const lowA = b.len() - 1;
        b.to(84, 7, { volMul: 1.0 });
        b.to(70.5, 14, { volMul: 0.8, noise: 0.5 });
        const lowB = b.len() - 1;
        b.pattern('hammer', { volMul: 1.3 });
        b.to(73, 2, { volMul: 1.2 });
        b.support(71, 'Prior low');
        b.trendline([lowA, 'low'], [lowB, 'low'], { kind: 'resistance', label: 'Lower low', extend: false });
        b.trendline([lowA, 'rsi'], [lowB, 'rsi'], { pane: 'rsi', kind: 'support', label: 'Higher low', extend: false });
        b.cut();
        b.zig([[78, 4, { volMul: 1.3 }], [83.5, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'rsi_002', title: 'A New High Nobody Believed', category: 'rsi', difficulty: 3,
      symbol: 'META', timeframe: '1D', answer: DOWN,
      indicators: { rsi: true },
      concept: 'Bearish divergence',
      explanation: 'Price ground out a slightly higher high while RSI made a distinctly lower one — the advance took fifteen bars to do what the first leg did in nine. Arriving at a prior high in that state, the rejection candle had very little momentum left behind it.',
      learningPoints: ['Price higher high, RSI lower high', 'The advance slowed markedly', 'Rejection at a known level confirms it'],
      hints: [{ k: 'Price', v: 'Slightly higher high' }, { k: 'RSI', v: 'Distinctly lower high' }, { k: 'Candle', v: 'Long upper wick at the level' }],
      insight: 'RSI peaked near 78 on the first leg and only reached the low 60s on this one.',
      chart(b) {
        b.vola(0.014).at(40).backdrop(190, 58, { swings: 7 });
        b.to(78, 9, { volMul: 1.5, curve: 'accel' });
        const hiA = b.len() - 1;
        b.to(70, 6, { volMul: 1.0 });
        b.to(80.5, 15, { volMul: 0.75, noise: 0.5 });
        const hiB = b.len() - 1;
        b.pattern('shootingStar', { volMul: 0.9 });
        b.to(78, 2, { volMul: 1.0 });
        b.resistance(79.5, 'Prior high');
        b.trendline([hiA, 'high'], [hiB, 'high'], { kind: 'support', label: 'Higher high', extend: false });
        b.trendline([hiA, 'rsi'], [hiB, 'rsi'], { pane: 'rsi', kind: 'resistance', label: 'Lower high', extend: false });
        b.cut();
        b.zig([[73, 4, { volMul: 1.3 }], [67.5, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'rsi_003', title: 'Oversold at a Level That Holds', category: 'rsi', difficulty: 2,
      symbol: 'SPY', timeframe: '1D', answer: UP,
      indicators: { rsi: true },
      concept: 'Oversold with confirmation',
      explanation: 'An oversold reading only becomes useful when it happens somewhere that matters. RSI dropped under 30 exactly as price reached a floor that had already held twice, and the session closed with a long lower wick well off the low — the reading, the level and the candle all pointed the same way.',
      learningPoints: ['Oversold means stretched, not finished', 'The level is what makes the reading tradeable', 'A reversal candle supplies the trigger'],
      hints: [{ k: 'RSI', v: 'Dipped below 30' }, { k: 'Level', v: 'Support already held twice' }, { k: 'Candle', v: 'Long lower wick' }],
      insight: 'This is the third time price has reached this floor, and the first time RSI got below 30 doing it.',
      chart(b) {
        b.vola(0.015).at(58).backdrop(190, 50, { swings: 7 });
        b.zig([[42.2, 6, { dnWick: 1.5 }], [48, 6], [42.1, 6, { dnWick: 1.5 }], [48.5, 5]]);
        /* A clean, persistent decline is what actually drives RSI under 30. */
        b.to(41.5, 10, { volMul: 1.25, curve: 'accel', noise: 0.18 });
        b.pattern('hammer', { volMul: 1.6 });
        b.to(43.2, 2, { volMul: 1.3 });
        b.support(42, 'Support · 2 tests');
        b.cut();
        b.zig([[45.5, 4, { volMul: 1.2 }], [48.5, 5, { volMul: 1.25 }]]);
      },
    },
    {
      id: 'rsi_004', title: 'Oversold and Still Falling', category: 'rsi', difficulty: 3,
      symbol: 'BTC/USD', timeframe: '1D', answer: DOWN,
      indicators: { rsi: true },
      concept: 'Oversold ≠ bounce',
      explanation: 'RSI spent this entire decline under 30 and price kept making lower lows anyway. In a strong downtrend an oversold reading describes how fast sellers are moving, not that they are finished — and with no prior low anywhere near, there was nothing for buyers to lean on.',
      myth: 'Oversold is not a buy signal. Trends stay oversold for as long as the selling lasts.',
      learningPoints: ['Downtrends can stay oversold for weeks', 'Lower highs and lower lows still intact', 'No level nearby to stop the decline'],
      hints: [{ k: 'RSI', v: 'Under 30 and staying there' }, { k: 'Structure', v: 'Lower highs, lower lows' }, { k: 'Support', v: 'Nothing close below' }],
      insight: 'RSI first fell below 30 eleven bars ago, and price is 12% lower since.',
      chart(b) {
        b.vola(0.016).at(90).backdrop(190, 78, { swings: 7 });
        b.zig([[66, 8, { volMul: 1.3 }], [70, 4, { volMul: 0.8 }], [56, 9, { volMul: 1.35 }], [59, 3, { volMul: 0.8 }], [47, 9, { volMul: 1.4 }]]);
        b.to(45, 3, { volMul: 1.3 });
        b.cut();
        b.zig([[42, 4, { volMul: 1.3 }], [38.5, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'rsi_005', title: 'Momentum Crosses the Midline', category: 'rsi', difficulty: 3,
      symbol: 'QQQ', timeframe: '1D', answer: UP,
      indicators: { rsi: true },
      concept: 'RSI regime change',
      explanation: 'The useful RSI level here is not 30 or 70 — it is 50. Through the whole base RSI kept failing under the midline; on this push it broke through and held while price cleared the top of the base. That shift is what separates a base from a bottom.',
      learningPoints: ['The 50 line separates bullish and bearish momentum', 'Base tops and RSI midline broke together', 'Two things confirming beats one'],
      hints: [{ k: 'RSI', v: 'Pushed through 50 and held' }, { k: 'Price', v: 'Cleared the top of the base' }, { k: 'Before', v: 'RSI kept failing under 50' }],
      insight: 'RSI had failed at the midline four times during the base before this push.',
      chart(b) {
        b.vola(0.013).at(30).backdrop(190, 24, { swings: 8 });
        b.range(26, 21.5, 24.5, { touches: 4 });
        b.to(25.8, 6, { volMul: 1.4, curve: 'accel' });
        b.level(24.5, 'Base high');
        b.cut();
        b.zig([[25.4, 3, { volMul: 1.1 }], [28.6, 6, { volMul: 1.3 }]]);
      },
    },

    /* ---------------- MACD ---------------- */
    {
      id: 'macd_001', title: 'A Cross Below the Zero Line', category: 'macd', difficulty: 2,
      symbol: 'MSFT', timeframe: '1D', answer: UP,
      indicators: { macd: true },
      concept: 'Momentum turning in a base',
      explanation: 'MACD crossed above its signal line while still below zero, and the histogram flipped positive — selling momentum was easing well before price did anything obvious. Price then held a base and pushed at its top, so the momentum turn had structure behind it.',
      learningPoints: ['A cross below zero means selling is easing, not that a trend has started', 'The base gave the signal a reference level', 'Histogram flipping positive confirms the cross'],
      hints: [{ k: 'MACD', v: 'Crossed above signal, still below zero' }, { k: 'Histogram', v: 'Flipped positive' }, { k: 'Price', v: 'Holding a base, pushing its top' }],
      insight: 'The histogram has printed four rising bars in a row after twelve negative ones.',
      chart(b) {
        b.vola(0.014).at(60).backdrop(190, 44, { swings: 7 });
        b.to(36, 12, { volMul: 1.3 });
        b.range(18, 35.5, 39, { touches: 3 });
        b.to(39.4, 4, { volMul: 1.2 });
        b.level(39, 'Base high');
        b.cut();
        b.zig([[41, 3, { volMul: 1.2 }], [45, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'macd_002', title: 'Momentum Rolls Over at the Highs', category: 'macd', difficulty: 3,
      symbol: 'AAPL', timeframe: '1D', answer: DOWN,
      indicators: { macd: true },
      concept: 'Bearish crossover at resistance',
      explanation: 'MACD crossed below its signal line exactly as price stalled under a prior high. A crossover in open space is noise; a crossover where price has already failed once is momentum confirming what the level was telling you.',
      learningPoints: ['Crossovers matter more at a level than in open space', 'Price failed to clear the prior high', 'Histogram turned negative on the stall'],
      hints: [{ k: 'MACD', v: 'Crossed below its signal' }, { k: 'Level', v: 'Stalled under the prior high' }, { k: 'Attempts', v: 'Two failures at the same price' }],
      insight: 'Price came within 0.5% of the prior high twice and could not close above it.',
      chart(b) {
        b.vola(0.013).at(150).backdrop(190, 170, { swings: 7 });
        b.to(196, 14, { volMul: 1.2 });
        b.to(188, 6, { volMul: 0.85 });
        b.to(195.4, 6, { volMul: 0.7 });
        b.to(189, 4, { volMul: 1.0 });
        b.resistance(196, 'Prior high');
        b.cut();
        b.zig([[183, 4, { volMul: 1.25 }], [173, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'macd_003', title: 'Crossovers Everywhere', category: 'macd', difficulty: 4,
      symbol: 'EUR/USD', timeframe: '1D', answer: NO_TRADE,
      indicators: { macd: true },
      concept: 'Crossovers in a range',
      explanation: 'MACD crossed its signal line six times in thirty bars and hugged the zero line throughout. That is what a moving-average-based indicator does in a sideways market — it manufactures signals out of noise. The next stretch whipsawed exactly the same way.',
      myth: 'A MACD crossover is not a trade. In a range it fires constantly and means nothing.',
      learningPoints: ['MACD is derived from averages, so it needs a trend', 'Repeated crossings near zero = no trend', 'The indicator cannot tell you it is wrong — the price structure does'],
      hints: [{ k: 'MACD', v: 'Crossing repeatedly, hugging zero' }, { k: 'Price', v: 'Large candles, no net progress' }, { k: 'Structure', v: 'No highs or lows to work from' }],
      insight: 'MACD has crossed its signal line six times in the last thirty bars.',
      chart(b) {
        b.vola(0.013).at(64).backdrop(190, 62, { swings: 9 });
        b.chop(30, { amp: 0.018, volMul: 0.9, mid: 62 });
        b.cut();
        b.chop(9, { amp: 0.02, volMul: 0.9, mid: 62 });
      },
    },
    {
      id: 'macd_004', title: 'Higher Price, Lower Momentum', category: 'macd', difficulty: 3,
      symbol: 'NVDA', timeframe: '1D', answer: DOWN,
      indicators: { macd: true },
      concept: 'MACD divergence',
      explanation: 'Price made a higher high, MACD made a clearly lower one. The first advance was fast and broad; the second took sixteen bars of grinding to get slightly further. Each new high was being bought by fewer people with less urgency, and the rejection candle ended it.',
      learningPoints: ['Price higher high, MACD lower high', 'The second leg was far slower', 'Divergence warns, the reversal candle triggers'],
      hints: [{ k: 'Price', v: 'Higher high' }, { k: 'MACD', v: 'Clearly lower high' }, { k: 'Pace', v: 'Second leg took much longer' }],
      insight: 'The first leg took 10 bars to run; the second needed 16 to get barely further.',
      chart(b) {
        b.vola(0.013).at(20).backdrop(190, 30, { swings: 7 });
        b.to(44, 10, { volMul: 1.5, curve: 'accel' });
        const hiA = b.len() - 1;
        b.to(39, 6, { volMul: 0.9 });
        b.to(46, 16, { volMul: 0.8, noise: 0.45 });
        const hiB = b.len() - 1;
        b.pattern('shootingStar', { volMul: 0.8 });
        b.to(44.5, 2, { volMul: 1.0 });
        b.trendline([hiA, 'high'], [hiB, 'high'], { kind: 'support', label: 'Higher high', extend: false });
        b.trendline([hiA, 'macd'], [hiB, 'macd'], { pane: 'macd', kind: 'resistance', label: 'Lower high', extend: false });
        b.cut();
        b.zig([[41, 4, { volMul: 1.25 }], [37.5, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'macd_005', title: 'Back Above Zero', category: 'macd', difficulty: 3,
      symbol: 'GOOGL', timeframe: '1D', answer: UP,
      indicators: { macd: true },
      concept: 'Zero-line reclaim',
      explanation: 'The zero line is the honest MACD signal: above it the shorter average is above the longer one, which is the definition of an uptrend in this tool. After months below zero, MACD crossed back above it as price cleared the top of its base — the trend changed and the indicator simply reported it.',
      learningPoints: ['Above zero = shorter average above longer', 'A zero-line reclaim is slower but more reliable than a signal cross', 'Price confirmed by clearing the base'],
      hints: [{ k: 'MACD', v: 'Crossed back above zero' }, { k: 'Before', v: 'Months below the zero line' }, { k: 'Price', v: 'Broke the top of the base' }],
      insight: 'MACD has been below zero for most of this chart and just crossed above it.',
      chart(b) {
        b.vola(0.014).at(88).backdrop(190, 66, { swings: 8 });
        b.range(22, 63, 69, { touches: 3 });
        b.to(72.5, 8, { volMul: 1.4 });
        b.level(69, 'Base high');
        b.cut();
        b.zig([[71.5, 3, { volMul: 1.1 }], [80, 6, { volMul: 1.3 }]]);
      },
    },

    {
      id: 'rsi_006', title: 'Momentum Slips Under the Midline', category: 'rsi', difficulty: 3,
      symbol: 'AMD', timeframe: '1D', answer: DOWN,
      indicators: { rsi: true },
      concept: 'Momentum deterioration',
      explanation: 'Price made a marginally higher high, but RSI stepped down the whole way — a peak in the mid-80s on the first leg, only about 70 on the second — and it has now dropped back under 50. Losing the midline after a run like that is momentum changing regime, not just cooling off.',
      learningPoints: ['RSI making lower highs while price does not', 'The 50 line separates bullish and bearish momentum', 'Losing 50 after a long run is a regime change'],
      hints: [{ k: 'RSI peaks', v: 'Stepping lower each leg' }, { k: 'Midline', v: 'Just lost' }, { k: 'Price', v: 'Barely made a higher high' }],
      insight: 'The first leg ran in 16 bars; the second needed 28 to cover similar ground.',
      chart(b) {
        b.vola(0.013).at(30).backdrop(190, 44, { swings: 7 });
        /* Each leg carries internal pullbacks: a one-way ramp pins RSI at
           97, which is not what a real advance looks like. */
        /* Leg one is brisk, so RSI runs hot. Leg two covers similar ground
           but grinds into its high, which is exactly what drags the RSI
           peak down while price still prints higher. */
        b.zig([[48, 4, { volMul: 1.3 }], [46.5, 2, { volMul: 0.8 }], [52, 4, { volMul: 1.3 }],
               [50.5, 2, { volMul: 0.8 }], [56, 4, { volMul: 1.4 }]]);
        b.to(51.5, 6, { volMul: 0.9 });
        b.zig([[53.5, 5, { volMul: 0.9 }], [52.5, 4, { volMul: 0.7 }], [55, 6, { volMul: 0.8 }],
               [54, 4, { volMul: 0.7 }], [57.5, 9, { volMul: 0.7 }]]);
        b.to(55.5, 5, { volMul: 1.0 });
        b.to(54, 5, { volMul: 1.1 });
        b.cut();
        b.zig([[51, 4, { volMul: 1.3 }], [47.5, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'macd_006', title: 'Breaking Away from Zero', category: 'macd', difficulty: 2,
      symbol: 'AMZN', timeframe: '1D', answer: UP,
      indicators: { macd: true },
      concept: 'Expanding histogram',
      explanation: 'MACD crossed above zero and the histogram has grown on every bar since — each session is adding more momentum than the last. An expanding histogram is the cleanest confirmation the tool gives: the move is accelerating rather than drifting.',
      learningPoints: ['Histogram height measures the rate of change, not the move', 'Bars growing = momentum accelerating', 'Above zero means the trend has already turned'],
      hints: [{ k: 'MACD', v: 'Pushed clear of the zero line' }, { k: 'Histogram', v: 'Taller on every bar' }, { k: 'Price', v: 'Broke out of a long base' }],
      insight: 'The histogram has expanded for six consecutive bars.',
      chart(b) {
        b.vola(0.014).at(40).backdrop(190, 34, { swings: 8 });
        b.range(22, 31.5, 35.5, { touches: 3, volMul: 0.8 });
        b.to(48, 15, { volMul: 1.5, curve: 'accel', noise: 0.28 });
        b.level(35.5, 'Base high');
        b.cut();
        b.zig([[50.5, 4, { volMul: 1.3 }], [54, 6, { volMul: 1.3 }]]);
      },
    },

    /* ---------------- BOLLINGER BANDS ---------------- */
    {
      id: 'bb_001', title: 'The Squeeze Breaks', category: 'bollinger', difficulty: 2,
      symbol: 'AMD', timeframe: '1D', answer: UP,
      indicators: { bb: true, volume: true },
      concept: 'Volatility expansion',
      explanation: 'The bands contracted to their tightest reading on the chart — volatility that low tends not to last. The resolution came as a wide candle closing outside the upper band on heavy volume, which is expansion beginning rather than an extreme to fade.',
      learningPoints: ['Narrow bands mean stored energy, not direction', 'The breakout candle chooses the direction', 'Volume separates expansion from a false start'],
      hints: [{ k: 'Bands', v: 'Tightest on the chart' }, { k: 'Close', v: 'Outside the upper band' }, { k: 'Volume', v: 'Heavy on the break' }],
      insight: 'Band width just before the break was in the narrowest few percent of the last 100 bars.',
      chart(b) {
        b.vola(0.012).at(40).backdrop(190, 46, { swings: 8 });
        b.range(16, 44.4, 47.6, { touches: 3, volMul: 0.7 });
        b.taper(26, { from: 0.012, to: 0.002, volMul: 0.5, volEnd: 0.28, mid: 46 });
        b.to(49.6, 3, { volMul: 2.4, curve: 'accel' });
        b.cut();
        b.zig([[51, 3, { volMul: 1.4 }], [55, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'bb_002', title: 'Walking the Band', category: 'bollinger', difficulty: 3,
      symbol: 'NVDA', timeframe: '1D', answer: UP,
      indicators: { bb: true },
      concept: 'Band walk in a trend',
      explanation: 'Price has been pinned to the upper band for weeks. A band touch is a statement about standard deviation, not about value — in a strong trend price walks the upper band, and every short taken because "it hit the band" has been wrong for the whole move. The trend structure never broke.',
      myth: 'Touching the upper band is not a sell signal. In a trend it is what the trend looks like.',
      learningPoints: ['Bands measure volatility, not value', 'Strong trends ride the outer band', 'Only a loss of the middle band changes the picture'],
      hints: [{ k: 'Position', v: 'Riding the upper band' }, { k: 'Middle band', v: 'Rising, never lost' }, { k: 'Structure', v: 'Higher highs and higher lows' }],
      insight: 'Price has closed in the top quarter of the band on most of the last twenty bars.',
      chart(b) {
        b.vola(0.012).at(30).backdrop(190, 36, { swings: 7 });
        b.to(52, 24, { volMul: 1.3, noise: 0.25 });
        b.cut();
        b.zig([[54, 3, { volMul: 1.2 }], [58.5, 6, { volMul: 1.25 }]]);
      },
    },
    {
      id: 'bb_003', title: 'Tagging the Lower Band', category: 'bollinger', difficulty: 2,
      symbol: 'XAU/USD', timeframe: '1D', answer: UP,
      indicators: { bb: true },
      concept: 'Mean reversion in a range',
      explanation: 'Inside a well-defined range with a flat middle band, a tag of the lower band is a stretch that tends to snap back toward the middle. The same touch in a trending market would mean the opposite — the flat bands are what make this a mean-reversion setup rather than a continuation.',
      learningPoints: ['Mean reversion needs a flat middle band', 'The range boundary and the band agree', 'The same signal means different things in a trend'],
      hints: [{ k: 'Middle band', v: 'Flat — no trend' }, { k: 'Position', v: 'At the lower band' }, { k: 'Level', v: 'Range low right here' }],
      insight: 'The middle band has been flat for weeks, and price is at the bottom of the channel.',
      chart(b) {
        b.vola(0.014).at(100).backdrop(190, 104, { swings: 8 });
        b.range(28, 96, 112, { touches: 4 });
        b.to(95.2, 5, { volMul: 1.2 });
        b.pattern('hammer', { volMul: 1.4 });
        b.support(96, 'Range low');
        b.cut();
        b.zig([[101, 4, { volMul: 1.2 }], [106.5, 5, { volMul: 1.2 }]]);
      },
    },
    {
      id: 'bb_004', title: 'Coiled, No Direction', category: 'bollinger', difficulty: 4,
      symbol: 'EUR/USD', timeframe: '1D', answer: NO_TRADE,
      indicators: { bb: true },
      concept: 'Squeeze without resolution',
      explanation: 'The bands are as tight as they get, which is genuinely useful information — it says a bigger move is likely soon. It says nothing about which way. Price sits in the middle of the coil with no break in either direction, so there is a setup forming here but not yet a decision to make.',
      myth: 'A squeeze tells you when, never which way. Trading one before it breaks is a coin flip with extra steps.',
      learningPoints: ['Band width forecasts timing, not direction', 'Price in the middle of the coil = no trigger', 'Waiting for the break is the whole skill'],
      hints: [{ k: 'Bands', v: 'Extremely tight' }, { k: 'Position', v: 'Middle of the coil' }, { k: 'Break', v: 'Has not happened yet' }],
      insight: 'Band width is at its narrowest on the chart, and price is within 1% of the middle band.',
      chart(b) {
        b.vola(0.011).at(18).backdrop(190, 19, { swings: 9 });
        b.taper(26, { from: 0.012, to: 0.002, volMul: 0.6, volEnd: 0.3, mid: 19 });
        b.cut();
        b.to(19.45, 3, { volMul: 1.1 });
        b.to(18.6, 4, { volMul: 1.1 });
        b.to(19.1, 3, { volMul: 0.9 });
      },
    },
    {
      id: 'bb_005', title: 'Pinned to the Lower Band', category: 'bollinger', difficulty: 3,
      symbol: 'ETH/USD', timeframe: '1D', answer: DOWN,
      indicators: { bb: true },
      concept: 'Band walk in a downtrend',
      explanation: 'Price is hugging the lower band with the bands expanding and the middle band falling steeply. That is a trend in progress, not an extreme — the band is being dragged down by the very selling it is measuring. Buying a lower-band tag in this condition is catching a trend, not a bounce.',
      myth: 'A lower-band tag is oversold only when the bands are flat. In a downtrend it is just the trend.',
      learningPoints: ['Expanding bands mean the move is accelerating', 'A falling middle band rules out mean reversion', 'Band position must be read with band slope'],
      hints: [{ k: 'Position', v: 'Riding the lower band' }, { k: 'Middle band', v: 'Falling steeply' }, { k: 'Width', v: 'Expanding, not contracting' }],
      insight: 'The bands have widened throughout this decline — volatility is expanding, not exhausting.',
      chart(b) {
        b.vola(0.015).at(64).backdrop(190, 56, { swings: 7 });
        b.to(40, 22, { volMul: 1.35, noise: 0.28 });
        b.cut();
        b.zig([[38, 4, { volMul: 1.3 }], [34.5, 6, { volMul: 1.3 }]]);
      },
    },

    /* ---------------- CHART PATTERNS ---------------- */
    {
      id: 'pat_001', title: 'Pressing on the Ceiling', category: 'pattern', difficulty: 2,
      symbol: 'TSLA', timeframe: '1D', answer: UP,
      patternType: 'ascending-triangle', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Ascending triangle',
      explanation: 'A flat ceiling with lows stepping up into it: buyers kept paying more while sellers held one price. Each attempt left less room than the last, and the resolution came with a close above the ceiling on heavy volume.',
      learningPoints: ['Flat resistance plus rising lows', 'Buyers growing more urgent than sellers', 'The breakout close is the trigger, not the shape'],
      hints: [{ k: 'Resistance', v: 'Flat, tested three times' }, { k: 'Lows', v: 'Each one higher' }, { k: 'Break', v: 'Closed above on heavy volume' }],
      insight: 'The gap between the lows and the ceiling shrank from 10% to 3% across the pattern.',
      chart(b) {
        b.vola(0.013).at(58).backdrop(190, 64, { swings: 7 });
        b.to(72, 6, { upWick: 1.4 });
        b.to(64.5, 5); const l1 = b.len() - 1;
        b.to(71.8, 5, { upWick: 1.3 });
        b.to(67, 5);
        b.to(71.9, 4, { upWick: 1.2 });
        b.to(69.5, 4); const l3 = b.len() - 1;
        b.to(74.6, 3, { volMul: 2.4, curve: 'accel' });
        b.resistance(72, 'Flat ceiling');
        b.trendline([l1, 'low'], [l3, 'low'], { kind: 'support', label: 'Rising lows' });
        b.cut();
        b.zig([[76, 3, { volMul: 1.4 }], [82, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'pat_002', title: 'Still Inside the Triangle', category: 'pattern', difficulty: 4,
      symbol: 'SPY', timeframe: '1D', answer: NO_TRADE,
      patternType: 'symmetrical-triangle', confirmationState: 'incomplete',
      indicators: {},
      concept: 'Symmetrical triangle',
      explanation: 'Lower highs and higher lows converging, with price still inside both lines. A symmetrical triangle is genuinely neutral — it is two groups disagreeing in a narrowing space, and the pattern is the wait, not the trade. Price stayed inside for the whole following stretch.',
      myth: 'A triangle is not a bullish or bearish pattern until price closes outside it.',
      learningPoints: ['Converging lines with no directional bias', 'No close outside either boundary', 'The edge appears on the break, not before'],
      hints: [{ k: 'Highs', v: 'Stepping lower' }, { k: 'Lows', v: 'Stepping higher' }, { k: 'Price', v: 'Still inside both lines' }],
      insight: 'Price is roughly mid-triangle, with both boundaries several percent away.',
      chart(b) {
        b.vola(0.014).at(200).backdrop(190, 210, { swings: 7 });
        b.to(228, 5); const hA = b.len() - 1;
        b.to(196, 6); const lA = b.len() - 1;
        b.to(221, 5);
        b.to(202, 5);
        b.to(216, 4); const hB = b.len() - 1;
        b.to(207, 4); const lB = b.len() - 1;
        b.to(212, 3);
        b.trendline([hA, 'high'], [hB, 'high'], { kind: 'resistance', label: 'Lower highs' });
        b.trendline([lA, 'low'], [lB, 'low'], { kind: 'support', label: 'Higher lows' });
        b.cut();
        b.to(217, 3, { volMul: 1.0 });
        b.to(206, 4, { volMul: 1.0 });
        b.to(212, 3, { volMul: 0.9 });
      },
    },
    {
      id: 'pat_003', title: 'Climbing on Fumes', category: 'pattern', difficulty: 3,
      symbol: 'META', timeframe: '1D', answer: DOWN,
      patternType: 'rising-wedge', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Rising wedge',
      explanation: 'Both boundaries slope up, but the lows are rising faster than the highs — the advance is running out of room, and volume has fallen away throughout. A rising wedge is a trend losing its own argument: still making progress, but needing more effort for less ground each time.',
      learningPoints: ['Converging lines that both slope up', 'Lows rising faster than highs', 'Volume fading through the pattern'],
      hints: [{ k: 'Shape', v: 'Both lines up, converging' }, { k: 'Progress', v: 'Smaller gains each swing' }, { k: 'Volume', v: 'Falling throughout' }],
      insight: 'Each upswing in this wedge is smaller than the one before it.',
      chart(b) {
        b.vola(0.013).at(30).backdrop(190, 34, { swings: 7 });
        b.to(42, 7, { volMul: 1.3 }); const hA = b.len() - 1;
        b.to(37, 5, { volMul: 1.0 }); const lA = b.len() - 1;
        b.to(45, 6, { volMul: 1.0 });
        b.to(41.5, 4, { volMul: 0.85 });
        b.to(46.5, 5, { volMul: 0.7 }); const hB = b.len() - 1;
        b.to(44.5, 4, { volMul: 0.6 }); const lB = b.len() - 1;
        b.to(45.6, 3, { volMul: 0.55 });
        b.trendline([hA, 'high'], [hB, 'high'], { kind: 'resistance', label: 'Wedge' });
        b.trendline([lA, 'low'], [lB, 'low'], { kind: 'support' });
        b.cut();
        b.zig([[42, 4, { volMul: 1.4 }], [37.5, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'pat_004', title: 'Falling, But Narrowing', category: 'pattern', difficulty: 3,
      symbol: 'AMZN', timeframe: '1D', answer: UP,
      patternType: 'falling-wedge', confirmationState: 'confirmed',
      indicators: {},
      concept: 'Falling wedge',
      explanation: 'Price kept making lower lows, but each one by less, and the bounces kept getting caught sooner — the two lines are converging as selling loses force. That narrowing is what separates a falling wedge from a plain downtrend, where each leg is as big as the last.',
      learningPoints: ['Converging lines that both slope down', 'Each new low by a smaller margin', 'Ranges narrowing as selling fades'],
      hints: [{ k: 'Shape', v: 'Both lines down, converging' }, { k: 'Lows', v: 'Lower by less each time' }, { k: 'Ranges', v: 'Narrowing into the apex' }],
      insight: 'The last leg down covered about two-thirds of the ground the first one did.',
      chart(b) {
        b.vola(0.013).at(140).backdrop(190, 128, { swings: 7 });
        b.to(112, 7, { volMul: 1.35 }); const lA = b.len() - 1;
        b.to(122, 5, { volMul: 1.0 }); const hA = b.len() - 1;
        b.to(106, 6, { volMul: 0.95 });
        b.to(113, 4, { volMul: 0.8 });
        b.to(102, 5, { volMul: 0.7 }); const lB = b.len() - 1;
        b.to(106.5, 4, { volMul: 0.6 }); const hB = b.len() - 1;
        b.to(104.5, 3, { volMul: 0.55 });
        b.trendline([lA, 'low'], [lB, 'low'], { kind: 'support', label: 'Wedge' });
        b.trendline([hA, 'high'], [hB, 'high'], { kind: 'resistance' });
        b.cut();
        b.zig([[110, 4, { volMul: 1.4 }], [118, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'pat_005', title: 'The Lower Rail', category: 'pattern', difficulty: 2,
      symbol: 'BTC/USD', timeframe: '4H', answer: UP,
      patternType: 'rising-channel', confirmationState: 'confirmed',
      indicators: {},
      concept: 'Ascending channel',
      explanation: 'Two parallel rails have contained this advance for weeks, and price has just reached the lower one again with a long lower wick. In a channel the rails are the levels — the upper one for taking profit, the lower one for finding entries, and a decisive close below it for being wrong.',
      learningPoints: ['Parallel rails define a trending range', 'The lower rail is where entries live', 'A close below the rail invalidates it'],
      hints: [{ k: 'Channel', v: 'Two parallel rising rails' }, { k: 'Position', v: 'At the lower rail' }, { k: 'Candle', v: 'Long lower wick off it' }],
      insight: 'This is the third touch of the lower rail, and all three have held.',
      chart(b) {
        b.vola(0.012).at(20).backdrop(190, 24, { swings: 7 });
        b.to(30, 8); const h1 = b.len() - 1;
        b.to(26.5, 5); const l1 = b.len() - 1;
        b.to(34, 8);
        b.to(30.5, 5);
        b.to(38, 8); const h2 = b.len() - 1;
        b.to(34.3, 6); const l2 = b.len() - 1;
        b.pattern('hammer', { volMul: 1.3 });
        b.trendline([h1, 'high'], [h2, 'high'], { kind: 'resistance', label: 'Channel' });
        b.trendline([l1, 'low'], [l2, 'low'], { kind: 'support' });
        b.cut();
        b.zig([[36.5, 4, { volMul: 1.2 }], [38.8, 5, { volMul: 1.25 }]]);
      },
    },
    {
      id: 'pat_006', title: 'The Handle', category: 'pattern', difficulty: 3,
      symbol: 'AAPL', timeframe: '1D', answer: UP,
      patternType: 'cup-and-handle', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Cup and handle',
      explanation: 'A long rounded base brought price back to the level it failed at months ago, and instead of rejecting hard it drifted sideways and slightly lower on shrinking volume. That quiet drift is the handle — the last holders selling into a level that no longer has much supply behind it.',
      learningPoints: ['A rounded base repairs a failed level', 'The handle should be shallow and quiet', 'Volume contracting in the handle is the tell'],
      hints: [{ k: 'Shape', v: 'Rounded base back to the old high' }, { k: 'Handle', v: 'Shallow drift lower' }, { k: 'Volume', v: 'Shrinking through the handle' }],
      insight: 'Handle volume is running roughly half of the base average.',
      chart(b) {
        b.vola(0.012).at(52).backdrop(190, 60, { swings: 7 });
        b.to(62, 4, { upWick: 1.3, volMul: 1.2 });
        b.to(50, 10, { curve: 'ease', volMul: 1.1 });
        b.to(50.5, 6, { volMul: 0.6 });
        b.to(61.5, 12, { curve: 'accel', volMul: 1.0 });
        b.to(57.8, 5, { volMul: 0.5, volEnd: 0.38 });
        b.resistance(62, 'Rim');
        b.cut();
        b.zig([[63, 3, { volMul: 1.9 }], [65.5, 6, { volMul: 1.5 }]]);
      },
    },
    {
      id: 'pat_007', title: 'Swings Getting Wider', category: 'pattern', difficulty: 4,
      symbol: 'QQQ', timeframe: '1D', answer: NO_TRADE,
      patternType: 'broadening', confirmationState: 'incomplete',
      indicators: {},
      concept: 'Broadening formation',
      explanation: 'Higher highs and lower lows at the same time — the swings are getting wider, not narrower. Every breakout in this structure reverses, because there is no agreement anywhere on the chart about what price belongs. Volatility is rising while opportunity is falling.',
      learningPoints: ['Higher highs AND lower lows means expanding disagreement', 'Breakouts inside a broadening structure keep failing', 'Rising volatility is not rising opportunity'],
      hints: [{ k: 'Highs', v: 'Getting higher' }, { k: 'Lows', v: 'Getting lower' }, { k: 'Swings', v: 'Wider every time' }],
      insight: 'The last swing was more than twice the size of the first, in both directions.',
      chart(b) {
        b.vola(0.016).at(76).backdrop(190, 80, { swings: 8 });
        b.to(86, 5); const hA = b.len() - 1;
        b.to(74, 5); const lA = b.len() - 1;
        b.to(92, 6);
        b.to(69, 6);
        b.to(97, 6); const hB = b.len() - 1;
        b.to(66, 6); const lB = b.len() - 1;
        b.to(80, 5);
        b.trendline([hA, 'high'], [hB, 'high'], { kind: 'resistance', label: 'Expanding' });
        b.trendline([lA, 'low'], [lB, 'low'], { kind: 'support' });
        b.cut();
        b.to(90, 4, { volMul: 1.2 });
        b.to(72, 4, { volMul: 1.2 });
        b.to(82, 3, { volMul: 1.0 });
      },
    },

    /* ---------------- CLASSIC REVERSAL SHAPES ---------------- */
    {
      id: 'pat_008', title: 'Three Tries at the Same Ceiling', category: 'pattern', difficulty: 3,
      symbol: 'META', timeframe: '1D', answer: DOWN,
      patternType: 'triple-top', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Triple top',
      explanation: 'Three pushes into the same ceiling, each on lighter volume, and now a close below the shelf that held between them. Three failures at one price says supply sits there; the break of the shelf is what turns that observation into a decision.',
      learningPoints: ['Three rejections at one level', 'Volume shrinking on each attempt', 'The shelf between the peaks is the trigger'],
      hints: [{ k: 'Peaks', v: 'Three at the same price' }, { k: 'Volume', v: 'Lighter on each attempt' }, { k: 'Shelf', v: 'Just closed below it' }],
      insight: 'All three highs sit within 1% of each other, and the last one came on the lightest volume.',
      chart(b) {
        b.vola(0.014).at(40).backdrop(190, 52, { swings: 7 });
        b.to(62, 8, { volMul: 1.5 }); const t1 = b.len() - 1;
        b.to(55.5, 5, { volMul: 1.0 });
        b.to(61.8, 6, { volMul: 1.1 }); const t2 = b.len() - 1;
        b.to(55.8, 5, { volMul: 0.9 });
        b.to(61.9, 6, { volMul: 0.65 }); const t3 = b.len() - 1;
        b.to(55.6, 5, { volMul: 1.1 });
        b.to(54, 3, { volMul: 2.1, curve: 'accel' });
        b.resistance(61.9, 'Triple top');
        b.level(55.6, 'Shelf');
        b.note(t1, null, '1'); b.note(t2, null, '2'); b.note(t3, null, '3');
        b.cut();
        b.zig([[51, 4, { volMul: 1.5 }], [47, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'pat_009', title: 'Three Tests of the Floor', category: 'pattern', difficulty: 3,
      symbol: 'GOOGL', timeframe: '1D', answer: UP,
      patternType: 'triple-bottom', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Triple bottom',
      explanation: 'The same floor absorbed three waves of selling, and the last bounce closed above the ceiling that capped the previous two. Three holds at one price says demand is parked there, and the break of the ceiling is the confirmation that it has finally overwhelmed the sellers.',
      learningPoints: ['Three holds at one level', 'Rising volume on the final bounce', 'The ceiling between the lows is the trigger'],
      hints: [{ k: 'Lows', v: 'Three at the same price' }, { k: 'Ceiling', v: 'Just closed above it' }, { k: 'Volume', v: 'Heaviest on the break' }],
      insight: 'The breakout bar carries more volume than any bar inside the base.',
      chart(b) {
        b.vola(0.013).at(300).backdrop(190, 268, { swings: 7 });
        b.to(228, 8, { volMul: 1.3 }); const l1 = b.len() - 1;
        b.to(252, 5, { volMul: 1.0 });
        b.to(228.6, 6, { volMul: 1.0 }); const l2 = b.len() - 1;
        b.to(251, 5, { volMul: 0.9 });
        b.to(228.4, 6, { volMul: 0.8 }); const l3 = b.len() - 1;
        b.to(250, 5, { volMul: 1.1 });
        b.to(258, 3, { volMul: 2.3, curve: 'accel' });
        b.support(228.4, 'Triple bottom');
        b.level(251, 'Ceiling');
        b.note(l1, null, '1', { place: 'below' }); b.note(l2, null, '2', { place: 'below' }); b.note(l3, null, '3', { place: 'below' });
        b.cut();
        b.zig([[266, 4, { volMul: 1.4 }], [281, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'pat_010', title: 'The Long Way Back', category: 'pattern', difficulty: 2,
      symbol: 'SPY', timeframe: '1D', answer: UP,
      patternType: 'rounded-bottom', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Rounded bottom',
      explanation: 'Selling did not stop abruptly — it faded, turned over slowly and became buying, tracing a saucer rather than a V. Volume fell into the middle of the curve and rebuilt on the right side, which is the signature of a base changing hands. Price has now cleared the rim.',
      learningPoints: ['A gradual, symmetrical turn rather than a sharp low', 'Volume lowest at the middle of the curve', 'The rim is the confirmation level'],
      hints: [{ k: 'Shape', v: 'Saucer, not a V' }, { k: 'Volume', v: 'Lowest in the middle, rebuilding now' }, { k: 'Rim', v: 'Just cleared' }],
      insight: 'Volume in the middle of the base ran about 45% below the edges.',
      chart(b) {
        b.vola(0.011).at(690).backdrop(190, 660, { swings: 6 });
        b.arc(34, { to: 656, extreme: 566, volMul: 1.2, volEnd: 1.2, noise: 0.5 });
        b.to(672, 4, { volMul: 2.0, curve: 'accel' });
        b.resistance(658, 'Rim');
        b.cut();
        b.zig([[684, 4, { volMul: 1.4 }], [712, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'pat_011', title: 'Rolling Over', category: 'pattern', difficulty: 3,
      symbol: 'TSLA', timeframe: '1D', answer: DOWN,
      patternType: 'rounded-top', confirmationState: 'confirmed',
      indicators: {},
      concept: 'Rounded top',
      explanation: 'The advance did not end with a spike — it flattened, curled over and began sloping down, with each week a little lower than the last. That slow curve is distribution: buyers being absorbed rather than beaten. Price has now closed below the shelf the curve was resting on.',
      learningPoints: ['A gradual curl rather than a sharp top', 'No single reversal bar to react to', 'The shelf under the curve is the trigger'],
      hints: [{ k: 'Shape', v: 'A slow curl, not a spike' }, { k: 'Momentum', v: 'Fading the whole way over' }, { k: 'Shelf', v: 'Just closed below' }],
      insight: 'Price is 9% off the high without a single wide-range down bar until now.',
      chart(b) {
        b.vola(0.013).at(300).backdrop(190, 330, { swings: 6 });
        b.arc(32, { to: 366, extreme: 428, volMul: 1.1, volEnd: 1.0, noise: 0.5 });
        b.to(356, 4, { volMul: 2.0, curve: 'accel' });
        b.support(366, 'Shelf');
        b.cut();
        b.zig([[344, 4, { volMul: 1.5 }], [326, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'pat_012', title: 'Three Lows, Middle Deepest', category: 'pattern', difficulty: 2,
      symbol: 'AMD', timeframe: '1D', answer: UP,
      patternType: 'inverse-head-and-shoulders', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Inverse head and shoulders',
      explanation: 'A deeper middle low between two shallower ones, with the right shoulder forming on much lighter selling, and now a close above the neckline on expanding volume. The shape alone was only a hypothesis — the neckline close is what made it actionable.',
      learningPoints: ['Middle low deepest, shoulders shallower', 'Right shoulder on lighter volume', 'The neckline close is the trigger'],
      hints: [{ k: 'Shape', v: 'Three lows, middle deepest' }, { k: 'Right shoulder', v: 'Formed on light volume' }, { k: 'Neckline', v: 'Just closed above it' }],
      insight: 'The breakout bar trades roughly twice the volume of the right shoulder.',
      chart(b) {
        b.vola(0.014).at(200).backdrop(190, 176, { swings: 7 });
        b.to(132, 8, { volMul: 1.4 }); const ls = b.len() - 1;
        b.to(152, 5, { volMul: 1.0 });
        b.to(116, 7, { volMul: 1.5 }); const head = b.len() - 1;
        b.to(153, 6, { volMul: 1.1 });
        b.to(133, 6, { volMul: 0.55 }); const rs = b.len() - 1;
        b.to(151, 4, { volMul: 1.0 });
        b.to(159, 3, { volMul: 2.2, curve: 'accel' });
        b.level(152, 'Neckline');
        b.note(ls, null, 'LS', { place: 'below' }); b.note(head, null, 'HEAD', { place: 'below' }); b.note(rs, null, 'RS', { place: 'below' });
        b.cut();
        b.zig([[168, 4, { volMul: 1.4 }], [181, 6, { volMul: 1.3 }]]);
      },
    },

    /* ---------------- CONTINUATION SHAPES ---------------- */
    {
      id: 'pat_013', title: 'A Pause on the Way Down', category: 'pattern', difficulty: 2,
      symbol: 'NVDA', timeframe: '1D', answer: DOWN,
      patternType: 'bear-flag', confirmationState: 'confirmed',
      indicators: {},
      concept: 'Bear flag',
      explanation: 'A steep decline, then a shallow drift back up between two parallel rails on progressively narrower bars. That is not buyers returning — it is sellers pausing. Price has just lost the lower rail, which puts the original decline back in charge.',
      learningPoints: ['Steep impulse down, shallow drift up', 'The drift retraces only part of the leg', 'Losing the lower rail resumes the move'],
      hints: [{ k: 'Impulse', v: 'Steep one-way decline' }, { k: 'Drift', v: 'Shallow, between two rails' }, { k: 'Rail', v: 'Lower one just lost' }],
      insight: 'The flag recovered under a third of the decline before rolling over.',
      chart(b) {
        b.vola(0.014).at(215).backdrop(190, 205, { swings: 7 });
        b.to(152, 11, { volMul: 1.6, curve: 'accel' });
        const f0 = b.mark();
        b.to(169, 9, { volMul: 0.75, noise: 0.35 });
        const f1 = b.len() - 1;
        b.to(164, 3, { volMul: 1.2 });
        b.trendline([f0, 'high'], [f1, 'high'], { kind: 'resistance', label: 'Flag' });
        b.trendline([f0, 'low'], [f1, 'low'], { kind: 'support' });
        b.cut();
        b.zig([[156, 4, { volMul: 1.4 }], [146, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'pat_014', title: 'The Coil After the Run', category: 'pattern', difficulty: 3,
      symbol: 'BTC/USD', timeframe: '4H', answer: UP,
      patternType: 'pennant', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Pennant',
      explanation: 'A near-vertical advance followed by a tight symmetrical coil on collapsing volume — a pennant. The pole supplies the direction, the coil stores the energy, and the close above the upper boundary on a jump in volume releases it.',
      learningPoints: ['A steep pole, then a small symmetrical coil', 'Volume collapses inside the coil', 'The break of the upper boundary is the trigger'],
      hints: [{ k: 'Pole', v: 'Steep, one-way advance' }, { k: 'Coil', v: 'Converging, very tight' }, { k: 'Volume', v: 'Dead inside, spiking on the break' }],
      insight: 'Volume inside the coil ran roughly 60% below the pole.',
      chart(b) {
        b.vola(0.015).at(78000).backdrop(190, 84000, { swings: 7 });
        b.to(104000, 10, { volMul: 1.8, curve: 'accel' });
        const c0 = b.mark();
        b.to(99500, 4, { volMul: 0.7 });
        b.to(102500, 3, { volMul: 0.6 });
        b.to(100400, 3, { volMul: 0.5 });
        b.to(101800, 3, { volMul: 0.45 });
        const c1 = b.len() - 1;
        b.to(106500, 3, { volMul: 2.4, curve: 'accel' });
        b.trendline([c0, 'high'], [c1, 'high'], { kind: 'resistance', label: 'Pennant' });
        b.trendline([c0 + 3, 'low'], [c1, 'low'], { kind: 'support' });
        b.cut();
        b.zig([[112000, 4, { volMul: 1.5 }], [119000, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'pat_015', title: 'Sideways, Then On', category: 'pattern', difficulty: 2,
      symbol: 'MSFT', timeframe: '1D', answer: UP,
      patternType: 'rectangle', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Rectangle continuation',
      explanation: 'A strong advance paused into a clean horizontal box for weeks, then broke out of the top of it on a volume surge. A rectangle inside an uptrend is a rest, not a reversal — the resolution came in the direction price entered it.',
      learningPoints: ['A horizontal box inside an established trend', 'Both boundaries tested repeatedly', 'Breaking the box in the trend direction'],
      hints: [{ k: 'Box', v: 'Flat top and bottom, several tests' }, { k: 'Context', v: 'Entered from below, in an uptrend' }, { k: 'Break', v: 'Closed above the top on heavy volume' }],
      insight: 'The box held for roughly 26 bars before the break.',
      chart(b) {
        b.vola(0.012).at(380).backdrop(190, 428, { swings: 6 });
        b.to(496, 12, { volMul: 1.5 });
        b.range(26, 478, 500, { touches: 4, volMul: 0.8 });
        b.to(512, 3, { volMul: 2.4, curve: 'accel' });
        b.resistance(500, 'Box top');
        b.support(478, 'Box floor');
        b.cut();
        b.zig([[524, 4, { volMul: 1.4 }], [548, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'pat_016', title: 'The Upper Rail', category: 'pattern', difficulty: 2,
      symbol: 'AAPL', timeframe: '1D', answer: DOWN,
      patternType: 'falling-channel', confirmationState: 'confirmed',
      indicators: {},
      concept: 'Falling channel',
      explanation: 'Two parallel rails have contained this decline for weeks and price has just reached the upper one again, leaving a long upper wick. In a channel the rails are the levels — the upper rail is where a downtrend offers its entries, and it has held every time so far.',
      learningPoints: ['Parallel rails define a trending range', 'The upper rail is where a downtrend gets sold', 'A decisive close above the rail would invalidate it'],
      hints: [{ k: 'Channel', v: 'Two parallel falling rails' }, { k: 'Position', v: 'At the upper rail' }, { k: 'Candle', v: 'Long upper wick off it' }],
      insight: 'This is the third touch of the upper rail, and the previous two both failed.',
      chart(b) {
        /* A falling channel opens with a decline, so the FIRST swing point
           is a low. Anchoring the upper rail to it — as a rising channel
           would — crosses the rails and draws a wedge instead. Rails are
           pinned to real bounce highs and decline lows, with matched slopes
           so they stay parallel. */
        b.vola(0.013).at(300).backdrop(190, 288, { swings: 7 });
        b.to(252, 8);
        b.to(272, 5); const h1 = b.len() - 1;   // bounce high
        b.to(228, 8); const l1 = b.len() - 1;   // decline low
        b.to(248, 5);
        b.to(208, 8); const l2 = b.len() - 1;   // decline low
        b.to(231, 6); const h2 = b.len() - 1;   // bounce high, back at the rail
        b.pattern('shootingStar', { volMul: 1.2 });
        b.trendline([h1, 'high'], [h2, 'high'], { kind: 'resistance', label: 'Channel' });
        b.trendline([l1, 'low'], [l2, 'low'], { kind: 'support' });
        b.cut();
        b.zig([[218, 4, { volMul: 1.3 }], [204, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'pat_017', title: 'Out of the Channel', category: 'pattern', difficulty: 3,
      symbol: 'AMZN', timeframe: '1D', answer: UP,
      patternType: 'falling-channel', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Channel break',
      explanation: 'The same falling channel, but this time price closed decisively above the upper rail on the heaviest volume of the whole decline. A channel is a description of a trend; breaking its boundary is the first evidence that the description no longer fits.',
      learningPoints: ['A channel break is the first sign a trend is ending', 'The break needs a decisive close, not a wick', 'Volume separates a break from a drift'],
      hints: [{ k: 'Channel', v: 'Falling, held for weeks' }, { k: 'Break', v: 'Closed clearly above the upper rail' }, { k: 'Volume', v: 'Heaviest of the decline' }],
      insight: 'The breakout bar carries more volume than any bar inside the channel.',
      chart(b) {
        b.vola(0.013).at(300).backdrop(190, 282, { swings: 7 });
        b.to(248, 8, { volMul: 1.0 });
        b.to(266, 5, { volMul: 0.9 }); const h1 = b.len() - 1;   // bounce high
        b.to(226, 8, { volMul: 1.0 }); const l1 = b.len() - 1;   // decline low
        b.to(244, 5, { volMul: 0.85 });
        b.to(206, 8, { volMul: 0.9 }); const l2 = b.len() - 1;   // decline low
        b.to(222, 5, { volMul: 1.0 }); const h2 = b.len() - 1;   // last touch of the rail
        b.to(238, 4, { volMul: 2.5, curve: 'accel' });           // closes above it
        b.trendline([h1, 'high'], [h2, 'high'], { kind: 'resistance', label: 'Channel' });
        b.trendline([l1, 'low'], [l2, 'low'], { kind: 'support' });
        b.cut();
        b.zig([[248, 4, { volMul: 1.4 }], [264, 6, { volMul: 1.3 }]]);
      },
    },

    /* ---------------- TRAPS AND FAILURES ---------------- */
    {
      id: 'pat_018', title: 'Everyone Bought the Breakout', category: 'pattern', difficulty: 3,
      symbol: 'QQQ', timeframe: '1D', answer: DOWN,
      patternType: 'bull-trap', confirmationState: 'failed',
      indicators: { volume: true },
      concept: 'Bull trap',
      explanation: 'Price cleared a long-standing ceiling on good volume — a textbook breakout — and then closed back under it two bars later. Everyone who bought the break is now offside above the market, and their exits are the supply that drives the next move.',
      myth: 'A breakout that reverses back through its level is worse than no breakout. It creates trapped buyers who have to sell.',
      learningPoints: ['A clean breakout that fails within days', 'Closing back under the level is the tell', 'Trapped buyers become forced sellers'],
      hints: [{ k: 'Break', v: 'Cleared the ceiling convincingly' }, { k: 'Now', v: 'Closed back underneath it' }, { k: 'Volume', v: 'Heavy on the failure too' }],
      insight: 'Price spent four bars above the level and gave all of it back in two.',
      chart(b) {
        b.vola(0.013).at(480).backdrop(190, 520, { swings: 7 });
        b.range(24, 528, 556, { touches: 4, volMul: 0.85 });
        b.to(572, 3, { volMul: 2.3, curve: 'accel' });
        b.to(566, 3, { volMul: 1.0 });
        b.to(544, 3, { volMul: 2.0, curve: 'accel' });
        b.resistance(556, 'Broken, then reclaimed by sellers');
        b.cut();
        b.zig([[528, 4, { volMul: 1.5 }], [508, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'pat_019', title: 'The Flag That Broke the Wrong Way', category: 'pattern', difficulty: 4,
      symbol: 'ETH/USD', timeframe: '4H', answer: DOWN,
      patternType: 'bull-flag', confirmationState: 'failed',
      indicators: { volume: true },
      concept: 'Failed bull flag',
      explanation: 'A textbook bull flag after a strong advance — and then price lost the lower rail instead of clearing the upper one. A continuation pattern that resolves against the trend usually means the buyers who drove the impulse are already gone.',
      myth: 'Patterns have expected outcomes, not guaranteed ones. What matters is which boundary actually breaks.',
      learningPoints: ['A pattern is only a hypothesis about direction', 'The break decides, not the shape', 'A failed continuation often runs hard the other way'],
      hints: [{ k: 'Shape', v: 'Textbook bull flag' }, { k: 'Break', v: 'Lost the lower rail' }, { k: 'Volume', v: 'Expanded on the breakdown' }],
      insight: 'The breakdown bar carries the heaviest volume since the impulse leg.',
      chart(b) {
        b.vola(0.015).at(2400).backdrop(190, 2650, { swings: 7 });
        b.to(3450, 11, { volMul: 1.7, curve: 'accel' });
        const f0 = b.mark();
        b.to(3280, 8, { volMul: 0.7, noise: 0.35 });
        const f1 = b.len() - 1;
        b.to(3150, 3, { volMul: 2.2, curve: 'accel' });
        b.trendline([f0, 'high'], [f1, 'high'], { kind: 'resistance', label: 'Flag' });
        b.trendline([f0, 'low'], [f1, 'low'], { kind: 'support' });
        b.cut();
        b.zig([[2980, 4, { volMul: 1.5 }], [2820, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'pat_020', title: 'The Triangle Cracked Downward', category: 'pattern', difficulty: 4,
      symbol: 'XAU/USD', timeframe: '1D', answer: DOWN,
      patternType: 'ascending-triangle', confirmationState: 'failed',
      indicators: { volume: true },
      concept: 'Failed ascending triangle',
      explanation: 'Rising lows pressing into a flat ceiling is read as bullish pressure building — but the rising trendline is the one that gave way. When the side everyone is leaning on breaks first, the unwinding is usually quick.',
      myth: 'An ascending triangle is not a bullish pattern. It is a compression, and either side can break.',
      learningPoints: ['Compression resolves, but not always upward', 'The break decides the direction, not the slope', 'A failed pattern traps everyone positioned for it'],
      hints: [{ k: 'Shape', v: 'Flat ceiling, rising lows' }, { k: 'Break', v: 'The rising trendline gave way' }, { k: 'Volume', v: 'Expanded on the break' }],
      insight: 'Price closed below the rising trendline after four successive higher lows.',
      chart(b) {
        b.vola(0.012).at(2450).backdrop(190, 2520, { swings: 7 });
        b.to(2720, 6, { upWick: 1.4, volMul: 1.2 });
        b.to(2560, 5, { volMul: 1.0 }); const l1 = b.len() - 1;
        b.to(2715, 5, { upWick: 1.3, volMul: 1.0 });
        b.to(2600, 5, { volMul: 0.9 });
        b.to(2718, 4, { upWick: 1.2, volMul: 0.8 });
        b.to(2640, 4, { volMul: 0.8 }); const l3 = b.len() - 1;
        b.to(2600, 4, { volMul: 2.1, curve: 'accel' });
        b.resistance(2718, 'Flat ceiling');
        b.trendline([l1, 'low'], [l3, 'low'], { kind: 'support', label: 'Rising lows' });
        b.cut();
        b.zig([[2540, 4, { volMul: 1.4 }], [2470, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'pat_021', title: 'The Coil Broke Down', category: 'pattern', difficulty: 3,
      symbol: 'EUR/USD', timeframe: '1D', answer: DOWN,
      patternType: 'symmetrical-triangle', confirmationState: 'confirmed',
      indicators: {},
      concept: 'Symmetrical triangle break',
      explanation: 'The triangle was genuinely neutral while price stayed inside it — lower highs against higher lows, nobody in control. The decision arrived when price closed below the rising boundary, and the direction of that close is the whole signal.',
      learningPoints: ['A symmetrical triangle has no bias until it breaks', 'The closing side of the break is the signal', 'Compression tends to resolve with force'],
      hints: [{ k: 'Shape', v: 'Converging, no bias' }, { k: 'Break', v: 'Closed below the rising boundary' }, { k: 'Bars', v: 'Widening again after the break' }],
      insight: 'The break bar has the widest range of the last twenty.',
      chart(b) {
        b.vola(0.011).at(1.13).backdrop(190, 1.16, { swings: 7 });
        b.to(1.205, 5); const hA = b.len() - 1;
        b.to(1.118, 6); const lA = b.len() - 1;
        b.to(1.186, 5);
        b.to(1.136, 5);
        b.to(1.172, 4); const hB = b.len() - 1;
        b.to(1.152, 4); const lB = b.len() - 1;
        b.to(1.138, 3, { curve: 'accel', volaMul: 1.5 });
        b.trendline([hA, 'high'], [hB, 'high'], { kind: 'resistance', label: 'Lower highs' });
        b.trendline([lA, 'low'], [lB, 'low'], { kind: 'support', label: 'Higher lows' });
        b.cut();
        b.zig([[1.118, 4], [1.088, 6]]);
      },
    },
    {
      id: 'pat_022', title: 'Back to the Broken Floor', category: 'pattern', difficulty: 2,
      symbol: 'AAPL', timeframe: '1D', answer: UP,
      patternType: 'retest', confirmationState: 'confirmed',
      indicators: {},
      concept: 'Support retest',
      explanation: 'Price pulled all the way back to a level that has now held four separate times, and stopped there again with the narrowest bars of the whole decline. A level that keeps producing the same reaction is the cleanest thing on any chart.',
      learningPoints: ['A level with four reactions is well established', 'Narrowing bars into support show sellers finishing', 'The level also defines where the idea is wrong'],
      hints: [{ k: 'Level', v: 'Held four times before' }, { k: 'Approach', v: 'Bars narrowing into it' }, { k: 'Candle', v: 'Long lower wick' }],
      insight: 'The last three bars have the narrowest ranges of the entire pullback.',
      chart(b) {
        b.vola(0.013).at(198).backdrop(190, 214, { swings: 7 });
        b.zig([[228, 6, { dnWick: 1.2 }], [214.5, 5, { dnWick: 1.5 }], [236, 6], [214.8, 5, { dnWick: 1.5 }],
               [244, 6], [215, 5, { dnWick: 1.4 }], [238, 5]]);
        b.to(216, 5, { volMul: 0.8, curve: 'ease' });
        b.pattern('hammer', { volMul: 1.2 });
        b.pattern('inside', { volMul: 0.6 });
        b.support(215, 'Support · 4 tests');
        b.cut();
        b.zig([[226, 4], [238, 5]]);
      },
    },

    /* ---------------- SHAPES WITHOUT CONFIRMATION ---------------- */
    {
      id: 'pat_023', title: 'The Shape Is There', category: 'pattern', difficulty: 4,
      symbol: 'META', timeframe: '1D', answer: NO_TRADE,
      patternType: 'head-and-shoulders', confirmationState: 'incomplete',
      indicators: { volume: true },
      concept: 'Head and shoulders, unconfirmed',
      explanation: 'Every part of a head and shoulders is here — two lower peaks around a higher one, a clean neckline, even the lighter volume on the right shoulder. What is missing is the only part that matters: price has not closed below the neckline. Until it does this is a shape, not a setup.',
      myth: 'Anticipating a pattern is not the same as trading one. Most head and shoulders that get drawn never complete.',
      learningPoints: ['The neckline break is the pattern, not the shape', 'Shorting the right shoulder is anticipating', 'Unconfirmed patterns fail often enough to matter'],
      hints: [{ k: 'Shape', v: 'Complete — LS, head, RS' }, { k: 'Neckline', v: 'Intact, several percent below' }, { k: 'Trigger', v: 'Has not happened' }],
      insight: 'Price sits roughly 4% above the neckline, with no close below it yet.',
      chart(b) {
        b.vola(0.013).at(560).backdrop(190, 596, { swings: 7 });
        b.to(690, 8, { volMul: 1.5 }); const ls = b.len() - 1;
        b.to(632, 5, { volMul: 0.9 });
        b.to(742, 7, { volMul: 1.2 }); const head = b.len() - 1;
        b.to(630, 6, { volMul: 1.1 });
        b.to(688, 6, { volMul: 0.55 }); const rs = b.len() - 1;
        b.to(656, 5, { volMul: 0.9 });
        b.level(631, 'Neckline · intact');
        b.note(ls, null, 'LS'); b.note(head, null, 'HEAD'); b.note(rs, null, 'RS');
        b.cut();
        b.to(672, 4, { volMul: 0.9 });
        b.to(644, 4, { volMul: 1.0 });
        b.to(660, 3, { volMul: 0.9 });
      },
    },
    {
      id: 'pat_024', title: 'Two Lows, No Trigger', category: 'pattern', difficulty: 3,
      symbol: 'AMD', timeframe: '1D', answer: NO_TRADE,
      patternType: 'double-bottom', confirmationState: 'incomplete',
      indicators: {},
      concept: 'Double bottom, unconfirmed',
      explanation: 'Two lows at the same price is encouraging, but the neckline is still overhead and price is sitting in the middle of the pattern. Buying here means guessing that the second low holds; waiting for the neckline close means being paid to be sure.',
      learningPoints: ['Two lows alone do not complete the pattern', 'The neckline is the confirmation level', 'Mid-pattern is the worst place to act'],
      hints: [{ k: 'Lows', v: 'Two at the same price' }, { k: 'Neckline', v: 'Still overhead' }, { k: 'Position', v: 'Middle of the pattern' }],
      insight: 'Price is roughly halfway between the double bottom and the neckline.',
      chart(b) {
        b.vola(0.014).at(210).backdrop(190, 182, { swings: 7 });
        b.to(122, 9, { volMul: 1.4 });
        b.to(123, 3, { dnWick: 1.8, volMul: 1.4 });
        b.to(152, 6, { volMul: 1.0 });
        b.to(124, 6, { volMul: 0.8 });
        b.pattern('hammer', { volMul: 1.3 });
        b.to(137, 4, { volMul: 0.9 });
        b.support(123, 'Double bottom');
        b.level(152, 'Neckline · unbroken');
        b.cut();
        b.to(145, 4, { volMul: 0.9 });
        b.to(128, 4, { volMul: 1.0 });
        b.to(139, 3, { volMul: 0.9 });
      },
    },
    {
      id: 'pat_025', title: 'Three Tops, Floor Intact', category: 'pattern', difficulty: 4,
      symbol: 'SPY', timeframe: '1D', answer: NO_TRADE,
      patternType: 'triple-top', confirmationState: 'incomplete',
      indicators: {},
      concept: 'Triple top, unconfirmed',
      explanation: 'Three rejections at one ceiling is genuine information — supply is there. But the shelf underneath has held just as many times, so price is simply inside a range whose boundaries both work. The edge appears when one of them gives way.',
      learningPoints: ['Repeated highs alone do not make a top', 'A pattern needs its trigger level broken', 'Both boundaries holding means a range, not a reversal'],
      hints: [{ k: 'Ceiling', v: 'Three rejections' }, { k: 'Floor', v: 'Held just as often' }, { k: 'Position', v: 'Between the two' }],
      insight: 'Price sits close to the middle of a range whose edges have each held three times.',
      chart(b) {
        b.vola(0.011).at(600).backdrop(190, 620, { swings: 7 });
        b.to(668, 6, { upWick: 1.5 });
        b.to(622, 5, { dnWick: 1.4 });
        b.to(666, 6, { upWick: 1.4 });
        b.to(623, 5, { dnWick: 1.4 });
        b.to(667, 5, { upWick: 1.3 });
        b.to(624, 5, { dnWick: 1.3 });
        b.to(645, 4);
        b.resistance(667, 'Ceiling · 3 tests');
        b.support(623, 'Floor · 3 tests');
        b.cut();
        b.to(658, 4); b.to(630, 4); b.to(647, 3);
      },
    },
    {
      id: 'pat_026', title: 'A Wedge Still Forming', category: 'pattern', difficulty: 4,
      symbol: 'GOOGL', timeframe: '1D', answer: NO_TRADE,
      patternType: 'falling-wedge', confirmationState: 'incomplete',
      indicators: {},
      concept: 'Falling wedge, unconfirmed',
      explanation: 'The wedge is well drawn — lower lows by smaller and smaller margins, converging boundaries — and it leans bullish. But price is still inside it, several percent below the upper boundary. Buying the middle of a wedge means paying for a break that has not happened.',
      learningPoints: ['A falling wedge leans bullish but proves nothing inside it', 'The upper boundary is the trigger', 'Trading inside a pattern has no invalidation level'],
      hints: [{ k: 'Shape', v: 'Converging, both lines down' }, { k: 'Position', v: 'Still inside the wedge' }, { k: 'Trigger', v: 'Upper boundary not touched' }],
      insight: 'Price is about 4% below the upper boundary and 3% above the lower one.',
      chart(b) {
        b.vola(0.013).at(300).backdrop(190, 282, { swings: 7 });
        b.to(246, 7); const lA = b.len() - 1;
        b.to(268, 5); const hA = b.len() - 1;
        b.to(234, 6);
        b.to(252, 4);
        b.to(226, 5); const lB = b.len() - 1;
        b.to(240, 4); const hB = b.len() - 1;
        b.to(232, 4);
        b.trendline([lA, 'low'], [lB, 'low'], { kind: 'support', label: 'Wedge' });
        b.trendline([hA, 'high'], [hB, 'high'], { kind: 'resistance' });
        b.cut();
        b.to(240, 4); b.to(228, 4); b.to(236, 3);
      },
    },
    {
      id: 'pat_027', title: 'The Vertical Ending', category: 'pattern', difficulty: 3,
      symbol: 'BTC/USD', timeframe: '1D', answer: DOWN,
      patternType: 'blow-off-top', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Blow-off top',
      explanation: 'The advance went vertical, printed its widest range and heaviest volume of the entire move, then closed back below the steep trendline it had been riding. A blow-off is exhaustion rather than strength — the last buyers were the most urgent, and there is nobody behind them.',
      learningPoints: ['Accelerating price with climax volume marks exhaustion', 'The steep trendline is the thing to watch', 'Losing it after a vertical run removes the bid'],
      hints: [{ k: 'Move', v: 'Vertical into the high' }, { k: 'Volume', v: 'Largest of the whole advance' }, { k: 'Trendline', v: 'Just lost' }],
      insight: 'The climax bar traded more volume than any other bar on the chart.',
      chart(b) {
        b.vola(0.016).at(62000).backdrop(190, 72000, { swings: 7 });
        b.to(84000, 8, { volMul: 1.2 }); const t0 = b.len() - 1;
        b.to(96000, 6, { volMul: 1.5, curve: 'accel' });
        b.to(116000, 5, { volMul: 2.2, curve: 'accel' });
        b.pattern('climaxUp', { volMul: 1.5 });
        const top = b.len() - 1;
        b.to(104000, 3, { volMul: 1.8, curve: 'accel' });
        b.trendline([t0, 'low'], [top - 2, 'low'], { kind: 'support', label: 'Steep trendline' });
        b.note(top, null, 'CLIMAX');
        b.cut();
        b.zig([[96000, 4, { volMul: 1.6 }], [86000, 6, { volMul: 1.4 }]]);
      },
    },
    {
      id: 'pat_028', title: 'Wider Every Swing', category: 'pattern', difficulty: 4,
      symbol: 'TSLA', timeframe: '1D', answer: NO_TRADE,
      patternType: 'broadening', confirmationState: 'incomplete',
      indicators: {},
      concept: 'Expanding wedge',
      explanation: 'The boundaries are diverging rather than converging — each swing overshoots the last in both directions. Every breakout in this structure has already reversed, which is what an expanding wedge is: rising volatility with falling agreement. There is no level here that holds long enough to lean on.',
      learningPoints: ['Diverging boundaries mean widening disagreement', 'Breakouts inside a broadening structure keep failing', 'Rising volatility is not rising opportunity'],
      hints: [{ k: 'Boundaries', v: 'Diverging, not converging' }, { k: 'Swings', v: 'Each one overshoots the last' }, { k: 'Breakouts', v: 'All of them reversed' }],
      insight: 'The most recent swing is more than twice the size of the first.',
      chart(b) {
        b.vola(0.016).at(330).backdrop(190, 352, { swings: 7 });
        b.to(380, 5); const hA = b.len() - 1;
        b.to(330, 5); const lA = b.len() - 1;
        b.to(404, 6);
        b.to(308, 6);
        b.to(428, 6); const hB = b.len() - 1;
        b.to(292, 6); const lB = b.len() - 1;
        b.to(356, 5);
        b.trendline([hA, 'high'], [hB, 'high'], { kind: 'resistance', label: 'Expanding' });
        b.trendline([lA, 'low'], [lB, 'low'], { kind: 'support' });
        b.cut();
        b.to(400, 4, { volMul: 1.2 });
        b.to(320, 4, { volMul: 1.2 });
        b.to(362, 3, { volMul: 1.0 });
      },
    },

    /* ---------------- SECOND STATES: the same shape, a different outcome ----------------
       A pattern with one example teaches a picture. A pattern with two or
       three, resolving differently each time, teaches the shape. */
    {
      id: 'pat_029', title: 'The Coil Tightens', category: 'pattern', difficulty: 3,
      symbol: 'MSFT', timeframe: '1D', answer: UP,
      patternType: 'contracting-wedge', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Contracting wedge',
      explanation: 'Each swing has been roughly two-thirds the size of the one before, with the boundaries closing on each other — volatility contracting toward a point. Contraction like this resolves; the close above the upper boundary on expanding volume is what tells you which way.',
      learningPoints: ['Each swing smaller than the last', 'Boundaries converging toward an apex', 'Contraction resolves — the break picks the side'],
      hints: [{ k: 'Swings', v: 'Each about two-thirds of the last' }, { k: 'Boundaries', v: 'Closing on each other' }, { k: 'Break', v: 'Closed above on heavy volume' }],
      insight: 'Swing size has fallen from roughly 11% to 6% to 4% across the coil.',
      chart(b) {
        b.vola(0.013).at(400).backdrop(190, 452, { swings: 7 });
        b.to(506, 6, { volMul: 1.2 }); const hA = b.len() - 1;
        b.to(452, 6, { volMul: 1.1 }); const lA = b.len() - 1;
        b.to(492, 5, { volMul: 0.9 });
        b.to(462, 5, { volMul: 0.85 });
        /* The coil narrows but must not close before the cut, or the two
           rails cross and price ends up outside its own pattern. */
        b.to(488, 4, { volMul: 0.7 }); const hB = b.len() - 1;
        b.to(466, 4, { volMul: 0.6 }); const lB = b.len() - 1;
        b.to(477, 3, { volMul: 0.5 });
        b.to(498, 3, { volMul: 2.4, curve: 'accel' });
        b.trendline([hA, 'high'], [hB, 'high'], { kind: 'resistance', label: 'Coil' });
        b.trendline([lA, 'low'], [lB, 'low'], { kind: 'support' });
        b.cut();
        b.zig([[516, 4, { volMul: 1.4 }], [540, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'pat_030', title: 'Two Highs, Neckline Intact', category: 'pattern', difficulty: 3,
      symbol: 'NVDA', timeframe: '1D', answer: NO_TRADE,
      patternType: 'double-top', confirmationState: 'incomplete',
      indicators: { volume: true },
      concept: 'Double top, unconfirmed',
      explanation: 'Two highs at the same price on fading volume is a warning, not a trade. The low between them is still several percent below and has not been touched — until it breaks this is a range with a known ceiling, and the ceiling is where the risk is defined, not here.',
      learningPoints: ['Two highs alone do not complete the pattern', 'The neckline is the confirmation level', 'Mid-pattern offers no place to be wrong'],
      hints: [{ k: 'Highs', v: 'Two at the same price' }, { k: 'Neckline', v: 'Intact, several percent below' }, { k: 'Position', v: 'Between the two' }],
      insight: 'Price sits roughly halfway between the double top and its neckline.',
      chart(b) {
        b.vola(0.014).at(120).backdrop(190, 148, { swings: 7 });
        b.to(196, 10, { volMul: 1.4 });
        b.to(195, 3, { upWick: 1.9, volMul: 1.5 });
        b.to(172, 6, { volMul: 1.0 });
        b.to(194, 7, { volMul: 0.6 });
        b.pattern('shootingStar', { volMul: 0.7 });
        b.to(184, 4, { volMul: 0.9 });
        b.resistance(195, 'Double top');
        b.level(172, 'Neckline · unbroken');
        b.cut();
        b.to(191, 4, { volMul: 0.9 });
        b.to(177, 4, { volMul: 1.0 });
        b.to(186, 3, { volMul: 0.9 });
      },
    },
    {
      id: 'pat_031', title: 'The Fourth Test Was Too Many', category: 'pattern', difficulty: 3,
      symbol: 'AMD', timeframe: '1D', answer: DOWN,
      patternType: 'triple-bottom', confirmationState: 'failed',
      indicators: { volume: true },
      concept: 'Failed triple bottom',
      explanation: 'The floor held three times and everyone watching knew where it was — which is exactly why the fourth visit broke it. Each test consumes the demand sitting there, and this time the bounce never came: a wide candle closed below on the heaviest volume of the base.',
      myth: 'A level tested repeatedly is not getting stronger. Each test spends the buyers defending it.',
      learningPoints: ['Repeated tests wear a level down', 'The break of a well-watched floor triggers stops', 'A failed base often falls faster than it built'],
      hints: [{ k: 'Floor', v: 'Held three times' }, { k: 'This test', v: 'Closed below it' }, { k: 'Volume', v: 'Heaviest of the whole base' }],
      insight: 'Each bounce off the floor was smaller than the last: 14%, then 9%, then 4%.',
      chart(b) {
        b.vola(0.013).at(190).backdrop(190, 168, { swings: 7 });
        b.to(132, 7, { volMul: 1.3 });
        b.to(150, 5, { volMul: 1.0 });
        b.to(132.5, 5, { volMul: 1.0 });
        b.to(144, 5, { volMul: 0.85 });
        b.to(132.3, 5, { volMul: 0.9 });
        b.to(137.5, 4, { volMul: 0.7 });
        b.to(130, 4, { volMul: 2.4, curve: 'accel' });
        b.support(132.3, 'Floor · 3 holds');
        b.cut();
        b.zig([[124, 4, { volMul: 1.5 }], [116, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'pat_032', title: 'Curling, But Not Broken', category: 'pattern', difficulty: 4,
      symbol: 'META', timeframe: '1D', answer: NO_TRADE,
      patternType: 'rounded-top', confirmationState: 'incomplete',
      indicators: {},
      concept: 'Rounded top, unconfirmed',
      explanation: 'The curl is there — the advance flattened and has begun sloping down without a single sharp reversal bar. But the shelf underneath the curve has not broken, and a rounded top that never loses its shelf is just a pause. The shape warns; the shelf decides.',
      learningPoints: ['A curl without a broken shelf is only a warning', 'Rounded tops give no single bar to react to', 'The confirmation level is what makes it tradeable'],
      hints: [{ k: 'Shape', v: 'Flattened and curling over' }, { k: 'Shelf', v: 'Still holding below' }, { k: 'Trigger', v: 'Has not happened' }],
      insight: 'Price is about 3% above the shelf, with no close below it yet.',
      chart(b) {
        b.vola(0.012).at(520).backdrop(190, 560, { swings: 6 });
        b.arc(30, { to: 622, extreme: 668, noise: 0.5 });
        b.to(616, 4);
        b.support(600, 'Shelf · intact');
        b.cut();
        b.to(628, 4); b.to(606, 4); b.to(618, 3);
      },
    },
    {
      id: 'pat_033', title: 'The Saucer Hit a Ceiling', category: 'pattern', difficulty: 3,
      symbol: 'QQQ', timeframe: '1D', answer: DOWN,
      patternType: 'rounded-bottom', confirmationState: 'failed',
      indicators: { volume: true },
      concept: 'Failed rounded bottom',
      explanation: 'A textbook saucer carried price all the way back to the rim — and the rim held. The rejection candle closed near its low on heavy volume, which means the sellers who were trapped at the old high got their exit. The base was real; the breakout was not.',
      learningPoints: ['A base is not a breakout until the rim gives way', 'Old highs hold trapped supply', 'Rejection on volume confirms the failure'],
      hints: [{ k: 'Shape', v: 'Clean saucer back to the rim' }, { k: 'Rim', v: 'Rejected, not cleared' }, { k: 'Candle', v: 'Closed near its low on volume' }],
      insight: 'The rejection bar has the widest range and the heaviest volume of the base.',
      chart(b) {
        b.vola(0.012).at(640).backdrop(190, 620, { swings: 6 });
        b.arc(32, { to: 612, extreme: 532, volMul: 1.1, volEnd: 1.1, noise: 0.5 });
        b.pattern('shootingStar', { volMul: 2.4 });
        b.to(596, 3, { volMul: 1.6 });
        b.resistance(618, 'Rim · held');
        b.cut();
        b.zig([[572, 4, { volMul: 1.4 }], [548, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'pat_034', title: 'The Bear Flag That Broke Up', category: 'pattern', difficulty: 4,
      symbol: 'ETH/USD', timeframe: '4H', answer: UP,
      patternType: 'bear-flag', confirmationState: 'failed',
      indicators: { volume: true },
      concept: 'Failed bear flag',
      explanation: 'A steep decline and a tidy upward drift between two rails — everything says continuation lower. Then price closed above the upper rail on the heaviest volume since the decline began. When a continuation pattern resolves against its trend, the sellers who were positioned for the break become the fuel.',
      myth: 'The shape suggests a direction; only the break confirms one. Patterns fail often enough that the boundary matters more than the name.',
      learningPoints: ['A continuation pattern can resolve either way', 'The broken boundary is the signal', 'A failed flag traps everyone leaning the other way'],
      hints: [{ k: 'Shape', v: 'Textbook bear flag' }, { k: 'Break', v: 'Cleared the upper rail' }, { k: 'Volume', v: 'Heaviest since the decline' }],
      insight: 'The breakout bar carries more volume than any bar in the decline.',
      chart(b) {
        b.vola(0.015).at(4200).backdrop(190, 3960, { swings: 7 });
        b.to(3040, 11, { volMul: 1.6, curve: 'accel' });
        const f0 = b.mark();
        b.to(3300, 9, { volMul: 0.7, noise: 0.35 });
        const f1 = b.len() - 1;
        b.to(3480, 3, { volMul: 2.5, curve: 'accel' });
        b.trendline([f0, 'high'], [f1, 'high'], { kind: 'resistance', label: 'Flag' });
        b.trendline([f0, 'low'], [f1, 'low'], { kind: 'support' });
        b.cut();
        b.zig([[3650, 4, { volMul: 1.4 }], [3880, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'pat_035', title: 'Still Coiling', category: 'pattern', difficulty: 4,
      symbol: 'BTC/USD', timeframe: '4H', answer: NO_TRADE,
      patternType: 'pennant', confirmationState: 'incomplete',
      indicators: { volume: true },
      concept: 'Pennant, unconfirmed',
      explanation: 'The pole is there and the coil is as tight as it gets, with volume almost gone — a pennant in every respect except the one that matters. Price sits in the middle of the coil with both boundaries a couple of percent away, so there is no level here that defines where the idea is wrong.',
      learningPoints: ['A pennant is a pause, not a signal', 'The boundary break is the trade', 'Mid-coil there is nothing to risk against'],
      hints: [{ k: 'Pole', v: 'Steep advance behind it' }, { k: 'Coil', v: 'Very tight, volume gone' }, { k: 'Position', v: 'Middle of the coil' }],
      insight: 'Both boundaries sit within 2% of the current price.',
      chart(b) {
        b.vola(0.015).at(62000).backdrop(190, 68000, { swings: 7 });
        b.to(88000, 10, { volMul: 1.8, curve: 'accel' });
        const c0 = b.mark();
        b.to(83500, 4, { volMul: 0.7 });
        b.to(86800, 3, { volMul: 0.6 });
        b.to(84400, 3, { volMul: 0.5 });
        b.to(86000, 3, { volMul: 0.45 });
        b.to(85000, 3, { volMul: 0.4 });
        const c1 = b.len() - 1;
        b.trendline([c0, 'high'], [c1, 'high'], { kind: 'resistance', label: 'Pennant' });
        b.trendline([c0 + 3, 'low'], [c1, 'low'], { kind: 'support' });
        b.cut();
        b.to(86800, 3); b.to(84200, 4); b.to(85600, 3);
      },
    },
    {
      id: 'pat_036', title: 'The Box Broke Downward', category: 'pattern', difficulty: 2,
      symbol: 'TSLA', timeframe: '1D', answer: DOWN,
      patternType: 'rectangle', confirmationState: 'confirmed',
      indicators: { volume: true },
      concept: 'Rectangle breakdown',
      explanation: 'The same horizontal box as a continuation pattern, resolving the other way: price entered from above, spent weeks going nowhere, and closed below the floor on a volume surge. A rectangle has no bias of its own — the side that breaks is the whole message.',
      learningPoints: ['A rectangle is neutral until a boundary breaks', 'The direction of the break is the signal', 'Volume separates a break from a probe'],
      hints: [{ k: 'Box', v: 'Flat floor and ceiling, several tests' }, { k: 'Break', v: 'Closed below the floor' }, { k: 'Volume', v: 'Heaviest of the box' }],
      insight: 'The breakdown bar trades more volume than any bar inside the box.',
      chart(b) {
        b.vola(0.014).at(470).backdrop(190, 430, { swings: 6 });
        b.to(352, 11, { volMul: 1.4 });
        b.range(24, 340, 372, { touches: 4, volMul: 0.8 });
        b.to(330, 3, { volMul: 2.5, curve: 'accel' });
        b.support(340, 'Box floor');
        b.resistance(372, 'Box ceiling');
        b.cut();
        b.zig([[316, 4, { volMul: 1.5 }], [298, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'pat_037', title: 'The Floor Refused to Break', category: 'pattern', difficulty: 4,
      symbol: 'GOOGL', timeframe: '1D', answer: UP,
      patternType: 'descending-triangle', confirmationState: 'failed',
      indicators: { volume: true },
      concept: 'Failed descending triangle',
      explanation: 'Lower highs pressing into a flat floor is read as pressure building downward — and the descending trendline is the side that broke. Everyone short into the obvious breakdown is now wrong, and a pattern that fails this cleanly usually runs hard the other way.',
      myth: 'A descending triangle is not a bearish pattern. It is compression, and the side that breaks decides.',
      learningPoints: ['Compression can resolve against the obvious side', 'The broken boundary is the signal', 'A failed pattern traps everyone positioned for it'],
      hints: [{ k: 'Shape', v: 'Flat floor, lower highs' }, { k: 'Break', v: 'The descending line gave way upward' }, { k: 'Volume', v: 'Expanded on the break' }],
      insight: 'Price closed above the descending trendline after four successive lower highs.',
      chart(b) {
        b.vola(0.013).at(310).backdrop(190, 288, { swings: 7 });
        b.to(236, 6, { dnWick: 1.4, volMul: 1.2 });
        b.to(278, 5, { volMul: 1.0 }); const h1 = b.len() - 1;
        b.to(236.5, 5, { dnWick: 1.3, volMul: 0.9 });
        b.to(266, 5, { volMul: 0.85 });
        b.to(236.2, 4, { dnWick: 1.2, volMul: 0.8 });
        b.to(256, 4, { volMul: 0.8 }); const h3 = b.len() - 1;
        b.to(268, 4, { volMul: 2.3, curve: 'accel' });
        b.support(236.3, 'Flat floor');
        b.trendline([h1, 'high'], [h3, 'high'], { kind: 'resistance', label: 'Lower highs' });
        b.cut();
        b.zig([[280, 4, { volMul: 1.4 }], [298, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'pat_038', title: 'Top of the Channel', category: 'pattern', difficulty: 2,
      symbol: 'AAPL', timeframe: '1D', answer: DOWN,
      patternType: 'rising-channel', confirmationState: 'confirmed',
      indicators: {},
      concept: 'Rising channel, upper rail',
      explanation: 'The same rising channel that offers entries at its lower rail offers the opposite at its upper one. Price has reached the top rail for the third time and left a long upper wick — inside a channel, the rails are the levels, and this one has turned price back every time.',
      learningPoints: ['A channel cuts both ways — rails are levels', 'The upper rail is where a rising channel gets sold', 'A close above the rail would change the read'],
      hints: [{ k: 'Channel', v: 'Two parallel rising rails' }, { k: 'Position', v: 'At the upper rail' }, { k: 'Candle', v: 'Long upper wick off it' }],
      insight: 'This is the third touch of the upper rail, and both previous touches turned price down.',
      chart(b) {
        b.vola(0.012).at(180).backdrop(190, 196, { swings: 7 });
        b.to(226, 7); const h1 = b.len() - 1;
        b.to(208, 5); const l1 = b.len() - 1;
        b.to(242, 7);
        b.to(224, 5);
        b.to(258, 7); const h2 = b.len() - 1;
        b.to(240, 5); const l2 = b.len() - 1;
        b.to(268, 5); const h3 = b.len() - 1;
        b.pattern('shootingStar', { volMul: 1.2 });
        b.trendline([h1, 'high'], [h3, 'high'], { kind: 'resistance', label: 'Channel' });
        b.trendline([l1, 'low'], [l2, 'low'], { kind: 'support' });
        b.cut();
        b.zig([[252, 4], [238, 6]]);
      },
    },
    {
      id: 'pat_039', title: 'The Wedge Has Not Cracked', category: 'pattern', difficulty: 4,
      symbol: 'SPY', timeframe: '1D', answer: NO_TRADE,
      patternType: 'rising-wedge', confirmationState: 'incomplete',
      indicators: { volume: true },
      concept: 'Rising wedge, unconfirmed',
      explanation: 'A well-formed rising wedge with volume draining away — the structure leans bearish and most readers would already be short. But price is sitting inside it, closer to the upper boundary than the lower, and the lower rail has not been touched let alone broken. Anticipating the break is not the same as trading it.',
      myth: 'A rising wedge leans bearish. It does not become a trade until the lower boundary gives way.',
      learningPoints: ['The lean of a pattern is not its trigger', 'Inside the wedge there is no invalidation level', 'Wedges can run far longer than they look able to'],
      hints: [{ k: 'Shape', v: 'Converging, both lines up' }, { k: 'Volume', v: 'Draining through the wedge' }, { k: 'Lower rail', v: 'Not touched, let alone broken' }],
      insight: 'Price sits nearer the upper boundary, about 5% above the lower rail.',
      chart(b) {
        b.vola(0.011).at(560).backdrop(190, 588, { swings: 7 });
        b.to(632, 7, { volMul: 1.3 }); const hA = b.len() - 1;
        b.to(604, 5, { volMul: 1.0 }); const lA = b.len() - 1;
        b.to(656, 6, { volMul: 0.95 });
        b.to(634, 4, { volMul: 0.85 });
        b.to(672, 5, { volMul: 0.7 }); const hB = b.len() - 1;
        b.to(656, 4, { volMul: 0.6 }); const lB = b.len() - 1;
        b.to(668, 4, { volMul: 0.55 });
        b.trendline([hA, 'high'], [hB, 'high'], { kind: 'resistance', label: 'Wedge' });
        b.trendline([lA, 'low'], [lB, 'low'], { kind: 'support' });
        b.cut();
        b.to(678, 4, { volMul: 0.7 }); b.to(660, 4, { volMul: 0.9 }); b.to(670, 3, { volMul: 0.7 });
      },
    },
    {
      id: 'pat_040', title: 'The Trap That Was Not', category: 'pattern', difficulty: 4,
      symbol: 'AMZN', timeframe: '1D', answer: DOWN,
      patternType: 'bear-trap', confirmationState: 'failed',
      indicators: { volume: true },
      concept: 'Failed bear trap',
      explanation: 'Price broke the range low, closed back inside on heavy volume, and looked exactly like a stop run — then lost the level again two bars later. A reclaim that cannot hold is not a trap, it is a genuine breakdown that took two attempts, and the buyers who stepped in are now the ones offside.',
      myth: 'A reclaim only counts while it holds. Losing the level a second time is the real signal.',
      learningPoints: ['A failed breakdown must hold to mean anything', 'The second break has far less resistance behind it', 'Buyers from the reclaim become forced sellers'],
      hints: [{ k: 'First break', v: 'Reclaimed on heavy volume' }, { k: 'Since', v: 'Lost the level again' }, { k: 'Close', v: 'Below the range low' }],
      insight: 'The reclaim held for only two bars before price closed back below.',
      chart(b) {
        b.vola(0.014).at(258).backdrop(190, 244, { swings: 7 });
        b.range(22, 206, 232, { touches: 3, volMul: 0.9 });
        b.to(210, 4, { volMul: 0.9 });
        b.poke(206, { above: false, overshoot: 0.02, closeAt: 213, volMul: 2.6 });
        b.to(216, 2, { volMul: 1.3 });
        b.to(202, 3, { volMul: 2.2, curve: 'accel' });
        b.support(206, 'Range low · lost twice');
        b.cut();
        b.zig([[192, 4, { volMul: 1.5 }], [180, 6, { volMul: 1.35 }]]);
      },
    },

    /* ---------------- FIBONACCI ---------------- */
    {
      id: 'fib_001', title: 'Two Thirds Back', category: 'fibonacci', difficulty: 2,
      symbol: 'NVDA', timeframe: '1D', answer: UP,
      indicators: { showFibonacci: true, ma: [50] },
      concept: 'Retracement with confluence',
      explanation: 'The pullback stopped at the 61.8% retracement of the prior advance — and the rising 50-day average was sitting at the same price. A Fibonacci level on its own is a line on a chart; what makes this one worth acting on is that a second, unrelated method points at the same place.',
      learningPoints: ['Deep retracements are normal inside a trend', 'A level matters more when something else agrees', 'Confluence, not the ratio, is the edge'],
      hints: [{ k: 'Retracement', v: 'Stopped at 61.8%' }, { k: 'MA50', v: 'Rising, at the same price' }, { k: 'Trend', v: 'Higher highs still intact' }],
      insight: 'The 61.8% level and the 50-day average are within 1% of each other.',
      chart(b) {
        b.vola(0.014).at(120).backdrop(190, 138, { swings: 7 });
        b.to(196, 18, { volMul: 1.3 });
        const hi = 196;
        /* Retrace to the average, then anchor the swing so 61.8% lands there
           — confluence has to be real, not asserted. */
        const target = b.ma(50) * 1.004;
        b.to(target, 9, { volMul: 0.8, curve: 'ease' });
        b.pattern('hammer', { volMul: 1.2 });
        b.fib(hi - (hi - target) / 0.618, hi, { dir: 'up' });
        b.cut();
        b.zig([[164, 4, { volMul: 1.2 }], [174, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'fib_002', title: 'Through Every Level', category: 'fibonacci', difficulty: 3,
      symbol: 'TSLA', timeframe: '1D', answer: DOWN,
      indicators: { showFibonacci: true },
      concept: 'Retracement failure',
      explanation: 'Price cut through 38.2%, 50% and 61.8% without pausing at any of them, and has now closed below 78.6%. A retracement that ignores every level is not retracing — it is reversing. Past 78.6% there is nothing left of the move to give back.',
      myth: 'Fibonacci levels are not support. They are places to watch for a reaction; no reaction means no support.',
      learningPoints: ['Levels matter only where price reacts to them', 'Slicing through all of them signals a trend change', 'Beyond 78.6% the original move is effectively undone'],
      hints: [{ k: 'Levels', v: 'Cut through 38.2, 50 and 61.8' }, { k: 'Reaction', v: 'None at any of them' }, { k: 'Now', v: 'Below 78.6%' }],
      insight: 'Not one of the five levels produced even a two-bar bounce.',
      chart(b) {
        b.vola(0.015).at(240).backdrop(190, 268, { swings: 7 });
        b.to(430, 16, { volMul: 1.4 });
        const hi = 430, lo = 268;
        b.to(lo + (hi - lo) * 0.16, 16, { volMul: 1.35, noise: 0.35 });
        b.fib(lo, hi, { dir: 'up' });
        b.cut();
        b.zig([[292, 4, { volMul: 1.4 }], [272, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'fib_003', title: 'A Shallow Give-Back', category: 'fibonacci', difficulty: 2,
      symbol: 'MSFT', timeframe: '1D', answer: UP,
      indicators: { showFibonacci: true },
      concept: 'Shallow retracement',
      explanation: 'The pullback gave back only 23.6% of the advance before buyers stepped in. A retracement that shallow says holders are not interested in selling — the market barely got a chance to offer a discount before it was taken.',
      learningPoints: ['Shallow retracements signal strong demand', 'The depth of a pullback measures conviction', 'Waiting for a deep level can mean missing the move'],
      hints: [{ k: 'Depth', v: 'Only 23.6% given back' }, { k: 'Bars', v: 'Pullback lasted four sessions' }, { k: 'Structure', v: 'Higher highs intact' }],
      insight: 'The pullback lasted four bars against an eighteen-bar advance.',
      chart(b) {
        b.vola(0.012).at(380).backdrop(190, 404, { swings: 7 });
        b.to(520, 18, { volMul: 1.35 });
        const hi = 520, lo = 404;
        b.to(lo + (hi - lo) * 0.764, 4, { volMul: 0.8 });
        b.fib(lo, hi, { dir: 'up' });
        b.cut();
        b.zig([[512, 4, { volMul: 1.3 }], [548, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'fib_004', title: 'Between the Lines', category: 'fibonacci', difficulty: 4,
      symbol: 'GOOGL', timeframe: '1D', answer: NO_TRADE,
      indicators: { showFibonacci: true },
      concept: 'Fibonacci without confluence',
      explanation: 'Price is drifting in the gap between the 38.2% and 50% levels, reacting to neither, with nothing else on the chart marking either one. Drawing a retracement does not create support — the levels only matter where price has already shown it cares, and here it has not.',
      myth: 'A Fibonacci tool can be drawn on any swing. That does not make the lines meaningful.',
      learningPoints: ['Levels need a reaction before they mean anything', 'Mid-way between levels is the worst place to act', 'Without confluence a retracement is decoration'],
      hints: [{ k: 'Position', v: 'Between 38.2% and 50%' }, { k: 'Reactions', v: 'None at either level' }, { k: 'Confluence', v: 'Nothing else marks them' }],
      insight: 'Neither of the nearest two levels has produced a reaction on this chart.',
      chart(b) {
        b.vola(0.013).at(210).backdrop(190, 226, { swings: 8 });
        b.to(288, 14, { volMul: 1.1 });
        const hi = 288, lo = 226;
        const mid = hi - (hi - lo) * 0.44;   /* squarely between 38.2% and 50% */
        b.to(mid, 6, { volMul: 0.9 });
        b.chop(11, { amp: 0.009, volMul: 0.85, mid });
        b.to(mid, 2, { volMul: 0.85 });
        b.fib(lo, hi, { dir: 'up' });
        b.cut();
        b.chop(9, { amp: 0.016, volMul: 0.9, mid: 262 });
      },
    },
    {
      id: 'fib_005', title: 'Halfway, and a Shelf', category: 'fibonacci', difficulty: 2,
      symbol: 'SPY', timeframe: '1D', answer: UP,
      indicators: { showFibonacci: true },
      concept: 'Fibonacci meets a real level',
      explanation: 'The 50% retracement lands exactly on a shelf that already held twice before the advance began. The horizontal level is the real evidence — old support that buyers defended — and the retracement simply tells you the pullback has given back a normal amount.',
      learningPoints: ['A prior high or low is stronger evidence than a ratio', 'The two agreeing is what makes the level worth using', '50% is a normal give-back inside a healthy trend'],
      hints: [{ k: 'Retracement', v: 'Right at 50%' }, { k: 'Level', v: 'Old shelf, held twice' }, { k: 'Candle', v: 'Long lower wick' }],
      insight: 'The 50% level sits within 0.5% of a shelf that held twice earlier.',
      chart(b) {
        b.vola(0.011).at(560).backdrop(190, 588, { swings: 6 });
        b.zig([[612, 5, { dnWick: 1.4 }], [600, 4, { dnWick: 1.5 }], [614, 5], [600.5, 4, { dnWick: 1.4 }]]);
        b.to(688, 14, { volMul: 1.3 });
        const hi = 688, lo = 600;
        b.to(lo + (hi - lo) * 0.5, 8, { volMul: 0.85, curve: 'ease' });
        b.pattern('hammer', { volMul: 1.3 });
        b.support(644, 'Old shelf');
        b.fib(lo, hi, { dir: 'up' });
        b.cut();
        b.zig([[664, 4, { volMul: 1.2 }], [686, 6, { volMul: 1.25 }]]);
      },
    },
    {
      id: 'fib_006', title: 'Stopped at Two Thirds', category: 'fibonacci', difficulty: 3,
      symbol: 'AMD', timeframe: '1D', answer: DOWN,
      indicators: { showFibonacci: true },
      concept: 'Retracement as resistance',
      explanation: 'This is a retracement of a decline, so the levels act as resistance rather than support. The bounce carried to 61.8% of the drop and stalled there with a long upper wick — a normal counter-trend rally that ran out exactly where the measured move said it might.',
      learningPoints: ['Retracing a decline makes the levels resistance', 'Counter-trend rallies often die at 61.8%', 'The rejection candle is the confirmation'],
      hints: [{ k: 'Direction', v: 'Retracing a decline' }, { k: 'Stall', v: 'At 61.8% of the drop' }, { k: 'Candle', v: 'Long upper wick' }],
      insight: 'The bounce recovered 62% of the decline and stopped within a bar of the level.',
      chart(b) {
        b.vola(0.014).at(190).backdrop(190, 176, { swings: 7 });
        b.to(108, 15, { volMul: 1.4 });
        const hi = 176, lo = 108;
        b.to(lo + (hi - lo) * 0.618, 11, { volMul: 0.9, curve: 'ease' });
        b.pattern('shootingStar', { volMul: 1.1 });
        b.fib(lo, hi, { dir: 'down' });
        b.cut();
        b.zig([[140, 4, { volMul: 1.3 }], [128, 6, { volMul: 1.3 }]]);
      },
    },

    /* ---------------- STOCHASTIC ---------------- */
    {
      id: 'stoch_001', title: 'Crossing Up from the Floor', category: 'stochastic', difficulty: 2,
      symbol: 'AMZN', timeframe: '1D', answer: UP,
      indicators: { showStochastic: true },
      concept: 'Oversold crossover at support',
      explanation: 'Stochastic dropped under 20 and %K has now crossed back above %D — but the reason to act is where it happened. Price was at a floor that had already held twice, so the oscillator is confirming a level rather than being used on its own.',
      learningPoints: ['A crossover below 20 is the classic bullish signal', 'It only matters where price is at something', 'Oscillator confirms; the level decides'],
      hints: [{ k: 'Stochastic', v: 'Under 20, %K crossing above %D' }, { k: 'Level', v: 'Support held twice before' }, { k: 'Candle', v: 'Long lower wick' }],
      insight: 'This is the first %K/%D cross above 20 in more than three weeks.',
      chart(b) {
        b.vola(0.013).at(268).backdrop(190, 250, { swings: 7 });
        b.zig([[214, 6, { dnWick: 1.5 }], [238, 6], [214.5, 6, { dnWick: 1.5 }], [236, 5]]);
        b.to(212, 9, { volMul: 1.2, curve: 'accel', noise: 0.2 });
        b.pattern('hammer', { volMul: 1.5 });
        b.to(220, 3, { volMul: 1.2 });
        b.support(213, 'Support · 2 tests');
        b.cut();
        b.zig([[232, 4, { volMul: 1.2 }], [246, 5, { volMul: 1.25 }]]);
      },
    },
    {
      id: 'stoch_002', title: 'Rolling Over at the Ceiling', category: 'stochastic', difficulty: 3,
      symbol: 'META', timeframe: '1D', answer: DOWN,
      indicators: { showStochastic: true },
      concept: 'Overbought crossover at resistance',
      explanation: 'Stochastic pushed above 80 as price reached a prior high, then %K crossed back below %D. The cross alone fires constantly; arriving at a level that has already rejected price once is what turns it into evidence.',
      learningPoints: ['A cross down from above 80 is the bearish signal', 'The prior high supplies the context', 'Two independent reasons beat one'],
      hints: [{ k: 'Stochastic', v: 'Above 80, %K crossing below %D' }, { k: 'Level', v: 'Prior high just overhead' }, { k: 'Close', v: 'Failed to clear it' }],
      insight: 'Price came within 0.5% of the prior high and turned away.',
      chart(b) {
        b.vola(0.012).at(560).backdrop(190, 600, { swings: 7 });
        b.to(712, 8, { upWick: 1.6, volMul: 1.2 });
        b.to(648, 7, { volMul: 1.0 });
        b.to(709, 10, { volMul: 0.9, curve: 'ease', noise: 0.25 });
        b.pattern('shootingStar', { volMul: 1.0 });
        b.to(694, 3, { volMul: 1.1 });
        b.resistance(711, 'Prior high');
        b.cut();
        b.zig([[664, 4, { volMul: 1.3 }], [636, 6, { volMul: 1.3 }]]);
      },
    },
    {
      id: 'stoch_003', title: 'Pinned at the Top', category: 'stochastic', difficulty: 4,
      symbol: 'AAPL', timeframe: '1D', answer: UP,
      indicators: { showStochastic: true },
      concept: 'Embedded stochastic',
      explanation: 'Stochastic has sat above 80 for weeks without price giving anything back. In a strong trend the oscillator becomes embedded at the extreme — every close near the top of its range keeps it there. Selling each overbought reading has been wrong for the entire advance.',
      myth: 'Overbought is not a sell signal. A stochastic stuck above 80 is describing a trend, not warning about one.',
      learningPoints: ['Oscillators embed at extremes during trends', 'Bounded indicators cannot measure trend strength', 'Structure overrides the oscillator'],
      hints: [{ k: 'Stochastic', v: 'Above 80 for weeks' }, { k: 'Price', v: 'Higher highs the whole time' }, { k: 'Pullbacks', v: 'None worth the name' }],
      insight: 'Stochastic has closed above 80 on most of the last twenty bars while price rose steadily.',
      chart(b) {
        b.vola(0.011).at(190).backdrop(190, 208, { swings: 7 });
        b.zig([[228, 7, { volMul: 1.2 }], [224, 3, { volMul: 0.8 }], [248, 7, { volMul: 1.2 }],
               [244, 3, { volMul: 0.8 }], [268, 7, { volMul: 1.2 }], [264, 3, { volMul: 0.8 }], [286, 6, { volMul: 1.2 }]]);
        b.cut();
        b.zig([[282, 3, { volMul: 1.1 }], [304, 6, { volMul: 1.25 }]]);
      },
    },
    {
      id: 'stoch_004', title: 'Crossing, Constantly', category: 'stochastic', difficulty: 4,
      symbol: 'EUR/USD', timeframe: '1D', answer: NO_TRADE,
      indicators: { showStochastic: true },
      concept: 'False signals in chop',
      explanation: 'Stochastic has crossed its signal line more than twenty times in thirty bars, swinging the full width of the panel while price has gone nowhere. An oscillator measuring position within a range will oscillate hardest when the range is all there is — every one of those crossings was a losing signal.',
      myth: 'A crossover is not a setup. In a sideways market an oscillator manufactures them continuously.',
      learningPoints: ['Oscillators are loudest where they are least useful', 'Count the net progress, not the signals', 'No structure means no trade, whatever the indicator says'],
      hints: [{ k: 'Crossovers', v: 'Over twenty in thirty bars' }, { k: 'Price', v: 'No net progress' }, { k: 'Structure', v: 'Nothing to work from' }],
      insight: 'Stochastic has crossed its signal line more than twenty times while price went nowhere.',
      chart(b) {
        b.vola(0.012).at(1.07).backdrop(190, 1.09, { swings: 9 });
        b.chop(30, { amp: 0.014, volMul: 0.9, mid: 1.09 });
        b.cut();
        b.chop(9, { amp: 0.015, volMul: 0.9, mid: 1.09 });
      },
    },
    {
      id: 'stoch_005', title: 'The High Nobody Backed', category: 'stochastic', difficulty: 3,
      symbol: 'QQQ', timeframe: '1D', answer: DOWN,
      indicators: { showStochastic: true },
      concept: 'Stochastic divergence',
      explanation: 'Price printed a higher high while stochastic peaked well below its previous reading. The oscillator measures where each close sits within its recent range — a lower peak means the new high was made with the close much further from the top of the day. The buying that drove the first leg was not there for the second.',
      learningPoints: ['Price higher high, oscillator lower high', 'Closes are finishing further from the highs', 'Divergence warns; the rejection confirms'],
      hints: [{ k: 'Price', v: 'Higher high' }, { k: 'Stochastic', v: 'Clearly lower peak' }, { k: 'Closes', v: 'Weaker within each range' }],
      insight: 'The first peak took stochastic near 95; the second barely reached 70.',
      chart(b) {
        b.vola(0.012).at(480).backdrop(190, 512, { swings: 7 });
        b.to(604, 10, { volMul: 1.4, curve: 'accel', noise: 0.2 });
        b.to(566, 6, { volMul: 1.0 });
        b.to(612, 16, { volMul: 0.8, noise: 0.75 });
        b.pattern('shootingStar', { volMul: 0.9 });
        b.to(596, 3, { volMul: 1.0 });
        b.cut();
        b.zig([[566, 4, { volMul: 1.3 }], [540, 6, { volMul: 1.3 }]]);
      },
    },

    /* ---------------- ATR / VOLATILITY ---------------- */
    {
      id: 'atr_001', title: 'The Quietest It Has Been', category: 'atr', difficulty: 3,
      symbol: 'AMD', timeframe: '1D', answer: UP,
      indicators: { showATR: true, volume: true },
      concept: 'Volatility contraction',
      explanation: 'ATR has fallen to the lowest reading on the chart — the daily range has roughly halved while price coiled into a narrow zone. Volatility mean-reverts: quiet periods do not stay quiet. The breakout candle arrived with range and volume together, which is contraction resolving into expansion.',
      learningPoints: ['ATR measures range, not direction', 'Contracting volatility precedes expansion', 'The breakout supplies the direction ATR cannot'],
      hints: [{ k: 'ATR', v: 'Lowest on the chart' }, { k: 'Range', v: 'Roughly halved' }, { k: 'Break', v: 'Wide candle on heavy volume' }],
      insight: 'ATR has fallen by more than half from its level six weeks ago.',
      chart(b) {
        b.vola(0.02).at(120).backdrop(190, 142, { swings: 8 });
        b.chop(10, { amp: 0.028, volMul: 1.2, mid: 142 });
        b.vola(0.007);
        b.taper(24, { from: 0.012, to: 0.003, volMul: 0.6, volEnd: 0.35, mid: 144 });
        b.vola(0.018);
        b.to(158, 3, { volMul: 2.6, curve: 'accel' });
        b.resistance(148, 'Coil top');
        b.cut();
        b.zig([[166, 4, { volMul: 1.5 }], [178, 6, { volMul: 1.35 }]]);
      },
    },
    {
      id: 'atr_002', title: 'Range Expanding on the Break', category: 'atr', difficulty: 2,
      symbol: 'BTC/USD', timeframe: '1D', answer: DOWN,
      indicators: { showATR: true },
      concept: 'Volatility expansion',
      explanation: 'The daily range has more than tripled as price lost the floor of its range. Expanding ATR on a break says the move is being made by participants who need to transact, not by drift — the kind of break that tends to keep going rather than fade.',
      learningPoints: ['Expanding range confirms a break', 'Quiet breaks are more likely to fail', 'ATR confirms the move, it does not choose it'],
      hints: [{ k: 'ATR', v: 'More than tripled' }, { k: 'Level', v: 'Range floor just lost' }, { k: 'Candles', v: 'Much wider than before' }],
      insight: 'The last few bars are far wider than anything in the preceding month.',
      chart(b) {
        b.vola(0.008).at(82000).backdrop(190, 88000, { swings: 7 });
        b.range(26, 86000, 94000, { touches: 4, volMul: 0.8 });
        b.vola(0.026);
        b.to(80000, 4, { volMul: 2.2, curve: 'accel' });
        b.support(86000, 'Range floor');
        b.cut();
        b.zig([[74000, 4, { volMul: 1.5 }], [67000, 6, { volMul: 1.4 }]]);
      },
    },
    {
      id: 'atr_003', title: 'Busy, Going Nowhere', category: 'atr', difficulty: 3,
      symbol: 'ETH/USD', timeframe: '4H', answer: NO_TRADE,
      indicators: { showATR: true },
      concept: 'Volatility without direction',
      explanation: 'ATR is near the top of its range — this market is moving violently. It is also exactly where it was three weeks ago. High volatility means wide stops and fast losses, not opportunity; without structure to lean on, the only thing a raised ATR guarantees here is a bigger loss when you are wrong.',
      myth: 'High volatility is not a signal. It raises the cost of being wrong without improving the odds.',
      learningPoints: ['ATR says how far, never which way', 'Wide ranges force wider stops', 'Volatility without structure is risk, not opportunity'],
      hints: [{ k: 'ATR', v: 'Near the top of its range' }, { k: 'Net move', v: 'Flat over three weeks' }, { k: 'Structure', v: 'No levels holding' }],
      insight: 'The daily range has nearly doubled while price finished where it started.',
      chart(b) {
        b.vola(0.01).at(2900).backdrop(190, 3050, { swings: 8 });
        b.vola(0.03);
        b.chop(28, { amp: 0.045, volMul: 1.3, mid: 3050 });
        b.cut();
        b.chop(9, { amp: 0.045, volMul: 1.3, mid: 3050 });
      },
    },
    {
      id: 'atr_004', title: 'Four Times a Normal Day', category: 'atr', difficulty: 4,
      symbol: 'XAU/USD', timeframe: '1D', answer: NO_TRADE,
      indicators: { showATR: true, volume: true },
      concept: 'Move stretched against ATR',
      explanation: 'One candle covered more than three times the average daily range. Chasing it means buying after the move that ATR says should have taken four sessions, with a sensible stop now far below. Fading it means standing in front of whatever caused it. Being right about direction would not save a position entered here.',
      learningPoints: ['Measure a move against normal range before acting', 'A stretched move makes entries expensive, not wrong', 'ATR is a risk tool first'],
      hints: [{ k: 'Candle', v: 'Over 3× the average range' }, { k: 'Volume', v: 'Far above normal on that bar' }, { k: 'Stop', v: 'Would sit a long way below' }],
      insight: 'That single bar covered what ATR says is around three sessions of movement.',
      chart(b) {
        b.vola(0.007).at(2380).backdrop(190, 2460, { swings: 7 });
        b.range(22, 2440, 2500, { touches: 4, volMul: 0.85 });
        b.vola(0.03);
        b.pattern('marubozuUp', { volMul: 2.4, body: 0.055 });
        b.vola(0.012);
        b.to(2618, 2, { volMul: 1.3 });
        b.resistance(2500, 'Old range top');
        b.cut();
        b.to(2650, 3, { volMul: 1.1 });
        b.to(2572, 4, { volMul: 1.2 });
        b.to(2612, 3, { volMul: 1.0 });
      },
    },
  ];

  /* =========================================================
     Materialisation

     A definition becomes a playable scenario here. This is the seam
     where constructed data could be swapped for real market history
     ({symbol, timeframe, start, cutoff, end}) without the game engine
     noticing (spec §42).
     ========================================================= */

  const VIEW_BARS = 62;   // candles the player gets to study
  const FUTURE_SLOTS = 13; // reserved chart space, constant so it leaks nothing

  const cache = new Map();

  function build(def) {
    if (cache.has(def.id)) return cache.get(def.id);

    const b = NM.Series.create(def.id, { vol: 0.013, baseVol: 100 });
    def.chart(b);
    if (b.cutIndex == null) b.cut();
    /* Scale into the symbol's price range before indicators are computed. */
    applyScale(b, def.symbol, def.id);

    const bars = b.bars;
    const cutIndex = b.cutIndex;
    const ind = NM.Indicators.computeAll(bars);
    const viewFrom = Math.max(0, cutIndex - VIEW_BARS);
    const move = NM.Series.outcomeMove(bars, cutIndex);
    const cat = CATEGORIES[def.category];

    const scn = {
      ...def,
      categoryLabel: cat.label,
      categoryColor: cat.color,
      skill: cat.skill,
      /* A correct NO TRADE is always also a discipline rep. */
      skills: def.answer === NO_TRADE && cat.skill !== 'discipline'
        ? [cat.skill, 'discipline']
        : [cat.skill],
      difficultyLabel: DIFFICULTY[def.difficulty].label,
      baseScore: 100,
      timeLimit: DIFFICULTY[def.difficulty].time,

      bars,
      cutIndex,
      viewFrom,
      futureCount: bars.length - cutIndex,
      futureSlots: FUTURE_SLOTS,
      /* Pattern metadata, for the feedback card and the verifier. */
      patternLabel: def.patternType ? PATTERNS[def.patternType] : null,
      confirmation: def.confirmationState ? CONFIRMATION[def.confirmationState] : null,

      /* The analysis tools this lesson needs — the chart renders exactly
         these and nothing else. */
      indicators: def.indicators || {},
      ind,
      draw: b.draw,
      readout: NM.Indicators.readout(bars, cutIndex, ind),
      outcomeMove: move,
      outcomeLabel: (move >= 0 ? '+' : '−') + Math.abs(move * 100).toFixed(1) + '%',
    };

    cache.set(def.id, scn);
    return scn;
  }

  const byId = (id) => {
    const d = DEFS.find((x) => x.id === id);
    return d ? build(d) : null;
  };

  /* ---------- selection ---------- */

  const defsByCategory = (c) => (c === 'mixed' ? DEFS.slice() : DEFS.filter((d) => d.category === c));
  const defsByDifficulty = (d) => DEFS.filter((x) => x.difficulty === d);

  /**
   * Survival difficulty ramp. The increase comes mostly from harder
   * analysis, not from a shorter clock (spec §14).
   */
  function survivalDifficulty(index) {
    if (index < 3) return [1];
    if (index < 6) return [1, 2];
    if (index < 10) return [2];
    if (index < 14) return [2, 3];
    if (index < 20) return [3];
    return [3, 4];
  }

  /**
   * Pick the next scenario, avoiding repeats until the relevant pool
   * is exhausted.
   */
  function pick(rng, { difficulties, categories, exclude = [] }) {
    let pool = DEFS.filter((d) => {
      if (difficulties && !difficulties.includes(d.difficulty)) return false;
      if (categories && !categories.includes(d.category)) return false;
      return true;
    });
    if (!pool.length) pool = DEFS.slice();

    const fresh = pool.filter((d) => !exclude.includes(d.id));
    const from = fresh.length ? fresh : pool;
    return build(from[Math.floor(rng.next() * from.length)]);
  }

  NM.Scenarios = {
    UP, DOWN, NO_TRADE,
    SKILLS, CATEGORIES, CHAPTERS, DIFFICULTY, PATTERNS, CONFIRMATION,
    DEFS, VIEW_BARS, FUTURE_SLOTS,
    build, byId, defsByCategory, defsByDifficulty,
    survivalDifficulty, pick,
    count: DEFS.length,
  };
})(window.NM = window.NM || {});
