// Position size — worked examples, each checked by hand (arithmetic shown in the comments).
(function () {
  const { describe, test, expect } = T;
  const P = CalcLib.position;
  const base = (o) => Object.assign({
    side: "long", account: 10000, riskMode: "pct", riskPct: 1, entry: 50,
    stopMode: "price", stop: 48, fees: 0, slippage: 0, leverage: 1, step: 1, target: null,
  }, o);

  describe("position size", () => {
    // Example 1 — risk 1% of 10,000 = 100; stop distance 50 − 48 = 2 → 100 / 2 = 50 shares
    //   position value 2,500 (25% of the account); 1R/2R/3R targets at 52 / 54 / 56
    test("example 1: long, whole shares", () => {
      const r = P.calculate(base());
      expect.ok(r);
      expect.close(r.units, 50);
      expect.close(r.positionValue, 2500);
      expect.close(r.pctOfAccount, 0.25);
      expect.close(r.risk, 100);
      expect.close(r.rTargets[0].price, 52);
      expect.close(r.rTargets[2].price, 56);
    });

    // Example 2 — short: risk 2% of 25,000 = 500; stop 21 above entry 20; slippage 0.05; fees 10
    //   per-share risk = 1 + 0.05 = 1.05; (500 − 10) / 1.05 = 466.67 → 466 shares
    //   real risk = 466 × 1.05 + 10 = 499.30
    test("example 2: short with fees and slippage", () => {
      const r = P.calculate(base({ side: "short", account: 25000, riskPct: 2, entry: 20, stop: 21, fees: 10, slippage: 0.05 }));
      expect.ok(r);
      expect.close(r.units, 466);
      expect.close(r.risk, 499.3);
      expect.close(r.rTargets[0].price, 19);
    });

    // Example 3 — a tight stop is capped by buying power:
    //   risk 50 / stop distance 0.10 = 500 shares × 100 = 50,000 > 5,000 cash → cap at 50 shares
    test("example 3: capped at account × leverage", () => {
      const r = P.calculate(base({ account: 5000, entry: 100, stop: 99.9 }));
      expect.equal(r.capped, true);
      expect.close(r.units, 50);
      expect.close(r.risk, 5, 1e-6);
      const lev = P.calculate(base({ account: 5000, entry: 100, stop: 99.9, leverage: 4 }));
      expect.close(lev.units, 200);
    });

    // Example 4 — crypto, fixed $20 risk, 2% stop: stop 58,800, distance 1,200
    //   20 / 1,200 = 0.0166667 → rounded down to 0.0001 → 0.0166; real risk = 19.92
    test("example 4: crypto step size and % stop", () => {
      const r = P.calculate(base({ account: 1000, riskMode: "amount", riskAmount: 20, entry: 60000, stopMode: "pct", stopPct: 2, step: 0.0001 }));
      expect.close(r.stop, 58800);
      expect.close(r.units, 0.0166, 1e-10);
      expect.close(r.risk, 19.92);
    });

    // Target 56 on example 1: reward 50 × 6 = 300 vs risk 100 → 3 : 1
    test("reward-to-risk for a target", () => {
      const r = P.calculate(base({ target: 56 }));
      expect.close(r.target.reward, 300);
      expect.close(r.target.rr, 3);
    });

    describe("edge cases", () => {
      test("entry equals stop", () => expect.error(P.calculate(base({ stop: 50 })), "stop"));
      test("long stop above entry", () => expect.error(P.calculate(base({ stop: 52 })), "stop"));
      test("short stop below entry", () => expect.error(P.calculate(base({ side: "short", stop: 48 })), "stop"));
      test("zero risk", () => expect.error(P.calculate(base({ riskPct: 0 })), "riskPct"));
      test("risk above the account", () => expect.error(P.calculate(base({ riskMode: "amount", riskAmount: 20000 })), "riskAmount"));
      test("negative account", () => expect.error(P.calculate(base({ account: -5 })), "account"));
      test("empty entry", () => expect.error(P.calculate(base({ entry: null })), "entry"));
      test("fees eat the whole budget", () => expect.error(P.calculate(base({ fees: 100 })), "fees"));
      test("too small for one whole share", () => expect.error(P.calculate(base({ account: 1000, entry: 100, stop: 80 }))));
      test("leverage below 1", () => expect.error(P.calculate(base({ leverage: 0.5 })), "leverage"));
      test("target on the wrong side", () => expect.error(P.calculate(base({ target: 40 })), "target"));
      test("results never contain NaN or Infinity", () => expect.finiteDeep(P.calculate(base())));
    });
  });
})();
