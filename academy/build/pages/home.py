"""Academy home (/academy). One page, three states:
   guest    — SSR in full (the SEO page): hero, how it works, the path map, Pro paths, ranks, Top Learners, Go further with Pro, Ready when you are + guide.
   new      — [data-show="new"]: signed in, nothing played yet.
   learning — [data-show="learning"]: mid-path (+ the Pro paths under the grid).
   Signed in, one layout at every width (phones stack the two columns): greeting, path card, what's ahead, then Today,
   rank, Rico's Gym, Top Learners (the side column).
   The path card (path.py pm_hero, filled by learn-pages.js pmHero) is the same component as on the path page and All
   paths, on desktop and phones.
The "Your day" aside, greetings and every learner number are filled by learn-pages.js from AC.progress."""
import json

import lib
from lib import esc
from pages.path import (art_picture, art_key, fmt_h, base_of, CSS, JS, RANKS, LESSON_XP, ltt, learn_data, icon, rico_src, href, lesson_route, challenge_xp, chips, disclaimer,
                        pm_hero)
from pages.certificates import cert_paths, CERT_CSS

POSE_BY_KEY = [("investor", "thumbs"), ("portfolio", "front"), ("technical", "detective"), ("crypto", "point"), ("option", "think"), ("macro", "point2"), ("risk", "think"), ("compan", "hero")]
ACCENT_BY_KEY = [("investor", "path-investor"), ("portfolio", "path-portfolio"), ("technical", "path-ta"), ("crypto", "amber"), ("option", "sky"), ("macro", "streak"), ("risk", "path-risk"), ("compan", "path-companies")]


def _by_key(table, pid, default):
    for k, v in table:
        if k in pid:
            return v
    return default


def pro_paths(ctx):
    return [p for p in ctx.catalog.get("paths", []) if p.get("tier") == "pro"]


def accent_var(p):
    a = (p.get("accent") or "").replace("--ac-", "")
    fallback = _by_key(ACCENT_BY_KEY, p["id"], "path-learn")
    if not a:
        return f"var(--ac-{fallback})"
    return f"var(--ac-{a}, var(--ac-{fallback}))"


def pro_card(t, base, p, big=False, lazy=True):
    """A Pro path card. No Pro lessons are published yet, so every card says "coming soon"; the whole card opens the
    path page. Pro members: "Included in your plan", swapped in from data-pro-text."""
    pose = p.get("pose") or _by_key(POSE_BY_KEY, p["id"], "present")
    cls = "ac-pcard" + (" ac-pcard--big" if big else "") + (" is-soon" if p.get("status") == "soon" else "")
    return (f'<article class="{cls}" style="--accent:{accent_var(p)}" data-tier="pro" data-path="{esc(p["id"])}">'
            f'<span class="ac-pcard__cover" style="background: var(--ac-art-{art_key(p["id"])})" aria-hidden="true">{art_picture(base, p["id"], lazy=lazy)}'
            + '</span>'
            f'<span class="ac-pcard__body"><span class="ac-pcard__tag" data-pro-text="{esc(t("paths.tag.member"))}">{esc(t("paths.tag.pro"))}</span>'
            f'<a class="ac-pcard__title" href="{href(base, "paths/" + p["id"])}">{esc(p["title"])}</a>'
            f'<span class="ac-pcard__desc">{esc(p.get("outcome") or p.get("desc", ""))}</span></span></article>')   # coming soon: no chapters or time


def title_link(base, route, hid, text, cls="ac-h2", html=None):
    """Home section header: the title itself is the link, with a chevron (the Top Learners pattern). Big section titles
    (.ac-h1) get a 22px chevron, card titles (.ac-h2) an 18px one."""
    route, _, anchor = route.partition("#")
    return (f'<a class="ac-titlelink" href="{href(base, route)}{"#" + anchor if anchor else ""}"><h2 id="{hid}" class="{cls}">{html if html is not None else esc(text)}</h2>'
            f'{icon("chev", 22 if cls == "ac-h1" else 18, 2.5)}</a>')


def how_cards(t, hid, base, L=None):
    # the same three steps, labels and lines as the phone swipe row (HOW_SHOTS, home.hw.*)
    items = "".join(f'<li class="ac-how__card"><div class="ac-how__head"><span class="ac-how__n" aria-hidden="true">{n}</span>'
                    f'<span class="ac-how__name"><span class="ac-how__eyebrow">{esc(t("home.hw." + k + ".step"))}</span>'
                    f'<b class="ac-how__title">{esc(t("home.hw." + k + ".title"))}</b></span></div>'
                    f'<span class="ac-how__text">{esc(t("home.hw." + k + ".text"))}</span></li>' for k, n in HOW_SHOTS)
    return (f'<section class="ac-how" aria-labelledby="{hid}"><div class="ac-sechead">{title_link(base, "how-it-works", hid, t("home.how.title"), "ac-h1")}'
            f'<p class="ac-lead">{esc(t("home.how.sub"))}</p></div><ol class="ac-how__grid">{items}</ol>'
            f'{how_swipe(t, base, L) if L else ""}</section>')


