import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import options_examples  # noqa: E402
from ui import CUR, field, seg, select, tool  # noqa: E402

ID = "options"
ROUTE = "options-profit-calculator"
ROUTE_DIR = ROUTE
SHORT = "Options Profit Calculator"
APP_NAME = "Options Profit Calculator"
BLURB = "P/L at expiry for calls, puts and spreads"
QUESTION = "Trading options?"
HUB_TEXT = "See the payoff, max loss and break-even"

META = {
    "title": "Options Profit Calculator: Calls, Puts & Spreads",
    "description": "Free options profit calculator for calls, puts, spreads and iron condors: profit and loss at expiry, max loss, break-even and a payoff chart.",
}
H1 = "Options Profit Calculator"
INTRO = "Use this free options profit calculator to see the profit and loss of calls, puts and strategies like spreads and iron condors: max profit, max loss, break-even, a payoff chart and an estimate of today's value."

# the Strategy menu: the four single options first, then the multi-leg presets (lib/options.js)
PRESETS = [("long-call", "Long call"), ("long-put", "Long put"), ("short-call", "Short call"), ("short-put", "Short put"),
           ("covered-call", "Covered call"), ("cash-secured-put", "Cash-secured put"), ("protective-put", "Protective put"),
           ("bull-call-spread", "Bull call spread"), ("bear-put-spread", "Bear put spread"), ("long-straddle", "Long straddle"),
           ("long-strangle", "Long strangle"), ("short-straddle", "Short straddle"),
           ("short-strangle", "Short strangle"), ("iron-condor", "Iron condor"), ("custom", "Custom (build legs)")]
SINGLE = "pre=long-call|long-put|short-call|short-put"
MULTI = "pre!=long-call&pre!=long-put&pre!=short-call&pre!=short-put"

TOOL = tool("Calculate options profit", f'''
          {select("pre", "Strategy", PRESETS)}
          <div class="c-rows" data-legs data-show="{MULTI}"></div>
          <div class="fld-row calc-main-row">
            {field("k", f"Strike price ({CUR})", f="legs.0.strike", ph="100", show=SINGLE)}
            {field("pr", f"Premium per share ({CUR})", f="legs.0.premium", ph="0.00", show=SINGLE)}
            {field("n", "Contracts", f="legs.0.qty", ph="1", show=SINGLE)}
            {field("at", f"Stock price at expiry ({CUR})", f="at", ph="110")}
          </div>
          <button type="button" class="c-toggle" data-toggle="mo" aria-controls="more-options" aria-expanded="false">More options</button>
          <div class="c-panel" id="more-options" data-show="mo=1">
            {field("und", f"Stock price today ({CUR})", f="und", ph="100")}
            {field("dte", "Days to expiry", f="days", ph="30")}
            {field("iv", "Implied volatility (%)", f="iv", ph="30")}
            {field("rate", "Interest rate (%)", f="rate", ph="4")}
            {field("mult", "Shares per contract", f="multiplier", ph="100")}
            {field("fee", f"Fee per contract ({CUR})", f="feePerContract", ph="0")}
            <p class="fld__hint c-panel__note" data-show="{MULTI}&pre!=custom">The strategy's strikes are placed around today's stock price, with <b>example premiums</b>. Replace them with the quotes you see.</p>
          </div>''')

ARTICLE_CTA = '<p class="calc-tip"><b>Tip:</b> before expiry an option also has time value. Add the days left and implied volatility under <b>More options</b> to see what the position is worth today, not just at expiry.</p>'   # a tip for everyone (no sign-up prompt, so nothing to hide when signed in)

ARTICLE = '''        <h2>How options profit is calculated</h2>
        <p>At expiration an option is worth only its <strong>intrinsic value</strong>: what you would gain by exercising it. A call is worth how far the stock is above the strike; a put is worth how far it is below. Your profit is that value minus the premium you paid, multiplied by the number of shares the contract covers, which is <strong>100</strong> for US stock options.</p>
        <p class="calc-formula">Long call P/L = (max(Stock − Strike, 0) − Premium) × 100 × Contracts
Long put P/L  = (max(Strike − Stock, 0) − Premium) × 100 × Contracts</p>
        <p>Selling an option flips the sign: you keep the premium and owe the intrinsic value. A multi-leg strategy is just the sum of its legs.</p>
{{CTA}}
{{EXAMPLES}}
        <h2>Break-evens, max profit and max loss</h2>
        <p>At expiry the P/L line is made of straight segments that only bend at strike prices, so the extremes and break-evens can be found exactly rather than estimated. The calculator checks every strike and the direction of the line beyond the highest one. If you are left holding uncovered short calls, the line keeps falling as the stock rises and the max loss is <strong>unlimited</strong>; a long call, or long stock, makes max profit unlimited.</p>
        <h2>Covered calls and protective puts</h2>
        <p>Add a stock leg to model positions that combine shares and options. A covered call (100 shares plus one short call) caps your upside at the strike plus the premium; a protective put (100 shares plus one long put) puts a floor under your loss at the strike minus the premium.</p>
        <h2>Common mistakes</h2>
        <ul>
          <li><strong>Forgetting the ×100.</strong> A $2.00 premium costs $200 per contract.</li>
          <li><strong>Reading the expiry chart as today's value.</strong> Before expiry, options also carry time value, so a position can show a loss on your broker's screen even when it would profit at expiry, and the other way round.</li>
          <li><strong>Assuming you hold to expiry.</strong> American-style options can be exercised early, and short legs can be assigned, especially around dividends.</li>
          <li><strong>Ignoring per-contract fees.</strong> On a four-leg iron condor they are charged on every contract, and again to close.</li>
        </ul>
        <h2>Assumptions</h2>
        <p class="calc-assume"><b>How this calculator works.</b> The main result is the value at expiration, using intrinsic value. The optional “today” view prices each option with Black-Scholes (European exercise, no dividends) from today's stock price, the days left, one implied volatility for every leg and an interest rate. One contract = the shares-per-contract you set (100 by default). Fees are charged once per contract to open; closing, exercise and assignment fees, dividends and early assignment are not modelled. Strategy presets use example premiums, not market prices.</p>'''

ARTICLE = ARTICLE.replace("{{EXAMPLES}}", options_examples.html())

FAQ = [
    ("How do you calculate profit on a call option?",
     "<p>At expiry: (stock price − strike, or zero if negative) minus the premium, times 100 shares per contract. A $100 call bought for $5 is worth (120 − 100 − 5) × 100 = $1,500 profit if the stock ends at $120.</p>"),
    ("What is the break-even for an option?",
     "<p>For a long call, strike plus premium. For a long put, strike minus premium. Spreads and combinations can have one or two break-evens; the calculator finds all of them.</p>"),
    ("Why does the calculator say max loss is unlimited?",
     "<p>Because a short call that isn't covered by stock or a higher long call loses more the higher the stock goes, with no ceiling. Max profit is unlimited for a long call for the same reason.</p>"),
    ("Does it show profit before expiration?",
     "<p>Yes. The main result is the profit or loss at expiration. Under More options, enter today's stock price, the days left and the implied volatility, and the chart adds a dashed “today” curve and Details shows what the position is worth if you closed it now. It uses the Black-Scholes model, so it is an estimate: real option prices also move with demand, dividends and early exercise.</p>"),
    ("What does the 100 multiplier mean?",
     "<p>One US equity option contract covers 100 shares, so quoted premiums are per share and are multiplied by 100. Change “Shares per contract” for mini or adjusted contracts.</p>"),
]
