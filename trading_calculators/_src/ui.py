"""Form markup helpers shared by the calculator page sources.

Every control is labelled, numeric inputs use inputmode="decimal", and each field has a
data-f hook so calc-ui.js can attach its error message next to it.
"""
import html


def esc(s):
    return html.escape(str(s), quote=True)


def field(k, label, f=None, pre=None, suf=None, hint=None, ph="", mode="decimal", typ="text", show=None, cur=False, cls=""):
    """A labelled input. pre/suf: text affixes; cur=True puts the live currency symbol in front."""
    f = f or k
    fid = f"in-{k}"
    hint_id = f"{fid}-hint" if hint else ""
    affix_pre = f'<span class="fld__affix" data-cur-sym aria-hidden="true">$</span>' if cur else (f'<span class="fld__affix" aria-hidden="true">{pre}</span>' if pre else "")
    affix_suf = f'<span class="fld__affix" aria-hidden="true">{suf}</span>' if suf else ""
    attrs = f'type="{typ}" id="{fid}" data-k="{k}" placeholder="{esc(ph)}" autocomplete="off"'
    if typ == "text":
        attrs += f' inputmode="{mode}" spellcheck="false"'
    if hint_id:
        attrs += f' aria-describedby="{hint_id}"'
    showa = f' data-show="{show}"' if show else ""
    hint_html = f'<p class="fld__hint" id="{hint_id}">{hint}</p>' if hint else ""
    return f'''<div class="fld {cls}" data-f="{f}"{showa}>
  <label for="{fid}">{label}</label>
  <span class="fld__box">{affix_pre}<input {attrs}>{affix_suf}</span>
  {hint_html}
</div>'''


def select(k, label, options, f=None, show=None):
    f = f or k
    showa = f' data-show="{show}"' if show else ""
    opts = "".join(f'<option value="{esc(v)}">{esc(t)}</option>' for v, t in options)
    return f'''<div class="fld" data-f="{f}"{showa}>
  <label for="in-{k}">{label}</label>
  <span class="fld__box"><select id="in-{k}" data-k="{k}">{opts}</select></span>
</div>'''


def seg(k, options, label, small=False, show=None, visible_label=True):
    """Segmented toggle (platform .tabs/.tab pills) behaving as a radio group."""
    lid = f"lbl-{k}"
    showa = f' data-show="{show}"' if show else ""
    btns = "".join(f'<button type="button" class="tab" role="radio" aria-checked="false" data-v="{esc(v)}">{t}</button>' for v, t in options)
    lab = f'<span class="fld__label" id="{lid}">{label}</span>' if visible_label else f'<span class="sr-only" id="{lid}">{label}</span>'
    return f'''<div class="fld" data-f="{k}"{showa}>
  {lab}
  <div class="seg tabs{" seg--sm" if small else ""}" role="radiogroup" aria-labelledby="{lid}" data-k="{k}">{btns}</div>
</div>'''


def fee(kt, kv, label, f, show=None):
    """A fee: a value plus a $ / % switch."""
    showa = f' data-show="{show}"' if show else ""
    return f'''<div class="fld" data-f="{f}"{showa}>
  <label for="in-{kv}">{label}</label>
  <div class="fld-fee">
    <span class="fld__box"><input type="text" id="in-{kv}" data-k="{kv}" inputmode="decimal" spellcheck="false" autocomplete="off" placeholder="0"></span>
    <div class="seg tabs seg--sm" role="radiogroup" aria-label="{esc(label)} type" data-k="{kt}"><button type="button" class="tab" role="radio" aria-checked="false" data-v="flat"><span data-cur-sym>$</span></button><button type="button" class="tab" role="radio" aria-checked="false" data-v="pct">%</button></div>
  </div>
</div>'''


CURRENCIES = [("USD", "USD $"), ("EUR", "EUR €"), ("GBP", "GBP £"), ("JPY", "JPY ¥"), ("CAD", "CAD $"),
              ("AUD", "AUD $"), ("CHF", "CHF"), ("INR", "INR ₹")]


CUR = '<span data-cur-sym>$</span>'


