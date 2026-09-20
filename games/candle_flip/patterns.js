// Candle Flip — the candlestick pattern library.
// Ported from the original prototype (candle_flip/CandleFlip-Game/static/js/patterns.js):
// same patterns, same tiers and the same "mix in easier tiers" rule, with the artwork
// recoloured for the Arena's dark theme and a few patterns added so the largest board
// (24 pairs) always has enough distinct cards.
(() => {
  const BULL = "#3be39a";
  const BEAR = "#f63d68";
  const NEUT = "#aab0be";

  // One candle: body rect plus the wick above and below it
  const candle = (x, top, h, color, wickTop, wickBottom, w = 12) => `
    <line x1="${x + w / 2}" y1="${wickTop}" x2="${x + w / 2}" y2="${wickBottom}" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="${x}" y="${top}" width="${w}" height="${h}" rx="1.5" fill="${color}"/>`;
  // A price line, for the chart-shaped patterns
  const line = (points, color = NEUT) =>
    `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  const svg = (inner) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

  const tiers = {
    // ---------- Beginner: single and two-candle patterns ----------
    beginner: [
      { id: 1, name: "Hammer", bias: "bull", meaning: "Bullish reversal: sellers pushed price down, buyers took it all back by the close.",
        svg: svg(candle(44, 22, 18, BULL, 16, 78)) },
      { id: 2, name: "Doji", bias: "neutral", meaning: "Open and close are almost equal — the market cannot decide.",
        svg: svg(`<line x1="50" y1="20" x2="50" y2="80" stroke="${NEUT}" stroke-width="2.4" stroke-linecap="round"/><line x1="30" y1="50" x2="70" y2="50" stroke="${NEUT}" stroke-width="4" stroke-linecap="round"/>`) },
      { id: 3, name: "Bullish Engulfing", bias: "bull", meaning: "A green candle swallows the red one before it — buyers have taken over.",
        svg: svg(candle(28, 42, 16, BEAR, 34, 66, 10) + candle(52, 30, 40, BULL, 24, 78, 18)) },
      { id: 4, name: "Bearish Engulfing", bias: "bear", meaning: "A red candle swallows the green one before it — sellers have taken over.",
        svg: svg(candle(28, 42, 16, BULL, 34, 66, 10) + candle(52, 30, 40, BEAR, 24, 78, 18)) },
      { id: 5, name: "Morning Star", bias: "bull", meaning: "Three candles at the bottom of a downtrend: the turn from selling to buying.",
        svg: svg(candle(18, 26, 30, BEAR, 20, 60) + candle(44, 54, 6, NEUT, 46, 64, 12) + candle(70, 38, 30, BULL, 32, 74)) },
      { id: 6, name: "Evening Star", bias: "bear", meaning: "Three candles at the top of an uptrend: the turn from buying to selling.",
        svg: svg(candle(18, 40, 30, BULL, 34, 76) + candle(44, 30, 6, NEUT, 24, 40, 12) + candle(70, 26, 30, BEAR, 20, 62)) },
      { id: 7, name: "Spinning Top", bias: "neutral", meaning: "A small body between long wicks — indecision on both sides.",
        svg: svg(candle(44, 44, 12, NEUT, 18, 82)) },
      { id: 8, name: "Shooting Star", bias: "bear", meaning: "Bearish reversal: buyers ran price up, sellers slammed it back down.",
        svg: svg(candle(44, 60, 14, BEAR, 18, 80)) },
    ],

    // ---------- Intermediate: three-candle patterns and classic chart shapes ----------
    intermediate: [
      { id: 9, name: "Three White Soldiers", bias: "bull", meaning: "Three strong green candles in a row — a confident bullish run.",
        svg: svg(candle(20, 58, 22, BULL, 52, 84) + candle(44, 46, 26, BULL, 40, 76) + candle(68, 34, 30, BULL, 28, 68)) },
      { id: 10, name: "Three Black Crows", bias: "bear", meaning: "Three strong red candles in a row — a confident bearish run.",
        svg: svg(candle(20, 18, 22, BEAR, 12, 44) + candle(44, 28, 26, BEAR, 22, 58) + candle(68, 40, 30, BEAR, 34, 76)) },
      { id: 11, name: "Double Top", bias: "bear", meaning: "Two failed attempts at the same high — resistance holds and price falls.",
        svg: svg(line("10,64 30,24 50,52 70,24 90,64", BEAR)) },
      { id: 12, name: "Double Bottom", bias: "bull", meaning: "Two failed attempts at the same low — support holds and price rises.",
        svg: svg(line("10,36 30,76 50,48 70,76 90,36", BULL)) },
      { id: 13, name: "Head and Shoulders", bias: "bear", meaning: "Three peaks with the highest in the middle — a classic top.",
        svg: svg(line("8,68 22,44 34,56 50,22 66,56 78,44 92,68", BEAR)) },
      { id: 14, name: "Inverse Head and Shoulders", bias: "bull", meaning: "Three troughs with the lowest in the middle — a classic bottom.",
        svg: svg(line("8,32 22,56 34,44 50,78 66,44 78,56 92,32", BULL)) },
      { id: 15, name: "Cup and Handle", bias: "bull", meaning: "A rounded base, a small dip, then the breakout higher.",
        svg: svg(`<path d="M12,28 C28,84 66,84 80,30 C74,44 70,44 88,52" fill="none" stroke="${BULL}" stroke-width="3" stroke-linecap="round"/>`) },
      { id: 16, name: "Bullish Harami", bias: "bull", meaning: "A small green candle inside a big red one — selling is running out.",
        svg: svg(candle(26, 24, 48, BEAR, 18, 80, 18) + candle(58, 44, 14, BULL, 38, 62, 12)) },
      { id: 17, name: "Bearish Harami", bias: "bear", meaning: "A small red candle inside a big green one — buying is running out.",
        svg: svg(candle(26, 24, 48, BULL, 18, 80, 18) + candle(58, 44, 14, BEAR, 38, 62, 12)) },
      { id: 18, name: "Piercing Line", bias: "bull", meaning: "A green candle closing above the midpoint of the red one before it.",
        svg: svg(candle(28, 24, 34, BEAR, 18, 64) + candle(58, 36, 34, BULL, 30, 78) + `<line x1="22" y1="41" x2="78" y2="41" stroke="${NEUT}" stroke-width="1.6" stroke-dasharray="4 4"/>`) },
    ],

    // ---------- Advanced: continuation shapes and the trickier reversals ----------
    advanced: [
      { id: 19, name: "Symmetrical Triangle", bias: "neutral", meaning: "Lower highs meet higher lows — a breakout is coming, direction unknown.",
        svg: svg(line("10,16 90,46") + line("10,84 90,54")) },
      { id: 20, name: "Ascending Triangle", bias: "bull", meaning: "Higher lows pressing against flat resistance — usually breaks upward.",
        svg: svg(`<line x1="10" y1="26" x2="90" y2="26" stroke="${NEUT}" stroke-width="3" stroke-linecap="round"/>` + line("10,82 90,28", BULL)) },
      { id: 21, name: "Descending Triangle", bias: "bear", meaning: "Lower highs pressing on flat support — usually breaks downward.",
        svg: svg(`<line x1="10" y1="74" x2="90" y2="74" stroke="${NEUT}" stroke-width="3" stroke-linecap="round"/>` + line("10,18 90,72", BEAR)) },
      { id: 22, name: "Bull Flag", bias: "bull", meaning: "A sharp rally, a quiet drift sideways, then the move continues.",
        svg: svg(line("16,84 16,22", BULL) + `<polyline points="16,30 84,42 84,62 16,72" fill="none" stroke="${NEUT}" stroke-width="2.6" stroke-linejoin="round"/>`) },
      { id: 23, name: "Pennant", bias: "neutral", meaning: "A sharp move, then a tight triangle before the trend resumes.",
        svg: svg(line("16,84 16,22", NEUT) + `<polyline points="16,28 76,50 16,72" fill="none" stroke="${NEUT}" stroke-width="2.6" stroke-linejoin="round"/>`) },
      { id: 24, name: "Dark Cloud Cover", bias: "bear", meaning: "A red candle closing below the midpoint of the green one before it.",
        svg: svg(candle(28, 36, 34, BULL, 30, 78) + candle(58, 24, 34, BEAR, 18, 64) + `<line x1="22" y1="53" x2="78" y2="53" stroke="${NEUT}" stroke-width="1.6" stroke-dasharray="4 4"/>`) },
      { id: 25, name: "Hanging Man", bias: "bear", meaning: "A hammer shape after a rally — the first crack in the uptrend.",
        svg: svg(candle(44, 22, 18, BEAR, 16, 78)) },
      { id: 26, name: "Inverted Hammer", bias: "bull", meaning: "A shooting-star shape after a sell-off — buyers are testing higher.",
        svg: svg(candle(44, 60, 14, BULL, 18, 80)) },
      { id: 27, name: "Rising Wedge", bias: "bear", meaning: "Rising but narrowing — momentum fades and price breaks down.",
        svg: svg(line("10,72 90,20", BEAR) + line("10,88 90,32")) },
      { id: 28, name: "Falling Wedge", bias: "bull", meaning: "Falling but narrowing — selling fades and price breaks up.",
        svg: svg(line("10,28 90,80", BULL) + line("10,12 90,68")) },
    ],
  };

  const ORDER = ["beginner", "intermediate", "advanced"];
  const all = () => ORDER.flatMap((t) => tiers[t]);
  const byId = (id) => all().find((p) => p.id === id) || null;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // The prototype's rule: a board draws from its own tier first, then fills up from the
  // easier tiers, so a harder board still contains patterns the player already knows.
  const pick = (level, pairs) => {
    const from = ORDER.indexOf(level);
    const pool = ORDER.slice(0, from + 1).reverse().flatMap((t) => shuffle([...tiers[t]]));
    return pool.slice(0, pairs);
  };

  window.CandleFlipPatterns = { tiers, ORDER, all, byId, pick };
})();
