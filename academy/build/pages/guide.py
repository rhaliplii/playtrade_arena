"""The free guide (/academy/guide): "Learn to Trade with Rico" PDF, a direct download for everyone (no email, no
sign-up: the Academy sells the platform, not the PDF). The link is a plain link that opens the PDF in a new tab, so it works without JS;
ref-pages.js adds the guests-only "practice what's inside" follow-up after the click."""
import lib
from lib import esc
from pages.how import base_of, faq_grid, faq_jsonld, img

PDF = "static/guide/learn-to-trade-with-rico.pdf"   # relative to academy/


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

    stats = [(lib.fmt_num(n), t("guide.stat.chapters")), (t("guide.stat.free"), t("guide.stat.freeNote"))]
    # phones: one compact row ("10 chapters · Free"); the Free stat's note is desktop-only (.ac-guide-d)
    note_cls = ["", ' class="ac-guide-d"']
    stats_html = "".join(f'<div class="ac-guide-stat"><b class="ac-num">{esc(a)}</b><span{note_cls[i]}>{esc(b)}</span></div>'
                         for i, (a, b) in enumerate(stats))

    inside = "".join(f'''<li class="ac-guide-ch"><span class="ac-guide-ch__n ac-num">{c["n"]}</span>
  <span class="ac-guide-ch__text"><b>{esc(c["title"])}</b><span>{esc(c.get("promise") or c["short"])}</span></span></li>''' for c in chapters)

    first = next((c for c in chapters if c.get("available")), None)
    start, first_id, mins = f'{base}{ctx.path["id"]}/index.html', "", 4
    if first and ctx.chapters.get(first["id"], {}).get("lessons"):
        first_id = ctx.chapters[first["id"]]["lessons"][0]
        start = f'{base}{ctx.path["id"]}/{first["id"]}/{first_id}/index.html'   # = the home hero's "Start learning free"
        mins = ctx.lessons[first_id].get("minutes") or mins                      # Lesson 1's own minutes, as on the home Ready card

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
        <h1 id="guide-title" class="ac-h1"><span class="ac-guide-d">{esc(t("guide.title.1"))}<br>{esc(t("guide.title.2"))}</span><span class="ac-guide-m">{esc(t("guide.title.short"))}</span></h1>
        <p class="ac-lead"><span class="ac-guide-d">{esc(t("guide.lead"))}</span><span class="ac-guide-m">{esc(t("guide.leadShort"))}</span></p>
      </div>
      <div class="ac-guide-stats">{stats_html}</div>
      <div class="ac-guide-dl">
        <div class="ac-guide-dl__get">
          <a class="ac-btn ac-btn--lg ac-guide-dl__btn" href="{base}{PDF}" target="_blank" rel="noopener" data-guide-dl>{DOWNLOAD}<span class="ac-guide-dl__long">{esc(t("guide.dl.cta"))}</span><span class="ac-guide-dl__short">{esc(t("guide.dl.ctaShort"))}</span></a>
        </div>
        <div class="ac-guide-next-live" aria-live="polite" data-guide-next-live>
          <div class="ac-guide-next" data-guide-next data-first="{esc(first_id)}" hidden>
            <span class="ac-guide-next__eb">{esc(t("guide.next.eyebrow"))}</span>
            <h2 class="ac-guide-next__title">{esc(t("guide.next.title"))}</h2>
            <p class="ac-guide-next__text" data-guide-next-text>{esc(t("guide.next.text", n=mins))}</p>
            <div class="ac-guide-next__row">
              <a class="ac-btn ac-btn--primary" href="{start}" data-guide-next-cta>{esc(t("home.hero.cta"))}{CHEVRON}</a>
              <a class="ac-guide-next__back" href="{base}index.html">{esc(t("guide.next.back"))}</a>
            </div>
          </div>
        </div>
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
           "inLanguage": "en", "isAccessibleForFree": True,
           "publisher": {"@type": "Organization", "name": "Profit.com"}, "description": t("guide.lead")}]
    yield route, lib.page(t, route=route, title=t("guide.meta.title"), description=t("guide.meta.description", n=n), body=body,
                          active="none", index=True, css=("ref-pages.css",), js=("ref-pages.js",), body_class="ac-page-guide",
                          data={"ac-ref": {"page": "guide"}}, jsonld=ld)
