#!/usr/bin/env python3
"""Build the trading calculator pages.

    python3 trading_calculators/_src/build.py

Each page's unique content lives in _src/pages/<id>.py (meta, form, article, FAQ). This
script wraps it in the shared Profit.com shell — the signed-out top nav from landing.html
and the global footer from index.html, read live so they never drift — and writes static
HTML with full SEO metadata, so search engines get the article and FAQ without running JS:

    trading_calculators/index.html                         /trading-calculators (hub)
    trading_calculators/<route>/index.html                 /<route>
"""
import html
import importlib.util
import json
import pathlib
import re
import sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

HERE = pathlib.Path(__file__).resolve().parent
CALC = HERE.parent                       # trading_calculators/
SITE = CALC.parent                       # the site root (styles.css, topnav.js, assets/)
ORIGIN = "https://www.profit.com"        # canonical host for SEO tags


PAGE_IDS = ["stock", "crypto", "position", "options", "margin"]


def load(name):
    spec = importlib.util.spec_from_file_location(name, HERE / "pages" / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# ------------------------------------------------------------------ shared shell
def rebase(markup, root):
    """Point the shell's root-relative URLs at the site root from a page `root` deep."""
    markup = re.sub(r'(src|href)="assets/', rf'\1="{root}assets/', markup)
    markup = re.sub(r'href="([a-z0-9-]+\.html(?:[#?][^"]*)?)"', rf'href="{root}\1"', markup)
    markup = re.sub(r'href="(academy/|trading_calculators/)', rf'href="{root}\1', markup)
    return markup


def topnav(root):
    # the Arena's member bar; topnav.js swaps it for the signed-out bar (Log in, CTA) for guests
    src = (SITE / "index.html").read_text()
    m = re.search(r'(<header class="topnav">.*?</header>)', src, re.S)
    return rebase(m.group(1), root)


def footer(root):
    src = (SITE / "index.html").read_text()
    m = re.search(r'(\s*<!-- ============ Global footer.*?</footer>)', src, re.S)
    return rebase(m.group(1), root)


# ------------------------------------------------------------------ building blocks
def plain(markup):
    return html.unescape(re.sub(r"<[^>]+>", "", markup)).strip()


def jsonld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, indent=1) + "</script>"


def faq_html(faq, more_href):
    """The platform FAQ component, exactly as on the Arena page (index.html):
    a "FAQs ›" section head and .faq-item accordion cards."""
    def card(q, a):
        a = re.sub(r"^\s*<p>(.*)</p>\s*$", r"\1", a, flags=re.S)      # the answer is the item's own <p>
        return f'''            <div class="faq-item">
              <button class="faq-item__q" aria-expanded="false"><span>{html.escape(q)}</span><span class="faq-icon"><img class="plus" src="{{ROOT}}assets/faq-plus.svg" alt=""><img class="minus" src="{{ROOT}}assets/faq-minus.svg" alt=""></span></button>
              <p class="faq-item__a">{a}</p>
            </div>'''
    # one column: the calculators' content column is narrower than the Arena page, and two
    # columns there wrap the longer questions into taller cards
    cols = f'''          <div class="faq__col" data-accordion>
{chr(10).join(card(q, a) for q, a in faq)}
          </div>'''
    return f'''      <section class="section faq" aria-labelledby="faq-title">
        <a class="section__head" href="{more_href}">
          <h2 class="t-h1" id="faq-title">FAQs</h2>
          <span class="section-title-arrow"><img src="{{ROOT}}assets/faq-arrow.svg" alt=""></span>
        </a>
        <div class="faq__cols">
{cols}
        </div>
      </section>'''


ICONS = {
    "hub": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    "stock": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
    "crypto": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 7.5h4a2.25 2.25 0 0 1 0 4.5h-4zM9.5 12h4.5a2.25 2.25 0 0 1 0 4.5H9.5zM9.5 7.5v9M11 6v1.5M11 16.5V18"/></svg>',
    "position": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
    "options": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16h7l7-9h4"/><path d="M3 20h18"/></svg>',
    "margin": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z"/></svg>',
}


CURRENT = ' aria-current="page"'

# Calculator navigation: the hub plus each calculator, with the short names the menus use.
NAV_LABELS = {"hub": "All calculators", "stock": "Stock profit", "crypto": "Crypto profit",
              "position": "Position size", "options": "Options profit", "margin": "Margin"}


