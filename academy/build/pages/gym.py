"""Rico's Gym overview (/academy/gym): due today, ideas in review, start → gym/today."""
from pages import me


def routes(ctx):
    yield "gym", me.page(ctx, "gym", "gym", '<div id="meRoot" class="me-root"></div>', "gym",
                         data={"me-ideas": me.ideas_data(ctx)})
