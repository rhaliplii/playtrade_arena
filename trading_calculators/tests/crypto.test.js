// Crypto profit — worked examples, each checked by hand (arithmetic shown in the comments).
(function () {
  const { describe, test, expect } = T;
  const C = CalcLib.crypto;
  const base = (o) => Object.assign({
    sizeMode: "amount", buys: [{ price: 20000, amount: 1000 }],
    buyFee: 0.1, sellFee: 0.1, otherCosts: 0, exit: 30000, taxRate: 0,
  }, o);

  describe("crypto", () => {
    // Example 1 (the page's worked example) — $1,000 of BTC at $50,000, 0.1% fees each way,
    // sold at $60,000. The amount is before fees; the buy fee goes on top.
    //   coins = 1,000 ÷ 50,000 = 0.02; buy fee = 1,000 × 0.1% = 1.00
    //   sale = 0.02 × 60,000 = 1,200; sell fee = 1.20; proceeds = 1,198.80
    //   gain 200 − fees 2.20 = profit 197.80; return = 197.80 ÷ 1,001 = 19.7602%
    //   break-even = 1,001 ÷ (0.02 × 0.999) = 50,100.1001
    test("example 1: one buy, % fees both sides (worked example)", () => {
      const r = C.calculate(base({ buys: [{ price: 50000, amount: 1000 }], exit: 60000 }));
      expect.ok(r);
      expect.close(r.coins, 0.02, 1e-12);
      expect.close(r.spent, 1001);
      expect.close(r.totalFees, 2.2);
      expect.close(r.proceeds, 1198.8);
      expect.close(r.profit, 197.8);
      expect.close(r.roi, 197.8 / 1001, 1e-9);
      expect.close(r.breakEven, 50100.1001, 1e-4);
    });

    // Example 2 — dollar-cost averaging, no fees: 500 @ 100 = 5 coins, 500 @ 50 = 10 coins.
    //   15 coins for 1,000 → average entry 66.6667; sold at 80 → 1,200; profit 200, ROI 20%
    test("example 2: two buys average the entry", () => {
      const r = C.calculate(base({ buys: [{ price: 100, amount: 500 }, { price: 50, amount: 500 }], buyFee: 0, sellFee: 0, exit: 80 }));
      expect.close(r.coins, 15);
      expect.close(r.avgPrice, 66.666667, 1e-5);
      expect.close(r.profit, 200);
      expect.close(r.roi, 0.2);
      expect.close(r.breakEven, 66.666667, 1e-5);
    });

    // Example 3 — coins mode: 2 coins @ 1,500 with 0.5% fees, 10 other costs, sold at 1,400.
    //   spent = 3,000 × 1.005 = 3,015; proceeds = 2,800 − 14 = 2,786
    //   profit = 2,786 − 3,015 − 10 = −239 (no tax on a loss); ROI = −239 / 3,025 = −7.9008%
    test("example 3: coins mode with other costs and a loss", () => {
      const r = C.calculate({ sizeMode: "coins", buys: [{ price: 1500, coins: 2 }], buyFee: 0.5, sellFee: 0.5,
        otherCosts: 10, exit: 1400, taxRate: 25 });
      expect.close(r.spent, 3015);
      expect.close(r.proceeds, 2786);
      expect.close(r.profit, -239);
      expect.close(r.tax, 0);
      expect.close(r.roi, -0.0790083, 1e-6);
    });

    // Target: example 2 position, +50% of the 1,000 invested = 500 → (1,000 + 500) / 15 = 100
    test("target sell price for +50%", () => {
      const r = C.targetExit(base({ buys: [{ price: 100, amount: 500 }, { price: 50, amount: 500 }], buyFee: 0, sellFee: 0 }), { type: "pct", value: 50 });
      expect.close(r.exit, 100);
    });

    test("a spot position can't lose more than it cost", () => {
      expect.error(C.targetExit(base(), { type: "amount", value: -5000 }), "target");
    });

    test("selling at zero loses everything spent", () => {
      const r = C.calculate(base({ exit: 0, otherCosts: 5 }));   // 1,000 + 1 buy fee + 5 other costs
      expect.close(r.profit, -1006);
      expect.close(r.roi, -1);
    });

    describe("edge cases", () => {
      test("no buys", () => expect.error(C.calculate(base({ buys: [] })), "buys"));
      test("zero buy price", () => expect.error(C.calculate(base({ buys: [{ price: 0, amount: 100 }] })), "buys.0.price"));
      test("empty amount", () => expect.error(C.calculate(base({ buys: [{ price: 10, amount: null }] })), "buys.0.amount"));
      test("negative sell price", () => expect.error(C.calculate(base({ exit: -1 })), "exit"));
      test("100% fee is impossible", () => expect.error(C.calculate(base({ sellFee: 100 })), "sellFee"));
      test("empty sell price", () => expect.error(C.calculate(base({ exit: null })), "exit"));
      test("results never contain NaN or Infinity", () => expect.finiteDeep(C.calculate(base({ exit: 0 }))));
    });

    // Example — short, coins mode: sell 2 coins at 30,000 with 0.1% each side, buy back at 25,000.
    //   sold 60,000 − 60 fee = 59,940; buy-back 50,000 + 50 fee = 50,050; profit 9,890
    //   invested = 60,000 + 60 = 60,060 → ROI 16.4669%; break-even = 59,940 / (2 × 1.001) = 29,940.06
    test("short: coins mode, fees both sides", () => {
      const r = C.calculate({ side: "short", sizeMode: "coins", buys: [{ price: 30000, coins: 2 }], buyFee: 0.1, sellFee: 0.1, exit: 25000 });
      expect.ok(r);
      expect.close(r.profit, 9890);
      expect.close(r.totalFees, 110);
      expect.close(r.roi, 9890 / 60060, 1e-9);
      expect.close(r.breakEven, 29940.05994, 1e-4);
    });

    // Short, amount mode, no fees: 1,000 sold at 100 = 10 coins; buying back at 120 costs 1,200 → −200, −20%
    test("short: a rise is a loss", () => {
      const r = C.calculate({ side: "short", sizeMode: "amount", buys: [{ price: 100, amount: 1000 }], exit: 120 });
      expect.close(r.coins, 10);
      expect.close(r.profit, -200);
      expect.close(r.roi, -0.2);
      expect.close(r.breakEven, 100);
    });

    // Short target: 50% of 1,000 = 500 → buy back at (1,000 − 500) / 10 = 50; 200% is out of reach
    test("short: target buy-back price, and an unreachable target", () => {
      const i = { side: "short", sizeMode: "amount", buys: [{ price: 100, amount: 1000 }] };
      const r = C.targetExit(i, { type: "pct", value: 50 });
      expect.close(r.exit, 50);
      expect.error(C.targetExit(i, { type: "pct", value: 200 }), "target");
    });
  });
})();