def nav_items(pages, calc_root):
    yield "hub", f"{calc_root}index.html"
    for p in pages:
        yield p.ID, f"{calc_root}{p.ROUTE_DIR}/index.html"


def nav_icon(cid, cls, root):
    # the calculator icons of the top nav's Tools menu (assets/tl-calc-*.svg), as the Arena side nav draws its icons
    name = "all" if cid == "hub" else cid
    return f'<span class="{cls}"><img src="{root}assets/tl-calc-{name}.svg" alt=""></span>'


def side_nav(current, pages, calc_root, root):
    """The Arena side navigation: sidebar.js with data-nav="calc" (the calculators only). The
    same links are written into the HTML first, for crawlers; sidebar.js replaces them on load."""
    links = "".join(
        f'<a class="side-nav__item{" is-active" if cid == current else ""}" href="{href}"{CURRENT if cid == current else ""}>'
        f'{nav_icon(cid, "side-nav__icon", root)}<span class="side-nav__label">{NAV_LABELS[cid]}</span></a>'
        for cid, href in nav_items(pages, calc_root))
    return f'''  <aside class="side-nav is-collapsed calc-nav" id="sideNav" data-nav="calc" data-active="{current}" aria-label="Trading calculators">
    <div class="side-nav__scroll">
      <nav class="side-nav__group" aria-label="Main">{links}</nav>
    </div>
  </aside>
  <script src="{root}sidebar.js"></script>'''


def chips(current, pages, calc_root, root):
    """Under 1024px the side nav gives way to a scrolling chip row under the H1."""
    items = "".join(
        f'<a class="calc-chip{" is-active" if cid == current else ""}" href="{href}"{CURRENT if cid == current else ""}>'
        f'{nav_icon(cid, "calc-chip__icon", root)}{NAV_LABELS[cid]}</a>'
        for cid, href in nav_items(pages, calc_root))
    return f'    <nav class="calc-chips" aria-label="Trading calculators" data-chips>{items}</nav>'


# The 300×600 ad rail (≥1280px only). Until real ads run it holds a generic Playtrade house ad.
# The art is the Academy's Arena banner (academy.js, .ac-arena__art): two Market Games tiles
# pushed back, the 1-to-1 bull-vs-bear duel in front. The faces are the Academy leaderboard's; 220K+ is the Arena hero's player count.
HA_ART = '<span class="ha-arena" aria-hidden="true"><span class="mg-card mg-card--flip ha-tile ha-tile--back"><span class="mg-card__art"><span class="mg-flip"><span class="mg-flip__card mg-flip__card--l"><span class="mg-flip__stock" aria-hidden="true"></span><span class="mg-flip__face mg-flip__face--front"><svg viewBox="0 0 48 48"><rect x="12" y="14" width="7" height="20" rx="2" fill="#3be39a"/><line x1="15.5" y1="8" x2="15.5" y2="40" stroke="#3be39a" stroke-width="2.4" stroke-linecap="round"/><rect x="29" y="20" width="7" height="14" rx="2" fill="#f63d68"/><line x1="32.5" y1="14" x2="32.5" y2="40" stroke="#f63d68" stroke-width="2.4" stroke-linecap="round"/></svg></span></span><span class="mg-flip__card mg-flip__card--m"><span class="mg-flip__face mg-flip__face--back"><svg viewBox="0 0 48 48"><rect x="10" y="18" width="6" height="16" rx="1.5" fill="#7c5cff" opacity=".75"/><line x1="13" y1="12" x2="13" y2="38" stroke="#7c5cff" stroke-width="2" opacity=".55" stroke-linecap="round"/><rect x="21" y="12" width="6" height="22" rx="1.5" fill="#7c5cff"/><line x1="24" y1="7" x2="24" y2="40" stroke="#7c5cff" stroke-width="2" opacity=".7" stroke-linecap="round"/><rect x="32" y="22" width="6" height="13" rx="1.5" fill="#7c5cff" opacity=".75"/><line x1="35" y1="17" x2="35" y2="40" stroke="#7c5cff" stroke-width="2" opacity=".55" stroke-linecap="round"/></svg></span><span class="mg-flip__stock" aria-hidden="true"></span><span class="mg-flip__face mg-flip__face--front"><svg viewBox="0 0 48 48"><rect x="20" y="11" width="8" height="10" rx="2" fill="#3be39a"/><line x1="24" y1="8" x2="24" y2="38" stroke="#3be39a" stroke-width="2.6" stroke-linecap="round"/></svg></span></span><span class="mg-flip__card mg-flip__card--r"><span class="mg-flip__stock" aria-hidden="true"></span><span class="mg-flip__face mg-flip__face--front"><svg viewBox="0 0 48 48"><polyline points="6,32 15,14 24,28 33,14 42,32" fill="none" stroke="#f63d68" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span></span></span></span></span><span class="mg-card mg-card--bull ha-tile ha-tile--mid"><span class="mg-card__art"><img class="mg-card__scene" src="{ROOT}assets/mg-bullrun-cover.jpg" alt="" loading="lazy"></span></span><span class="ha-duel"><img src="{ROOT}assets/ex-bullbear-ad.webp" alt="" loading="lazy" width="512" height="512"></span></span>'

