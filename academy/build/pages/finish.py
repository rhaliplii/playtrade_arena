"""Path finale (/academy/learn-to-trade/finish): every Challenge passed + plan → certificate, +500 XP, +500 coins.
rankup.js/.css (shared with the player) show the rank-up when the +500 XP crosses a rank."""
from pages import me
from pages.certificates import cert_catalog, cert_data, CERT_CSS, CERT_JS


def routes(ctx):
    route = ctx.path["id"] + "/finish"
    data = {"me-catalog": cert_catalog(ctx)}
    data.update(cert_data(ctx))
    yield route, me.page(ctx, route, "finish", '<div id="meRoot" class="me-root"></div>', "paths", wrap_head=False, data=data,
                         css=("rankup.css", "celebrate.css") + CERT_CSS, js=("rankup.js", "celebrate.js") + CERT_JS)
