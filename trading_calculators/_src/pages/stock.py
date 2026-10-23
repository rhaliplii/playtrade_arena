import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from ui import CUR, ticker_field, field, fee, fees_field, seg, tool, unit_field  # noqa: E402

ID = "stock"
ROUTE = "stock-profit-calculator"
ROUTE_DIR = ROUTE
SHORT = "Stock Profit Calculator"
APP_NAME = "Stock Profit Calculator"
BLURB = "Profit, return and break-even after fees and tax"
QUESTION = "Already traded, or planning an exit?"
HUB_TEXT = "Calculate your profit and loss after fees"

META = {
    "title": "Stock Profit Calculator: Profit, Return & Break-Even",
    "description": "Free stock profit calculator: your profit and return after commissions, your break-even price and the sell price for a target. Long or short.",
}
H1 = "Stock Profit Calculator"
INTRO = "Use this free stock profit calculator to work out your profit and return on a trade after commissions and fees, your break-even price and the sell price you need for a target, for long and short trades."
SIBLING = ""

TOOL = tool("Calculate stock profit", f'''
          {seg("side", [("long", "Long"), ("short", "Short")], "Direction")}
          {ticker_field("stock")}
          <div class="fld-row calc-main-row">
            {unit_field("sh", "Shares", "shares", "100", "sz=shares", ("sz", "amount", f"Use {CUR}"), '<span data-size-hint></span>')}
            {unit_field("amt", f"Amount ({CUR})", "amount", "5,000", "sz=amount", ("sz", "shares", "Use shares"), '<span data-size-hint></span>')}
            {field("en", '<span data-show="side!=short">Buy price</span><span data-show="side=short">Sell price (opened)</span> (' + CUR + ')', ph="0.00", f="entry")}
            {field("ex", '<span data-show="side!=short">Sell price</span><span data-show="side=short">Buy-back price</span> (' + CUR + ')', ph="0.00", f="exit", show="mode=profit")}
            {field("tg", f"Target profit ({CUR})", f="target", ph="1,000", show="mode=target")}
            {fees_field()}
          </div>
          <button type="button" class="c-toggle" data-toggle="mo" aria-controls="more-stock" aria-expanded="false">More options</button>
          <div class="c-panel" id="more-stock" data-show="mo=1">
            {seg("fs", [("total", "One fee"), ("split", "Buy & sell")], "Fees")}
            {seg("tgt", [("amount", "$"), ("pct", "% return")], "Target as", show="mode=target")}
            <div class="fld-row" data-show="fs=split">
              {fee("eft", "ef", "Buy fee", "entryFee")}
              {fee("xft", "xf", "Sell fee", "exitFee")}
            </div>
            {field("div", f"Dividends ({CUR})", ph="0", f="dividends")}
            {field("tax", "Tax on profit (%)", ph="0", f="taxRate")}
            {field("bfr", "Borrow fee (% a year)", f="borrowRate", ph="0", show="side=short")}
            {field("bdy", "Days held", f="borrowDays", ph="0", show="side=short")}
            {field("d1", "Buy date", typ="date", f="startDate")}
            {field("d2", "Sell date", typ="date", f="endDate")}
          </div>''')

ARTICLE_CTA = '<p class="calc-tip"><b>Tip:</b> brokers charge on both the buy and the sell. Enter the total for both trades, or switch to <b>Use %</b> if your broker charges a percentage of each trade.</p>'   # a tip for everyone (no sign-up prompt, so nothing to hide when signed in)

