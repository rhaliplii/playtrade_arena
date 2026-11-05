"""All paths (/academy/paths) and one page per Pro path (/academy/paths/<id>, canvas-path ProPath-*). No Pro lessons are
published yet, so every Pro path is "coming soon": browsable chapters (PRO padlock chapters and the purple Pro
card for everyone without Pro); Pro members (AC.auth.isPro()) see "Included in your plan" and no upgrade prompts.
Catalog: content/<locale>/catalog.json ({"paths": [...]}). Filters (All / Free / Pro / In progress) run in learn-pages.js."""
import lib
from lib import esc, ORIGIN
from pages.path import (art_style, art_picture, fmt_h, CSS, JS, LESSON_XP, ltt, learn_data, icon, rico_src, base_of, href, lesson_route, crumbs,
                        crumbs_ld, chips, disclaimer, segs, challenge_xp, pm_earn, pm_practice, pm_rank, pm_sheet, pm_mstats, pm_min,
                        pm_hero)
from pages.home import pro_paths, pro_card, POSE_BY_KEY, _by_key, accent_var


def routes(ctx):
    t = ctx.t
    L = ltt(ctx)
    pros = pro_paths(ctx)
    data = {"ac-learn": learn_data(ctx, L)}
    first_r = lesson_route(L["id"], *L["first_lesson"]) if L["first_lesson"] else L["id"]

    # ------------------------------------------------------------------ /paths
    route = "paths"
    base = base_of(route, ctx.locale)
    filters = "".join(f'<button type="button" class="ac-filter" aria-pressed="{"true" if k == "all" else "false"}" aria-controls="paths-list" data-filter="{k}">{esc(t("paths.filter." + k))}</button>'
                      for k in ("all", "free", "pro", "progress"))
    featured = pm_hero(t, base, L, href(base, first_r), h1=False, path_map=True, attrs=' data-tier="free" data-feat')
    body = f'''<div class="ac-wrap ac-lp" data-paths-page>
  <header class="ac-pathshead">
    <div class="ac-sechead"><h1 class="ac-h1">{esc(t("paths.title"))}</h1><p class="ac-lead">{esc(t("paths.sub"))}</p></div>
    <div role="group" class="ac-filters" aria-label="{esc(t("paths.filterAria"))}">{filters}</div>
  </header>
  <div class="ac-pathslist" id="paths-list" aria-live="polite">
  {featured}
  <section class="ac-prosec" aria-labelledby="pro-title" data-tier="pro">
    <div class="ac-section-head"><h2 id="pro-title" class="ac-h2">{esc(t("paths.pro"))}</h2></div>
    <div class="ac-pgrid">{"".join(pro_card(t, base, p) for p in pros)}</div>
  </section>
  <p class="ac-empty" data-paths-empty hidden>{esc(t("paths.empty"))} <a href="{href(base, first_r)}">{esc(t("paths.emptyCta"))}</a></p>
  </div>
  <section class="ac-card ac-proband" aria-labelledby="band-title" data-pro-hide>
    <span class="ac-iconbox ac-iconbox--pro ac-iconbox--lg">{icon("star", 22, 2)}</span>
    <div class="ac-proband__text"><b id="band-title">{esc(t("paths.band.title"))}</b><span>{esc(t("paths.band.text"))}</span></div>
    <a class="ac-btn ac-btn--pro" href="{href(base, "pro")}">{esc(t("paths.upgrade"))}</a>
  </section>
  {disclaimer(t)}
</div>'''
    ld = [{"@context": "https://schema.org", "@type": "ItemList", "name": t("paths.title"),
           "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": p["title"],
                                "url": f"{ORIGIN}/academy/{p['id'] if p['id'] == L['id'] else 'paths/' + p['id']}/"}
                               for i, p in enumerate([{"id": L["id"], "title": L["title"]}] + pros)]},
          crumbs_ld([(t("path.crumb.academy"), ""), (t("path.crumb.paths"), "paths")])]
    yield route, lib.page(t, route=route, title=t("paths.meta.title"), description=t("paths.meta.desc"), body=body, active="paths",
                          index=True, css=CSS, js=JS, jsonld=ld, data=data, body_class="ac-page-paths", locale=ctx.locale)

    # ------------------------------------------------------------------ /paths/<pro path>
    for p in pros:
        route = f'paths/{p["id"]}'
        base = base_of(route, ctx.locale)
        body = pro_body(ctx, p, base)
        chs = pro_chapters(p)
        ld = [{"@context": "https://schema.org", "@type": "Course", "name": p["title"], "description": p.get("outcome", ""),
               "url": f"{ORIGIN}/academy/{route}/", "inLanguage": "en-US", "isAccessibleForFree": False,
               "provider": {"@type": "Organization", "name": "Profit.com", "sameAs": ORIGIN},
               "hasCourseInstance": {"@type": "CourseInstance", "courseMode": "online"},
               "syllabusSections": [{"@type": "Syllabus", "name": c["title"], "description": c["desc"]} for c in chs]},
              crumbs_ld([(t("path.crumb.academy"), ""), (t("path.crumb.paths"), "paths"), (p["title"], route)])]
        yield route, lib.page(t, route=route, title=t("paths.pro.meta.title", title=p["title"]),
                              description=t("paths.pro.meta.desc", title=p["title"], outcome=p.get("outcome", "")),
                              body=body, active="paths", index=p.get("status") != "soon", css=CSS, js=JS, jsonld=ld, data=data,
                              body_class="ac-page-propath", locale=ctx.locale)


