"""Guest onboarding (canvas Onb-01…06).
   /academy/start   — the 5-question onboarding quiz (one question per screen, instant feedback) and its result (a state
                      of the same page: a finished quiz always opens on the result). Full screen, noindex.
   /academy/welcome — after sign-up: the saved result, the XP credited, level and streak started, the chapters the
                      questions came from, Start Lesson 1 (+ Skip to Chapter 2 for 4–5 right). Noindex.
   Questions: content/<locale>/onboarding.json. Logic: static/js/onboarding.js on AC.progress (onboarding / onbAnswer /
   onbFinish / onbCredit)."""
import lib
from lib import content_path, load_json
from pages.path import ltt, lesson_route, base_of, href
from pages.lesson import PLAYER_CSS, PLAYER_JS, skeleton


def onb_data(ctx, L, base):
    q = load_json(content_path(ctx.locale, "onboarding.json"))
    first = L["first_lesson"]
    return {
        "questions": q["questions"],
        "minutes": q["minutes"],
        "path": {"id": L["id"], "title": L["title"], "href": href(base, L["id"])},
        "first": {"href": href(base, lesson_route(L["id"], *first)) if first else href(base, L["id"])},
    }


def routes(ctx):
    t = ctx.t
    L = ltt(ctx)

    route = "start"
    base = base_of(route, ctx.locale)
    yield route, lib.page(
        t, route=route, title=t("onb.meta.title"), description=t("onb.meta.desc"),
        body=skeleton(t, t("onb.boot"), t("onb.meta.title")), index=False, shell=False, body_class="ac-body--player ac-body--onb",
        css=PLAYER_CSS + ("onboarding.css",), js=PLAYER_JS + ("onboarding.js",), data={"ac-onb": onb_data(ctx, L, base)}, locale=ctx.locale)

    route = "welcome"
    base = base_of(route, ctx.locale)
    body = (f'<div class="ac-wrap ac-onbw" id="acWelcome" aria-live="polite"><noscript><p class="ac-lead">{lib.esc(t("player.noscript"))}</p></noscript></div>')
    yield route, lib.page(
        t, route=route, title=t("onb.w.meta.title"), description=t("onb.w.meta.desc"), body=body, active="home",
        index=False, css=("learn-pages.css", "onboarding.css"), js=("onboarding.js",), data={"ac-onb": onb_data(ctx, L, base)},
        body_class="ac-page-welcome", locale=ctx.locale)
