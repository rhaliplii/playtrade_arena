"""Trading Foundations path map (/academy/learn-to-trade). SEO page: SSR every chapter (coming-soon ones with their lesson
list); learner state (passed, current lesson, locks, XP) is filled by learn-pages.js from AC.progress.

Also holds the helpers shared by the learn pages (home, setup, placement, paths, path, chapter)."""
import json

import lib
from lib import esc, ORIGIN

CSS = ("learn-pages.css",)
JS = ("learn-pages.js",)

# XP rules (mirror js/engine.js: lesson 60 + 3 × 10, Challenge 30 a question + 50 if all right, path 500)
LESSON_FINISH_XP = 60
FIRST_TRY_XP = 10
LESSON_XP = LESSON_FINISH_XP + 3 * FIRST_TRY_XP   # 90
GYM_XP = 30
CHALLENGE_Q_XP = 30
CHALLENGE_PERFECT = 50
PATH_XP = 500
PATH_COINS = 500
PLACEMENT_XP = 120   # one-time bonus for testing out of a chapter
# rank thresholds (mirror AC.progress.RANKS) for the SSR rank strip; labels come from the shell's rank.* strings
LEGEND_STEP = 5000   # XP per level from Market Legend on (engine RANKS legend step)
RANKS = [("rookie", 1, 5, 0), ("analyst", 6, 20, 1000), ("strategist", 21, 28, 12000), ("trader", 29, 36, 24000), ("legend", 37, None, 40000)]

# 24px stroke icons (paths taken from the canvas)
ICONS = {
    "chev": '<path d="m9 6 6 6-6 6"/>',
    "chev-l": '<path d="m15 6-6 6 6 6"/>',
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "close": '<path d="M6 6l12 12M18 6 6 18"/>',
    "check": '<path d="m5 12 5 5 9-10"/>',
    "shield": '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    "diamond": '<path d="M12 2 22 12 12 22 2 12z"/>',
    "award": '<circle cx="12" cy="9" r="5"/><path d="M9 13.5 8 21l4-2 4 2-1-7.5"/>',
    "flame": '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z"/>',
    "gym": '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
    "trend": '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    "calc": '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/>',
    "book": '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
    "star": '<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>',
    "lock": '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    "chev-d": '<path d="m6 9 6 6 6-6"/>',
    "arrow-up": '<path d="M12 19V5M6 11l6-6 6 6"/>',
    "arrow-down": '<path d="M12 5v14M6 13l6 6 6-6"/>',
    "replay": '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/>',
    "rocket": '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M14 4c3-1 6-1 6-1s0 3-1 6l-7 7-5-5 7-7z"/><circle cx="15" cy="9" r="1.5"/>',
    "bookmark": '<path d="M6 3h12v18l-6-4-6 4z"/>',
    "unlock": '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    "cert": '<rect x="3" y="4" width="18" height="12" rx="2"/><circle cx="12" cy="17" r="3"/><path d="M10.5 19.5 10 22l2-1 2 1-.5-2.5M7 8h10M7 11h6"/>',
}


def icon(name, size=20, sw=2, cls=""):
    c = f' class="{cls}"' if cls else ""
    return (f'<svg{c} width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>')


def rico_src(base, pose):
    return f"{base}static/img/rico/{pose}.webp"


# Path art (design: rico-path-art): one 21:9 scene per path, Rico + his prop. Cards show it as the cover; each path page
# banner shows the same scene on the right, fading into the scene's edge colour (--ac-art-<key>) behind the text.
ART_KEY = [("learn-to-trade", "ltt"), ("investor", "investor"), ("portfolio", "portfolio"), ("technical", "ta"),
           ("crypto", "crypto"), ("option", "options"), ("macro", "macro"), ("risk", "risk"), ("compan", "companies")]


def art_key(pid):
    for k, v in ART_KEY:
        if k in (pid or ""):
            return v
    return "ltt"


def art_picture(base, pid, cls="", sizes="(max-width: 640px) 100vw, 400px", lazy=True):
    """The path's scene as a responsive <picture> (avif, then webp). Decorative: the title next to it carries the meaning."""
    k, d = art_key(pid), f"{base}static/img/art/path-"
    c = f' class="{cls}"' if cls else ""
    lz = ' loading="lazy"' if lazy else ""
    return (f'<picture><source type="image/avif" srcset="{d}{k}-672w.avif 672w, {d}{k}-1344w.avif 1344w" sizes="{sizes}">'
            f'<img{c} src="{d}{k}-672w.webp" srcset="{d}{k}-672w.webp 672w, {d}{k}-1344w.webp 1344w" sizes="{sizes}" '
            f'width="672" height="288" alt=""{lz} decoding="async"></picture>')