AD_RAIL = '''    <aside class="calc-rail" aria-label="Advertisement">
      <div class="ad-slot ad-slot--rail">
        <a class="house-ad" href="#" data-cta="adslot" data-member-href="index.html" aria-label="Playtrade: practice trading with virtual money. Play free">
          <span class="ha-eyebrow"><img src="{ROOT}assets/cup.svg" alt="">Playtrade</span>
          <span class="ha-kick">100% Virtual Funds</span>
          <span class="ha-title">Practice Trading. Risk Nothing.</span>
          <span class="ha-text">Trade stocks and crypto with virtual money on live prices, and see how you rank.</span>
          <span class="ha-tags"><span>Tournaments</span><span>Games</span><span>Leaderboard</span></span>
          ''' + HA_ART + '''
          <span class="ha-people"><span class="ha-faces" aria-hidden="true"><img src="{ROOT}assets/lp-av-2.png" alt="" loading="lazy"><img src="{ROOT}assets/pr-av-a.png" alt="" loading="lazy"><img src="{ROOT}assets/lp-av-4.png" alt="" loading="lazy"><img src="{ROOT}assets/lp-av-1.png" alt="" loading="lazy"></span><b>220K+</b> traders joined</span>
          <span class="calc-cta-btn ha-btn">Play free</span>
          <span class="ha-note">Virtual money · No deposit</span>
        </a>
      </div>
    </aside>'''


def related(current, pages, root):
    """"More trading calculators ›": the platform section head (as FAQs) linking to the hub,
    and the other calculators as the hub's cover cards in a horizontal scroll row."""
    cards = "\n".join(f'''          <a class="hub-card" href="{root}{p.ROUTE_DIR}/index.html">
            <span class="hub-card__art hub-card__art--{p.ID}"><img class="hub-card__img" src="{root}art/{p.ID}.webp" srcset="{root}art/{p.ID}.webp 1x, {root}art/{p.ID}@4x.webp 2x" alt="" loading="lazy"></span>
            <span class="hub-card__body">
              <h3>{html.escape(getattr(p, "CARD_TITLE", p.APP_NAME))}</h3>
              <p>{p.HUB_TEXT}</p>
            </span>
          </a>''' for p in pages if p.ID != current)
    return f'''      <section class="section calc-more" aria-labelledby="more-title">
        <a class="section__head" href="{root}index.html">
          <h2 class="t-h1" id="more-title">More trading calculators</h2>
          <span class="section-title-arrow"><img src="{{ROOT}}assets/faq-arrow.svg" alt=""></span>
        </a>
        <div class="calc-more__wrap" data-carousel>
          <div class="calc-more__row" tabindex="0" aria-label="Other calculators">
{cards}
          </div>
          <button type="button" class="calc-more__nav calc-more__nav--prev" aria-label="Previous calculators" hidden><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15l-5-5 5-5"/></svg></button>
          <button type="button" class="calc-more__nav calc-more__nav--next" aria-label="Next calculators" hidden><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 5l5 5-5 5"/></svg></button>
        </div>
      </section>'''




