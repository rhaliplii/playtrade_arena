"""Top Learners (/academy/leaderboard): this month's XP, sample peers + the learner, podium, opt-out."""
from pages import me


def routes(ctx):
    yield "leaderboard", me.page(ctx, "leaderboard", "board", '<div id="meRoot" class="me-root"></div>', "leaderboard",
                                 wrap_head=False, data={"me-peers": me.peers()}, public=True)
