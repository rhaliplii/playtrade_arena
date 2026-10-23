import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from ui import CUR, field, seg, ticker_field, select, tool, unit_field  # noqa: E402

ID = "position"
ROUTE = "position-size-calculator"
ROUTE_DIR = ROUTE
SHORT = "Position Size Calculator"
APP_NAME = "Position Size Calculator"
BLURB = "How many shares to buy for the risk you choose"
QUESTION = "About to enter a trade?"
HUB_TEXT = "Find the right position size for your risk"

META = {
    "title": "Position Size Calculator: How Many Shares to Buy",
    "description": "Free position size calculator: how many shares, ETF shares or coins to buy from your account size, risk per trade and stop-loss.",
}
H1 = "Position Size Calculator"
INTRO = "Use this free position size calculator to work out how many shares, ETF shares or coins to buy from your account size, risk per trade and stop-loss. Works for stocks, ETFs, crypto and any other asset, so you never risk more than you planned."

TOOL = tool("Calculate position size", f'''
          <div class="ps-top">
            {seg("side", [("long", "Long"), ("short", "Short")], "Position")}
            <div class="fld ps-asset"><label class="sr-only" for="in-at">Asset type</label><span class="fld__box"><select id="in-at" data-k="at"><option value="stock">Stocks &amp; ETFs</option><option value="crypto">Crypto</option><option value="other">Other</option></select></span></div>
          </div>
          {ticker_field("any")}
          {field("acc", f"Account size ({CUR})", f="account", ph="10,000")}
          {unit_field("rp", "Risk (%)", "riskPct", "1", "rm=pct", ("rm", "amount", f"Use {CUR}"), "")}
          {unit_field("ra", f"Risk ({CUR})", "riskAmount", "100", "rm=amount", ("rm", "pct", "Use %"), "")}
          <div class="ps-chips" data-show="rm=pct" role="group" aria-label="Quick risk">
            <button type="button" class="ps-chip" data-set="rp=0.5">0.5%</button><button type="button" class="ps-chip" data-set="rp=1">1%</button><button type="button" class="ps-chip" data-set="rp=2">2%</button>
          </div>
          {field("en", f"Entry price ({CUR})", f="entry", ph="0.00")}
          {unit_field("st", f"Stop-loss ({CUR})", "stop", "0.00", "sm=price", ("sm", "pct", "Use %"), "")}
          {unit_field("sp", "Stop distance (%)", "stopPct", "2", "sm=pct", ("sm", "price", "Use price"), "")}
          <button type="button" class="c-toggle" data-toggle="mo" aria-controls="more-position" aria-expanded="false">More options</button>
          <div class="c-panel" id="more-position" data-show="mo=1">
            {unit_field("tp", f'Take profit ({CUR}) <span class="fld__opt">optional</span>', "target", "0.00", "tm=price", ("tm", "pct", "Use %"), "")}
            {unit_field("tpp", 'Take profit (%) <span class="fld__opt">optional</span>', "targetPct", "10", "tm=pct", ("tm", "price", "Use price"), "")}
            {select("step", "Round to", [("1", "Whole numbers"), ("0.01", "0.01"), ("0.0001", "0.0001"), ("0.00000001", "0.00000001 (8 decimals)"), ("0", "Any fraction")])}
            {field("fee", f"Fees, round trip ({CUR})", f="fees", ph="0")}
            {field("slip", f"Slippage per share ({CUR})", f="slippage", ph="0")}
            {field("lev", "Max leverage (×)", f="leverage", ph="1")}
          </div>''')

ARTICLE_CTA = '<p class="calc-tip"><b>Tip:</b> set your stop where the trade idea stops making sense, then let the calculator size the position. Moving the stop closer just to buy more shares defeats the point.</p>'   # a tip for everyone (no sign-up prompt, so nothing to hide when signed in)

