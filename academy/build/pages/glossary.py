"""Glossary: /academy/glossary (A–Z index, search, categories) and /academy/glossary/<term> for every term
(definition, example, why it matters, related terms, the lessons that use it, JSON-LD DefinedTerm). All SSR;
ref-pages.js filters the list as you type."""
import re

import lib
from lib import esc
from pages.how import base_of, disclaimer, img

TERM_LINK = re.compile(r"\[\[([a-z0-9-]+)\|")
CUR_TRUE = ' aria-current="true"'
CUR_PAGE = ' aria-current="page"'
CATEGORIES = ["Markets", "Orders", "Costs", "Risk", "Charts", "Psychology", "Fundamentals", "Economy", "Portfolio"]
SEARCH_ICON = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
               'aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>')


def _strings(v):
    if isinstance(v, str):
        yield v
    elif isinstance(v, dict):
        for x in v.values():
            yield from _strings(x)
    elif isinstance(v, list):
        for x in v:
            yield from _strings(x)


def usage(ctx):
    """term id → {"lessons": [lesson ids in path order, most links first], "chapters": [chapter ids that list it]}"""
    out = {}
    for lid in ctx.lesson_order:
        counts = {}
        for s in _strings(ctx.lessons[lid].get("cards", [])):
            for tid in TERM_LINK.findall(s):
                counts[tid] = counts.get(tid, 0) + 1
        for tid, n in counts.items():
            out.setdefault(tid, {"lessons": [], "chapters": [], "weight": {}})
            out[tid]["lessons"].append(lid)
            out[tid]["weight"][lid] = n
    for cid, ch in ctx.chapters.items():
        for tid in ch.get("terms", []):
            out.setdefault(tid, {"lessons": [], "chapters": [], "weight": {}})
            if cid not in out[tid]["chapters"]:
                out[tid]["chapters"].append(cid)
    return out


def chapter_numbers(ctx, tid, use):
    """Chapter numbers where a term shows up (linked in a lesson or listed by the chapter), ascending."""
    u = use.get(tid) or {}
    ns = {ctx.chapter_of(l)["n"] for l in u.get("lessons", [])} | {ctx.chapters[c]["n"] for c in u.get("chapters", [])}
    return sorted(ns)


def sort_key(term):
    return re.sub(r"[^a-z0-9]", "", term.lower())


def letter_of(term):
    k = sort_key(term)
    return k[0].upper() if k and k[0].isalpha() else "#"


def lesson_route(ctx, lid):
    return f'{ctx.path["id"]}/{ctx.lessons[lid]["chapter"]}/{lid}'


def _aside(ctx, t, base, terms, current=None):
    letters = sorted({letter_of(v["term"]) for v in terms.values()})
    cur_letter = letter_of(terms[current]["term"]) if current else None
    gl = f"{base}glossary/index.html"
    lt = "".join(
        f'<a class="ac-gl-letter{" is-on" if c == cur_letter else ""}" href="{gl}#letter-{esc(c)}"'
        f'{CUR_TRUE if c == cur_letter else ""} aria-label="{esc(t("glossary.letter.aria", c=c))}">{esc(c)}</a>' for c in letters)
    listing = ""
    if current:
        same = sorted([k for k, v in terms.items() if letter_of(v["term"]) == cur_letter], key=lambda k: sort_key(terms[k]["term"]))
        items = "".join(
            f'<a class="ac-gl-navterm{" is-on" if k == current else ""}" href="{base}glossary/{k}/index.html"'
            f'{CUR_PAGE if k == current else ""}>{esc(terms[k]["term"])}</a>' for k in same)
        listing = (f'<div class="ac-gl-aside__rule"></div><span class="ac-ref-label" data-gl-group>{esc(cur_letter)}</span>'
                   f'<nav class="ac-gl-navterms" aria-label="{esc(t("glossary.letter.aria", c=cur_letter))}" data-gl-group>{items}</nav>')
    else:
        cats = "".join(
            f'<button type="button" class="ac-gl-cat" data-gl-cat="{esc(c)}" aria-pressed="false">{esc(t("glossary.cat." + c))}</button>'
            for c in CATEGORIES if any(v["category"] == c for v in terms.values()))
        listing = (f'<div class="ac-gl-aside__rule"></div><span class="ac-ref-label">{esc(t("glossary.categories"))}</span>'
                   f'<div class="ac-gl-cats"><button type="button" class="ac-gl-cat is-on" data-gl-cat="" aria-pressed="true">{esc(t("glossary.cat.all"))}</button>{cats}</div>')
    return f'''<aside class="ac-card ac-gl-aside" aria-label="{esc(t("glossary.aside"))}">
  <h2 class="ac-h2">{esc(t("glossary.title"))}</h2>
  <label class="ac-gl-search">{SEARCH_ICON}<span class="ac-sr">{esc(t("glossary.search.label"))}</span>
    <input type="search" data-gl-search placeholder="{esc(t("glossary.search.placeholder", n=len(terms)))}" autocomplete="off"></label>
  <nav class="ac-gl-letters" aria-label="{esc(t("glossary.letters"))}" data-gl-group>{lt}</nav>
  {listing}
  <div class="ac-gl-matches" data-gl-matches hidden><span class="ac-ref-label">{esc(t("glossary.matches"))}</span><nav class="ac-gl-navterms" data-gl-match-list></nav>
    <p class="ac-ref-note" data-gl-none hidden></p></div>
</aside>'''


