"""Worked examples for the options profit calculator: one per strategy the calculator offers.

Each example is defined by its legs and one example stock price. Every figure in the text (cost
or credit, max profit, max loss, break-evens, profit or loss at the example price) is computed
here from the legs, and the same figures are written to tests/options-examples.data.js, where
options.test.js checks each one against the calculator (lib/options.js). So the article can't
drift from what the calculator shows.

All examples: the stock is at $100 today, US options (100 shares per contract), one contract
per leg, no fees, values at expiry.
"""
import json
import pathlib

MULT = 100
S0 = 100

# key (matches the calculator's strategy menu), name, intro, legs, example price
# legs: ("call"|"put", "long"|"short", strike, premium) or ("stock", "long", price, None)
EXAMPLES = [
    ("long-call", "Single call", "You think the stock will rise, so you buy one $100 call for $5.00 a share.",
     [("call", "long", 100, 5.00)], 120),
    ("long-put", "Single put", "You think the stock will fall, so you buy one $100 put for $4.00 a share.",
     [("put", "long", 100, 4.00)], 85),
    ("covered-call", "Covered call", "You own 100 shares bought at $100 and sell one $110 call against them for $2.00.",
     [("stock", "long", 100, None), ("call", "short", 110, 2.00)], 115),
    ("cash-secured-put", "Cash-secured put", "You sell one $95 put for $2.00 and keep $9,500 in cash in case you have to buy the shares.",
     [("put", "short", 95, 2.00)], 90),
    ("protective-put", "Protective put", "You own 100 shares bought at $100 and buy one $95 put for $2.00 as insurance.",
     [("stock", "long", 100, None), ("put", "long", 95, 2.00)], 85),
    ("bull-call-spread", "Bull call spread", "You buy the $100 call for $5.00 and sell the $110 call for $2.00.",
     [("call", "long", 100, 5.00), ("call", "short", 110, 2.00)], 106),
    ("bear-put-spread", "Bear put spread", "You buy the $100 put for $5.00 and sell the $90 put for $2.00.",
     [("put", "long", 100, 5.00), ("put", "short", 90, 2.00)], 94),
    ("long-straddle", "Long straddle", "You expect a big move but not its direction, so you buy the $100 call and the $100 put for $5.00 each.",
     [("call", "long", 100, 5.00), ("put", "long", 100, 5.00)], 120),
    ("long-strangle", "Long strangle", "A cheaper bet on a big move: you buy the $105 call and the $95 put for $3.00 each.",
     [("call", "long", 105, 3.00), ("put", "long", 95, 3.00)], 85),
    ("short-straddle", "Short straddle", "You expect the stock to stay put, so you sell the $100 call and the $100 put for $5.00 each.",
     [("call", "short", 100, 5.00), ("put", "short", 100, 5.00)], 105),
    ("short-strangle", "Short strangle", "You expect a quiet market and sell the $105 call and the $95 put for $3.00 each.",
     [("call", "short", 105, 3.00), ("put", "short", 95, 3.00)], 100),
    ("iron-condor", "Iron condor", "You expect the stock to stay in a range. You sell the $95 put and the $105 call for $2.50 each, and buy the $85 put and the $115 call for $1.00 each as protection.",
     [("put", "long", 85, 1.00), ("put", "short", 95, 2.50), ("call", "short", 105, 2.50), ("call", "long", 115, 1.00)], 110),
]


def leg_value(leg, s):
    t, _, k, _ = leg
    return s if t == "stock" else max(s - k, 0) if t == "call" else max(k - s, 0)


def leg_pl(leg, s):
    t, side, k, prem = leg
    d = 1 if side == "long" else -1
    return d * (s - k) * MULT if t == "stock" else d * (leg_value(leg, s) - prem) * MULT


def pl(legs, s):
    return sum(leg_pl(l, s) for l in legs)


def figures(legs, at):
    """Net premium (+ paid, − received), max profit / loss (None = unlimited), break-evens, P/L at `at`."""
    net = sum((1 if side == "long" else -1) * prem * MULT for t, side, k, prem in legs if t != "stock")
    kinks = sorted({k for t, _, k, _ in legs if t != "stock"} | {0})
    slope = sum((1 if side == "long" else -1) * (MULT if t in ("call", "stock") else 0) for t, side, *_ in legs)
    vals = [pl(legs, s) for s in kinks]
    max_profit = None if slope > 0 else max(vals)
    max_loss = None if slope < 0 else -min(vals)
    bes = []
    pts = kinks + [kinks[-1] + 1000]
    for a, b in zip(pts, pts[1:]):
        pa, pb = pl(legs, a), pl(legs, b)
        if pa == 0 and a not in bes and (not bes or abs(bes[-1] - a) > 1e-9):
            bes.append(a)
        elif pa * pb < 0:
            bes.append(round(a + (b - a) * (-pa) / (pb - pa), 6))
    return {"net": net, "maxProfit": max_profit, "maxLoss": max_loss, "breakEvens": bes, "at": at, "plAt": pl(legs, at)}


def usd(v, dp=None):
    v = round(v, 2)
    if dp is None:
        dp = 0 if v == int(v) else 2
    return f"${abs(v):,.{dp}f}"


def name(leg):
    t, side, k, _ = leg
    return "the 100 shares" if t == "stock" else f"the ${k:g} {t}"


