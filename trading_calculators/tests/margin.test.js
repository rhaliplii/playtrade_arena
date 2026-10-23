// Trading margin — worked examples, each checked by hand.
(function () {
  const { describe, test, expect } = T;
  const M = CalcLib.margin;
  const base = (o) => Object.assign({ side: "long", price: 100, shares: 100, initial: 50, maint: 25, rate: 0, days: 0 }, o);

  describe("margin", () => {
    // Example 1 — long 100 @ 100 at 50% initial: deposit 5,000, loan 5,000, 2× leverage
    //   call price = 5,000 / (100 × (1 − 0.25)) = 66.67, a 33.33% fall
    test("example 1: long margin call price", () => {
      const r = M.calculate(base());
      expect.ok(r);
      expect.close(r.loan, 5000);
      expect.close(r.leverage, 2);
      expect.close(r.callPrice, 66.666667, 1e-5);
      expect.close(r.callMove, -0.333333, 1e-5);
    });

    // Example 2 — short 100 @ 100, 50% initial, 30% maintenance:
    //   account holds 10,000 proceeds + 5,000 deposit = 15,000
    //   call price = 15,000 / (100 × 1.30) = 115.38, a 15.38% rise
    test("example 2: short margin call price", () => {
      const r = M.calculate(base({ side: "short", maint: 30 }));
      expect.close(r.credit, 15000);
      expect.close(r.callPrice, 115.384615, 1e-5);
      expect.close(r.callMove, 0.153846, 1e-5);
    });

    // Example 3 — long, what if it falls to 60: equity 6,000 − 5,000 = 1,000;
    //   required 25% × 6,000 = 1,500 → call; deposit 500, or sell ⌈100 − 1,000 / 15⌉ = 34 shares
    test("example 3: covering a long margin call", () => {
      const r = M.calculate(base({ whatIf: 60 }));
      expect.equal(r.scenario.inCall, true);
      expect.close(r.scenario.equity, 1000);
      expect.close(r.scenario.cover.deposit, 500);
      expect.equal(r.scenario.cover.units, 34);
    });

    // Short at 120: equity 15,000 − 12,000 = 3,000; required 30% × 12,000 = 3,600 → deposit 600,
    //   or buy back ⌈100 − 3,000 / 36⌉ = 17 shares
    test("covering a short margin call", () => {
      const r = M.calculate(base({ side: "short", maint: 30, whatIf: 120 }));
      expect.close(r.scenario.cover.deposit, 600);
      expect.equal(r.scenario.cover.units, 17);
    });

    // Interest: 5,000 loan at 8% for 30 days = 5,000 × 0.08 × 30 / 365 = 32.88
    //   break-even = 100 + 32.88 / 100 = 100.3288
    test("margin interest and break-even", () => {
      const r = M.calculate(base({ rate: 8, days: 30 }));
      expect.close(r.carry, 32.876712, 1e-5);
      expect.close(r.breakEven, 100.328767, 1e-5);
    });

    // Buying power: 10,000 cash at 50% → 20,000 → 200 shares at 100
    test("buying power", () => {
      const r = M.calculate(base({ cash: 10000 }));
      expect.close(r.buyingPower, 20000);
      expect.equal(r.maxShares, 200);
    });

    test("no call above the call price", () => {
      expect.equal(M.calculate(base({ whatIf: 80 })).scenario.inCall, false);
    });

    test("equity wiped out: selling can't fix it", () => {
      const r = M.calculate(base({ whatIf: 40 }));
      expect.equal(r.scenario.cover.units, null);
      expect.close(r.scenario.cover.deposit, 2000);          // 25% × 4,000 − (−1,000)
    });

    describe("edge cases", () => {
      test("100% initial margin: nothing borrowed, no call", () => {
        const r = M.calculate(base({ initial: 100 }));
        expect.equal(r.noCall, true);
        expect.equal(r.callPrice, null);
      });
      test("initial margin above 100%", () => expect.error(M.calculate(base({ initial: 120 })), "initial"));
      test("maintenance at 100%", () => expect.error(M.calculate(base({ maint: 100 })), "maint"));
      test("maintenance ≥ initial", () => expect.error(M.calculate(base({ initial: 25, maint: 30 })), "maint"));
      test("zero shares", () => expect.error(M.calculate(base({ shares: 0 })), "shares"));
      test("negative price", () => expect.error(M.calculate(base({ price: -1 })), "price"));
      test("empty initial margin", () => expect.error(M.calculate(base({ initial: null })), "initial"));
      test("empty maintenance uses the FINRA default", () => {
        expect.close(M.calculate(base({ maint: null })).maintenance, 25);
        expect.close(M.calculate(base({ side: "short", maint: null })).maintenance, 30);
      });
      test("results never contain NaN or Infinity", () => expect.finiteDeep(M.calculate(base({ initial: 100, whatIf: 10 }))));
    });
  });
})();