def _search_data(ctx, terms):
    return [{"id": k, "t": v["term"], "s": v["short"], "c": v["category"]} for k, v in terms.items()]


def _index(ctx, t, terms, use):
    route = "glossary"
    base = base_of(route)
    ordered = sorted(terms, key=lambda k: sort_key(terms[k]["term"]))
    groups = {}
    for k in ordered:
        groups.setdefault(letter_of(terms[k]["term"]), []).append(k)
    sections = []
    for c in sorted(groups):
        cards = "".join(f'''<li class="ac-gl-item" data-gl-item data-cat="{esc(terms[k]["category"])}" data-q="{esc((terms[k]["term"] + " " + terms[k]["short"]).lower())}">
  <a class="ac-gl-card" href="{base}glossary/{k}/index.html"><b>{esc(terms[k]["term"])}</b><span>{esc(terms[k]["short"])}</span>
  <span class="ac-gl-card__cat">{esc(t("glossary.cat." + terms[k]["category"]))}</span></a></li>''' for k in groups[c])
        sections.append(f'<section class="ac-gl-letterblock" id="letter-{esc(c)}" data-gl-letter aria-labelledby="gl-h-{esc(c)}">'
                        f'<h2 id="gl-h-{esc(c)}" class="ac-ref-label">{esc(c)}</h2><ul class="ac-gl-grid">{cards}</ul></section>')
    body = f'''<div class="ac-wrap ac-gl">
  {_aside(ctx, t, base, terms)}
  <div class="ac-gl-main">
    <div class="ac-gl-head">
      <h1 class="ac-h1">{esc(t("glossary.index.title"))}</h1>
      <p class="ac-gl-lead">{esc(t("glossary.index.lead"))}</p>
      <span class="ac-ref-note" data-gl-count data-n="{len(terms)}">{esc(t("glossary.count", n=len(terms)))}</span>
    </div>
    {"".join(sections)}
    <p class="ac-gl-empty" data-gl-empty hidden></p>
    {disclaimer(t)}
  </div>
</div>'''
    url = f"{lib.ORIGIN}/academy/glossary/"
    ld = {"@context": "https://schema.org", "@type": "DefinedTermSet", "@id": url, "name": t("glossary.index.title"), "url": url,
          "hasDefinedTerm": [{"@type": "DefinedTerm", "name": terms[k]["term"], "description": terms[k]["short"],
                              "url": f"{url}{k}/"} for k in ordered]}
    return route, lib.page(t, route=route, title=t("glossary.meta.title", n=len(terms)), description=t("glossary.meta.description"),
                           body=body, active="glossary", index=True, css=("ref-pages.css",), js=("ref-pages.js",),
                           body_class="ac-page-glossary", data={"ac-ref": {"page": "glossary", "terms": _search_data(ctx, terms)}},
                           jsonld=[ld])