def art_style(base, pid):
    """Inline custom properties for a banner that shows the path's scene (see .has-art in learn-pages.css)."""
    k = art_key(pid)
    # url() inside a custom property resolves against the stylesheet that uses it (static/css/), not the page
    return f"--art: url(../img/art/path-{k}-1344w.webp); --art-bg: var(--ac-art-{k})"


def base_of(route, locale="en"):
    """relative path to academy/ from this route (the pseudo-locale lives one folder deeper, like lib.page)."""
    return "../" * (len([p for p in route.strip("/").split("/") if p]) + (1 if locale == lib.PSEUDO else 0))


def challenge_xp(n):
    return n * CHALLENGE_Q_XP + CHALLENGE_PERFECT


def chapter_xp(n_lessons):
    return n_lessons * LESSON_XP + challenge_xp(n_lessons)


def ltt(ctx):
    """The path with every chapter normalised (available ones from the chapter files, coming-soon from the path)."""
    p = ctx.path
    chapters = []
    for ch in p["chapters"]:
        c = {"id": ch["id"], "n": ch["n"], "title": ch["title"], "short": ch["short"], "promise": ch.get("promise", ""),
             "minutes": ch["minutes"], "available": bool(ch.get("available")) and ch["id"] in ctx.chapters,
             "skill": ch.get("skill"), "tagline": ch.get("tagline", "")}
        if c["available"]:
            full = ctx.chapters[ch["id"]]
            c["full"] = full
            c["promise"] = full.get("promise") or c["promise"]
            c["lessons"] = [{"id": lid, "n": i + 1, "title": ctx.lessons[lid]["title"], "minutes": ctx.lessons[lid]["minutes"],
                             "desc": ctx.lessons[lid].get("desc", ""), "cards": len(ctx.lessons[lid].get("cards", []))}
                            for i, lid in enumerate(full["lessons"])]
            c["questions"] = len(full["challenge"]["questions"])
            c["unlock"] = full.get("unlock", [])
            c["terms"] = [(tid, ctx.glossary[tid]["term"] if tid in ctx.glossary else tid) for tid in full.get("terms", [])]
            c["pages"] = full.get("pages")
            # minutes come from the chapter file, so they can't drift from the path summary
            c["minutes"] = full.get("minutes") or sum(l["minutes"] or 0 for l in c["lessons"]) or c["minutes"]
        else:
            est = max(1, round(ch["minutes"] / max(1, len(ch.get("lessons", [])))))
            c["lessons"] = [{"id": None, "n": i + 1, "title": t, "minutes": est, "desc": ""} for i, t in enumerate(ch.get("lessons", []))]
            c["questions"] = len(c["lessons"])
            c["unlock"], c["terms"], c["pages"] = [], [], None
        c["practice"] = ch.get("practice")
        c["count"] = len(c["lessons"])
        c["xp"] = chapter_xp(c["count"])
        chapters.append(c)
    total_lessons = sum(c["count"] for c in chapters)
    ready_lessons = sum(c["count"] for c in chapters if c["available"])
    total_xp = sum(c["xp"] for c in chapters) + PATH_XP
    total_min = sum(c["minutes"] for c in chapters)
    first = next((c for c in chapters if c["available"] and c["lessons"]), None)
    return {"id": p["id"], "title": p["title"], "outcome": p.get("outcome", ""), "chapters": chapters, "lessons": total_lessons, "ready": ready_lessons, "xp": total_xp,
            "minutes": total_min, "hours": round(total_min / 30.0) / 2.0 if total_min else p.get("hours"),
            "skills": p.get("skills", []), "first": first,
            "first_lesson": (first["id"], first["lessons"][0]["id"]) if first else None}


def lesson_route(path_id, ch_id, lid):
    return f"{path_id}/{ch_id}/{lid}/"


def href(base, route):
    route = route.strip("/")
    return f"{base}{route + '/' if route else ''}index.html"


def site_href(base, link):
    """content links are site-relative (e.g. trading_calculators/margin-calculator/) → from this page."""
    if not link or link.startswith(("http:", "https:", "#")):
        return link or "#"
    link = link.lstrip("/")
    if link.endswith("/"):
        link += "index.html"
    return base + "../" + link