ARTICLE = '''        <h2>How to calculate stock profit</h2>
        <p>Profit on a stock is the difference between what you get when you close the trade and everything it cost you to open and close it. The share price movement is only part of it: commissions, exchange fees, dividends and tax all change the number that ends up in your account.</p>
        <p class="calc-formula">Profit = (Sell price − Buy price) × Shares − Buy fee − Sell fee + Dividends − Tax</p>
        <p>Your <strong>return</strong> (ROI) divides that profit by what you put in: the cost of the shares plus the buy fee. A $500 profit on $5,000 is a 10% return; the same $500 on $50,000 is 1%.</p>
        <p class="calc-formula">Return = Profit ÷ (Buy price × Shares + Buy fee)</p>
{{CTA}}
        <h2>Worked example</h2>
        <p>You buy <strong>100 shares at $50</strong> and sell them at <strong>$60</strong>. Your broker charges <strong>$5 per trade</strong>.</p>
        <ol>
          <li>The price gain is (60 − 50) × 100 = <strong>$1,000</strong>.</li>
          <li>Fees are $5 to buy and $5 to sell: <strong>$10</strong>. Profit = $1,000 − $10 = <strong>$990</strong>.</li>
          <li>You put in 50 × 100 + $5 = <strong>$5,005</strong>, so the return is 990 ÷ 5,005 = <strong>19.78%</strong>.</li>
          <li>Break-even: you need the sale to cover $5,005 plus the $5 sell fee, so (5,005 + 5) ÷ 100 = <strong>$50.10</strong> a share.</li>
        </ol>
        <h2>The break-even price</h2>
        <p>Your break-even is the sell price at which you make exactly nothing after fees. It is always a little above your buy price, because you have to earn back the fee you paid to get in and the one you will pay to get out. With a fee charged as a percentage (say 0.1% each way), the break-even is buy price × (1 + fee) ÷ (1 − fee). Dividends you collect lower it; for a short, dividends you owe raise it.</p>
        <h2>Short selling</h2>
        <p>A short reverses the order: you sell borrowed shares first and buy them back later. You profit when the price falls: (entry − exit) × shares, minus fees. Two things are different from a long: you pay any dividends the stock declares while you are short, and your loss has no ceiling because a price can keep rising. This calculator does not include stock-borrow fees or margin interest; check those with your broker, or use the <a href="../margin-calculator/index.html">margin calculator</a>.</p>
        <h2>Annualised return</h2>
        <p>Add your buy and sell dates and the calculator turns the return into a yearly rate, so a 10% gain over three months and a 10% gain over three years can be compared fairly: (1 + return)<sup>365 ÷ days</sup> − 1. Treat annualised figures for holding periods under a month with care; a 3% move in a week annualises to over 300%.</p>
        <h2>Common mistakes</h2>
        <ul>
          <li><strong>Forgetting one side of the fees.</strong> Most people subtract the commission once. You pay it to buy and to sell.</li>
          <li><strong>Measuring return against the sale.</strong> Return is profit over what you put in, not over what you got back.</li>
          <li><strong>Mixing up percentage gains and losses.</strong> A 50% fall needs a 100% rise to get back to even. The table under the calculator shows this.</li>
          <li><strong>Ignoring tax.</strong> If you pay capital-gains tax, the money you keep is smaller than the headline profit. Enter your rate to see the after-tax figure.</li>
        </ul>
        <h2>Assumptions</h2>
        <p class="calc-assume"><b>How this calculator works.</b> Fees are charged on top of the shares you buy (they are not taken out of the amount invested), either as a flat amount or as a % of that side's trade value. Return is measured against the cost of the shares plus the buy fee. Tax is applied to a profit only, at the single rate you enter; it ignores holding-period rules, allowances and loss carry-forwards. Short results exclude borrow fees and margin interest.</p>'''

FAQ = [
    ("How do I calculate profit on a stock?",
     "<p>Multiply the difference between your sell price and buy price by the number of shares, then subtract the fees you paid to buy and to sell. Add any dividends you received and subtract tax if it applies. For example, 100 shares bought at $50 and sold at $60 with $5 commission each way is (60 − 50) × 100 − 10 = $990.</p>"),
    ("What is a break-even price?",
     "<p>The share price at which you neither make nor lose money once fees are included. It is your buy price plus the fees spread over your shares: with $5 to buy, $5 to sell and 100 shares, the break-even on a $50 purchase is $50.10.</p>"),
    ("Does the calculator include taxes?",
     "<p>Only if you enter a tax rate. It then applies that single rate to a profit (a loss is not taxed and gives no credit). Real capital-gains rules depend on where you live, how long you held and your other gains and losses, so treat the after-tax figure as an estimate.</p>"),
    ("Can I calculate profit on a short sale?",
     "<p>Yes. Choose Short, enter the price you sold at as the entry and the price you bought back at as the exit. Profit is (entry − exit) × shares minus fees, and any dividends paid while you were short are subtracted.</p>"),
    ("How do I find the price I need to sell at for a target profit?",
     "<p>Switch to “Price for a target” and enter the profit you want, as an amount or a % return. The calculator solves for the sell price that delivers it after fees, and after tax if you entered a rate.</p>"),
]
