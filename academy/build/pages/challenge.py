"""Chapter Challenge: learn-to-trade/<chapter-id>/challenge (noindex, full screen, static/js/challenge.js)."""
import lib
from pages.lesson import PLAYER_CSS, PLAYER_JS, strip_added, glossary_for, skeleton, next_chapter


def chapter_meta(ctx, cid, ch):
    return {"id": cid, "n": ch["n"], "title": ch["title"], "short": ch["short"], "count": len(ch["lessons"]),
            "lessons": [{"id": lid, "n": i + 1, "title": ctx.lessons[lid]["title"]} for i, lid in enumerate(ch["lessons"])]}


def routes(ctx):
    t = ctx.t
    for cid, ch in ctx.chapters.items():
        data = {"ac-challenge": {
            "chapter": chapter_meta(ctx, cid, ch),
            "questions": strip_added(ch["challenge"]["questions"]),
            # optional second set (same order, one per lesson): a retry after a fail uses it ("Retry with new questions")
            "retry": strip_added(ch["challenge"].get("retry") or []),
            "refresher": ch.get("refresher", []),
            "next": next_chapter(ctx, ch),
            "path": {"id": ctx.path["id"], "title": ctx.path["title"], "chapters": len(ctx.path["chapters"]),
                     "finale": {"xp": ctx.path.get("finale", {}).get("xp", 500), "coins": ctx.path.get("finale", {}).get("coins", 500)}},
            "last": ch["n"] == max(c["n"] for c in ctx.path["chapters"]),
        }, "ac-glossary": glossary_for(ctx, ch["challenge"])}
        route = f"learn-to-trade/{cid}/challenge"
        yield route, lib.page(
            t, route=route, title=t("challenge.meta.title", n=ch["n"], title=ch["title"]), description=t("challenge.meta.description"),
            body=skeleton(t, t("challenge.heading", n=ch["n"]), ch["title"]), index=False, shell=False, body_class="ac-body--player",
            css=PLAYER_CSS + ("celebrate.css",), js=PLAYER_JS + ("celebrate.js", "player.js", "challenge.js"), data=data, locale=ctx.locale)
