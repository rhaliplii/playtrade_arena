// Options profit at expiry — worked examples, each checked by hand.
(function () {
  const { describe, test, expect } = T;
  const O = CalcLib.options;
  const call = (side, strike, premium, qty = 1) => ({ type: "call", side, strike, premium, qty });
  const put = (side, strike, premium, qty = 1) => ({ type: "put", side, strike, premium, qty });
  const calc = (legs, o) => O.calculate(Object.assign({ legs, multiplier: 100, feePerContract: 0 }, o));

  describe("options", () => {
    // Example 1 — long 100 call for 5: at 120 → (20 − 5) × 100 = 1,500
    //   max loss = the 500 premium; max profit unlimited; break-even 100 + 5 = 105
    test("example 1: long call", () => {
      const r = calc([call("long", 100, 5)], { expiryPrice: 120 });
      expect.ok(r);
      expect.close(r.atExpiry.profit, 1500);
      expect.close(r.maxLoss, -500);
      expect.equal(r.maxProfitUnlimited, true);
      expect.equal(r.breakEvens.length, 1);
      expect.close(r.breakEvens[0], 105);
      expect.close(r.netPremium, 500);
    });

    // Example 2 — bull call spread: buy 100C @ 5, sell 110C @ 2 → debit 3 × 100 = 300
    //   max profit = (10 − 3) × 100 = 700; max loss = 300; break-even = 103
    test("example 2: bull call spread", () => {
      const r = calc([call("long", 100, 5), call("short", 110, 2)], { expiryPrice: 120 });
      expect.close(r.netPremium, 300);
      expect.close(r.maxProfit, 700);
      expect.close(r.maxLoss, -300);
      expect.close(r.breakEvens[0], 103);
      expect.close(r.atExpiry.profit, 700);
    });

    // Example 3 — iron condor 85/90/110/115: credit (1.5 + 1.5 − 0.5 − 0.5) = 2 → 200
    //   max profit 200 between 90 and 110; max loss = (5 − 2) × 100 = 300
    //   break-evens 90 − 2 = 88 and 110 + 2 = 112
    test("example 3: iron condor", () => {
      const r = calc([put("long", 85, 0.5), put("short", 90, 1.5), call("short", 110, 1.5), call("long", 115, 0.5)]);
      expect.close(r.netPremium, -200);
      expect.close(r.maxProfit, 200);
      expect.close(r.maxLoss, -300);
      expect.equal(r.breakEvens.length, 2);
      expect.close(r.breakEvens[0], 88);
      expect.close(r.breakEvens[1], 112);
    });

    // Example 4 — covered call: 100 shares @ 100, sell 1 × 105 call @ 2
    //   max profit = (105 − 100 + 2) × 100 = 700; at 0: −10,000 + 200 = −9,800; break-even 98
    test("example 4: covered call with a stock leg", () => {
      const r = calc([{ type: "stock", side: "long", price: 100, qty: 100 }, call("short", 105, 2)]);
      expect.close(r.maxProfit, 700);
      expect.close(r.maxLoss, -9800);
      expect.close(r.breakEvens[0], 98);
    });

    test("a naked short call has unlimited loss", () => {
      const r = calc([call("short", 100, 3)]);
      expect.equal(r.maxLossUnlimited, true);
      expect.equal(r.maxLoss, null);
      expect.close(r.maxProfit, 300);
    });

    // Long put: max profit when the stock goes to zero = (100 − 4) × 100 = 9,600; break-even 96
    test("long put max profit is bounded at a zero stock price", () => {
      const r = calc([put("long", 100, 4)]);
      expect.close(r.maxProfit, 9600);
      expect.close(r.breakEvens[0], 96);
    });

    // Fees: 0.65 per contract on example 1 → max loss 500.65, break-even 105.0065
    test("per-contract fees move the break-even", () => {
      const r = calc([call("long", 100, 5)], { feePerContract: 0.65 });
      expect.close(r.maxLoss, -500.65);
      expect.close(r.breakEvens[0], 105.0065);
    });

    test("long straddle has two break-evens", () => {
      const r = calc([call("long", 100, 3), put("long", 100, 2)]);
      expect.close(r.breakEvens[0], 95);
      expect.close(r.breakEvens[1], 105);
    });

    test("chart samples include every strike exactly", () => {
      const pts = O.curve({ legs: [call("long", 100, 5), call("short", 110, 2)], multiplier: 100 }, 50, 150, 10);
      expect.equal(pts.some((p) => p.price === 110), true);
    });

    describe("edge cases", () => {
      test("no legs", () => expect.error(calc([]), "legs"));
      test("zero strike", () => expect.error(calc([call("long", 0, 5)]), "legs.0.strike"));
      test("negative premium", () => expect.error(calc([call("long", 100, -1)]), "legs.0.premium"));
      test("zero contracts", () => expect.error(calc([call("long", 100, 5, 0)]), "legs.0.qty"));
      test("empty premium", () => expect.error(calc([call("long", 100, null)]), "legs.0.premium"));
      test("zero multiplier", () => expect.error(calc([call("long", 100, 5)], { multiplier: 0 }), "multiplier"));
      test("results never contain NaN or Infinity", () => expect.finiteDeep(calc([call("short", 100, 3)])));
    });

    // Black-Scholes, textbook case (Hull): S = K = 100, T = 1, r = 5%, σ = 20%
    //   call = 10.4506, put = 5.5735 (put-call parity: C − P = S − K·e^(−rT) = 4.8771)
    test("value today: Black-Scholes call and put", () => {
      expect.close(O.bs("call", 100, 100, 1, 0.2, 0.05), 10.4506, 1e-3);
      expect.close(O.bs("put", 100, 100, 1, 0.2, 0.05), 5.5735, 1e-3);
    });

    // one long call (strike 100, premium 3.50, ×100) valued today at S = 100, 365 days, 20%, 5%:
    //   (10.4506 − 3.50) × 100 = 695.06; with 0 days left it is the expiry P/L (−350)
    test("value today: P/L of a position, and expiry as the limit", () => {
      const i = { legs: [{ type: "call", side: "long", strike: 100, premium: 3.5, qty: 1 }], multiplier: 100 };
      expect.close(O.todayAt(i, 100, 365, 20, 5), 695.06, 0.1);
      expect.close(O.todayAt(i, 100, 0, 20, 5), -350);
    });

    // Every number in the article's worked examples (one per strategy), against the calculator.
    // The examples and their stated figures come from _src/options_examples.py.
    OPTION_EXAMPLES.forEach((ex) => {
      test(`worked example: ${ex.name}`, () => {
        const i = { legs: ex.legs, multiplier: 100, expiryPrice: ex.at };
        const r = O.calculate(i);
        expect.ok(r);
        expect.close(r.netPremium, ex.net, 1e-6);
        if (ex.maxLoss === null) expect.ok({ ok: r.maxLossUnlimited }); else expect.close(Math.abs(r.maxLoss), ex.maxLoss, 1e-6);
        if (ex.maxProfit === null) expect.ok({ ok: r.maxProfitUnlimited }); else expect.close(r.maxProfit, ex.maxProfit, 1e-6);
        expect.ok({ ok: r.breakEvens.length === ex.breakEvens.length, errors: [{ message: `break-evens ${r.breakEvens} vs ${ex.breakEvens}` }] });
        r.breakEvens.forEach((b, n) => expect.close(b, ex.breakEvens[n], 1e-6));
        expect.close(O.profitAt(i, ex.at), ex.plAt, 1e-6);
      });
    });
  });
})();