def _term(ctx, t, terms, use, k):
    v = terms[k]
    route = f"glossary/{k}"
    base = base_of(route)
    cards = []
    if v.get("example"):
        cards.append(f'''<section class="ac-card ac-gl-box" aria-labelledby="gl-ex"><h2 id="gl-ex" class="ac-ref-label ac-ref-label--mint">{esc(t("glossary.example"))}</h2>
  <p class="ac-gl-box__lead">{lib.rich(v["example"])}</p></section>''')
    if v.get("long"):
        paras = [p.strip() for p in re.split(r"\n\s*\n|\n", v["long"]) if p.strip()]
        ps = "".join(f'<p class="{"ac-gl-box__lead" if i == 0 else "ac-gl-box__text"}">{lib.rich(p)}</p>' for i, p in enumerate(paras))
        cards.append(f'<section class="ac-card ac-gl-box" aria-labelledby="gl-why"><h2 id="gl-why" class="ac-ref-label ac-ref-label--amber">{esc(t("glossary.why"))}</h2>{ps}</section>')
    boxes = f'<div class="ac-gl-boxes{" ac-gl-boxes--one" if len(cards) == 1 else ""}">{"".join(cards)}</div>' if cards else ""

    rel = [r for r in v.get("related", []) if r in terms and r != k]
    related = ""
    if rel:
        chips = "".join(f'<a class="ac-ref-chip" href="{base}glossary/{r}/index.html">{esc(terms[r]["term"])}</a>' for r in rel)
        related = f'<div class="ac-gl-related"><span class="ac-gl-related__label">{esc(t("glossary.related"))}</span>{chips}</div>'

    # lessons that use it: the lesson that links it most is the banner, the rest are listed
    u = use.get(k) or {"lessons": [], "chapters": [], "weight": {}}
    lessons = sorted(u["lessons"], key=lambda l: (-u["weight"].get(l, 0), ctx.lesson_order.index(l)))
    banner, more = "", ""
    if lessons:
        lid = lessons[0]
        les, ch = ctx.lessons[lid], ctx.chapter_of(lessons[0])
        banner = f'''<section class="ac-banner ac-gl-banner" aria-labelledby="gl-lesson">
  <div class="ac-gl-banner__copy">
    <span class="ac-eyebrow">{esc(t("glossary.lesson.eyebrow", n=les["minutes"]))}</span>
    <h2 id="gl-lesson" class="ac-h2">{esc(les["title"])}</h2>
    <span class="ac-gl-banner__where">{esc(t("glossary.lesson.where", path=ctx.path["title"], n=ch["n"], short=ch["short"]))}</span>
    <a class="ac-btn ac-btn--white ac-gl-banner__cta" href="{base}{lesson_route(ctx, lid)}/index.html">{esc(t("glossary.lesson.cta"))}</a>
  </div>
  {img(base, "rico/present.webp", t("glossary.rico.alt"), "ac-gl-banner__rico")}
</section>'''
        rest = lessons[1:6]
        if rest:
            items = "".join(f'''<li><a class="ac-gl-lesson" href="{base}{lesson_route(ctx, l)}/index.html"><span class="ac-gl-lesson__where">{esc(t("glossary.lesson.where", path=ctx.path["title"], n=ctx.chapter_of(l)["n"], short=ctx.chapter_of(l)["short"]))}</span>
  <b>{esc(ctx.lessons[l]["title"])}</b></a></li>''' for l in rest)
            more = f'<section class="ac-ref-section ac-gl-more" aria-labelledby="gl-more"><h2 id="gl-more" class="ac-ref-label">{esc(t("glossary.lesson.also"))}</h2><ul class="ac-gl-lessons">{items}</ul></section>'
    elif u["chapters"]:
        ch = ctx.chapters[u["chapters"][0]]
        banner = f'''<section class="ac-banner ac-gl-banner" aria-labelledby="gl-lesson">
  <div class="ac-gl-banner__copy">
    <span class="ac-eyebrow">{esc(t("glossary.chapter.eyebrow"))}</span>
    <h2 id="gl-lesson" class="ac-h2">{esc(ch["title"])}</h2>
    <span class="ac-gl-banner__where">{esc(t("glossary.chapter.where", path=ctx.path["title"], n=ch["n"]))}</span>
    <a class="ac-btn ac-btn--white ac-gl-banner__cta" href="{base}{ctx.path["id"]}/{ch["id"]}/index.html">{esc(t("glossary.chapter.cta"))}</a>
  </div>
  {img(base, "rico/present.webp", t("glossary.rico.alt"), "ac-gl-banner__rico")}
</section>'''

    body = f'''<div class="ac-wrap ac-gl">
  {_aside(ctx, t, base, terms, current=k)}
  <article class="ac-gl-main">
    <div class="ac-gl-head">
      <nav class="ac-gl-crumb" aria-label="{esc(t("glossary.breadcrumb"))}"><a href="{base}glossary/index.html">{esc(t("glossary.title"))}</a><span aria-hidden="true">/</span><span>{esc(t("glossary.cat." + v["category"]))}</span></nav>
      <h1 class="ac-h1">{esc(v["term"])}</h1>
      <p class="ac-gl-lead">{lib.rich(v["short"])}</p>
    </div>
    {boxes}
    {related}
    {banner}
    {more}
    {disclaimer(t)}
  </article>
</div>'''
    url = f"{lib.ORIGIN}/academy/glossary/{k}/"
    ld = {"@context": "https://schema.org", "@type": "DefinedTerm", "@id": url, "name": v["term"], "description": v["short"],
          "url": url, "termCode": k,
          "inDefinedTermSet": {"@type": "DefinedTermSet", "@id": f"{lib.ORIGIN}/academy/glossary/", "name": t("glossary.index.title")}}
    desc = v["short"] if len(v["short"]) <= 160 else v["short"][:157].rsplit(" ", 1)[0] + "…"
    return route, lib.page(t, route=route, title=t("glossary.term.meta.title", term=v["term"]), description=desc, body=body,
                           active="glossary", index=True, css=("ref-pages.css",), js=("ref-pages.js",), body_class="ac-page-glossary",
                           data={"ac-ref": {"page": "term", "terms": _search_data(ctx, terms)},
                                 "ac-glossary": {x: {"term": y["term"], "short": y["short"]} for x, y in terms.items()}}, jsonld=[ld])


def routes(ctx):
    t = ctx.t
    terms = ctx.glossary
    use = usage(ctx)
    yield _index(ctx, t, terms, use)
    for k in terms:
        yield _term(ctx, t, terms, use, k)