# ---------------------------------------------------------------- phones: How it works
# A swipe row of the three steps (canvas Home-Guest-D-Mobile; card art from HowItWorks-Learn-Card, artboard
# e53d5a9954ce): step, title, one line and an illustrated example of that step built in HTML/CSS (no screenshots).
# Learn: a Rico's Call on a head and shoulders chart (Chapter 4, Lesson 5). Practice: that question back in Rico's Gym
# the next day. Review: that chapter's Challenge passed, with the XP and coins the engine pays. Each example is one
# role="img" with a short description; nothing inside is focusable. Nothing animates; the dots and tabs follow the
# swipe (learn-pages.js swipeDots). Desktop keeps the three .ac-how__grid cards.
HOW_SHOTS = [("learn", 1), ("gym", 2), ("challenge", 3)]
HOW_LESSON = "head-and-shoulders"   # the lesson the Learn and Practice examples come from
FIRST_TRY_XP = 10                   # engine.js XP.firstTry
CHALLENGE_COINS = 50                # engine.js COINS.challenge


def _hw_opt(key, text, cls=""):
    return f'<span class="ac-hwm__opt{cls}"><span class="ac-hwm__key">{key}</span><span>{esc(text)}</span></span>'


def _hw_bars(n, tone):
    return (f'<span class="ac-hwm__bars ac-hwm--{tone}">'
            + "".join('<i class="is-on"></i>' if i < n else '<i></i>' for i in range(4)) + '</span>')


def _hw_learn(t, base):
    k = "home.hw.learn.mock."
    line = "M 6 124 L 30 96 L 56 58 L 84 98 L 112 60 L 142 22 L 172 64 L 186 98 L 212 72 L 230 58 L 256 96 L 270 100"
    chart = (f'<svg class="ac-hwm__chart" viewBox="0 0 320 132" preserveAspectRatio="xMidYMid meet">'
             f'<defs><linearGradient id="ac-hwm-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="ac-hwm__stop"/><stop offset="1" class="ac-hwm__stop ac-hwm__stop--end"/></linearGradient></defs>'
             f'<path class="ac-hwm__area" d="{line} L 270 132 L 6 132 Z"/>'
             f'<line class="ac-hwm__neck" x1="60" y1="98" x2="300" y2="98"/>'
             f'<text class="ac-hwm__lbl ac-hwm__lbl--gold" x="64" y="114">{esc(t(k + "neckline"))}</text>'
             f'<path class="ac-hwm__line" d="{line}"/>'
             f'<text class="ac-hwm__lbl" x="56" y="48" text-anchor="middle">{esc(t(k + "shoulder"))}</text>'
             f'<text class="ac-hwm__lbl" x="142" y="14" text-anchor="middle">{esc(t(k + "head"))}</text>'
             f'<text class="ac-hwm__lbl" x="230" y="48" text-anchor="middle">{esc(t(k + "shoulder"))}</text>'
             f'<circle class="ac-hwm__qdot" cx="296" cy="98" r="15"/><text class="ac-hwm__q" x="296" y="104" text-anchor="middle">?</text></svg>')
    # the lesson player's progress bar: card 2 of 6, so it reads as one step of a short lesson
    prog = (f'<div class="ac-hwm__lessonbar"><span class="ac-hwm__segs">{"<i class=is-on></i>" * 2}{"<i></i>" * 4}</span>'
            f'<span class="ac-hwm__meta">{esc(t(k + "step", n=2, total=6))}</span></div>')
    return (f'{prog}<div class="ac-hwm__head"><span class="ac-hwm__eb ac-hwm__eb--gold">{esc(t(k + "eb"))}</span>'
            f'<span class="ac-hwm__pill">{esc(t(k + "xp", n=FIRST_TRY_XP))}</span></div>'
            f'<div class="ac-hwm__call"><img src="{rico_src(base, "present")}" alt="" width="64" height="64" loading="lazy" decoding="async">'
            f'<span class="ac-hwm__bubble"><b>{esc(t(k + "q"))}</b><span>{esc(t(k + "ask"))}</span></span></div>'
            f'<div class="ac-hwm__well">{chart}</div>'
            f'<div class="ac-hwm__opts">{_hw_opt("A", t(k + "up"))}{_hw_opt("B", t(k + "down"))}{_hw_opt("C", t(k + "side"))}</div>')


def _hw_gym(t):
    k = "home.hw.gym.mock."
    days = t(k + "days").split(",")
    week = "".join(f'<span class="ac-hwm__day{" is-done" if i < 4 else " is-today" if i == 4 else ""}"><i></i>{esc(d)}</span>' for i, d in enumerate(days))
    return (f'<div class="ac-hwm__title"><span class="ac-hwm__eb ac-hwm__eb--gold">{esc(t(k + "eb"))}</span>'
            f'<b>{esc(t(k + "title"))}</b><span>{esc(t(k + "sub", n=3, min=2))}</span></div>'
            f'<div class="ac-hwm__tile"><span class="ac-hwm__miss">{esc(t(k + "missed"))}</span>'
            f'<b class="ac-hwm__qtext">{esc(t(k + "q"))}</b>'
            f'{_hw_opt(icon("check", 12, 3), t(k + "a"), " is-right")}'
            f'<span class="ac-hwm__got">{icon("check", 12, 3)}{esc(t(k + "got"))}</span></div>'
            f'<div class="ac-hwm__tile ac-hwm__know"><span class="ac-hwm__eb">{esc(t(k + "know"))}</span>'
            f'<span class="ac-hwm__skill"><span>{esc(t(k + "t1"))}</span>{_hw_bars(3, "up")}<b class="ac-hwm--up">{esc(t(k + "s1"))}</b></span>'
            f'<span class="ac-hwm__skill"><span>{esc(t(k + "t2"))}</span>{_hw_bars(1, "warn")}<b class="ac-hwm--warn">{esc(t(k + "s2"))}</b></span></div>'
            f'<div class="ac-hwm__tile ac-hwm__weekbox"><span class="ac-hwm__weekhead"><span class="ac-hwm__eb">{esc(t(k + "week"))}</span>'
            f'<span class="ac-hwm__streak">{esc(t(k + "streak", n=4))}</span></span><span class="ac-hwm__week">{week}</span></div>')


