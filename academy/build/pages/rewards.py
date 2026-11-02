"""My rewards (/academy/me/rewards): Profit Coins balance, what coins buy, rank look, certificates."""
from pages import me


def routes(ctx):
    yield "me/rewards", me.page(ctx, "me/rewards", "rewards", '<div id="meRoot" class="me-root"></div>', "progress")
