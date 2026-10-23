import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from ui import CUR, ticker_field, CURRENCIES, field, fees_field, seg, tool, unit_field  # noqa: E402

ID = "crypto"
ROUTE = "crypto-profit-calculator"
ROUTE_DIR = ROUTE
SHORT = "Crypto Profit Calculator"
APP_NAME = "Crypto Profit Calculator"
BLURB = "Bitcoin and altcoin profit after exchange fees"
QUESTION = "Trading Bitcoin or another coin?"
HUB_TEXT = "Work out your crypto gains and losses"
CRYPTO = True

META = {
    "title": "Crypto Profit Calculator: Bitcoin Profit After Fees",
    "description": "Free crypto profit calculator: profit, return and break-even on Bitcoin or any coin after exchange fees, with average cost across several buys.",
}
H1 = "Crypto Profit Calculator"
INTRO = "Use this free crypto profit calculator to work out your profit and return on Bitcoin, Ethereum or any coin after exchange fees, your break-even price and your average cost across several buys, long or short."
SIBLING = ""

TOOL = tool("Calculate crypto profit", f'''
          {seg("side", [("long", "Long"), ("short", "Short")], "Direction")}
          {ticker_field("crypto")}
          <div class="fld-row calc-main-row">
            {unit_field("amt", f"Amount ({CUR})", "buys.0.amount", "1,000", "sz=amount", ("sz", "coins", "Use coins"), '<span data-size-hint></span>')}
            {unit_field("co", "Coins", "buys.0.coins", "0.5", "sz=coins", ("sz", "amount", f"Use {CUR}"), '<span data-size-hint></span>')}
            {field("bp", '<span data-show="side!=short">Buy price</span><span data-show="side=short">Sell price (opened)</span> (' + CUR + ')', ph="0.00", f="buys.0.price")}
            {field("ex", '<span data-show="side!=short">Sell price</span><span data-show="side=short">Buy-back price</span> (' + CUR + ')', ph="0.00", f="exit", show="mode=profit")}
            {field("tg", f"Target profit ({CUR})", f="target", ph="1,000", show="mode=target")}
            {fees_field()}
          </div>
          <button type="button" class="c-toggle" data-toggle="mo" aria-controls="more-crypto" aria-expanded="false">More options</button>
          <div class="c-panel" id="more-crypto" data-show="mo=1">
            {seg("fs", [("total", "One fee"), ("split", "Buy & sell")], "Fees")}
            {seg("tgt", [("amount", "$"), ("pct", "% return")], "Target as", show="mode=target")}
            <div class="fld-row" data-show="fs=split">
              {field("bf", "Buy fee (%)", ph="0.1", f="buyFee")}
              {field("sf", "Sell fee (%)", ph="0.1", f="sellFee")}
            </div>
            {field("oc", f"Other costs ({CUR})", ph="0", f="otherCosts")}
            {field("tax", "Tax on profit (%)", ph="0", f="taxRate")}
            {field("bfr", "Borrow fee (% a year)", f="borrowRate", ph="0", show="side=short")}
            {field("bdy", "Days held", f="borrowDays", ph="0", show="side=short")}
            {field("coin", "Coin", mode="text", ph="BTC")}
            <div class="c-buys">
              <p class="fld__label"><span data-show="side!=short">More buys (average in)</span><span data-show="side=short">More sales (average in)</span></p>
              <div class="c-rows" data-buys></div>
            </div>
          </div>''', currencies=CURRENCIES + [("USDT", "USDT")])

ARTICLE_CTA = '<p class="calc-tip"><b>Tip:</b> on small trades, network and withdrawal fees can cost more than the exchange fee. Add them under <b>More options → Other costs</b> so your break-even is real.</p>'   # a tip for everyone (no sign-up prompt, so nothing to hide when signed in)