def _hw_challenge(t, base, c, nxt, chapters):
    k = "home.hw.challenge.mock."
    n, total = c["n"], c["questions"]
    segs = "".join('<i class="is-on"></i>' if i < n else '<i class="is-next"></i>' if i == n else '<i></i>' for i in range(chapters))
    return (f'<div class="ac-hwm__head"><b class="ac-hwm__h">{esc(t(k + "title", n=n))}</b><span class="ac-hwm__meta">{esc(t(k + "results"))}</span></div>'
            f'<div class="ac-hwm__pass"><span class="ac-hwm__chip">{esc(t(k + "chip", n=n))}</span>'
            f'<b>{esc(t(k + "passed", chapter=t(k + "chapter")))}</b><span>{esc(t(k + "right", right=total, total=total))}</span>'
            f'<img src="{rico_src(base, "star")}" alt="" width="108" height="108" loading="lazy" decoding="async"></div>'
            f'<div class="ac-hwm__stats"><span class="ac-hwm__stat"><b class="ac-hwm--up">{esc(t(k + "xp", xp=lib.fmt_num(challenge_xp(total))))}</b>'
            f'<span class="ac-hwm--up">{esc(t(k + "rank", n=12))}</span></span>'
            f'<span class="ac-hwm__stat"><b class="ac-hwm--gold">{esc(t(k + "coins", n=CHALLENGE_COINS))}</b><span>{esc(t(k + "coinsLabel"))}</span></span></div>'
            f'<div class="ac-hwm__unlock"><span class="ac-hwm__lock">{icon("unlock", 16, 2.2)}</span>'
            f'<span><span class="ac-hwm__eb ac-hwm--up">{esc(t(k + "unlocked"))}</span><b>{esc(t(k + "next", n=nxt["n"], name=nxt["short"]))}</b></span></div>'
            f'<div class="ac-hwm__tile ac-hwm__prog"><span class="ac-hwm__progtop"><span>{esc(t(k + "done", n=n, total=chapters))}</span>{icon("cert", 20, 1.8)}</span>'
            f'<span class="ac-hwm__segs">{segs}</span></div>'
            f'<span class="ac-hwm__cta">{esc(t(k + "cta", n=nxt["n"]))}</span>')


def how_swipe(t, base, L):
    # step labels above the row ("1 Learn · 2 Practice · 3 Review"): the whole sequence is visible without swiping;
    # tapping one scrolls its card in, and the label of the card in view is marked (learn-pages.js swipeDots)
    tabs = "".join(f'<li><button type="button" class="ac-hws__tab" data-swipe-to="{i}"><span>{n}</span>{esc(t("home.hw." + k + ".step"))}</button></li>'
                   for i, (k, n) in enumerate(HOW_SHOTS))
    chs = L["chapters"]
    ci = next((i for i, c in enumerate(chs) if any(l["id"] == HOW_LESSON for l in c["lessons"])), 3)
    c, nxt = chs[ci], chs[min(ci + 1, len(chs) - 1)]
    total = c["questions"]
    aria = {"learn": t("home.hw.learn.mock.aria"), "gym": t("home.hw.gym.mock.aria"),
            "challenge": t("home.hw.challenge.mock.aria", n=c["n"], right=total, total=total, xp=lib.fmt_num(challenge_xp(total)),
                           coins=CHALLENGE_COINS, next=nxt["n"], chapters=len(chs))}
    body = {"learn": _hw_learn(t, base), "gym": _hw_gym(t), "challenge": _hw_challenge(t, base, c, nxt, len(chs))}
    items = "".join(
        f'<li class="ac-hws__card" tabindex="0">'
        f'<span class="ac-hws__step">{esc(t("home.hw.stepN", n=n, step=t("home.hw." + k + ".step")))}</span>'
        f'<b class="ac-hws__title">{esc(t("home.hw." + k + ".title"))}</b>'
        f'<span class="ac-hws__text">{esc(t("home.hw." + k + ".text"))}</span>'
        f'<div class="ac-hwm ac-hwm--{k}" role="img" aria-label="{esc(aria[k])}"><div class="ac-hwm__in" aria-hidden="true">{body[k]}</div></div></li>'
        for k, n in HOW_SHOTS)
    return (f'<div class="ac-hws ac-m-only"><ol class="ac-hws__tabs" aria-label="{esc(t("home.hw.tabs"))}">{tabs}</ol>'
            f'<ul class="ac-hws__row" data-swipe="how-dots" data-swipe-tabs aria-label="{esc(t("home.hw.aria"))}">{items}</ul>'
            f'<div class="ac-dots" id="how-dots" aria-hidden="true"></div></div>')


