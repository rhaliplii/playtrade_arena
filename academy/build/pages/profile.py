"""Public profile (/academy/u/?h=<handle>): rank, skills, certificates of a learner (each links to its verify page). Not indexed."""
from pages import me


def routes(ctx):
    yield "u", me.page(ctx, "u", "profile", '<div id="meRoot" class="me-root"></div>', "progress",
                       wrap_head=False, data={"me-peers": me.peers()})
