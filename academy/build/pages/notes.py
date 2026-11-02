"""My notes (/academy/me/notes): saved takeaways and reasoning answers, filter by chapter, search."""
from pages import me


def routes(ctx):
    lessons = {lid: {"t": l["title"], "n": l["n"], "ch": l["chapter"]} for lid, l in ctx.lessons.items()}
    yield "me/notes", me.page(ctx, "me/notes", "notes", '<div id="meRoot" class="me-root"></div>', "progress",
                              crumb=ctx.t("notes.title"), data={"me-lessons": lessons})