# ---------------------------------------------------------------- phones: What you'll learn (chapters 1–3, "+6 more", the plan, the certificate)
def learn_list(t, base, L):
    cl = L["chapters"]
    head, mid, last = cl[:3], cl[3:-1], cl[-1]

    def row(c, extra=False, plan=False):
        tag = "a" if c["available"] else "div"
        h = f' href="{href(base, L["id"] + "/" + c["id"])}"' if c["available"] else ""
        cls = "ac-wyl__item" + (" is-first" if c is cl[0] else "") + (" ac-wyl__item--plan" if plan else "")
        title = t("home.map.planShort") if plan else c["short"]
        return (f'<li class="{cls}"{" data-wyl-extra hidden" if extra else ""}><{tag} class="ac-wyl__link"{h}><span class="ac-wyl__dot">{c["n"]}</span>'
                f'<span class="ac-wyl__text"><b>{esc(title)}</b><span>{esc(c["tagline"])}</span></span></{tag}></li>')
    more = ""
    if mid:
        more = (f'<li class="ac-wyl__item ac-wyl__item--more" data-wyl-more><button type="button" class="ac-wyl__link" aria-expanded="false" data-wyl-toggle>'
                f'<span class="ac-wyl__dot">{esc(t("home.map.moreN", n=len(mid)))}</span>'
                f'<span class="ac-wyl__text"><b>{esc(t("home.map.more", n=len(mid)))}{icon("chev-d", 16, 2.5)}</b>'
                f'<span>{esc(", ".join(c["short"] for c in mid))}</span></span></button></li>')
    items = "".join(row(c) for c in head) + more + "".join(row(c, extra=True) for c in mid) + row(last, plan=True)
    return f'<ol class="ac-wyl ac-m-only">{items}</ol>'


def cert_card(t, base, L):
    """Guests: "When you finish the path · Get your certificate" (phones: a compact row; desktop: a banner under the path
    map with a "See a sample" button). The thumbnail is the real certificate (learn-pages.js certThumb) with a blank name
    line; the card opens the sample certificate sheet (cert_sheet), never a verify page (the demo certificates belong to
    the verify page's demo)."""
    data = {"path": L["id"]}
    return (f'<button type="button" class="ac-wylcert" data-cert-thumb="{esc(json.dumps(data))}" aria-haspopup="dialog" aria-label="{esc(t("home.cert.aria"))}">'
            f'<span class="ac-wylcert__thumb" aria-hidden="true" data-cert-slot></span>'
            f'<span class="ac-wylcert__text"><span class="ac-wylcert__eb">{esc(t("home.cert.eyebrow"))}</span><b>{esc(t("home.cert.title"))}</b>'
            f'<span>{esc(t("home.cert.text"))}</span></span>'
            f'<span class="ac-btn ac-btn--ghost ac-btn--sm ac-wylcert__go ac-d-only" aria-hidden="true">{esc(t("home.cert.see"))}{icon("chev", 14, 2.5)}</span></button>')


def cert_sheet(t, base, L, first_r):
    """The sample certificate (bottom sheet on phones, dialog on wider screens; the .ac-pmsheet shell): the real
    certificate template with the learner's name ("Your name" for guests), today's date, a placeholder ID and a SAMPLE
    ribbon (filled by learn-pages.js certSheet), what it takes, and a button: the hero's for guests (sign-up gate
    included), the path card's next step when signed in. Opened by the guest card and the home's Certificate milestone."""
    rows = [("check", t("home.certSheet.challenges", n=len(L["chapters"]))), ("book", t("home.certSheet.plan")), ("shield", t("home.certSheet.verify"))]
    verify = href(base, "verify")
    items = "".join(f'<li><span class="ac-certsheet__ic">{icon(i, 16, 2.2)}</span>'
                    + (f'<a class="ac-certsheet__link" href="{verify}">{esc(x)}{icon("chev", 14, 2.5)}</a>' if i == "shield" else f'<span>{esc(x)}</span>')
                    + '</li>' for i, x in rows)
    return (f'<dialog class="ac-pmsheet ac-certsheet" data-cert-sheet role="dialog" aria-modal="true" aria-labelledby="cert-sheet-t">'
            f'<div class="ac-certsheet__box"><span class="ac-pmsheet__grip" aria-hidden="true"></span>'
            f'<div class="ac-certsheet__head"><h2 class="ac-pmsheet__title" id="cert-sheet-t" tabindex="-1">{esc(t("home.certSheet.title"))}</h2>'
            f'<button type="button" class="ac-share__x" data-cert-sheet-x aria-label="{esc(t("common.close"))}">'
            f'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>'
            f'<div class="ac-certsheet__cert" data-cert-sheet-slot></div>'
            f'<ul class="ac-certsheet__list">{items}</ul>'
            f'<a class="ac-btn ac-btn--primary ac-btn--lg ac-btn--block" href="{href(base, first_r)}" data-cert-sheet-cta><span data-gh-cta-label>{esc(t("home.hero.cta"))}</span></a>'
            f'<button type="button" class="ac-pmsheet__close" data-cert-sheet-close>{esc(t("common.close"))}</button></div></dialog>')