def learn_data(ctx, L):
    """Inlined as #ac-learn for learn-pages.js (more than the shared #ac-index: descriptions, card counts, ideas)."""
    chapters = []
    for c in L["chapters"]:
        d = {"id": c["id"], "n": c["n"], "title": c["title"], "short": c["short"], "available": c["available"],
             "count": c["count"], "questions": c["questions"], "xp": c["xp"],
             "lessons": [{"id": l["id"], "title": l["title"], "minutes": l["minutes"], "desc": l["desc"], "cards": l.get("cards", 0)} for l in c["lessons"]]}
        if c["available"]:
            full = c["full"]
            ideas = set(q["idea"] for q in full["challenge"]["questions"])
            for lid in full["lessons"]:
                for card in ctx.lessons[lid].get("cards", []):
                    if card.get("idea"):
                        ideas.add(card["idea"])
            d["ideas"] = sorted(ideas)
            d["refresher"] = {r["idea"]: r["title"] for r in full.get("refresher", [])}
            d["promise"] = c["promise"]
            d["unlock"] = c["unlock"]
            d["terms"] = [{"id": tid, "term": term} for tid, term in c["terms"]]
            d["pages"] = c["pages"]
        d["minutes"] = c["minutes"]
        chapters.append(d)
    return {"path": L["id"], "title": L["title"], "lessons": L["lessons"], "xp": L["xp"], "chapters": chapters,
            "skills": L["skills"], "sample": SAMPLE_BOARD}


# Sample Top Learners for the prototype (the leaderboard service replaces this; names are sample data, not UI copy)
SAMPLE_BOARD = [
    {"name": "Mira Okafor", "handle": "mira.reads", "xp": 4860, "lv": 15, "avatar": "mira"},
    {"name": "Jak Pak", "handle": "jakpak", "xp": 4415, "lv": 15, "avatar": "jak"},
    {"name": "Raghavendra N.", "handle": "raghu", "xp": 3970, "lv": 14, "tone": "pro"},
    {"name": "Lena Brandt", "handle": "lenab", "xp": 3320, "lv": 14, "avatar": "lena"},
    {"name": "Abdulrasheed Guruji", "handle": "abdulrasheed.g", "xp": 2985, "lv": 13, "avatar": "abdul"},
    {"name": "Tomás Rivera", "handle": "trivera", "xp": 2540, "lv": 12, "avatar": "tomas"},
    {"name": "Nivedita Shetty", "handle": "nivedita.s", "xp": 2110, "lv": 11, "tone": "sky"},
    {"name": "Hana Kim", "handle": "hanakim", "xp": 1890, "lv": 10, "avatar": "hana"},
    {"name": "Tony Nik", "handle": "tonynik56", "xp": 1645, "lv": 9, "tone": "mint"},
    {"name": "Sofia Lind", "handle": "sofialind", "xp": 1420, "lv": 8, "avatar": "sofia"},
    {"name": "Kenji M.", "handle": "kenji", "xp": 1240, "lv": 7, "tone": "sky"},
    {"name": "Aisha R.", "handle": "aisha", "xp": 1020, "lv": 6, "tone": "coral"},
    {"name": "Omar F.", "handle": "omarf", "xp": 640, "lv": 4, "tone": "gold"},
    {"name": "Lucía G.", "handle": "luciag", "xp": 310, "lv": 2, "tone": "pro"},
]


def crumbs_ld(items):
    """items: [(name, route or None)] → BreadcrumbList."""
    out = []
    for i, (name, route) in enumerate(items, 1):
        e = {"@type": "ListItem", "position": i, "name": name}
        if route is not None:
            r = route.strip("/")
            e["item"] = f"{ORIGIN}/academy/{r + '/' if r else ''}"
        out.append(e)
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": out}


def crumbs(t, base, items):
    parts = []
    for i, (name, route) in enumerate(items):
        if i:
            parts.append('<span aria-hidden="true">/</span>')
        if route is None:
            parts.append(f'<span aria-current="page">{esc(name)}</span>')
        else:
            parts.append(f'<a href="{href(base, route)}">{esc(name)}</a>')
    return f'<nav class="ac-crumbs" aria-label="{esc(t("path.crumbs"))}">{"".join(parts)}</nav>'


def segs(t, L, label_cls=""):
    """10-segment path bar (one per chapter); JS fills each bar from the learner's progress."""
    out = []
    for c in L["chapters"]:
        out.append(f'<li class="ac-seg__item{" ac-seg__item--plan" if c is L["chapters"][-1] else ""}" data-seg="{esc(c["id"])}">'
                   f'<span class="ac-seg__bar"><span style="width:0%"></span></span><span class="ac-seg__label">{esc(c["short"])}</span></li>')
    return f'<ol class="ac-seg {label_cls}" aria-label="{esc(t("path.segAria"))}">{"".join(out)}</ol>'


def fmt_h(h):
    """hours: 4 → "4", 3.5 → "3.5" (lib.fmt_num would give 3.50)."""
    return lib.fmt_num(h) if float(h).is_integer() else lib.fmt_num(float(h), 1)


def chips(items, cls="ac-hchip"):
    return "".join(f'<span class="{cls}">{esc(x)}</span>' for x in items if x)


def disclaimer(t):
    return f'<p class="ac-lp-disclaimer">{esc(t("path.disclaimer"))}</p>'




