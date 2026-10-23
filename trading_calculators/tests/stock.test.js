// Stock profit — worked examples, each checked by hand (arithmetic shown in the comments).
(function () {
  const { describe, test, expect } = T;
  const S = CalcLib.stock;
  const base = (o) => Object.assign({
    side: "long", sizeMode: "shares", shares: 100, entry: 50, exit: 60,
    entryFee: { type: "flat", value: 5 }, exitFee: { type: "flat", value: 5 },
    dividends: 0, taxRate: 0, startDate: "", endDate: "",
  }, o);

  describe("stock", () => {
    // Example 1 — long, flat fees.
    //   gross = (60 − 50) × 100 = 1,000; fees = 5 + 5 = 10; profit = 990
    //   cost basis = 50 × 100 + 5 = 5,005; ROI = 990 / 5,005 = 19.7802%
    //   break-even = (5,000 + 5 + 5) / 100 = 50.10
    test("example 1: long, flat fees", () => {
      const r = S.calculate(base());
      expect.ok(r);
      expect.close(r.grossProfit, 1000);
      expect.close(r.totalFees, 10);
      expect.close(r.profit, 990);
      expect.close(r.costBasis, 5005);
      expect.close(r.roi, 0.1978022, 1e-6);
      expect.close(r.breakEven, 50.1);
    });

    // Example 2 — short 200 @ 30, cover @ 25, 0.1% fees each side.
    //   entry fee = 6,000 × 0.1% = 6; exit fee = 5,000 × 0.1% = 5
    //   profit = (30 − 25) × 200 − 6 − 5 = 989; ROI = 989 / 6,006 = 16.4669%
    //   break-even: 6,000 − 200x − 6 − 0.2x = 0 → x = 5,994 / 200.2 = 29.940060
    test("example 2: short, % fees", () => {
      const r = S.calculate(base({ side: "short", shares: 200, entry: 30, exit: 25,
        entryFee: { type: "pct", value: 0.1 }, exitFee: { type: "pct", value: 0.1 } }));
      expect.ok(r);
      expect.close(r.entryFee, 6);
      expect.close(r.exitFee, 5);
      expect.close(r.profit, 989);
      expect.close(r.roi, 0.1646687, 1e-6);
      expect.close(r.breakEven, 29.94006, 1e-5);
    });

    // Example 3 — a losing long with dividends and tax.
    //   10 × (90 − 100) = −100; + 20 dividends = −80; no tax on a loss; ROI = −80 / 1,000 = −8%
    //   break-even = (1,000 − 20) / 10 = 98
    test("example 3: loss with dividends, no tax on a loss", () => {
      const r = S.calculate(base({ shares: 10, entry: 100, exit: 90, dividends: 20, taxRate: 20,
        entryFee: { type: "flat", value: 0 }, exitFee: { type: "flat", value: 0 } }));
      expect.ok(r);
      expect.close(r.profit, -80);
      expect.close(r.tax, 0);
      expect.close(r.roi, -0.08);
      expect.close(r.breakEven, 98);
    });

    // Example 4 — tax on a gain: profit before tax 990, 25% tax = 247.50, after tax 742.50
    test("example 4: tax on a gain", () => {
      const r = S.calculate(base({ taxRate: 25 }));
      expect.close(r.tax, 247.5);
      expect.close(r.profit, 742.5);
    });

    // Example 5 — amount mode: 1,000 at 40 buys 25 shares; selling at 50 grosses 250
    test("example 5: amount mode buys fractional-capable shares, fees on top", () => {
      const r = S.calculate(base({ sizeMode: "amount", amount: 1000, entry: 40, exit: 50,
        entryFee: { type: "flat", value: 0 }, exitFee: { type: "flat", value: 0 } }));
      expect.close(r.shares, 25);
      expect.close(r.profit, 250);
    });

    // Annualised: +21% over exactly two years = 1.21^(1/2) − 1 = 10%
    test("annualised return over two years", () => {
      const r = S.calculate(base({ shares: 100, entry: 100, exit: 121, entryFee: null, exitFee: null,
        startDate: "2023-01-01", endDate: "2024-12-31" }));
      expect.close(r.days, 730);
      expect.close(r.annualised, 0.1, 1e-6);
    });

    test("annualised is −100% when everything is lost", () => {
      const r = S.calculate(base({ exit: 0, entryFee: null, exitFee: null, startDate: "2024-01-01", endDate: "2024-07-01" }));
      expect.close(r.annualised, -1);
    });

    // Reverse mode: $500 after tax, no tax → (5,000 + 5 + 500 + 5) / 100 = 55.10
    //               with 20% tax → need 625 before tax → 56.35
    test("target exit price, before and after tax", () => {
      expect.close(S.targetExit(base(), { type: "amount", value: 500 }).exit, 55.1);
      expect.close(S.targetExit(base({ taxRate: 20 }), { type: "amount", value: 500 }).exit, 56.35);
    });

    // 10% of the 5,005 cost basis = 500.50 → (5,005 + 500.5 + 5) / 100 = 55.105
    test("target as % of cost basis", () => {
      expect.close(S.targetExit(base(), { type: "pct", value: 10 }).exit, 55.105);
    });

    test("a short can't make more than its entry value", () => {
      expect.error(S.targetExit(base({ side: "short", shares: 10, entry: 10 }), { type: "amount", value: 200 }), "target");
    });

    test("scenario table covers −50%…+100% and matches the main formula at 0%", () => {
      const r = S.calculate(base());
      expect.equal(r.scenarios.length, S.SCENARIO_MOVES.length);
      const flat = r.scenarios.find((s) => s.move === 0);
      expect.close(flat.profit, -10);                 // only the fees are lost at an unchanged price
    });

    describe("edge cases", () => {
      test("zero shares", () => expect.error(S.calculate(base({ shares: 0 })), "shares"));
      test("empty entry price", () => expect.error(S.calculate(base({ entry: null })), "entry"));
      test("negative exit price", () => expect.error(S.calculate(base({ exit: -1 })), "exit"));
      test("negative fee", () => expect.error(S.calculate(base({ entryFee: { type: "flat", value: -2 } })), "entryFee"));
      test("100% fee is impossible", () => expect.error(S.calculate(base({ exitFee: { type: "pct", value: 100 } })), "exitFee"));
      test("100% tax is impossible", () => expect.error(S.calculate(base({ taxRate: 100 })), "taxRate"));
      test("sell date before buy date", () => expect.error(S.calculate(base({ startDate: "2024-05-01", endDate: "2024-01-01" })), "endDate"));
      test("exit at zero is a valid total loss", () => {
        const r = S.calculate(base({ exit: 0, entryFee: null, exitFee: null }));
        expect.close(r.profit, -5000);
        expect.close(r.roi, -1);
      });
      test("same-day trade: no annualised figure", () => {
        const r = S.calculate(base({ startDate: "2024-01-01", endDate: "2024-01-01" }));
        expect.equal(r.annualised, null);
      });
      test("results never contain NaN or Infinity", () => expect.finiteDeep(S.calculate(base({ exit: 0 }))));
    });

    // Short with a borrow fee: 100 shares at 150 (15,000), 3% a year for 73 days = 15,000 × 0.03 × 0.2 = 90
    //   gross 2,500 (150 → 125), fees 2, borrow 90 → profit 2,408; break-even (15,000 − 1 − 1 − 90)/100 = 149.08
    test("short with a stock-borrow fee", () => {
      const r = S.calculate({ side: "short", sizeMode: "shares", shares: 100, entry: 150, exit: 125,
        entryFee: { type: "flat", value: 1 }, exitFee: { type: "flat", value: 1 }, borrowRate: 3, borrowDays: 73 });
      expect.close(r.borrowFee, 90);
      expect.close(r.profit, 2408);
      expect.close(r.breakEven, 149.08);
    });
  });
})();