# ---------------------------------------------------------------- Go further with Pro (Free vs Pro)
# Phones and desktop (canvas Home-Guest-D: full width after Climb the ranks; the CTA sits in its own bar on desktop,
# with "See all paths" on the right). Pro paths are still coming soon: the button opens the Pro page.
def go_pro(t, base, L):
    yes = f'<span class="ac-gopro__tick" role="img" aria-label="{esc(t("pro.table.yes"))}">{icon("check", 14, 3.2)}</span>'
    pro = f'<span class="ac-gopro__tick ac-gopro__tick--pro" role="img" aria-label="{esc(t("pro.table.yes"))}">{icon("check", 14, 3.2)}</span>'
    no = f'<span class="ac-gopro__no" role="img" aria-label="{esc(t("pro.table.no"))}"></span>'
    rows = [(t("home.gopro.ltt"), t("home.gopro.lttNote", n=len(L["chapters"]), lessons=L["lessons"]), yes),
            (t("home.gopro.gym"), "", yes), (t("home.gopro.paths"), "", no), (t("home.gopro.proCert"), "", no)]
    body = "".join(f'<div class="ac-gopro__row" role="row"><span class="ac-gopro__what" role="rowheader"><b>{esc(a)}</b>'
                   + (f'<span>{esc(note)}</span>' if note else "") + f'</span><span role="cell">{free}</span><span role="cell">{pro}</span></div>'
                   for a, note, free in rows)
    # desktop reads "Start free. Go further with Pro." (board Home-Guest-D); phones keep the short title
    title = (f'<span class="ac-d-only">{esc(t("home.gopro.titleDesk"))}</span><span class="ac-m-only">{esc(t("home.gopro.title"))}</span>')
    return (f'<section class="ac-gopro" aria-labelledby="gopro-title">'
            f'<div class="ac-section-head">{title_link(base, "pro", "gopro-title", None, "ac-h1", html=title)}<p class="ac-lead">{esc(t("home.gopro.sub"))}</p></div>'
            f'<div class="ac-gopro__table" role="table" aria-label="{esc(t("pro.table.aria"))}"><span class="ac-gopro__col" aria-hidden="true"></span>'
            f'<div class="ac-gopro__row ac-gopro__row--head" role="row"><span role="columnheader">{esc(t("pro.table.what"))}</span>'
            f'<span role="columnheader">{esc(t("pro.table.free"))}</span><span role="columnheader"><span class="ac-gopro__pill">{esc(t("pro.table.pro"))}</span></span></div>'
            f'{body}</div>'
            f'<div class="ac-gopro__cta"><a class="ac-btn ac-btn--pro ac-gopro__btn" href="{href(base, "pro")}" data-pro-hide>{esc(t("pro.cta"))}{icon("chev", 16, 2.5)}</a>'
            f'<span class="ac-gopro__price" data-pro-text="{esc(t("home.gopro.member"))}">{esc(t("home.gopro.price", price=lib.fmt_money(9.99)))}</span>'
            f'<a class="ac-gopro__all ac-d-only" href="{href(base, "paths")}">{esc(t("pm.upnext.all"))}{icon("chev", 16, 2.5)}</a></div></section>')


# ---------------------------------------------------------------- Why Rico? (canvas Home-Guest-D + Home-Guest-D-Mobile)
# Between Go further with Pro and the Ready + guide pair, on desktop and phones. One section: desktop puts Rico on the
# left in a soft green glow with the text beside him; phones put the text left and Rico bottom right on the card's edge.
def why_rico(t, base):
    return (f'<section class="ac-whyrico" aria-labelledby="why-title">'
            f'<img class="ac-whyrico__rico" src="{rico_src(base, "hero")}" alt="{esc(t("home.why.ricoAlt"))}" width="113" height="168" loading="lazy" decoding="async">'
            f'<div class="ac-whyrico__text"><h2 id="why-title" class="ac-whyrico__title">{esc(t("home.why.title"))}</h2>'
            f'<p class="ac-whyrico__p">{esc(t("home.why.text"))}</p></div></section>')


# ---------------------------------------------------------------- desktop: Ready when you are (canvas Home-Guest-D)
# The last call to start, beside the guide card. Its button mirrors the hero's "Start learning free" (label, link and
# sign-up gate, learn-pages.js guestHome). The minutes are Lesson 1's own (the lesson file), as on the path map.
# Phones keep the guide card alone (the mobile boards have no Ready card; the sticky bar does this job there).
def ready_card(t, base, first_r, first_l):
    mins = (first_l or {}).get("minutes") or 4
    return (f'<section class="ac-card ac-ready ac-d-only" aria-labelledby="ready-title">'
            f'<span class="ac-eyebrow ac-eyebrow--mint">{esc(t("home.ready.eyebrow"))}</span>'
            f'<h2 id="ready-title" class="ac-h2">{esc(t("home.ready.title", n=mins))}</h2>'
            f'<p class="ac-ready__text">{esc(t("home.ready.text"))}</p>'
            # the closing ask: sign up (the sheet), then straight into Lesson 1 (shell.js: a sign-up link lands on its href)
            f'<a class="ac-btn ac-btn--primary ac-ready__btn" href="{href(base, first_r)}" data-action="signup" data-reason="{esc(t("chapter.signupReason"))}">{esc(t("home.ready.cta"))}{icon("chev", 16, 2.5)}</a>'
            # the board's "N min" ring: a quarter arc on a track, the minutes in the middle (decorative; the title says it)
            f'<svg class="ac-ready__ring" viewBox="0 0 150 150" aria-hidden="true" focusable="false">'
            f'<circle class="ac-ready__track" cx="75" cy="75" r="60"/>'
            f'<circle class="ac-ready__arc" cx="75" cy="75" r="60" stroke-dasharray="94.2 377" transform="rotate(-90 75 75)"/>'
            f'<text class="ac-ready__num" x="75" y="80" text-anchor="middle">{mins}</text>'
            f'<text class="ac-ready__unit" x="75" y="102" text-anchor="middle">{esc(t("home.ready.min"))}</text></svg></section>')


