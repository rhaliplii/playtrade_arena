"""My progress (/academy/me) + shared helpers for the progress & social pages
(me/rewards, me/certificates, me/notes, my-plan, leaderboard, u, gym, learn-to-trade/finish).

The pages are learner-specific and not indexed: Python renders the frame (title, intro, guest gate, an empty
mount point) and inlines the data the page needs; static/js/me-pages.js renders the learner's state."""
import json

import lib
from lib import esc, ACADEMY, CONTENT

CSS = ("me-pages.css",)
JS = ("me-pages.js",)
PEERS = CONTENT / "demo" / "peers.json"


def path_data(ctx):
    """Path outline for the client: every chapter (authored or not), skills, finale."""
    p = ctx.path
    chapters = []
    for ch in p["chapters"]:
        authored = ctx.chapters.get(ch["id"])
        chapters.append({
            "id": ch["id"], "n": ch["n"], "short": ch["short"], "title": ch["title"],
            "available": bool(ch.get("available")) and authored is not None,
            "count": len(authored["lessons"]) if authored else len(ch.get("lessons", [])),
        })
    return {
        "id": p["id"], "title": p["title"], "chapters": chapters,
        "lessons": sum(c["count"] for c in chapters),
        "skills": [{"after": s["after"], "name": s["name"]} for s in p.get("skills", [])],
        "finale": {"xp": p.get("finale", {}).get("xp", 500), "coins": p.get("finale", {}).get("coins", 500)},
        # lesson id → minutes (My progress: time learned)
        "minutes": {lid: ctx.lessons[lid].get("minutes", 4) for lid in ctx.lesson_order if lid in ctx.lessons},
    }


def ideas_data(ctx):
    """idea id → where it is taught {ch: chapter n, chapter, short, l: lesson n, lesson} for Rico's Gym.
    (Content has no idea names yet; the page shows the idea id in words.)"""
    out = {}
    for idea, uses in getattr(ctx, "ideas", {}).items():
        info = {}
        for u in uses:
            ch = ctx.chapters.get(u.get("chapter"))
            if not ch:
                continue
            if u.get("lesson") in ctx.lessons:
                info.setdefault("l", ctx.lessons[u["lesson"]]["n"])
                info.setdefault("lesson", u["lesson"])
            elif u.get("challenge") and u["challenge"].get("lesson"):
                info.setdefault("l", u["challenge"]["lesson"])
            info.setdefault("ch", ch["n"])
            info.setdefault("chapter", ch["id"])
            info.setdefault("short", ch["short"])
        if info:
            info["name"] = getattr(ctx, "idea_names", {}).get(idea, "")
            out[idea] = info
    return out


def peers():
    if PEERS.exists():
        return json.loads(PEERS.read_text())
    return {"peers": []}


def gate(t, area):
    """Guest state: these pages need an account (spec: Account)."""
    return f'''<section class="me-gate" data-show="guest" aria-labelledby="meGateTitle">
  <div class="me-gate__text">
    <span class="ac-eyebrow me-gate__eyebrow">{esc(t("me.gate.eyebrow"))}</span>
    <h2 class="ac-h2" id="meGateTitle">{esc(t(area + ".gate.title"))}</h2>
    <p class="ac-lead">{esc(t(area + ".gate.text"))}</p>
    <div class="ac-row">
      <button type="button" class="ac-btn ac-btn--white" data-action="signup">{esc(t("me.gate.cta"))}</button>
      <a class="ac-btn ac-btn--outline-light" href="{{HOME}}">{esc(t("me.gate.start"))}</a>
    </div>
  </div>
  <img class="me-gate__rico" src="{{BASE}}static/img/rico/thumbs.webp" alt="">
</section>'''


def head(t, area, crumb=None, aside=""):
    crumbs = ""
    if crumb:
        crumbs = (f'<nav class="me-crumb" aria-label="{esc(t("me.crumb.aria"))}"><a href="{{BASE}}me/index.html">'
                  f'{esc(t("me.title"))}</a><span aria-hidden="true">/</span><span aria-current="page">{esc(crumb)}</span></nav>')
    return f'''<header class="me-head">
  <div class="me-head__text">{crumbs}
    <h1 class="ac-h1">{esc(t(area + ".title"))}</h1>
    <p class="ac-lead">{esc(t(area + ".lead"))}</p>
  </div>{aside}
</header>'''


# My progress tabs: the learner's own pages share one side nav entry (My progress) and this tab bar.
# (route, label key); routes stay separate pages so deep links and the back button work.
ME_TABS = (("me", "me.tabs.progress"), ("my-plan", "me.tabs.plan"), ("me/rewards", "me.tabs.rewards"))


def me_tabs(t, route):
    """Progress · Trading Plan · Rewards: links styled as the All paths filter pills; the current one has aria-current."""
    cur = ' aria-current="page"'
    links = "".join(f'<a class="ac-filter me-tabs__tab" href="{{BASE}}{r}/index.html"{cur if r == route else ""}>{esc(t(k))}</a>'
                    for r, k in ME_TABS)
    return f'<nav class="ac-filters me-tabs" aria-label="{esc(t("me.tabs.aria"))}">{links}</nav>'


def page(ctx, route, area, inner, active, data=None, wrap_head=True, crumb=None, aside="", extra_class="", public=False, css=(), js=()):
    """One progress & social page: guest gate + member mount point (public pages skip the gate).
    Routes in ME_TABS get the My progress tab bar above the header."""
    t = ctx.t
    depth = len([p for p in route.strip("/").split("/") if p])
    base = "../" * depth
    head_html = head(t, area, crumb, aside) if wrap_head else ""
    tabs_html = me_tabs(t, route) if route in dict(ME_TABS) else ""
    body = f'''<div class="ac-wrap me-wrap {extra_class}" data-me-page="{area}">
{tabs_html}
{head_html}
{"" if public else gate(t, area)}
<div class="me-body"{"" if public else ' data-show="member"'}>{inner}</div>
</div>'''
    body = body.replace("{BASE}", base).replace("{HOME}", base + "index.html")
    payload = {"me-path": path_data(ctx)}
    payload.update(data or {})
    return lib.page(t, route=route, title=t(area + ".meta.title"), description=t(area + ".meta.description"),
                    body=body, active=active, index=False, css=CSS + tuple(css), js=JS + tuple(js), data=payload, locale=ctx.locale)


def routes(ctx):
    from pages.certificates import cert_data, CERT_CSS, CERT_JS   # (certificates imports this module)
    yield "me", page(ctx, "me", "me", '<div id="meRoot" class="me-root" aria-live="polite"></div>', "progress", data=cert_data(ctx, seed=False), css=CERT_CSS, js=CERT_JS,
                     aside=f'<a class="me-head__link" href="../u/index.html" id="meProfileLink" data-show="member">{esc(ctx.t("me.profile"))}'
                           f'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
                           f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></a>')
