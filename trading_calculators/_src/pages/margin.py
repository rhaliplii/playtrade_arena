import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from ui import CUR, field, seg, tool  # noqa: E402

ID = "margin"
ROUTE = "margin-calculator"
ROUTE_DIR = ROUTE
SHORT = "Margin Call Calculator"
APP_NAME = "Margin Call Calculator"
CARD_TITLE = "Margin Calculator"          # the hub card and "More trading calculators" row
BLURB = "Margin call price, buying power and interest"
QUESTION = "Using borrowed money?"
HUB_TEXT = "Check the margin needed and the price of a margin call"

META = {
    "title": "Margin Call Calculator: Call Price & Buying Power",
    "description": "Free margin call calculator for stocks: the price that triggers a margin call, long or short, your buying power, and the cash to cover a call.",
}
H1 = "Margin Call Calculator"
INTRO = "Use this free margin call calculator to find the share price that triggers a margin call on a long or short position, how much you borrow, your buying power, and the cash you would need to cover a call."

TOOL = tool("Calculate margin call price", f'''
          {seg("side", [("long", "Long"), ("short", "Short")], "Position")}
          <div class="fld-row calc-main-row">
            {field("px", f"Share price ({CUR})", f="price", ph="0.00")}
            {field("sh", "Shares", f="shares", ph="100")}
            {field("im", "Initial margin (%)", f="initial", ph="50", hint="What you fund yourself. Reg T minimum: 50%.")}
            {field("mm", "Maintenance margin (%)", f="maint", ph="25", hint="FINRA minimum: 25% long, 30% short.")}
          </div>
          <button type="button" class="c-toggle" data-toggle="mo" aria-controls="more-margin" aria-expanded="false">More options</button>
          <div class="c-panel" id="more-margin" data-show="mo=1">
            {field("wi", f'What-if share price ({CUR}) <span class="fld__opt">optional</span>', f="whatIf", ph="0.00")}
            {field("rate", "Interest or borrow fee (% a year)", f="rate", ph="0")}
            {field("days", "Days held", f="days", ph="0")}
            {field("cash", f"Cash available ({CUR})", f="cash", ph="0")}
          </div>''')

ARTICLE_CTA = '<p class="calc-tip"><b>Tip:</b> many brokers set maintenance margin above the 25% FINRA minimum. Enter your broker\'s own rate, or your margin call price will look further away than it is.</p>'   # a tip for everyone (no sign-up prompt, so nothing to hide when signed in)

ARTICLE = '''        <h2>How margin works</h2>
        <p>Buying on margin means paying for part of a position yourself and borrowing the rest from your broker. Under the US Federal Reserve's <strong>Regulation T</strong>, you must fund at least <strong>50%</strong> of a new purchase: that is the <strong>initial margin</strong>. After that, your equity (the position's value minus the loan) has to stay above the <strong>maintenance margin</strong>. FINRA's minimum is 25% of the position for longs, and many brokers set 30–40%.</p>
        <p class="calc-formula">Loan = Price × Shares × (1 − Initial margin)
Margin call price (long) = Loan ÷ (Shares × (1 − Maintenance margin))</p>
{{CTA}}
        <h2>Worked example: a long position</h2>
        <p>You buy <strong>100 shares at $100</strong> with <strong>50%</strong> initial margin and the broker's maintenance is <strong>25%</strong>.</p>
        <ol>
          <li>The position is $10,000. You put in $5,000 and borrow <strong>$5,000</strong>. That is 2× leverage.</li>
          <li>A margin call comes when equity falls below 25% of the position's value: 5,000 ÷ (100 × 0.75) = <strong>$66.67</strong>.</li>
          <li>That is a <strong>33.3%</strong> fall. At $66.67 the shares are worth $6,667, you still owe $5,000, and your $1,667 equity is exactly 25%.</li>
          <li>At $60 your equity is $1,000 against $1,500 required. You'd cover it by depositing <strong>$500</strong> or selling <strong>34 shares</strong>.</li>
        </ol>
        <h2>Short positions</h2>
        <p>When you short, the sale proceeds stay in your account along with your own margin deposit. Your equity shrinks as the price <em>rises</em>, because buying the shares back costs more. FINRA's minimum maintenance for most shorts is <strong>30%</strong> (more for stocks under $5).</p>
        <p class="calc-formula">Margin call price (short) = (Sale proceeds + Deposit) ÷ (Shares × (1 + Maintenance margin))</p>
        <p>Shorting 100 shares at $100 with a 50% deposit leaves $15,000 in the account. At 30% maintenance, the call comes at 15,000 ÷ 130 = <strong>$115.38</strong>, a 15.4% rise. A short is called after a smaller move than a long, and the loss has no upper limit.</p>
        <h2>Interest and borrow fees</h2>
        <p>Borrowed money costs interest, charged daily. $5,000 at 8% a year for 30 days is 5,000 × 0.08 × 30 ÷ 365 = <strong>$32.88</strong>, which pushes your break-even up by 33 cents a share. Shorts pay a stock-borrow fee instead; for hard-to-borrow stocks it can be very high.</p>
        <h2>Common mistakes</h2>
        <ul>
          <li><strong>Using the FINRA minimum when your broker's is higher.</strong> Check your broker's house requirement; it may be 30–40%, or more for volatile stocks.</li>
          <li><strong>Thinking a call waits for you.</strong> Brokers can sell your shares without notice, and on a fast move they often do.</li>
          <li><strong>Forgetting leverage cuts both ways.</strong> At 2× leverage a 10% fall in the stock is a 20% fall in your equity.</li>
          <li><strong>Ignoring interest.</strong> On a long holding period it can turn a small gain into a loss.</li>
        </ul>
        <h2>Assumptions</h2>
        <p class="calc-assume"><b>How this calculator works.</b> One stock position; no other holdings or cash in the account. Covering a call shows the minimum that restores the maintenance level; some brokers require you to return to the initial margin instead. Interest and borrow fees are simple interest on the starting loan or position value. FINRA's special rules for low-priced shorts ($5 per share minimum) and pattern-day-trader accounts are not modelled. This is a stock margin calculator, not for forex or CFDs.</p>'''

FAQ = [
    ("How do you calculate a margin call price?",
     "<p>For a long: loan ÷ (shares × (1 − maintenance margin)). With a $5,000 loan on 100 shares and 25% maintenance, that is 5,000 ÷ 75 = $66.67. For a short: (sale proceeds + your deposit) ÷ (shares × (1 + maintenance margin)).</p>"),
    ("What is the difference between initial and maintenance margin?",
     "<p>Initial margin is the share of a new position you must fund yourself (50% under Regulation T). Maintenance margin is the minimum equity you must keep as the price moves (at least 25% for longs and 30% for most shorts under FINRA rules; brokers often require more).</p>"),
    ("How much buying power do I have?",
     "<p>Your cash divided by the initial margin rate. At 50%, $10,000 of cash buys up to $20,000 of marginable stock. Enter your cash under “Interest and buying power” to see it.</p>"),
    ("What happens in a margin call?",
     "<p>Your broker asks you to bring equity back above the maintenance level, by depositing cash or reducing the position. If you don't, or if prices move fast, the broker can sell your shares without asking first.</p>"),
    ("Why is a short sale called sooner than a long?",
     "<p>Because FINRA's minimum maintenance for shorts is higher (30% against 25%), and a short's equity shrinks faster as the price rises. In the examples on this page a long is called after a 33% fall, a short after a 15% rise.</p>"),
]