# snake map: node centres in a 1100 × 310 box (from the canvas). The path runs along the top row, turns, and back.
GUT = 120
SNAKE = "M 210 56 L 1090 56 A 125 125 0 0 1 1090 306 L 210 306"
NODES = [(10, 30), (230, 30), (450, 30), (670, 30), (890, 30), (890, 280), (670, 280), (450, 280), (230, 280), (10, 280)]
SNAKE_LEN = 880 + 3.14159265 * 125 + 880


def node_at(i):
    """Fraction of the path where chapter node i sits (the trail fills to here)."""
    if i <= 4:
        return 220 * i / SNAKE_LEN
    return (880 + 3.14159265 * 125 + 220 * (i - 5)) / SNAKE_LEN


def snake_map(t, base, L):
    skills = {s["after"]: s["name"] for s in L.get("skills", [])}
    items, badges = [], []
    for i, c in enumerate(L["chapters"][:10]):
        x, y = NODES[i]
        last = i == len(L["chapters"]) - 1
        kind = "plan" if last else ""
        tag = "a" if c["available"] else "div"
        h = f' href="{href(base, L["id"] + "/" + c["id"])}"' if c["available"] else ' tabindex="0"'
        mins = sum(l["minutes"] or 0 for l in c["lessons"]) or c["minutes"]
        pop = (f'<span class="ac-snake__pop" role="tooltip"><b>{esc(c["title"])}</b>'
               f'<span>{esc(t("home.map.popMeta", n=c["count"], min=c["minutes"]))}</span>'
               + (f'<span class="ac-snake__pop-cta">{esc(t("home.map.popOpen"))} ›</span>' if c["available"] else f'<span class="ac-snake__pop-soon">{esc(t("home.map.popSoon"))}</span>')
               + '</span>')
        soon = ""
        items.append(f'<li class="ac-snake__node{" ac-snake__node--" + kind if kind else ""}{"" if c["available"] else " is-soon"}" data-ch="{c["id"]}" data-n="{c["n"]}" data-at="{node_at(i):.4f}" style="left:{(x + GUT) / 12.2:.3f}%;top:{y / 3.8:.3f}%;--i:{i}">'
                     f'<{tag} class="ac-snake__link"{h}><span class="ac-snake__dot">{c["n"]}</span>'
                     f'<span class="ac-snake__text"><b>{esc(c["short"])}{soon}</b><span>{esc(c["tagline"])}</span></span>{pop}</{tag}></li>')
    svg = (f'<svg class="ac-snake__svg" viewBox="0 0 1220 380" aria-hidden="true" focusable="false">'
           f'<defs><linearGradient id="acSnakeGrad" x1="0" x2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".55"/><stop offset="1" stop-color="currentColor"/></linearGradient></defs>'
           f'<path class="ac-snake__track" d="{SNAKE}" pathLength="1"/><path class="ac-snake__trail" d="{SNAKE}" pathLength="1"/></svg>')
    rico = (f'<div class="ac-snake__rico" data-snake-rico hidden><span class="ac-snake__bubble" data-snake-bubble></span>'
            f'<img src="{rico_src(base, "point")}" alt="{esc(t("home.map.ricoAlt"))}" width="72" height="72"></div>'
            f'<div class="ac-snake__rico ac-snake__rico--end is-gutter" style="top:{NODES[9][1] / 3.8:.3f}%">'
            f'<span class="ac-snake__bubble ac-snake__bubble--gold">{esc(t("home.map.finish"))}</span>'
            f'<img src="{rico_src(base, "celebrate")}" alt="{esc(t("home.map.ricoEndAlt"))}" width="72" height="72"></div>')
    return (f'<div class="ac-snake" data-snake>{svg}<ol class="ac-snake__nodes">{"".join(items)}</ol>'
            f'{rico}</div>')