# ---------------------------------------------------------------------------------------------- Pro path page
def pro_chapters(p):
    """Catalog chapters → the chapter model the page needs (counts come from the content)."""
    raw = p.get("chapters")
    rows = raw if isinstance(raw, list) else [{"title": x} for x in p.get("topics", [])]
    out = []
    for i, c in enumerate(rows):
        ls = c.get("lessons")
        if isinstance(ls, list):
            lessons = [{"n": j + 1, "title": l["title"], "desc": l.get("desc", ""), "minutes": l.get("minutes") or 5} for j, l in enumerate(ls)]
        else:
            lessons = [{"n": j + 1, "title": None, "desc": "", "minutes": 5} for j in range(int(ls or 0))]
        mins = c.get("minutes") or sum(l["minutes"] for l in lessons)
        out.append({"id": f"ch{i + 1}", "n": i + 1, "title": c.get("title", ""), "desc": c.get("desc") or c.get("promise") or "",
                    "lessons": lessons, "count": len(lessons), "minutes": mins, "practice": c.get("practice")})
    return out


def pro_lesson(t, c, l):
    """A Pro lesson row: browsable (title, one-line description, minutes) but nothing to start until it's published."""
    title = l["title"] or t("pm.pro.lesson", n=l["n"])
    mins = l["minutes"]
    desc = (f'<span class="ac-pml__desc">{esc(l["desc"])}</span><span class="ac-pml__dmin"> · {esc(pm_min(t, mins))}</span>' if l["desc"]
            else f'<span class="ac-pml__desc ac-pml__desc--min">{esc(pm_min(t, mins))}</span>')
    return (f'<li class="ac-pml is-later" data-pml="{c["id"]}-{l["n"]}" data-n="{l["n"]}" data-min="{mins}">'
            f'<span class="ac-pml__dot" data-dot>{l["n"]}</span>'
            f'<div class="ac-pml__text"><b class="ac-pml__title">{esc(title)}</b>'
            f'<span class="ac-pml__sub">{desc}</span><span class="ac-pml__meta" data-meta>{esc(pm_min(t, mins))}</span></div>'
            f'<span class="ac-pml__end"><span class="ac-pml__xp" data-xp>{esc(t("pm.l.upTo", xp=LESSON_XP))}</span></span>'
            f'<button type="button" class="ac-pml__hit" data-hint aria-label="{esc(title)}"></button><span class="ac-pml__tip" role="tooltip" data-tip></span></li>')


