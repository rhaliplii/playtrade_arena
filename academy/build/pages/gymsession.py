"""Rico's Gym session: gym/today (noindex, full screen, static/js/gym-session.js).
Inlines the idea → questions index (ctx.ideas) so the session can show each due idea as one of its questions.
?chapter=<id> (from the Gym page's "Chapter review") builds the session from that chapter's ideas."""
import lib
from pages.lesson import PLAYER_CSS, PLAYER_JS, strip_added, glossary_for, skeleton


def routes(ctx):
    t = ctx.t
    ideas = {}
    for idea, qs in ctx.ideas.items():
        ideas[idea] = [strip_added(q) for q in qs]
    lessons = {lid: {"n": les["n"], "title": les["title"], "chapter": les["chapter"]} for lid, les in ctx.lessons.items()}
    chapters = {cid: {"n": ch["n"], "short": ch["short"], "title": ch["title"]} for cid, ch in ctx.chapters.items()}
    names = getattr(ctx, "idea_names", None) or {}
    data = {"ac-gym": {"ideas": ideas, "lessons": lessons, "chapters": chapters, "names": names},
            "ac-glossary": glossary_for(ctx, ideas)}
    route = "gym/today"
    yield route, lib.page(
        t, route=route, title=t("gym.session.meta.title"), description=t("gym.session.meta.description"),
        body=skeleton(t, t("gym.session.heading"), t("gym.session.meta.title")), index=False, shell=False, body_class="ac-body--player",
        css=PLAYER_CSS, js=PLAYER_JS + ("player.js", "gym-session.js"), data=data, locale=ctx.locale)