def ranks_strip(t, base):
    items = []
    for rid, lo, hi, xp in RANKS:
        lv = t("home.ranks.levels", a=lo, b=hi) if hi else t("home.ranks.levelsPlus", a=lo)
        items.append(f'<li class="ac-rankcard ac-rankcard--{rid}"><span class="ac-rankcard__lv">{esc(lv)}</span><b>{esc(t("rank." + rid))}</b>'
                     f'<span class="ac-rankcard__xp">{esc(t("home.ranks.from", xp=lib.fmt_num(xp)))}</span>'
                     f'<img src="{base}static/img/ranks/{rid}.webp" alt="{esc(t("home.ranks.alt", rank=t("rank." + rid)))}" width="150" height="150"></li>')
    return (f'<section class="ac-card ac-ranks" aria-labelledby="ranks-title"><div class="ac-sechead">{title_link(base, "how-it-works#how-ranks", "ranks-title", t("home.ranks.title"))}'
            f'<p class="ac-small ac-muted">{esc(t("home.ranks.sub"))}</p></div><ol class="ac-ranks__list" data-swipe>{"".join(items)}</ol></section>')


def routes(ctx):
    t = ctx.t
    L = ltt(ctx)
    base = base_of("", ctx.locale)
    first_r = lesson_route(L["id"], *L["first_lesson"]) if L["first_lesson"] else L["id"]
    first_c = L["first"]
    first_l = first_c["lessons"][0] if first_c else None
    n_ch = len(L["chapters"])
    pros = [p for p in pro_paths(ctx) if p.get("status") != "soon"][:3]
    pro_grid = "".join(pro_card(t, base, p, lazy=False) for p in pros)   # eager: phones show them in a swipe row

    def pro_section(key):
        """The Pro paths section, one component (the landing page and the signed-in home): a grid on desktop, a swipe
        row with dots on phones. key keeps its ids unique (every copy is in the page)."""
        return (f'<section class="ac-prosec ac-prosec--row" aria-labelledby="{key}-title">'
                f'<div class="ac-section-head">{title_link(base, "paths", key + "-title", t("home.pro.title"), "ac-h1")}<p class="ac-lead ac-m-only">{esc(t("home.pro.soon"))}</p></div>'
                f'<div class="ac-pgrid" data-swipe="{key}-dots">{pro_grid}</div>'
                f'<div class="ac-dots ac-m-only" id="{key}-dots" aria-hidden="true"></div></section>')
    hero_chips = [t("home.chip.free"), t("home.chip.chapters", n=n_ch), t("home.chip.lessons", n=L["lessons"], ready=L["ready"]), t("home.chip.cert")]

    # ---------------------------------------------------------------- guest (SSR, SEO)
    guest = f'''<div class="ac-home ac-home--guest" data-show="guest">
  <section class="ac-ghero" aria-labelledby="hero-title">
    <div class="ac-ghero__main">
      <img class="ac-ghero__rico-m" src="{rico_src(base, "present")}" alt="" width="230" height="230">
      <span class="ac-ghero__eb" data-gh-eb hidden></span>
      <h1 id="hero-title" class="ac-ghero__title"><span>{esc(t("home.hero.title1"))}</span><br><span>{esc(t("home.hero.title2"))}</span></h1>
      <p class="ac-ghero__lead">{esc(t("onb.hero.lead"))}</p>
      <div class="ac-ghero__ctas">
        <a class="ac-btn ac-btn--white ac-btn--lg ac-ghero__start" href="{href(base, "start")}" data-gh-cta><span data-gh-cta-label>{esc(t("onb.hero.cta"))}</span>{icon("chev", 16, 2.5)}</a>
        <a class="ac-btn ac-btn--outline-light ac-btn--lg ac-ghero__paths" href="{href(base, L["id"])}">{esc(t("home.hero.learn"))}</a>
      </div>
      <ul class="ac-ghero__chips">{"".join(f"<li>{esc(c)}</li>" for c in hero_chips)}</ul>
    </div>
    <div class="ac-ghero__art">
      <div class="ac-ghero__meet" role="note"><b>{esc(t("home.hero.meet"))}</b><span>{esc(t("home.hero.meetSub"))}</span></div>
      <img class="ac-ghero__rico" src="{rico_src(base, "hero")}" alt="{esc(t("home.hero.ricoAlt"))}" width="396" height="396">
    </div>
  </section>
  {how_cards(t, "how-title", base, L)}
  <section class="ac-card ac-learnmap" aria-labelledby="learn-title">
    <div class="ac-learnmap__head">
      <div class="ac-sechead"><div class="ac-row ac-row--tight">{title_link(base, L["id"], "learn-title", t("home.map.title"))}<span class="ac-chip ac-chip--mint ac-chip--xs">{esc(t("home.map.tag", path=L["title"]))}</span></div>
      <p class="ac-small ac-muted">{esc(t("home.map.sub", n=n_ch))} {esc(t("home.map.meta", lessons=L["lessons"], ready=L["ready"], hours=fmt_h(L["hours"] or 4)))}</p></div>
    </div>
    {snake_map(t, base, L)}
    {learn_list(t, base, L)}
    {cert_card(t, base, L)}
  </section>
  {pro_section("pro")}
  <section class="ac-top" aria-labelledby="tl-title" data-top-board>
    <div class="ac-section-head">{title_link(base, "leaderboard", "tl-title", t("home.top.title"), "ac-h1")}
      <p class="ac-lead">{esc(t("home.top.lead"))}</p></div>
    <div class="ac-top__grid">
      <div class="ac-top__podium-card"><div class="ac-top__intro"><span class="ac-top__eyebrow" data-top-eyebrow></span><span>{esc(t("home.top.sub"))}</span></div><div class="ac-top__podium" data-top-podium></div></div>
      <div class="ac-top__list-card"><ol class="ac-top__list" data-top-list></ol><p class="ac-top__foot">{esc(t("home.top.foot"))}</p>
        <button type="button" class="ac-top__join ac-m-only" data-action="signup"><span class="ac-top__join-ic" aria-hidden="true">?</span><span class="ac-top__join-text"><b>{esc(t("home.top.where"))}</b><span>{esc(t("home.top.whereSub"))}</span></span>{icon("chev", 18, 2.5)}</button></div>
    </div>
  </section>
  {ranks_strip(t, base)}
  {go_pro(t, base, L)}
  {why_rico(t, base)}
  <div class="ac-grid-2 ac-home__pair">
    {ready_card(t, base, first_r, first_l)}
    <section class="ac-card ac-guidepromo" aria-labelledby="guide-title">
      <a class="ac-guidepromo__cover" href="{href(base, "guide")}" aria-label="{esc(t("home.guide.cta"))}"><img src="{base}static/img/art/guide-cover.webp" alt="{esc(t("home.guide.alt"))}" width="150" height="200"></a>
      <div class="ac-sechead"><span class="ac-eyebrow ac-eyebrow--gold">{esc(t("home.guide.eyebrow"))}</span><h2 id="guide-title" class="ac-h2">{esc(t("home.guide.title"))}</h2>
        <p class="ac-lead ac-d-only">{esc(t("home.guide.text"))}</p><p class="ac-lead ac-m-only">{esc(t("home.guide.textShort"))}</p>
        <a class="ac-btn ac-btn--primary ac-guidepromo__btn" href="{href(base, "guide")}">{esc(t("home.guide.cta"))}</a>
        <a class="ac-guidepromo__link ac-m-only" href="{href(base, "guide")}">{esc(t("home.guide.cta"))}{icon("chev", 16, 2.5)}</a></div>
    </section>
  </div>
  <div class="ac-ghsticky" data-gh-sticky inert><a class="ac-btn ac-btn--primary ac-btn--lg" href="{href(base, first_r)}" data-gh-sticky-cta><span data-gh-cta-label>{esc(t("home.hero.cta"))}</span></a></div>
</div>'''

    # ---------------------------------------------------------------- signed in: new (nothing played yet) and learning
    # the path card (one component: path page, All paths, here); filled with the learner's state by learn-pages.js pmHero
    path_card = pm_hero(t, base, L, href(base, first_r), h1=False, path_map=True)
    # what's ahead on the path: this chapter's Challenge, the next skill, the certificate (learn-pages.js pathProgress)
    miles_card = (f'<section class="ac-card ac-pathprog"><h2 class="ac-side__title">{esc(t("home.miles.title"))}</h2>'
                  f'<div class="ac-miles" data-pp-miles></div></section>')
    new = f'''<div class="ac-home ac-home--member" data-show="new" hidden>
  <header class="ac-sechead"><h1 class="ac-h1" data-greet-new>{esc(t("home.new.title", name=""))}</h1><p class="ac-lead">{esc(t("home.new.sub", min=first_l["minutes"] if first_l else 4))}</p></header>
  <div class="ac-homegrid">
    <div class="ac-homegrid__main">
      {path_card}
      {miles_card}
      <div data-home-gym></div>
    </div>
    <aside class="ac-homegrid__aside" aria-label="{esc(t("home.aside"))}" data-home-aside></aside>
  </div>
  {pro_section("new")}
</div>'''

    # ---------------------------------------------------------------- learning (mid-path)
    learning = f'''<div class="ac-home ac-home--member" data-show="learning" hidden>
  <header class="ac-sechead"><h1 class="ac-h1" data-greet></h1><p class="ac-lead" data-greet-sub></p></header>
  <div class="ac-homegrid">
    <div class="ac-homegrid__main">
      {path_card}
      {miles_card}
      <div data-home-gym></div>
    </div>
    <aside class="ac-homegrid__aside" aria-label="{esc(t("home.aside"))}" data-home-aside></aside>
  </div>
  {pro_section("more")}
</div>'''

    body = f'<div class="ac-wrap ac-lp ac-home-wrap" data-home>{guest}{new}{learning}{cert_sheet(t, base, L, first_r)}{disclaimer(t)}</div>'
    ld = [{"@context": "https://schema.org", "@type": "WebPage", "name": t("home.meta.title"), "description": t("home.meta.desc"),
           "url": f"{lib.ORIGIN}/academy/", "isPartOf": {"@type": "WebSite", "name": "Profit.com", "url": lib.ORIGIN}},
          {"@context": "https://schema.org", "@type": "Course", "name": L["title"], "description": ctx.path["outcome"],
           "url": f"{lib.ORIGIN}/academy/{L['id']}/", "isAccessibleForFree": True, "inLanguage": "en-US",
           "provider": {"@type": "Organization", "name": "Profit.com", "sameAs": lib.ORIGIN}}]
    yield "", lib.page(t, route="", title=t("home.meta.title"), description=t("home.meta.desc"), body=body, active="home",
                       index=True, css=CSS + CERT_CSS, js=("vendor/qrcode.js", "cert.js") + JS, jsonld=ld, data={"ac-learn": learn_data(ctx, L), "ac-certpaths": cert_paths(ctx)}, body_class="ac-page-home", locale=ctx.locale)