def pro_chapter(t, base, p, c, total):
    """One Pro chapter, coming soon: PRO pill by the eyebrow, plain lesson rows, the upgrade box last (Pro members:
    learn-pages.js drops the pill and the box)."""
    first = c["n"] == 1
    lessons_t = t("path.lessons", n=c["count"])
    q = c["count"]
    rows = "".join(pro_lesson(t, c, l) for l in c["lessons"])
    ch_row = ""
    if q:
        ch_row = (f'<li class="ac-pml ac-pml--ch is-later" data-pmch><span class="ac-pml__dot ac-pml__dot--ch">{icon("shield", 18, 2)}</span>'
                  f'<div class="ac-pml__text"><b class="ac-pml__title">{esc(t("pm.ch.challenge"))}</b>'
                  f'<span class="ac-pml__sub" data-chsub>{esc(t("pm.ch.challengeSub", n=q, last=q))}</span>'
                  f'<span class="ac-pml__meta" data-chmeta>{esc(t("pm.ch.challengeMeta", n=q, last=q, xp=challenge_xp(q)))}</span></div>'
                  f'<span class="ac-pml__end"><span class="ac-pml__xp ac-pml__xp--gold" data-xp>{esc(t("pm.l.upTo", xp=challenge_xp(q)))}</span></span>'
                  f'<button type="button" class="ac-pml__hit" data-hint aria-label="{esc(t("pm.ch.challenge"))}"></button><span class="ac-pml__tip" role="tooltip" data-tip></span></li>')
    hid = f'pmc-{c["id"]}'
    pill = f'<span class="ac-pmc__pro ac-pmc__pro--eb" aria-hidden="true">{icon("lock", 12, 2.4)}{esc(t("pm.pro.badge"))}</span>'
    omin = esc(t("pm.ch.metaSoon", lessons=lessons_t, min=c["minutes"])) + (f'<span class="ac-pmc__mdesc"> · {esc(c["desc"])}</span>' if c["desc"] else "")
    more = total - 1   # every chapter but this one
    cls = " is-pro" + (" is-open" if first else "")
    note = (f'<span data-show="guest">{esc(t("pm.pro.carryGuest"))}.</span>'
            f'<span data-show="member" hidden>{esc(t("pm.pro.carry"))}.</span>')
    return (f'<section class="ac-pmc ac-pmc--pro{cls}" id="ch-{c["id"]}" data-pmc="{c["id"]}" data-n="{c["n"]}" data-count="{c["count"]}" '
            f'data-min="{c["minutes"]}" data-title="{esc(c["title"])}" aria-labelledby="{hid}-t">'
            f'<div class="ac-pmc__head" data-head><span class="ac-pmc__badge" data-badge>{c["n"]}</span>'
            f'<div class="ac-pmc__text"><span class="ac-pmc__ebrow"><span class="ac-pmc__eb" data-eb>{esc(t("pm.pro.ch.eb", n=c["n"]))}</span>{pill}</span>'
            f'<h2 class="ac-pmc__title" id="{hid}-t"><button type="button" class="ac-pmc__toggle" aria-expanded="{"true" if first else "false"}" '
            f'aria-controls="{hid}-body" data-toggle>{esc(c["title"])}</button></h2>'
            f'<span class="ac-pmc__meta" data-meta>{esc(c["desc"] or lessons_t)}</span>'
            f'<span class="ac-pmc__meta ac-pmc__meta--open">{omin}</span></div>'
            f'<span class="ac-pmc__lock" data-lock><span class="ac-pmc__count">{esc(lessons_t)}</span>'
            f'<span class="ac-pmc__pro" role="img" aria-label="{esc(t("pm.pro.lockAria"))}">{icon("lock", 12, 2.4)}{esc(t("pm.pro.badge"))}</span></span>'
            f'<span class="ac-pmc__chev" aria-hidden="true">{icon("chev-d", 20, 2.2)}</span></div>'
            f'<div class="ac-pmc__body" id="{hid}-body" data-body>'
            f'<ol class="ac-pmc__list" aria-label="{esc(t("path.row.lessonsAria", title=c["title"]))}">{rows}{ch_row}</ol>'
            f'<div class="ac-pmc__unlock--in" data-pro-hide><span class="ac-pmc__ubox"><b>{esc(t("pm.pro.unlockMore", n=more) if more > 0 else t("pm.pro.unlockThis"))}</b>'
            f'{note}</span>'
            f'<a class="ac-pmbtn ac-pmbtn--pro" href="{href(base, "pro")}">{esc(t("pm.sheet.upgrade"))}{icon("arrow", 18, 2.4)}</a></div>'
            '</div></section>')


