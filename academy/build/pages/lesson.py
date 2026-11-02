"""Lesson player routes: learn-to-trade/<chapter-id>/<lesson-id> (noindex, full screen, JS player).
The lesson JSON, chapter meta, next-lesson info and the glossary terms it uses are inlined for static/js/player.js."""
import json
import re

import lib

# rankup.js/.css (rank-up screen, rank card, count-up) are standalone: the path finish page loads them too
PLAYER_CSS = ("visuals.css", "player.css", "rankup.css")
PLAYER_JS = ("visuals.js", "cards.js", "rankup.js")


def strip_added(v):
    """Drop provenance notes ('added') before inlining: they are reviewed, never shown."""
    if isinstance(v, dict):
        return {k: strip_added(x) for k, x in v.items() if k != "added"}
    if isinstance(v, list):
        return [strip_added(x) for x in v]
    return v


def glossary_for(ctx, obj):
    ids = sorted(set(re.findall(r"\[\[([a-z0-9-]+)\|", json.dumps(obj, ensure_ascii=False))))
    return {i: {"term": ctx.glossary[i]["term"], "short": ctx.glossary[i]["short"]} for i in ids if i in ctx.glossary}


def next_chapter(ctx, ch):
    """The chapter after `ch` on the path ({id, n, title, short, available}), or None after the last one."""
    for c in ctx.path["chapters"]:
        if c["n"] == ch["n"] + 1:
            return {"id": c["id"], "n": c["n"], "title": c["title"], "short": c["short"], "available": bool(c.get("available"))}
    return None


def skeleton(t, kicker, title):
    """What shows before the script runs (and if it never does)."""
    return (f'<div id="acPlayer" class="ac-pl-host"><div class="ac-pl-boot"><span class="ac-eyebrow">{lib.esc(kicker)}</span>'
            f'<h1 class="ac-h2">{lib.esc(title)}</h1><noscript><p class="ac-lead">{lib.esc(t("player.noscript"))}</p></noscript></div></div>')


def routes(ctx):
    t = ctx.t
    first = ctx.lesson_order[0] if ctx.lesson_order else None
    for cid, ch in ctx.chapters.items():
        ids = ch["lessons"]
        for i, lid in enumerate(ids):
            les = ctx.lessons[lid]
            nxt = None
            if i + 1 < len(ids):
                n = ctx.lessons[ids[i + 1]]
                nxt = {"id": n["id"], "n": n["n"], "title": n["title"], "minutes": n["minutes"]}
            data = {
                "ac-lesson": {
                    "lesson": strip_added(les),
                    "chapter": {"id": cid, "n": ch["n"], "title": ch["title"], "short": ch["short"], "index": i, "count": len(ids)},
                    "next": nxt,
                    # the last lesson: where to go once the chapter's Challenge is already passed (a replay)
                    "nextChapter": None if nxt else next_chapter(ctx, ch),
                    "first": first,
                },
                "ac-glossary": glossary_for(ctx, les),
            }
            route = f"learn-to-trade/{cid}/{lid}"
            kicker = t("player.kicker", ch=ch["n"], n=i + 1, total=len(ids))
            yield route, lib.page(
                t, route=route, title=t("player.meta.title", lesson=les["title"]), description=les["desc"],
                body=skeleton(t, kicker, les["title"]), index=False, shell=False, body_class="ac-body--player",
                css=PLAYER_CSS, js=PLAYER_JS + ("player.js",), data=data, locale=ctx.locale)