DISCLAIMER = '<p class="calc-disclaimer"><b>For education and planning only, not investment advice.</b> Results are calculated from the numbers you enter and the assumptions stated on this page.</p>'
CRYPTO_RISK = '<p class="calc-disclaimer calc-disclaimer--risk"><b>Crypto risk warning.</b> Crypto-assets are highly volatile and largely unregulated. You can lose all of the money you put in, and there is usually no investor compensation scheme if an exchange fails.</p>'


def head(meta, root, canonical, extra_ld, og_id="hub"):
    t, d = meta["title"], meta["description"]
    return f'''<!doctype html>
<html lang="en" data-root="{root}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(t)}</title>
  <meta name="description" content="{html.escape(d)}">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Profit.com">
  <meta property="og:title" content="{html.escape(meta.get("og_title", t))}">
  <meta property="og:description" content="{html.escape(d)}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{ORIGIN}/trading_calculators/og/{og_id}.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="{ORIGIN}/trading_calculators/og/{og_id}.jpg">
  <meta name="theme-color" content="#13161b">
  {extra_ld}
  <script>try{{document.documentElement.dataset.theme=localStorage.getItem("pt_theme")||"dark"}}catch(e){{}}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <noscript><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet"></noscript>
  <link rel="stylesheet" href="{root}styles.css">
  <link rel="stylesheet" href="{root}trading_calculators/calc.css">
  <script src="{root}trading_calculators/calc-shell.js"></script>
</head>'''


def breadcrumb_ld(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": n + 1, "name": name, "item": url} for n, (name, url) in enumerate(items)]}


def faq_ld(faq):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in faq]}


def crumbs(items):
    lis = []
    for n, (name, href) in enumerate(items):
        last = n == len(items) - 1
        lis.append(f'<li aria-current="page">{html.escape(name)}</li>' if last else f'<li><a href="{href}">{html.escape(name)}</a></li>')
    return f'<nav class="calc-crumbs" aria-label="Breadcrumb"><ol>{"".join(lis)}</ol></nav>'


# ------------------------------------------------------------------ pages
def build_calculator(p, pages):
    root = "../../"
    canonical = f"{ORIGIN}/{p.ROUTE}"
    hub = f"{ORIGIN}/trading-calculators"
    lds = "\n  ".join(jsonld(x) for x in [
        {"@context": "https://schema.org", "@type": "WebApplication", "name": p.APP_NAME, "url": canonical,
         "description": p.META["description"], "applicationCategory": "FinanceApplication", "operatingSystem": "Any",
         "browserRequirements": "Requires JavaScript", "isAccessibleForFree": True,
         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
         "publisher": {"@type": "Organization", "name": "Profit.com", "url": ORIGIN}},
        breadcrumb_ld([("Profit.com", ORIGIN + "/"), ("Trading calculators", hub), (p.SHORT, canonical)]),
        faq_ld(p.FAQ),
    ])
    article = p.ARTICLE.replace("{{CTA}}", p.ARTICLE_CTA)
    sib = f'\n        <p class="calc-sibling">{p.SIBLING}</p>' if getattr(p, "SIBLING", "") else ""
    risk = "\n      " + CRYPTO_RISK if getattr(p, "CRYPTO", False) else ""
    body = f'''{head(p.META, root, canonical, lds, p.ID)}
<body class="calc-page" data-calc="{p.ID}" data-nav-active="none">
  <script>document.body.dataset.user = new URLSearchParams(location.search).get("guest") === "0" ? "member" : "guest";</script>

  <!-- ============ Top navigation (shared component, signed-out bar) ============ -->
{topnav(root)}
  <script src="{root}topnav.js"></script>

  <div class="shell calc-shell">
{side_nav(p.ID, pages, root + "trading_calculators/", root)}
  <main class="calc" id="main">
    {crumbs([("Trading calculators", root + "trading_calculators/index.html"), (p.SHORT, "")])}
    <header class="calc-hero">
      <h1>{p.H1}</h1>
      <p>{p.INTRO}</p>{sib}
    </header>
{chips(p.ID, pages, root + "trading_calculators/", root)}

    <div class="calc-grid">
    <div class="calc-main">
{p.TOOL}
      <article class="c-card calc-article">
{article}
      </article>
{faq_html(p.FAQ, root + "trading_calculators/index.html#faq-title")}
{related(p.ID, pages, root + "trading_calculators/")}
      {DISCLAIMER}{risk}
    </div>
{AD_RAIL}
    </div>
  </main>
  </div>
{footer(root)}
  <script src="{root}footer.js"></script>
  <script src="{root}trading_calculators/lib/core.js"></script>
  <script src="{root}trading_calculators/lib/{p.ID}.js"></script>
  <script src="{root}trading_calculators/calc-ui.js"></script>
{f'  <script src="{root}trading_calculators/ticker-search.js"></script>' + chr(10) if p.ID in ("stock", "crypto", "position") else ""}  <script src="{root}trading_calculators/pages/{p.ID}.js"></script>
</body>
</html>
'''
    body = body.replace("{ROOT}", root)
    out = CALC / p.ROUTE_DIR / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(body)
    return out