def pro_body(ctx, p, base):
    t = ctx.t
    soon = p.get("status") == "soon"
    pose = p.get("pose") or _by_key(POSE_BY_KEY, p["id"], "present")
    chs = pro_chapters(p)
    n_ch = len(chs)
    n_les = sum(c["count"] for c in chs) or p.get("lessons") or 0
    hours = p.get("hours")
    if hours and n_les:
        facts_d = t("pm.pro.facts", chapters=n_ch, lessons=n_les, h=fmt_h(hours))
        facts_m = t("pm.pro.factsM", chapters=n_ch, lessons=n_les, h=fmt_h(hours))
    else:
        facts_d = facts_m = " · ".join(x for x in [t("paths.chapters", n=n_ch) if n_ch else "", t("path.lessons", n=n_les) if n_les else ""] if x)
    if soon:
        rows = "".join(f'<section class="ac-pmc ac-pmc--pro is-pro is-soon"><div class="ac-pmc__head"><span class="ac-pmc__badge">{c["n"]}</span>'
                       f'<div class="ac-pmc__text"><h2 class="ac-pmc__title"><span class="ac-pmc__toggle">{esc(c["title"])}</span></h2></div></div></section>'
                       for c in chs)
    else:
        rows = "".join(pro_chapter(t, base, p, c, len(chs)) for c in chs)
    perks = "".join(f'<li>{icon("check", 16, 2.6)}<span>{esc(t("pm.pro.perk" + str(i)))}</span></li>' for i in (1, 2))
    pro_card = "" if soon else (
        f'<section class="ac-pmcard ac-pmcard--pro" data-pro-hide aria-labelledby="pm-pro-t"><span class="ac-pmcard__tag">{esc(t("pm.pro.card.eb"))}</span>'
        f'<h2 class="ac-pmcard__title ac-pmcard__title--lg" id="pm-pro-t">{esc(t("pm.pro.card.title"))}</h2>'
        f'<ul class="ac-pmchecks ac-pmchecks--pro">{perks}</ul>'
        f'<a class="ac-pmbtn ac-pmbtn--pro ac-pmbtn--lg ac-pmbtn--block" href="{href(base, "pro")}">{esc(t("paths.upgrade"))}</a>'
        f'<span class="ac-pmcard__note"><span data-show="guest">{esc(t("pm.pro.card.noteGuest"))}</span>'
        f'<span data-show="member" hidden>{esc(t("pm.pro.card.note"))}</span></span></section>')
    practice = "".join(pm_practice(t, base, c, i == 0) for i, c in enumerate(chs))
    return f'''<div class="ac-pm ac-pm--pro ac-lp{" is-soon" if soon else ""}" data-pm="{esc(p["id"])}" data-propath="{esc(p["id"])}">
  {crumbs(t, base, [(t("path.crumb.paths"), "paths"), (p["title"], None)])}
  <a class="ac-pm-mback" href="{href(base, "paths")}">{icon("chev-l", 16, 2.4)}{esc(t("path.crumb.paths"))}</a>
  {pm_mstats(t)}
  <section class="ac-pmhero ac-pmhero--pro has-art" style="--accent:{accent_var(p)}; {art_style(base, p["id"])}" data-pm-hero aria-labelledby="pp-title">
    <div class="ac-pmhero__main">
      <div class="ac-pmhero__head">
        <span class="ac-pmhero__eb" data-pm-eb data-pro-text="{esc(t("pm.pro.eb.member"))}">{esc(t("pm.pro.eb.soon") if soon else t("pm.pro.eb.locked"))}</span>
        <h1 id="pp-title" class="ac-pmhero__title">{esc(p["title"])}</h1>
        <p class="ac-pmhero__lead ac-pmhero__lead--d" data-pm-lead>{esc(p.get("intro") or p.get("outcome", ""))}</p>
        <p class="ac-pmhero__lead ac-pmhero__lead--m" data-pm-lead-m>{esc(p.get("tagline") or p.get("outcome", ""))}</p>
      </div>
      <p class="ac-pmhero__facts"><span class="ac-pmhero__facts-d">{esc(facts_d)}</span><span class="ac-pmhero__facts-m">{esc(facts_m)}</span></p>
      <div class="ac-pmhero__ctas">
        <a class="ac-pmbtn ac-pmbtn--pro ac-pmbtn--lg" href="{href(base, "pro")}" data-pro-hide>{esc(t("paths.upgrade"))}</a>
        <span class="ac-pmhero__note" data-pm-note>{esc(t("pm.pro.note"))}</span>
      </div>
    </div>
    <img class="ac-pmhero__rico" src="{rico_src(base, pose)}" alt="{esc(t("chapter.ricoAlt"))}" width="200" height="220">
  </section>
  <div class="ac-pm-grid">
    <div class="ac-pm-main" id="chapters">
      <h2 class="ac-pm-h2">{esc(t("pm.chapters"))}</h2>
      {rows}
      {disclaimer(t)}
    </div>
    <aside class="ac-pm-side" aria-label="{esc(t("paths.unlockAria"))}">
      <h2 class="ac-pm-h2 ac-pm-side__mtitle" data-pro-hide>{esc(t("pm.pro.unlockTitle"))}</h2>
      {pm_rank(t, base)}
      {pro_card}
      {pm_earn(t)}
      {practice}
    </aside>
  </div>
  {pm_sheet(t, base)}
</div>'''