ARTICLE = '''        <h2>How position sizing works</h2>
        <p>Position sizing starts from the loss, not the gain. You decide how much of your account you are prepared to lose if the trade goes wrong, put your stop where the trade idea stops making sense, and let the distance between the two set the size.</p>
        <p class="calc-formula">Amount at risk = Account × Risk %
Position size (shares or coins) = Amount at risk ÷ |Entry − Stop|</p>
        <p>A wider stop means a smaller position; a tighter stop means a larger one. Either way, a stopped-out trade costs the same amount, which is what keeps one bad trade from doing outsized damage.</p>
{{CTA}}
        <h2>Worked example</h2>
        <p>Your account is <strong>$10,000</strong> and you risk <strong>1%</strong> per trade. You want to buy at <strong>$50</strong> with a stop at <strong>$48</strong>.</p>
        <ol>
          <li>Amount at risk: 10,000 × 1% = <strong>$100</strong>.</li>
          <li>Risk per share: 50 − 48 = <strong>$2</strong>.</li>
          <li>Shares: 100 ÷ 2 = <strong>50 shares</strong>, a $2,500 position (25% of the account).</li>
          <li>If the stop fills at $48, you lose 50 × 2 = <strong>$100</strong>. A move to $54 (2R) would make $200.</li>
        </ol>
        <h2>Shorts, fees and slippage</h2>
        <p>For a short, the stop sits above the entry and the maths is the same. Fees and slippage make the real loss bigger than the price distance alone, so the calculator takes them off the budget first: Shares = (Amount at risk − Fees) ÷ (|Entry − Stop| + Slippage). Then it rounds <strong>down</strong> to whole shares (or your crypto step), so the actual risk never goes over what you set.</p>
        <h2>When the stop is very tight</h2>
        <p>A tight stop can produce a position bigger than your account: $100 of risk on a $0.10 stop at $100 a share is 1,000 shares, or $100,000. The calculator caps the size at account × max leverage (1× for a cash account) and tells you when that happens, along with the smaller risk you are actually taking.</p>
        <h2>Reward-to-risk and R-multiples</h2>
        <p>Traders measure outcomes in <strong>R</strong>, the amount risked. A take profit twice as far from the entry as the stop is a 2R target. Add a take profit to see the ratio, or use the 1R, 2R and 3R levels in the results. They are arithmetic, not predictions: they show what a move would be worth, not whether it will happen.</p>
        <h2>Common mistakes</h2>
        <ul>
          <li><strong>Choosing the size first and the stop second.</strong> Then the stop goes wherever the loss feels bearable, not where the trade idea fails.</li>
          <li><strong>Rounding up.</strong> 466.7 shares should be 466, or you are over your risk.</li>
          <li><strong>Ignoring gaps.</strong> A stop is an instruction, not a guarantee. A stock that opens far below your stop fills at the open.</li>
          <li><strong>Sizing on a balance you don't have.</strong> Use the account value you would actually trade from.</li>
        </ul>
        <h2>Assumptions</h2>
        <p class="calc-assume"><b>How this calculator works.</b> The stop is assumed to fill at the stop price plus the slippage you enter; real fills can be worse after a gap. Fees are one round-trip amount. Units are rounded down to the step you choose. The position is capped at account × max leverage. Margin interest and borrow costs are not included.</p>'''

FAQ = [
    ("How do I calculate position size?",
     "<p>Multiply your account by the % you are willing to risk, then divide by the distance between your entry and your stop. $10,000 × 1% = $100; with a $2 stop distance that is 50 shares.</p>"),
    ("What percentage of my account should I risk per trade?",
     "<p>That is your decision, and this calculator doesn't make it. It shows the arithmetic for whatever figure you choose. Many trading textbooks discuss risking a small, fixed percentage so that a run of losses doesn't empty the account.</p>"),
    ("Does it work for short positions?",
     "<p>Yes. Choose Short and put the stop above your entry. The size, risk and take profit are worked out the same way, mirrored.</p>"),
    ("Can I use it for crypto or fractional shares?",
     "<p>Yes. Pick <b>Crypto</b> (up to 8 decimals) or <b>Other</b> (any fraction) as the asset type, or set the rounding yourself under More options → Round to. The size is rounded down to that step so you stay within your risk.</p>"),
    ("Why is my position smaller than expected?",
     "<p>Three things can make it smaller: fees and slippage use part of the risk budget, the size is rounded down to the “Round to” step (whole shares by default), or the position hits the buying-power cap (account × max leverage). If it is capped, the result says so.</p>"),
]