def unit_field(k, label, f, ph, show, switch, hint, cur=False):
    """(Stock and crypto.) A field whose unit is chosen by a "Use …" link in the label row (switch = (key, value, text));
    the unit is in the label, and a hint under the input says what the number means."""
    key, val, text = switch
    return f'''<div class="fld" data-f="{f}" data-show="{show}">
  <div class="fld__top"><label for="in-{k}">{label}</label><button type="button" class="fld__use" data-set="{key}={val}">{text}</button></div>
  <span class="fld__box">{'<span class="fld__affix" data-cur-sym aria-hidden="true">$</span>' if cur else ""}<input type="text" id="in-{k}" data-k="{k}" inputmode="decimal" spellcheck="false" autocomplete="off" placeholder="{ph}" aria-describedby="in-{k}-hint"></span>
  <p class="fld__hint fld__hint--on" id="in-{k}-hint">{hint}</p>
</div>'''


def fees_field():
    """One Fees input (key fee, unit key ft = flat | pct); the $ / % choice switches its label,
    link and hint (a single input, so the value isn't read twice). Stock and crypto share it."""
    flat, pct = 'data-show="ft!=pct"', 'data-show="ft=pct"'
    return f'''<div class="fld" data-f="fee" data-show="fs=total">
  <div class="fld__top"><label for="in-fee"><span {flat}>Fees ({CUR})</span><span {pct}>Fees (%)</span></label><button type="button" class="fld__use" data-set="ft=pct" {flat}>Use %</button><button type="button" class="fld__use" data-set="ft=flat" {pct}>Use {CUR}</button></div>
  <span class="fld__box"><input type="text" id="in-fee" data-k="fee" inputmode="decimal" spellcheck="false" autocomplete="off" placeholder="0" aria-describedby="in-fee-hint"></span>
  <p class="fld__hint fld__hint--on" id="in-fee-hint"><span {flat}>Total for buy and sell</span><span {pct}>Charged on buy and on sell</span></p>
</div>'''



def ticker_field(kind):
    """The Stock / Coin / Ticker field: a search box that opens the ticker search popup
    (ticker-search.js), which fills the price. The pick lives in the URL as tk."""
    what = {"crypto": "Coin", "any": "Ticker"}.get(kind, "Stock")
    noun = {"crypto": "coin", "any": "stock or coin"}.get(kind, "ticker")
    icon = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="m13.5 13.5 3.5 3.5"/></svg>'
    x = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15"/></svg>'
    return f'''<div class="fld c-ticker" data-f="ticker" data-kind="{kind}">
  <label for="in-tk-btn">{what} <span class="fld__opt">(optional)</span></label>
  <span class="fld__box"><button type="button" id="in-tk-btn" class="c-ticker__btn" data-ticker-open aria-describedby="in-tk-hint">{icon}<span data-tk-label>Search {noun} to fill the price</span></button><button type="button" class="c-ticker__clear" data-tk-clear aria-label="Clear {what.lower()}" hidden>{x}</button></span>
  <input type="hidden" id="in-tk" data-k="tk">
  <p class="fld__hint fld__hint--on" id="in-tk-hint" data-tk-hint></p>
</div>'''


def tool(title, form_html, currencies=CURRENCIES, stacked=False):
    """The calculator card: toolbar (title, currency, Share result, Reset), inputs, results."""
    opts = "".join(f'<option value="{v}">{t}</option>' for v, t in currencies)
    return f'''      <section class="c-card calc-tool{" calc-tool--stack" if stacked else ""}" id="calculator" data-calc-root aria-labelledby="tool-title">
        <div class="calc-tool__bar">
          <h2 id="tool-title">{title}</h2>
          <div class="calc-tool__actions">
            <label class="sr-only" for="in-cur">Currency</label>
            <span class="fld__box"><select id="in-cur" data-k="cur">{opts}</select></span>
            <button type="button" class="c-btn c-btn--ghost" data-share><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-.8.8M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l.8-.8"/></svg><span>Share result</span></button>
            <button type="button" class="c-btn c-btn--ghost" data-reset>Reset</button>
          </div>
        </div>
        <form class="calc-form" novalidate onsubmit="return false">
{form_html}
        </form>
        <div class="calc-out" aria-live="polite"></div>
      </section>'''