# =============================================================================================== merged path page
# One page per path (canvas-path Path1-*-D / Path1-Final-M): hero, every chapter as an accordion with its lessons and
# Challenge, and the side column (rank or save, finish-and-earn, practice tool, key terms). Chapter routes render the
# same page with their chapter open. SSR = the guest, first-visit state; learn-pages.js applies the learner's state.
PATH_N = 1   # "Path 1 · Free" (the free path is the first path)


def pm_min(t, n):
    return t("pm.min", n=n)


def pm_lesson(t, base, L, c, l, now=False):
    """One lesson row (desktop list row + mobile trail row share the markup; CSS + JS switch states)."""
    lid = l["id"] or ""
    link = href(base, lesson_route(L["id"], c["id"], lid)) if lid else ""
    mins = l["minutes"] or 5
    state = "is-now" if now else "is-later"
    desc = (f'<span class="ac-pml__desc">{esc(l["desc"])}</span><span class="ac-pml__dmin"> · {esc(pm_min(t, mins))}</span>' if l["desc"]
            else f'<span class="ac-pml__desc ac-pml__desc--min">{esc(pm_min(t, mins))}</span>')
    go = (f'<a class="ac-pml__go" href="{link}" data-go>{esc(t("pm.l.start"))}</a>' if link else "")
    mgo = (f'<a class="ac-btn ac-btn--primary ac-pml__mgo" href="{link}" data-mgo><span data-mgo-label>{esc(t("pm.l.startLesson"))}</span>{icon("arrow", 16, 2.4)}</a>' if link else "")
    return (f'<li class="ac-pml {state}" data-pml="{esc(lid)}" data-n="{l["n"]}" data-min="{mins}">'
            f'<span class="ac-pml__dot" data-dot>{l["n"]}</span>'
            f'<div class="ac-pml__text">'
            f'<span class="ac-pml__eb">{esc(t("pm.l.ebNext", n=l["n"]))}</span>'
            f'<b class="ac-pml__title">{esc(l["title"])}<span class="ac-pml__tag" data-tag hidden>{esc(t("pm.l.skipped"))}</span></b>'
            f'<span class="ac-pml__sub">{desc}</span>'
            f'<span class="ac-pml__meta" data-meta>{esc(t("pm.l.meta", min=mins, xp=LESSON_XP))}</span>{mgo}</div>'
            f'<span class="ac-pml__end"><span class="ac-pml__xp" data-xp>{esc(t("pm.l.upTo", xp=LESSON_XP))}</span>{go}</span>'
            f'<button type="button" class="ac-pml__hit" data-hint aria-label="{esc(l["title"])}"></button>'
            f'<span class="ac-pml__tip" role="tooltip" data-tip></span></li>')


def pm_challenge(t, base, L, c):
    q = c["questions"]
    link = href(base, f'{L["id"]}/{c["id"]}/challenge') if c["available"] else ""
    go = f'<a class="ac-pml__go" href="{link}" data-go hidden>{esc(t("pm.l.start"))}</a>' if link else ""
    return (f'<li class="ac-pml ac-pml--ch is-later" data-pmch>'
            f'<span class="ac-pml__dot ac-pml__dot--ch">{icon("shield", 18, 2)}</span>'
            f'<div class="ac-pml__text"><b class="ac-pml__title">{esc(t("pm.ch.challenge"))}</b>'
            f'<span class="ac-pml__sub" data-chsub>{esc(t("pm.ch.challengeSub", n=q, last=c["count"]))}</span>'
            f'<span class="ac-pml__meta" data-chmeta>{esc(t("pm.ch.challengeMeta", n=q, last=c["count"], xp=challenge_xp(q)))}</span></div>'
            f'<span class="ac-pml__end"><span class="ac-pml__xp ac-pml__xp--gold" data-xp>{esc(t("pm.l.upTo", xp=challenge_xp(q)))}</span>{go}</span>'
            f'<button type="button" class="ac-pml__hit" data-hint aria-label="{esc(t("pm.ch.challenge"))}"></button>'
            f'<span class="ac-pml__tip" role="tooltip" data-tip></span></li>')