ARTICLE = '''        <h2>How to calculate crypto profit</h2>
        <p>Crypto profit is what you get when you sell, minus everything you spent to buy, minus fees. The catch is that exchange fees are charged as a percentage on both sides, and on a volatile coin you often buy in several times at different prices. Both change your real result more than people expect.</p>
        <p class="calc-formula">Coins = Amount spent ÷ Buy price
Profit = (Sell price − Buy price) × Coins − Buy fee − Sell fee</p>
        <p>The amount spent is before fees: the exchange adds the buy fee on top. Your <strong>return</strong> divides the profit by everything you put in, the amount plus that buy fee. If you entered coins instead of an amount, the amount is coins × buy price.</p>
        <p class="calc-formula">Return = Profit ÷ (Amount spent + Buy fee)</p>
{{CTA}}
        <h2>Worked example</h2>
        <p>You spend <strong>$1,000</strong> on Bitcoin at <strong>$50,000</strong>. The exchange charges <strong>0.1%</strong> each way. You sell at <strong>$60,000</strong>.</p>
        <ol>
          <li>Coins: 1,000 ÷ 50,000 = <strong>0.02 BTC</strong>.</li>
          <li>The price move: (60,000 − 50,000) × 0.02 = <strong>$200</strong>.</li>
          <li>Fees are $1.00 to buy (0.1% of $1,000) and $1.20 to sell (0.1% of $1,200): <strong>$2.20</strong>. Profit = 200 − 2.20 = <strong>$197.80</strong>.</li>
          <li>You put in 1,000 + 1 = $1,001, so the return is 197.80 ÷ 1,001 = <strong>19.76%</strong>.</li>
          <li>Break-even: the sale, after its fee, has to bring back $1,001: 1,001 ÷ (0.02 × 0.999) = <strong>$50,100.10</strong>. The coin has to rise 0.2% just to cover fees.</li>
        </ol>
        <h2>Buying in several times (dollar-cost averaging)</h2>
        <p>If you buy $500 at $100 and $500 at $50, you own 5 + 10 = 15 coins for $1,000. Your average entry is 1,000 ÷ 15 = <strong>$66.67</strong>, not the $75 midpoint, because the cheaper buy got you more coins. Add each extra buy under <strong>More options → More buys</strong> and the calculator does this for you, fees included.</p>
        <h2>Shorting crypto</h2>
        <p>A short reverses the order: you sell coins you have borrowed, then buy them back later. You profit when the price falls: (sell price − buy-back price) × coins, minus the fee on each side. Pick <strong>Short</strong>, enter the amount or number of coins sold and the price you sold at, then the buy-back price. Unlike a spot purchase, a short has no ceiling on the loss, because the price can keep rising. Borrow interest, funding rates and liquidation aren't included; check those with your exchange.</p>
        <h2>Exchange fees: maker and taker</h2>
        <p>Most exchanges charge a lower <strong>maker</strong> fee on limit orders that wait on the order book and a higher <strong>taker</strong> fee on orders that fill straight away. Use the rate you actually pay on each side. On small trades, also add network or withdrawal fees under “Other costs”; a flat $5 withdrawal fee on a $200 trade is 2.5% before the price even moves.</p>
        <h2>Common mistakes</h2>
        <ul>
          <li><strong>Averaging prices instead of costs.</strong> The average of $100 and $50 is not your entry price if you spent the same amount at each. Average the money, not the prices.</li>
          <li><strong>Counting fees once.</strong> You pay the exchange to buy and again to sell.</li>
          <li><strong>Forgetting the stablecoin.</strong> If you trade against USDT, your profit is in USDT. Pick USDT as the currency so the results say so.</li>
          <li><strong>Calling unrealised gains profit.</strong> Until you sell, the number moves every second. The profit or loss chart shows the range.</li>
        </ul>
        <h2>Assumptions</h2>
        <p class="calc-assume"><b>How this calculator works.</b> Fees are a % of each order’s value, as on spot exchanges, or a $ total for buy and sell. An amount spent is before fees: the buy fee is added on top, as it is for coins bought. Several buys are combined into one position and sold in one go. Other costs are a flat amount. Tax is a single rate on a profit; a loss is not taxed. On a short, the amount is the position value sold and the opening fee is added on top; return is measured against the position value plus fees. Leverage, borrow interest, funding rates and liquidation are not modelled.</p>'''

FAQ = [
    ("How do I calculate profit on crypto?",
     "<p>Divide the amount you spent by the buy price to get your coins. Profit is (sell price − buy price) × coins, minus the buy and sell fees. $1,000 of Bitcoin bought at $50,000 and sold at $60,000 with 0.1% fees each way makes $197.80, a 19.76% return.</p>"),
    ("How do exchange fees affect my profit?",
     "<p>They are charged on both the buy and the sell, as a percentage of the order. At 0.1% each way, a coin has to rise about 0.2% before you break even; at 0.5% each way, about 1%. On frequent small trades that adds up quickly.</p>"),
    ("What is my average entry price if I bought several times?",
     "<p>Total money spent divided by total coins bought, not the average of the prices. Add each extra buy under More options → More buys and the calculator shows the true average, fees included.</p>"),
    ("What price do I need to sell at to make a certain profit?",
     "<p>Use “Find the price for a target profit” under the result and enter the profit you want, as an amount or (under More options) a % return. The calculator returns the sell price that delivers it after both fees, and after tax if you entered a rate.</p>"),
    ("Can I calculate profit on a crypto short?",
     "<p>Yes. Pick Short, enter the price you sold at and how much you sold, then the buy-back price. The calculator takes the fee off both sides and shows your profit or loss and the break-even buy-back price. Add a borrow fee under More options to include it; funding rates and liquidation aren't included.</p>"),
]