def steps(key, legs, f):
    out = []
    net = f["net"]
    opts = [l for l in legs if l[0] != "stock"]
    if len(opts) == 1:
        word = "Cost" if net > 0 else "Credit"
        out.append(f"{word}: {abs(net) / MULT:.2f} a share × 100 = <strong>{usd(abs(net))}</strong> {'paid' if net > 0 else 'received'}"
                   + (f", on top of {usd(sum(k for t, _, k, _ in legs if t == 'stock') * MULT)} for the shares." if len(legs) > 1 else "."))
        return out + rest(legs, f)
    return out + multi_cost(legs, f) + rest(legs, f)


def multi_cost(legs, f):
    out = []
    net = f["net"]
    if net > 0:
        out.append(f"Cost: {' + '.join(f'{p:.2f}' for t, s, k, p in legs if t != 'stock' and s == 'long')}"
                   + (f" − {' − '.join(f'{p:.2f}' for t, s, k, p in legs if t != 'stock' and s == 'short')}" if any(t != 'stock' and s == 'short' for t, s, *_ in legs) else "")
                   + f" = {net / MULT:.2f} a share, × 100 = <strong>{usd(net)}</strong> paid.")
    else:
        out.append(f"Credit: {' + '.join(f'{p:.2f}' for t, s, k, p in legs if t != 'stock' and s == 'short')}"
                   + (f" − {' − '.join(f'{p:.2f}' for t, s, k, p in legs if t != 'stock' and s == 'long')}" if any(t != 'stock' and s == 'long' for t, s, *_ in legs) else "")
                   + f" = {-net / MULT:.2f} a share, × 100 = <strong>{usd(-net)}</strong> received.")
    return out


def rest(legs, f):
    out = []
    ml = "unlimited, because the stock can keep rising" if f["maxLoss"] is None else f"<strong>{usd(f['maxLoss'])}</strong>"
    mp = "unlimited" if f["maxProfit"] is None else f"<strong>{usd(f['maxProfit'])}</strong>"
    out.append(f"Max loss {ml}; max profit {mp}.")
    be = " and ".join(f"<strong>{usd(b, 2)}</strong>" for b in f["breakEvens"])
    out.append(f"Break-even{'s' if len(f['breakEvens']) > 1 else ''} at expiry: {be}.")
    s = f["at"]
    terms = []
    for leg in legs:
        t, side, k, prem = leg
        if t == "stock":
            terms.append(f"({s:g} − {k:g}) × 100" if side == "long" else f"({k:g} − {s:g}) × 100")
        else:
            v = leg_value(leg, s)
            terms.append(f"({v:.2f} − {prem:.2f}) × 100" if side == "long" else f"({prem:.2f} − {v:.2f}) × 100")
    def state(l):
        if l[0] == "stock":
            return f"{name(l)} are worth {usd(s)} each"
        v = leg_value(l, s)
        return f"{name(l)} is worth {usd(v, 2)} a share" if v > 0 else f"{name(l)} expires worthless"
    worth = "; ".join(state(l) for l in legs)
    word = "profit" if f["plAt"] >= 0 else "loss"
    out.append(f"At {usd(s)} at expiry, {worth}. P/L = {' + '.join(terms)} = <strong>{usd(f['plAt'])} {word}</strong>.")
    return out


def all_examples():
    return [dict(key=k, name=n, intro=i, legs=legs, f=figures(legs, at)) for k, n, i, legs, at in EXAMPLES]


def body(ex):
    items = "".join(f"<li>{s}</li>" for s in steps(ex["key"], ex["legs"], ex["f"]))
    return f'<p>{ex["intro"]}</p><ol>{items}</ol>'


def html():
    """The worked examples as tabs (the platform .tabs component): one tab per strategy, the
    first open. options.js switches the tab to match the strategy chosen in the calculator.
    Every panel is in the HTML (inactive ones carry `hidden`), so all of them are crawlable."""
    exs = all_examples()
    tabs = "".join(f'<button type="button" class="tab{" is-active" if n == 0 else ""}" role="tab" id="ox-tab-{e["key"]}" aria-controls="ox-{e["key"]}" aria-selected="{"true" if n == 0 else "false"}" tabindex="{0 if n == 0 else -1}" data-ox-tab="{e["key"]}">{e["name"]}</button>'
                   for n, e in enumerate(exs))
    panels = "\n".join(f'''          <div class="ox" role="tabpanel" id="ox-{e["key"]}" aria-labelledby="ox-tab-{e["key"]}" data-ox="{e["key"]}"{"" if n == 0 else " hidden"}>{body(e)}</div>'''
                       for n, e in enumerate(exs))
    return f'''        <h2 id="ox-title">Worked example: <span data-ox-name>{exs[0]["name"].lower()}</span></h2>
        <p class="ox-note">The stock is at $100, one contract (100 shares) per leg, no fees, values at expiry.</p>
        <div class="tabs ox-tabs" role="tablist" aria-label="Strategy">{tabs}</div>
        <div class="ox-panels">
{panels}
        </div>'''


def write_test_data(path):
    data = [{"key": e["key"], "name": e["name"],
             "legs": [({"type": "stock", "side": s, "price": k, "qty": MULT} if t == "stock"
                       else {"type": t, "side": s, "strike": k, "premium": p, "qty": 1}) for t, s, k, p in e["legs"]],
             **e["f"]} for e in all_examples()]
    pathlib.Path(path).write_text("// Generated by _src/build.py from _src/options_examples.py. Do not edit.\n"
                                  "var OPTION_EXAMPLES = " + json.dumps(data, indent=1) + ";\n")