def pm_chapter(t, base, L, c, is_open=False, heading="h2", first=False):
    """One chapter: head (badge, eyebrow, title toggle, meta, Passed), body (bar + lessons)."""
    cid = c["id"]
    prev_n = c["n"] - 1
    lessons_t = t("path.lessons", n=c["count"])
    if first:
        eb = t("pm.ch.eb.start", n=c["n"])
        meta = t("pm.ch.metaNot", lessons=lessons_t, min=c["minutes"])
    elif not c["available"]:
        eb = t("pm.ch.eb.soon", n=c["n"])
        meta = t("pm.ch.metaSoon", lessons=lessons_t, min=c["minutes"])
    else:
        eb = t("pm.ch.eb.later", n=c["n"], p=prev_n)
        meta = t("pm.ch.metaLater", lessons=lessons_t, min=c["minutes"], p=prev_n)
    rows = "".join(pm_lesson(t, base, L, c, l, now=first and j == 0) for j, l in enumerate(c["lessons"]))
    hid = f"pmc-{cid}"
    cls = (" is-open is-now" if is_open and first else (" is-open" if is_open else "")) + ("" if c["available"] else " is-soon")
    return f'''<section class="ac-pmc{cls}" id="ch-{esc(cid)}" data-pmc="{esc(cid)}" data-n="{c["n"]}" aria-labelledby="{hid}-t">
  <div class="ac-pmc__head" data-head>
    <span class="ac-pmc__badge" data-badge>{c["n"]}</span>
    <div class="ac-pmc__text">
      <span class="ac-pmc__eb" data-eb>{esc(eb)}</span>
      <{heading} class="ac-pmc__title" id="{hid}-t"><button type="button" class="ac-pmc__toggle" aria-expanded="{"true" if is_open else "false"}" aria-controls="{hid}-body" data-toggle>{esc(c["title"])}</button></{heading}>
      <span class="ac-pmc__meta" data-meta>{esc(meta)}</span>
    </div>
    <span class="ac-pmc__end" data-end hidden><span class="ac-pmc__passed">{esc(t("pm.passed"))}</span></span>
    <span class="ac-pmc__chev" aria-hidden="true">{icon("chev-d", 20, 2.2)}</span>
  </div>
  <div class="ac-pmc__body" id="{hid}-body" data-body>
    <div class="ac-pmc__bar" aria-hidden="true" data-barwrap hidden><span data-bar></span></div>
    <ol class="ac-pmc__list" aria-label="{esc(t("path.row.lessonsAria", title=c["title"]))}">{rows}{pm_challenge(t, base, L, c)}</ol>
  </div>
</section>'''


def pm_earn(t, title_key="pm.earn.title", link=""):
    foot = (f'<a class="ac-pmcard__foot ac-pmcard__foot--chev" href="{link}" data-earn-link>{esc(t("pm.earn.link"))}<span aria-hidden="true">›</span></a>'
            if link else "")
    return (f'<section class="ac-pmcard" data-pm-earn aria-labelledby="pm-earn-t"><h2 class="ac-pmcard__eb" id="pm-earn-t" data-earn-title>{esc(t(title_key))}</h2>'
            f'<div class="ac-pmearn"><span>{icon("award", 20, 2)}<span>{esc(t("pm.earn.cert"))}</span></span>'
            f'<span><b class="ac-pmearn__coins">{lib.fmt_num(PATH_COINS)}</b><span>{esc(t("pm.earn.coins"))}</span></span>'
            f'<span><b class="ac-pmearn__xp">+{lib.fmt_num(PATH_XP)}</b><span>{esc(t("pm.earn.xp"))}</span></span></div>{foot}</section>')


def pm_art(t, base, kind):
    """Practice-card art: the Bull Run cover, or a drawn PlayTrade ticket / Next Move chart (sample UI, not data)."""
    if kind == "bullrun":
        return f'<span class="ac-pmart ac-pmart--img" aria-hidden="true"><img src="{base}../assets/mg-bullrun-cover.jpg" alt="" loading="lazy" width="344" height="147"></span>'
    if kind == "playtrade":
        return (f'<span class="ac-pmart ac-pmart--pt" aria-hidden="true"><svg class="ac-pmart__line" viewBox="0 0 260 120" preserveAspectRatio="none"><path d="M0 100 L40 92 L70 96 L105 70 L140 78 L175 52 L210 60 L260 24"/></svg>'
                f'<span class="ac-pmart__ticket"><span class="ac-pmart__row"><b>{esc(t("pm.art.pt.sym"))}</b><span class="ac-pmart__buy">{esc(t("pm.art.pt.buy"))}</span></span>'
                f'<span class="ac-pmart__row"><span>{esc(t("pm.art.pt.limit"))}</span><b>{esc(lib.fmt_money(185))}</b></span>'
                f'<span class="ac-pmart__row"><span>{esc(t("pm.art.pt.stop"))}</span><b class="ac-pmart__down">{esc(lib.fmt_money(179))}</b></span>'
                f'<span class="ac-pmart__place">{esc(t("pm.art.pt.place"))}</span></span>'
                f'<span class="ac-pmart__virt">{esc(t("pm.art.pt.virtual", amount=lib.fmt_money(10000, 0)))}</span></span>')
    if kind == "nextmove":
        candles = [(14, 70, 92, 1), (38, 60, 82, 1), (62, 52, 70, 0), (86, 40, 62, 1), (110, 34, 54, 1), (134, 40, 50, 0), (158, 22, 44, 1)]
        bars = "".join(f'<line x1="{x}" x2="{x}" y1="{lo - 10}" y2="{hi + 10}"/><rect class="{"up" if up else "dn"}" x="{x - 5}" y="{lo}" width="10" height="{hi - lo}" rx="2"/>' for x, lo, hi, up in candles)
        return (f'<span class="ac-pmart ac-pmart--nm" aria-hidden="true"><svg class="ac-pmart__candles" viewBox="0 0 180 120">{bars}<path class="ac-pmart__dash" d="M158 22 L178 14"/></svg>'
                f'<span class="ac-pmart__ask"><b>{esc(t("pm.art.nm.ask"))}</b><span class="ac-pmart__up">▲ {esc(t("pm.art.nm.up"))}</span><span class="ac-pmart__dn">▼ {esc(t("pm.art.nm.down"))}</span></span></span>')
    return ""