def build_hub(pages):
    hub = load("hub")
    root = "../"
    canonical = f"{ORIGIN}/trading-calculators"
    lds = "\n  ".join(jsonld(x) for x in [
        {"@context": "https://schema.org", "@type": "CollectionPage", "name": hub.META["title"], "url": canonical,
         "description": hub.META["description"],
         "mainEntity": {"@type": "ItemList", "itemListElement": [
             {"@type": "ListItem", "position": n + 1, "url": f"{ORIGIN}/{p.ROUTE}", "name": p.APP_NAME} for n, p in enumerate(pages)]}},
        breadcrumb_ld([("Profit.com", ORIGIN + "/"), ("Trading calculators", canonical)]),
        faq_ld(hub.FAQ),
    ])
    cards = "\n".join(f'''        <a class="hub-card" href="{p.ROUTE_DIR}/index.html">
          <span class="hub-card__art hub-card__art--{p.ID}"><img class="hub-card__img" src="art/{p.ID}.webp" srcset="art/{p.ID}.webp 1x, art/{p.ID}@4x.webp 2x" alt=""></span>
          <span class="hub-card__body">
            <span class="hub-card__q">{html.escape(p.QUESTION)}</span>
            <h2>{html.escape(getattr(p, "CARD_TITLE", p.APP_NAME))}</h2>
            <p>{p.HUB_TEXT}</p>
          </span>
        </a>''' for p in pages)
    body = f'''{head(hub.META, root, canonical, lds)}
<body class="calc-page" data-calc="hub" data-nav-active="none">
  <script>document.body.dataset.user = new URLSearchParams(location.search).get("guest") === "0" ? "member" : "guest";</script>

  <!-- ============ Top navigation (shared component, signed-out bar) ============ -->
{topnav(root)}
  <script src="{root}topnav.js"></script>

  <div class="shell calc-shell">
{side_nav("hub", pages, "", root)}
  <main class="calc" id="main">
    <header class="calc-hero">
      <h1>{hub.H1}</h1>
      <p>{hub.INTRO}</p>
    </header>
    <div class="calc-grid">
    <div class="calc-main">
      <section class="hub-grid" aria-label="Calculators">
{cards}
      </section>
      <article class="c-card calc-article">
{hub.ARTICLE}
      </article>
{faq_html(hub.FAQ, "#faq-title")}
      {DISCLAIMER}
    </div>
{AD_RAIL}
    </div>
  </main>
  </div>
{footer(root)}
  <script src="{root}footer.js"></script>
</body>
</html>
'''
    body = body.replace("{ROOT}", root)
    (CALC / "index.html").write_text(body)


def sitemap(pages):
    """sitemap-calculators.xml: the hub and the five calculators, for the production sitemap index."""
    urls = [f"{ORIGIN}/trading-calculators"] + [f"{ORIGIN}/{p.ROUTE}" for p in pages]
    body = "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls)
    (CALC / "sitemap-calculators.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + "</urlset>\n")


def main():
    pages = [load(i) for i in PAGE_IDS if (HERE / "pages" / f"{i}.py").exists()]
    for p in pages:
        print("built", build_calculator(p, pages).relative_to(SITE))
    if (HERE / "pages" / "hub.py").exists():
        build_hub(pages)
        sitemap(pages)
        print("built", (CALC / "index.html").relative_to(SITE))
    import options_examples                       # the options article's worked examples, as test data
    options_examples.write_test_data(CALC / "tests" / "options-examples.data.js")


if __name__ == "__main__":
    main()
