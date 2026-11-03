"""Search (/academy/search?q=): client-side search over lessons, chapters, glossary terms and paths.
The page ships a small index (#ac-ref); ref-pages.js ranks, groups and renders results with the learner's state."""
import json

import lib
from lib import esc
from pages.glossary import usage, chapter_numbers
from pages.how import base_of, disclaimer, img

ICON = ('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
        'aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>')


def _index(ctx):
    use = usage(ctx)
    path_title = ctx.path["title"]
    chapters = []
    for c in ctx.path["chapters"]:
        full = ctx.chapters.get(c["id"])
        chapters.append({"id": c["id"], "n": c["n"], "t": c["title"], "s": c["short"], "d": c.get("promise") or (full or {}).get("promise", ""),
                         "a": bool(c.get("available")), "l": (full or {}).get("lessons", []) if full else [],
                         "nl": len((full or {}).get("lessons") or c.get("lessons") or [])})
    lessons = []
    for i, lid in enumerate(ctx.lesson_order):
        les = ctx.lessons[lid]
        ch = ctx.chapter_of(lid)
        heads = [c.get("title") for c in les.get("cards", []) if isinstance(c.get("title"), str)]
        linked = sorted({tid for tid, u in use.items() if lid in u["lessons"]})
        kw = " ".join(heads + [ctx.glossary[x]["term"] for x in linked if x in ctx.glossary])
        lessons.append({"id": lid, "c": ch["id"], "cn": ch["n"], "cs": ch["short"], "n": les["n"], "t": les["title"],
                        "d": les.get("desc", ""), "m": les["minutes"], "k": kw[:400], "i": i})
    # chapters not authored yet still list their lesson titles: searchable, shown as coming soon
    for c in ctx.path["chapters"]:
        if c.get("available"):
            continue
        for j, title in enumerate(c.get("lessons") or [], 1):
            lessons.append({"id": "", "c": c["id"], "cn": c["n"], "cs": c["short"], "n": j, "t": title, "d": "", "m": 0, "k": "", "soon": True})
    terms = [{"id": k, "t": v["term"], "d": v["short"], "r": [r for r in v.get("related", []) if r in ctx.glossary][:4],
              "ch": chapter_numbers(ctx, k, use)} for k, v in ctx.glossary.items()]
    paths = []
    for p in ctx.catalog.get("paths", []):
        ch = p.get("chapters")
        paths.append({"id": p.get("id"), "t": p.get("title", ""), "d": p.get("outcome") or p.get("intro") or p.get("desc", ""),
                      "tier": p.get("tier", "pro"), "nc": ch if isinstance(ch, int) else len(ch or []),
                      "soon": p.get("status") == "soon" or p.get("soon") is True or p.get("available") is False,
                      "href": p.get("route") or (ctx.path["id"] if p.get("id") == ctx.path["id"] else "paths/" + p.get("id", ""))})
    if not any(p["id"] == ctx.path["id"] for p in paths):
        paths.insert(0, {"id": ctx.path["id"], "t": path_title, "d": ctx.path.get("outcome", ""), "tier": ctx.path.get("tier", "free"),
                         "nc": len(ctx.path["chapters"]), "soon": False, "href": ctx.path["id"]})
    suggest = [ctx.glossary[k]["term"] for k in list(ctx.glossary)[:4]]
    return {"page": "search", "path": {"id": ctx.path["id"], "t": path_title}, "chapters": chapters, "lessons": lessons,
            "terms": terms, "paths": paths, "suggest": suggest}


def index_json(ctx):
    """The same index as a file (static/data/search-index.js) for the top bar's search panel, on every page."""
    d = _index(ctx)
    d.pop("page", None)
    return json.dumps(d, ensure_ascii=False, separators=(",", ":"))


def routes(ctx):
    t = ctx.t
    route = "search"
    base = base_of(route)
    tabs = "".join(
        f'<button type="button" role="tab" class="ac-search-tab{" is-on" if k == "all" else ""}" aria-selected="{"true" if k == "all" else "false"}" '
        f'data-tab="{k}"{"" if k in ("all", "lessons", "terms", "chapters") else " hidden"}>{esc(t("search.tab." + k))}<span class="ac-search-tab__n ac-num" data-tab-n>0</span></button>'
        for k in ("all", "lessons", "terms", "chapters", "paths"))
    body = f'''<div class="ac-wrap ac-ref ac-search">
  <h1 class="ac-sr">{esc(t("search.title"))}</h1>
  <div class="ac-search-top">
    <form class="ac-search-box" role="search" action="index.html" method="get" data-search-form>
      {ICON}
      <input type="search" name="q" aria-label="{esc(t("search.label"))}" placeholder="{esc(t("search.placeholder"))}" autocomplete="off" data-search-input>
      <span class="ac-search-box__count ac-num" data-search-count aria-live="polite"></span>
    </form>
    <div class="ac-search-tabs" role="tablist" aria-label="{esc(t("search.tabs"))}" data-search-tabs hidden>{tabs}</div>
  </div>
  <div class="ac-search-grid">
    <div class="ac-search-results" data-search-results></div>
    <aside class="ac-search-aside">
      <section class="ac-search-tip" aria-labelledby="tip-title" data-search-tip hidden>
        <span class="ac-eyebrow">{esc(t("search.tip.eyebrow"))}</span>
        <b id="tip-title" class="ac-search-tip__title" data-tip-title></b>
        <p class="ac-search-tip__text" data-tip-text></p>
        <div class="ac-search-tip__foot">
          <a class="ac-btn ac-btn--white ac-btn--sm" href="#" data-tip-cta></a>
          {img(base, "rico/think.webp", t("search.tip.rico"), "ac-search-tip__rico")}
        </div>
      </section>
      <section class="ac-card ac-search-related" aria-labelledby="related-title" data-search-related hidden>
        <h2 id="related-title" class="ac-ref-label">{esc(t("search.related"))}</h2>
        <div class="ac-ref-chips" data-related-list></div>
      </section>
    </aside>
  </div>
  {disclaimer(t)}
</div>'''
    yield route, lib.page(t, route=route, title=t("search.meta.title"), description=t("search.meta.description"), body=body,
                          active="search", index=False, css=("ref-pages.css",), js=("ref-pages.js",), body_class="ac-page-search",
                          data={"ac-ref": _index(ctx)})