def pm_practice(t, base, c, shown):
    pr = c.get("practice")
    if not pr:
        return ""
    return (f'<section class="ac-pmcard ac-pmcard--practice" data-pm-practice="{esc(c["id"])}" aria-labelledby="pm-pr-{esc(c["id"])}"{"" if shown else " hidden"}>'
            f'<h2 class="ac-pmcard__eb" id="pm-pr-{esc(c["id"])}">{esc(t("pm.practice.title"))}</h2>'
            f'<a class="ac-pmtool" href="{esc(site_href(base, pr["href"]))}">{pm_art(t, base, pr.get("art"))}'
            f'<span class="ac-pmtool__foot"><span class="ac-pmtool__text"><b>{esc(pr["tool"])}</b><span>{esc(pr["text"])}</span></span>'
            f'<span class="ac-pmtool__go" aria-hidden="true">{icon("chev", 18, 2.6)}</span></span></a></section>')


def pm_terms(t, base, c, shown):
    if not c.get("terms"):
        return ""
    terms = "".join(f'<li><a class="ac-pmterm" href="{href(base, "glossary/" + tid)}">{esc(term)}</a></li>' for tid, term in c["terms"])
    guide = t("pm.terms.guide", pages=c["pages"]) if c.get("pages") else t("pm.terms.guideNoPages")
    return (f'<section class="ac-pmcard" data-pm-terms="{esc(c["id"])}" aria-labelledby="pm-kt-{esc(c["id"])}"{"" if shown else " hidden"}>'
            f'<h2 class="ac-pmcard__eb" id="pm-kt-{esc(c["id"])}">{esc(t("pm.terms.title"))}</h2><ul class="ac-pmterms">{terms}</ul>'
            f'<a class="ac-pmcard__foot" href="{href(base, "guide")}">{icon("bookmark", 16, 2)}{esc(guide)}</a></section>')


def pm_rank(t, base):
    """Your rank (members): filled by learn-pages.js."""
    return (f'<section class="ac-pmcard ac-pmrank" data-pm-rank aria-labelledby="pm-rank-t" hidden><h2 class="ac-pmcard__eb" id="pm-rank-t">{esc(t("pm.rank.title"))}</h2>'
            f'<div class="ac-pmrank__who"><span class="ac-pmrank__look"><img data-rank-img src="{base}static/img/ranks/rookie.webp" alt=""></span>'
            f'<span class="ac-pmrank__txt"><b data-rank-line></b><span data-rank-sub></span></span></div>'
            f'<div class="ac-pmrank__bar" aria-hidden="true"><span data-rank-bar></span></div>'
            f'<div class="ac-pmrank__day"><span class="ac-pmrank__streak">{icon("flame", 14, 2.2)}<span data-rank-streak></span></span><span data-rank-today></span></div>'
            f'<a class="ac-pmcard__foot ac-pmcard__foot--chev" href="{href(base, "how-it-works")}">{esc(t("pm.rank.how"))}<span aria-hidden="true">›</span></a></section>')


def pm_save(t):
    items = "".join(f'<li>{icon("check", 16, 2.6)}<span>{esc(t("pm.save.p" + str(i)))}</span></li>' for i in (1, 2, 3))
    return (f'<section class="ac-pmcard ac-pmcard--save" data-show="guest" aria-labelledby="pm-save-t"><span class="ac-pmcard__eb ac-pmcard__eb--mint">{esc(t("pm.save.eb"))}</span>'
            f'<h2 class="ac-pmcard__title" id="pm-save-t">{esc(t("pm.save.title"))}</h2><ul class="ac-pmchecks">{items}</ul>'
            f'<button type="button" class="ac-btn ac-btn--primary ac-btn--block ac-pmbtn" data-action="signup">{esc(t("pm.save.cta"))}</button>'
            '</section>')


