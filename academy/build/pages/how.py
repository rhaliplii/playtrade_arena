"""How progress works (/academy/how-it-works): XP rules, the five ranks and their level thresholds, skills,
finishing a path, the learning loop and FAQs. Everything is SSR (indexable); ref-pages.js marks the learner's
rank, their XP bar and unlocked skills. Also holds small helpers the other ref pages share."""
import math

import lib
from lib import esc
from pages import path as _path

# XP and rank rules come from one Python source, pages/path.py (which mirrors static/js/engine.js).
# The few values path.py doesn't carry yet fall back to the engine's numbers.
FIRST_TRY = getattr(_path, "FIRST_TRY_XP", 10)
LEGEND_STEP = getattr(_path, "LEGEND_STEP", 5000)


def _ranks():
    """(id, first level, last level, start XP, XP per level), derived from path.RANKS."""
    out = []
    for i, (rid, lo, hi, start) in enumerate(_path.RANKS):
        nxt = _path.RANKS[i + 1][3] if i + 1 < len(_path.RANKS) else None
        step = (nxt - start) / (hi - lo + 1) if (hi and nxt is not None) else LEGEND_STEP
        out.append((rid, lo, hi, start, step))
    return out


RANKS = _ranks()
XP = {"finish": getattr(_path, "LESSON_FINISH_XP", _path.LESSON_XP - 3 * FIRST_TRY), "firstTry": FIRST_TRY,
      "challengeQ": _path.CHALLENGE_Q_XP, "challengePerfect": _path.CHALLENGE_PERFECT,
      "gym": getattr(_path, "GYM_XP", 30), "path": _path.PATH_XP}
COINS_PATH = _path.PATH_COINS


def level_start(lv):
    for _id, lo, hi, start, step in RANKS:
        if lv >= lo and (hi is None or lv <= hi):
            return int(math.floor((start + (lv - lo) * step) / 10.0 + 0.5)) * 10
    return 0


# ------------------------------------------------------------------ shared bits for the ref pages
def faq_grid(t, prefix, count, title_key, heading_id, **v):
    items = []
    for i in range(1, count + 1):
        items.append(f'<div class="ac-ref-faq__item"><h3 class="ac-h3">{esc(t(f"{prefix}.{i}.q", **v))}</h3>'
                     f'<p class="ac-ref-faq__a">{esc(t(f"{prefix}.{i}.a", **v))}</p></div>')
    return (f'<section class="ac-ref-section" aria-labelledby="{heading_id}">'
            f'<h2 id="{heading_id}" class="ac-h2 ac-section-title">{esc(t(title_key))}</h2>'
            f'<div class="ac-ref-faq">{"".join(items)}</div></section>')


def faq_jsonld(t, prefix, count, **v):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": t(f"{prefix}.{i}.q", **v),
         "acceptedAnswer": {"@type": "Answer", "text": t(f"{prefix}.{i}.a", **v)}} for i in range(1, count + 1)]}


def disclaimer(t, key="footer.disclaimer"):
    return f'<p class="ac-ref-disclaimer">{esc(t(key))}</p>'


def img(base, rel, alt, cls, lazy=True):
    load = ' loading="lazy"' if lazy else ' fetchpriority="high"'
    return f'<img class="{cls}" src="{base}static/img/{rel}" alt="{esc(alt)}"{load} decoding="async">'


def base_of(route):
    return "../" * len([p for p in route.strip("/").split("/") if p])


SKILL_ICONS = [
    '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
    '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
    '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="m9 13 2 2 4-4"/>',
]


def svg(paths, size=20, width=2):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{width}" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths}</svg>')


def _nch(p):
    ch = p.get("chapters")
    n = ch if isinstance(ch, int) else len(ch or [])
    return n or len(p.get("topics") or [])   # a coming-soon path without an outline: one chapter per listed topic


