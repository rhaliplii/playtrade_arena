"""Profit.com Pro (/academy/pro): what Pro adds (comparison table), the Pro paths from the catalog, the
"included in Profit.com Pro" note and FAQs. SSR. Pro members (body[data-pro="1"]) get a member variant with no
upgrade prompts (ref-pages.css hides .ac-pro-for-free; .ac-pro-for-member shows only for them).
A Pro path is "coming soon" until its lessons exist (pages.certificates.path_live)."""
import lib
from lib import esc
from pages.how import base_of, faq_grid, faq_jsonld, img, disclaimer
from pages.certificates import path_live
from pages.home import pro_card

YES = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>'
NO = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>'
STAR = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/></svg>'


def _soon(ctx, p):
    return p.get("available") is False or not path_live(ctx, p)


def routes(ctx):
    t = ctx.t
    route = "pro"
    base = base_of(route)
    root = base + "../"
    plans = f"{root}index.html#plans"   # Profit.com Plans (pricing lives there)
    pro_paths = [p for p in ctx.catalog.get("paths", []) if p.get("tier") == "pro"]
    live = [p for p in pro_paths if not _soon(ctx, p)]
    soon = [p for p in pro_paths if _soon(ctx, p)]
    n_live = len(live)
    n_pro = len(pro_paths)

    cell_yes = f'<span class="ac-pro-tick ac-pro-tick--free" role="img" aria-label="{esc(t("pro.table.yes"))}">{YES}</span>'
    cell_pro = f'<span class="ac-pro-tick ac-pro-tick--pro" role="img" aria-label="{esc(t("pro.table.yes"))}">{YES}</span>'
    cell_no = f'<span class="ac-pro-tick ac-pro-tick--no" role="img" aria-label="{esc(t("pro.table.no"))}">{NO}</span>'
    paths_note = (t("pro.row.paths.noteSoon", n=n_pro) if not live
                  else t("pro.row.paths.note", n=n_live, soon=", ".join(p.get("title", "") for p in soon)) if soon
                  else t("pro.row.paths.noteAll", n=n_live))
    rows = [
        ("pro.row.ltt", t("pro.row.ltt.note", n=len(ctx.path["chapters"])), True),
        ("pro.row.gym", t("pro.row.gym.note"), True),
        ("pro.row.glossary", t("pro.row.glossary.note"), True),
        ("pro.row.board", t("pro.row.board.note"), True),
        ("pro.row.cert", t("pro.row.cert.note"), True),
        ("pro.row.paths", paths_note, False),
        ("pro.row.proCert", t("pro.row.proCert.note"), False),
    ]
    table = "".join(f'''<tr><th scope="row"><b>{esc(t(k))}</b><span>{esc(note)}</span></th>
  <td>{cell_yes if free else cell_no}</td><td>{cell_pro}</td></tr>''' for k, note, free in rows)

    # the same Pro path card component as All paths and home (pages.home.pro_card)
    cards = [pro_card(t, base, p) for p in pro_paths]

    body = f'''<div class="ac-wrap ac-ref ac-pro">
  <section class="ac-pro-hero" aria-labelledby="pro-title">
    <div class="ac-pro-hero__copy">
      <div class="ac-pro-for-free">
        <span class="ac-eyebrow">{esc(t("pro.eyebrow"))}</span>
        <h1 id="pro-title" class="ac-h1">{esc(t("pro.title"))}</h1>
        <p class="ac-lead">{esc(t("pro.lead", n=n_pro))}</p>
        <div class="ac-row ac-pro-hero__cta">
          <a class="ac-btn ac-btn--white ac-btn--lg" href="{plans}">{esc(t("pro.cta"))}</a>
          <span class="ac-pro-hero__note">{esc(t("pro.included"))}</span>
        </div>
      </div>
      <div class="ac-pro-for-member">
        <span class="ac-eyebrow">{esc(t("pro.member.eyebrow"))}</span>
        <h1 id="pro-title-m" class="ac-h1">{esc(t("pro.member.title"))}</h1>
        <p class="ac-lead">{esc(t("pro.member.lead"))}</p>
        <div class="ac-row ac-pro-hero__cta">
          <a class="ac-btn ac-btn--white ac-btn--lg" href="{base}paths/index.html">{esc(t("pro.member.cta"))}</a>
          <span class="ac-pro-hero__note">{esc(t("pro.member.note"))}</span>
        </div>
      </div>
    </div>
    {img(base, "rico/present.webp", t("pro.rico.alt"), "ac-pro-hero__rico", lazy=False)}
  </section>

  <section class="ac-pro-table-wrap" aria-label="{esc(t("pro.table.aria"))}">
    <table class="ac-pro-table">
      <thead><tr><th scope="col">{esc(t("pro.table.what"))}</th><th scope="col">{esc(t("pro.table.free"))}</th><th scope="col" class="ac-pro-table__pro"><span class="ac-pro-table__pill">{esc(t("pro.table.pro"))}</span></th></tr></thead>
      <tbody>{table}</tbody>
    </table>
  </section>

  <section class="ac-ref-section" aria-labelledby="pro-paths">
    <div class="ac-pro-paths-head">
      <h2 id="pro-paths" class="ac-h2 ac-section-title">{esc(t("pro.paths.title"))}</h2>
      <span class="ac-ref-note">{esc(t("pro.paths.lead"))}</span>
    </div>
    <div class="ac-pgrid ac-pro-paths">{"".join(cards)}</div>
  </section>

  <section class="ac-card ac-pro-incl ac-pro-for-free" aria-labelledby="pro-incl">
    <span class="ac-pro-incl__icon">{STAR}</span>
    <div class="ac-pro-incl__text"><h2 id="pro-incl" class="ac-h3">{esc(t("pro.incl.title"))}</h2><p>{esc(t("pro.incl.text"))}</p></div>
    <a class="ac-btn ac-btn--pro" href="{plans}">{esc(t("pro.cta"))}</a>
  </section>
  <section class="ac-card ac-pro-incl ac-pro-for-member" aria-labelledby="pro-incl-m">
    <span class="ac-pro-incl__icon">{STAR}</span>
    <div class="ac-pro-incl__text"><h2 id="pro-incl-m" class="ac-h3">{esc(t("pro.member.incl.title"))}</h2><p>{esc(t("pro.member.incl.text"))}</p></div>
  </section>

  {faq_grid(t, "pro.faq", 3, "pro.faq.title", "pro-faq")}
  {disclaimer(t)}
</div>'''
    yield route, lib.page(t, route=route, title=t("pro.meta.title"), description=t("pro.meta.description", n=n_pro), body=body,
                          active="paths", index=True, css=("learn-pages.css", "ref-pages.css"), js=("ref-pages.js",), body_class="ac-page-pro",
                          data={"ac-ref": {"page": "pro"}}, jsonld=[faq_jsonld(t, "pro.faq", 3)])