def pm_upnext(t, base, pro):
    if not pro:
        return ""
    return (f'<section class="ac-pmcard" data-pm-upnext aria-labelledby="pm-up-t" hidden><h2 class="ac-pmcard__eb" id="pm-up-t">{esc(t("pm.upnext.title"))}</h2>'
            f'<a class="ac-pmup" href="{href(base, "paths/" + pro["id"])}"><span class="ac-pmup__eb">{esc(t("pm.upnext.eb"))}</span>'
            f'<b>{esc(pro["title"])}</b><span>{esc(pro.get("tagline") or pro.get("outcome", ""))}</span></a>'
            f'<a class="ac-pmcard__foot ac-pmcard__foot--chev" href="{href(base, "paths")}">{esc(t("pm.upnext.all"))}<span aria-hidden="true">›</span></a></section>')


def pm_sheet(t, base):
    """Bottom sheet (phones) / small dialog (desktop): a lesson that isn't open yet, or a Pro chapter."""
    return (f'<dialog class="ac-pmsheet" data-pm-sheet aria-labelledby="pm-sheet-t"><span class="ac-pmsheet__grip" aria-hidden="true"></span>'
            f'<span class="ac-pmsheet__eb" data-sheet-eb></span><span class="ac-pmsheet__sub" data-sheet-sub hidden></span><h2 class="ac-pmsheet__title" id="pm-sheet-t" tabindex="-1" autofocus data-sheet-title></h2>'
            f'<p class="ac-pmsheet__text" data-sheet-text></p>'
            f'<a class="ac-btn ac-btn--primary ac-btn--block ac-pmbtn ac-pmbtn--lg" href="#" data-sheet-cta><span data-sheet-cta-label></span>{icon("arrow", 16, 2.4)}</a>'
            f'<p class="ac-pmsheet__up" data-sheet-up hidden><a href="{href(base, "pro")}" data-sheet-pro>{esc(t("pm.sheet.upPro"))}</a>{esc(t("pm.sheet.upOr"))}'
            f'<button type="button" data-sheet-free>{esc(t("pm.sheet.upFree"))}</button></p>'
            f'<button type="button" class="ac-pmsheet__close" data-sheet-close>{esc(t("pm.sheet.close"))}</button>'
            f'<button type="button" class="ac-pmsheet__x" data-sheet-x aria-label="{esc(t("pm.sheet.close"))}">{icon("close", 16, 2.4)}</button></dialog>')


def pm_mstats(t):
    """Phones: streak · XP · today chips + rank look (canvas Path1-Final-M / Home-Mobile-Path-v3 top row)."""
    return '<div class="ac-pm-mstats" data-pm-mstats data-show="member" hidden></div>'


def pm_hero(t, base, L, first_href, h1=True, path_map=False, attrs=""):
    """The path card: one component wherever Trading Foundations appears (its path page, All paths, the home page).
    SSR = the guest / not started state; learn-pages.js pmHero() fills the learner's state (progress, next step,
    finished). path_map: adds the "Path map" button (everywhere but the path page itself)."""
    tag = "h1" if h1 else "h2"
    facts = t("pm.facts", chapters=len(L["chapters"]), lessons=L["lessons"], ready=L["ready"], h=fmt_h(L["hours"] or 4))
    segs_html = segs(t, L)
    pmap = (f'<a class="ac-pmbtn ac-pmbtn--ghost ac-pmbtn--lg" href="{href(base, L["id"])}" data-pm-map>{esc(t("home.pathMap"))}</a>'
            if path_map else "")
    return f'''<section class="ac-pmhero ac-pmhero--ltt has-art" style="{art_style(base, L["id"])}" data-pm-hero{attrs}>
    <div class="ac-pmhero__main">
      <div class="ac-pmhero__head">
        <span class="ac-pmhero__eb" data-pm-eb>{esc(t("pm.eb.free", n=PATH_N))}</span>
        <{tag} class="ac-pmhero__title" data-pm-title>{esc(L["title"])}</{tag}>
        <p class="ac-pmhero__lead" data-pm-lead>{esc(L["outcome"])}</p>
      </div>
      <p class="ac-pmhero__facts" data-pm-facts>{esc(facts)}</p>
      <div class="ac-pmhero__prog" data-pm-prog hidden><span class="ac-pmhero__count" data-pm-count></span>{segs_html}</div>
      <div class="ac-pmhero__ctas">
        <a class="ac-pmbtn ac-pmbtn--white ac-pmbtn--lg" href="{first_href}" data-pm-cta><span data-pm-cta-label>{esc(t("pm.cta.start", l=1))}</span>{icon("arrow", 18, 2.4)}</a>
        {pmap}<a class="ac-pmbtn ac-pmbtn--ghost ac-pmbtn--lg" href="{href(base, "paths")}" data-pm-cta2 hidden>{esc(t("pm.cta.explore"))}</a>
        <span class="ac-pmhero__note" data-pm-note hidden></span>
      </div>
    </div>
    <img class="ac-pmhero__rico" src="{rico_src(base, "present")}" alt="{esc(t("chapter.ricoAlt"))}" width="200" height="220" data-pm-rico>
  </section>'''


