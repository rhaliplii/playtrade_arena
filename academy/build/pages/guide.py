"""The free guide (/academy/guide): "Learn to Trade with Rico" PDF behind an email gate. SSR; ref-pages.js
checks the email, shows the download and remembers that this browser already got the guide."""
import lib
from lib import esc
from pages.how import base_of, faq_grid, faq_jsonld, img

PDF = "static/guide/learn-to-trade-with-rico.pdf"   # relative to academy/
PAGES = 80                                         # pages in that PDF (v69)

CHECK = ('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" '
         'stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>')
CHEVRON = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" '
           'stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>')
DOWNLOAD = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" '
            'stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>')


def routes(ctx):
    t = ctx.t
    route = "guide"
    base = base_of(route)
    chapters = ctx.path["chapters"]
    n = len(chapters)

    stats = [(lib.fmt_num(PAGES), t("guide.stat.pages")), (lib.fmt_num(n), t("guide.stat.chapters")),
             (t("guide.stat.free"), t("guide.stat.freeNote"))]
    stats_html = "".join(f'<div class="ac-guide-stat"><b class="ac-num">{esc(a)}</b><span>{esc(b)}</span></div>' for a, b in stats)

    inside = "".join(f'''<li class="ac-guide-ch"><span class="ac-guide-ch__n ac-num">{c["n"]}</span>
  <span class="ac-guide-ch__text"><b>{esc(c["title"])}</b><span>{esc(c.get("promise") or c["short"])}</span></span></li>''' for c in chapters)

    first = next((c for c in chapters if c.get("available")), None)
    start = f'{base}{ctx.path["id"]}/index.html'
    if first and ctx.chapters.get(first["id"], {}).get("lessons"):
        start = f'{base}{ctx.path["id"]}/{first["id"]}/{ctx.chapters[first["id"]]["lessons"][0]}/index.html'

    body = f'''<div class="ac-wrap ac-ref">
  <section class="ac-guide-hero" aria-labelledby="guide-title">
    <div class="ac-guide-book">
      <span class="ac-guide-book__shadow" aria-hidden="true"></span>
      <div class="ac-guide-book__body"><span class="ac-guide-book__spine" aria-hidden="true"></span>
        {img(base, "art/guide-cover.webp", t("guide.cover.alt"), "ac-guide-book__cover", lazy=False)}</div>
    </div>
    <div class="ac-guide-copy">
      <div class="ac-guide-copy__head">
        <span class="ac-eyebrow">{esc(t("guide.eyebrow"))}</span>
        <h1 id="guide-title" class="ac-h1">{esc(t("guide.title.1"))}<br>{esc(t("guide.title.2"))}</h1>
        <p class="ac-lead">{esc(t("guide.lead"))}</p>
      </div>
      <div class="ac-guide-stats">{stats_html}</div>
      <div class="ac-guide-gate" data-show="guest">
      <form class="ac-guide-form" aria-label="{esc(t("guide.form.aria"))}" data-guide-form novalidate>
        <label class="ac-guide-form__label" for="guide-email">{esc(t("guide.form.label"))}</label>
        <div class="ac-guide-form__row">
          <input id="guide-email" name="email" type="email" placeholder="{esc(t("guide.form.placeholder"))}" autocomplete="email" required aria-describedby="guide-err">
          <button type="submit" class="ac-btn ac-btn--white">{esc(t("guide.form.cta"))}</button>
        </div>
        <p class="ac-guide-form__err" id="guide-err" role="alert" hidden>{esc(t("guide.form.invalid"))}</p>
        <span class="ac-guide-form__free">{CHECK}{esc(t("guide.form.free"))}</span>
      </form>
      <div class="ac-guide-form ac-guide-done" data-guide-done hidden tabindex="-1" aria-live="polite">
        <b class="ac-guide-form__label">{esc(t("guide.done.title"))}</b>
        <span class="ac-guide-done__text" data-guide-sent hidden></span>
        <div class="ac-row"><a class="ac-btn ac-btn--white" href="{base}{PDF}" download>{DOWNLOAD}{esc(t("guide.done.cta"))}</a>
          <span class="ac-guide-done__text">{esc(t("guide.done.size", n=PAGES))}</span></div>
        <button type="button" class="ac-guide-again" data-guide-again>{esc(t("guide.done.again"))}</button>
      </div>
      </div>
      <div class="ac-guide-form ac-guide-member" data-show="member" hidden aria-live="polite">
        <b class="ac-guide-form__label">{esc(t("guide.member.title"))}</b>
        <div class="ac-row"><a class="ac-btn ac-btn--white" href="{base}{PDF}" download data-guide-dl>{DOWNLOAD}{esc(t("guide.done.cta"))}</a></div>
        <span class="ac-guide-done__text">{esc(t("guide.done.size", n=PAGES))}</span>
      </div>
    </div>
  </section>

  <section class="ac-card ac-guide-inside" aria-labelledby="inside-title">
    <h2 id="inside-title" class="ac-h2">{esc(t("guide.inside.title"))}</h2>
    <ol class="ac-guide-chs">{inside}</ol>
  </section>

  <section class="ac-banner ac-guide-doing" aria-labelledby="doing-title">
    <div class="ac-guide-doing__copy">
      <h2 id="doing-title" class="ac-h2">{esc(t("guide.doing.title"))}</h2>
      <p class="ac-lead">{esc(t("guide.doing.text"))}</p>
    </div>
    <a class="ac-btn ac-btn--white ac-guide-doing__cta" href="{start}">{esc(t("guide.doing.cta"))}{CHEVRON}</a>
    {img(base, "rico/point2.webp", t("glossary.rico.alt"), "ac-guide-doing__rico")}
  </section>

  {faq_grid(t, "guide.faq", 3, "guide.faq.title", "guide-faq", n=n)}
  <p class="ac-ref-disclaimer">{esc(t("guide.disclaimer"))}</p>
</div>'''

    ld = [faq_jsonld(t, "guide.faq", 3, n=n),
          {"@context": "https://schema.org", "@type": "Book", "name": "Learn to Trade with Rico", "bookFormat": "https://schema.org/EBook",
           "numberOfPages": PAGES, "inLanguage": "en", "isAccessibleForFree": True,
           "publisher": {"@type": "Organization", "name": "Profit.com"}, "description": t("guide.lead")}]
    yield route, lib.page(t, route=route, title=t("guide.meta.title"), description=t("guide.meta.description", n=n), body=body,
                          active="none", index=True, css=("ref-pages.css",), js=("ref-pages.js",), body_class="ac-page-guide",
                          data={"ac-ref": {"page": "guide"}}, jsonld=ld)