# ------------------------------------------------------------------ page
def routes(ctx):
    t = ctx.t
    route = "how-it-works"
    base = base_of(route)
    fn = lib.fmt_num

    # ranks
    cards = []
    for i, (rid, lo, hi, start, _step) in enumerate(RANKS):
        nxt = RANKS[i + 1][3] if i + 1 < len(RANKS) else None
        levels = t("how.ranks.levels", **{"from": lo, "to": hi}) if hi else t("how.ranks.levelsOpen", **{"from": lo})
        xp = t("how.ranks.xp", **{"from": fn(start), "to": fn(nxt)}) if nxt else t("how.ranks.xpOpen", **{"from": fn(start)})
        name = t(f"rank.{rid}")
        cards.append(f'''<li class="ac-how-rank ac-how-rank--{rid}" data-rank="{rid}">
  <span class="ac-how-rank__here">{esc(t("how.ranks.here"))}</span>
  <span class="ac-how-rank__levels">{esc(levels)}</span>
  <h3 class="ac-how-rank__name">{esc(name)}</h3>
  <span class="ac-how-rank__xp">{esc(xp)}</span>
  <span class="ac-how-rank__purpose">{esc(t(f"how.rank.purpose.{rid}"))}</span>
  {img(base, f"ranks/{rid}.webp", t("how.ranks.alt", rank=name), "ac-how-rank__img")}
</li>''')

    # every level (SSR so search engines and screen readers get the thresholds)
    last = RANKS[-1][1] + 3
    rows = []
    for rid, lo, hi, _s, _st in RANKS:
        top = hi if hi else last
        cells = "".join(f'<li><span>{esc(t("level.short", n=lv))}</span><b class="ac-num">{fn(level_start(lv))}</b></li>' for lv in range(lo, top + 1))
        rows.append(f'<div class="ac-how-levels__rank"><h3 class="ac-how-levels__name ac-how-levels__name--{rid}">{esc(t(f"rank.{rid}"))}</h3><ul class="ac-how-levels__list">{cells}</ul></div>')
    levels_block = (f'<details class="ac-how-levels"><summary>{esc(t("how.levels.toggle"))}</summary>'
                    f'<div class="ac-how-levels__body">{"".join(rows)}'
                    f'<p class="ac-fine">{esc(t("how.levels.note", n=RANKS[-1][1], step=fn(RANKS[-1][4])))}</p></div></details>')

    you = f'''<a class="ac-how-you" href="{base}me/index.html" data-how-you>
  <b class="ac-how-you__who">{esc(t("how.you.label"))} · <span class="ac-how-you__rank" data-bind="rank">{esc(t("rank.rookie"))}</span> · <span data-how-level>{esc(t("how.you.level", n=1))}</span></b>
  <span class="ac-how-you__bar"><span data-bind-width="level" style="width:0%"></span></span>
  <span class="ac-how-you__xp"><b data-how-xp>{esc(t("how.you.xp", n=0))}</b> · <span data-how-next>{esc(t("how.you.toNext", n=fn(1000), rank=t("rank.analyst")))}</span></span>
</a>'''

    # earn XP
    xp_rows = [("how.xp.lesson", XP["finish"]), ("how.xp.firstTry", XP["firstTry"]), ("how.xp.challengeQ", XP["challengeQ"]),
               ("how.xp.perfect", XP["challengePerfect"]), ("how.xp.gym", XP["gym"]), ("how.xp.path", XP["path"])]
    xp_html = "".join(f'<li class="ac-ref-row"><span>{esc(t(k))}</span><b class="ac-num ac-ref-row__xp">{esc(t("how.xp.plus", n=v))}</b></li>' for k, v in xp_rows)

    # skills (from the path)
    n_chapters = len(ctx.path["chapters"])
    by_n = {c["n"]: c for c in ctx.path["chapters"]}
    skills = ctx.path.get("skills") or []
    sk_html = []
    for i, s in enumerate(skills):
        finish = s["after"] >= n_chapters
        where = t("how.skills.finish") if finish else t("how.skills.after", n=s["after"])
        ch = by_n.get(s["after"])
        sk_html.append(f'''<li class="ac-how-skill" data-skill-chapter="{esc(ch["id"]) if ch and not finish else ""}" data-skill-finish="{"1" if finish else ""}">
  <span class="ac-how-skill__icon">{svg(SKILL_ICONS[i % len(SKILL_ICONS)])}</span>
  <span class="ac-how-skill__text"><b>{esc(s["name"])}</b><span>{esc(where)}</span></span>
  <span class="ac-how-skill__state" data-on="{esc(t("how.skills.unlocked"))}">{esc(t("how.skills.locked"))}</span>
</li>''')
    final_skill = next((s["name"] for s in skills if s["after"] >= n_chapters), None)

    finish_rows = [
        (t("how.finish.xp"), t("how.xp.plus", n=XP["path"]), "ac-ref-row__xp"),
        (t("how.finish.coins"), t("how.xp.plus", n=COINS_PATH), "ac-ref-row__coins"),
        (t("how.finish.certificate"), t("how.finish.shareable"), ""),
    ]
    if final_skill:
        finish_rows.append((t("how.finish.skill", name=final_skill), t("how.finish.unlocked"), ""))   # "Unlocks": you get it on finishing
    finish_html = "".join(f'<li class="ac-ref-row"><span>{esc(a)}</span><b class="ac-num {c}">{esc(b)}</b></li>' for a, b, c in finish_rows)

    steps = "".join(f'''<li class="ac-how-step"><span class="ac-how-step__n ac-num">{i}</span>
  <h3 class="ac-h3">{esc(t(f"how.loop.{i}.title"))}</h3><p>{esc(t(f"how.loop.{i}.text"))}</p></li>''' for i in range(1, 5))
    # ranges from the content, so they can't drift: chapters per path (catalog) and lessons per chapter (free path)
    def rng(vals):
        vals = [v for v in vals if v]
        return t("how.fact.range", a=min(vals), b=max(vals)) if vals and min(vals) != max(vals) else str(vals[0] if vals else "")
    n_ch = [_nch(p) for p in ctx.catalog.get("paths", [])] or [len(ctx.path["chapters"])]
    n_ls = [len(c.get("lessons") or []) or len((ctx.chapters.get(c["id"]) or {}).get("lessons") or []) for c in ctx.path["chapters"]]
    fact_v = {"path": rng(n_ch), "chapter": rng(n_ls)}
    facts = "".join(f'''<div class="ac-how-fact"><dt>{esc(t(f"how.fact.{k}.k"))}</dt><dd><b class="ac-num">{esc(fact_v.get(k) or t(f"how.fact.{k}.v"))}</b><span>{esc(t(f"how.fact.{k}.d"))}</span></dd></div>'''
                    for k in ("path", "chapter", "lesson", "goal"))

    body = f'''<div class="ac-wrap ac-ref">
  <header class="ac-hero ac-ref-hero">
    <div class="ac-ref-hero__copy">
      <span class="ac-eyebrow">{esc(t("how.eyebrow"))}</span>
      <h1 class="ac-h1 ac-ref-hero__title">{esc(t("how.title"))}</h1>
      <p class="ac-lead">{esc(t("how.lead"))}</p>
    </div>
    {img(base, "rico/present.webp", t("how.rico.alt"), "ac-ref-hero__rico", lazy=False)}
  </header>

  <section class="ac-ref-section" aria-labelledby="how-ranks">
    <h2 id="how-ranks" class="ac-h2 ac-section-title">{esc(t("how.ranks.title"))}</h2>
    <ol class="ac-how-ranks">{"".join(cards)}</ol>
    {you}
    {levels_block}
  </section>

  <div class="ac-how-cols">
    <section class="ac-card ac-how-col" aria-labelledby="how-xp">
      <h2 id="how-xp" class="ac-ref-label">{esc(t("how.xp.title"))}</h2>
      <ul class="ac-ref-rows">{xp_html}</ul>
      <p class="ac-ref-note">{esc(t("how.xp.note"))}</p>
    </section>
    <section class="ac-card ac-how-col ac-how-col--skills" aria-labelledby="how-skills">
      <h2 id="how-skills" class="ac-ref-label">{esc(t("how.skills.title"))}</h2>
      <p class="ac-ref-note ac-ref-note--top">{esc(t("how.skills.lead"))}</p>
      <ul class="ac-how-skills">{"".join(sk_html)}</ul>
      <p class="ac-ref-note">{esc(t("how.skills.note"))}</p>
    </section>
    <section class="ac-card ac-how-col" aria-labelledby="how-finish">
      <h2 id="how-finish" class="ac-ref-label">{esc(t("how.finish.title"))}</h2>
      <ul class="ac-ref-rows">{finish_html}</ul>
      <div class="ac-how-finish">
        <b>{esc(t("how.finish.howTitle"))}</b>
        <span>{esc(t("how.finish.howText"))}</span>
        <span class="ac-small">{esc(t("how.finish.coinsNote"))}</span>
      </div>
    </section>
  </div>

  <section class="ac-ref-section" aria-labelledby="how-loop">
    <h2 id="how-loop" class="ac-h2 ac-section-title">{esc(t("how.loop.title"))}</h2>
    <ol class="ac-how-steps">{steps}</ol>
    <dl class="ac-how-facts">{facts}</dl>
  </section>

  {faq_grid(t, "how.faq", 6, "how.faq.title", "how-faq")}
  {disclaimer(t)}
</div>'''

    html = lib.page(t, route=route, title=t("how.meta.title"), description=t("how.meta.description"), body=body,
                    active="how", index=True, css=("ref-pages.css",), js=("ref-pages.js",), body_class="ac-page-how",
                    data={"ac-ref": {"page": "how", "path": ctx.path["id"], "chapters": [c["id"] for c in ctx.path["chapters"]],
                                     "ranks": [r[0] for r in RANKS]}},
                    jsonld=[faq_jsonld(t, "how.faq", 6)])
    yield route, html