def merged_body(ctx, L, base, open_id=None):
    """The merged path page body. open_id: the chapter opened by its own route (None = the path route)."""
    t = ctx.t
    chs = L["chapters"]
    first_href = href(base, lesson_route(L["id"], *L["first_lesson"])) if L["first_lesson"] else href(base, L["id"])
    focus = next((c for c in chs if c["id"] == open_id), chs[0])
    chapter_route = open_id is not None
    items = [(t("path.crumb.paths"), "paths"), (L["title"], L["id"] if chapter_route else None)]
    if chapter_route:
        items.append((t("chapter.crumb", n=focus["n"]), None))
    rows = "".join(pm_chapter(t, base, L, c, is_open=(c is focus), heading=("h1" if chapter_route and c is focus else "h2"), first=(i == 0))
                   for i, c in enumerate(chs))
    pros = [p for p in ctx.catalog.get("paths", []) if p.get("tier") == "pro" and p.get("status") != "soon"]
    upnext = next((p for p in pros if "technical" in p["id"]), pros[0] if pros else None)
    aside = (pm_rank(t, base) + pm_save(t) + pm_earn(t, link=href(base, L["id"] + "/finish")) + "".join(pm_practice(t, base, c, c is focus) for c in chs)
             + pm_upnext(t, base, upnext) + "".join(pm_terms(t, base, c, c is focus) for c in chs))
    return f'''<div class="ac-pm ac-pm--free ac-lp" data-pm="{esc(L["id"])}" data-open="{esc(open_id or "")}">
  {crumbs(t, base, items)}
  <a class="ac-pm-mback" href="{href(base, "paths")}">{icon("chev-l", 16, 2.4)}{esc(t("path.crumb.paths"))}</a>
  {pm_mstats(t)}
  {pm_hero(t, base, L, first_href, h1=not chapter_route)}
  <div class="ac-pm-grid">
    <div class="ac-pm-main">
      <h2 class="ac-pm-h2"><span class="ac-pm-h2__d">{esc(t("pm.chapters"))}</span><span class="ac-pm-h2__m">{esc(t("pm.yourPath"))}</span></h2>
      {rows}
      {disclaimer(t)}
    </div>
    <aside class="ac-pm-side" aria-label="{esc(t("path.aside"))}">{aside}</aside>
  </div>
  <button type="button" class="ac-pm-back" data-pm-back hidden>{icon("arrow-up", 16, 2.4, "ac-pm-back__up")}{icon("arrow-down", 16, 2.4, "ac-pm-back__down")}<span data-pm-back-label></span></button>
  {pm_sheet(t, base)}
</div>'''


def routes(ctx):
    t = ctx.t
    L = ltt(ctx)
    route = L["id"]
    base = base_of(route, ctx.locale)
    p = ctx.path
    n_ch = len(L["chapters"])
    body = merged_body(ctx, L, base)
    ld = [{"@context": "https://schema.org", "@type": "Course", "name": L["title"], "description": p["outcome"],
           "url": f"{ORIGIN}/academy/{route}/", "inLanguage": "en-US", "isAccessibleForFree": True,
           "educationalLevel": p.get("level") or "Beginner",
           "provider": {"@type": "Organization", "name": "Profit.com", "sameAs": ORIGIN},
           "hasCourseInstance": {"@type": "CourseInstance", "courseMode": "online", "courseWorkload": f"PT{L['minutes']}M"},
           "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD", "category": "Free"},
           "syllabusSections": [{"@type": "Syllabus", "name": c["title"], "description": c["promise"]} for c in L["chapters"]]},
          crumbs_ld([(t("path.crumb.academy"), ""), (t("path.crumb.paths"), "paths"), (L["title"], route)])]
    if p.get("faq"):
        ld.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in p["faq"]]})
    yield route, lib.page(t, route=route, title=t("path.meta.title", title=L["title"]),
                          description=t("path.meta.desc", title=L["title"], chapters=n_ch, lessons=L["lessons"]),
                          body=body, active="paths", index=True, css=CSS, js=JS, jsonld=ld,
                          data={"ac-learn": learn_data(ctx, L)}, body_class="ac-page-path", locale=ctx.locale)
