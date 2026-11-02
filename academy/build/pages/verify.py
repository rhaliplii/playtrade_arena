"""Certificate verify page (/academy/verify; canvas Certificate-Verify 5.5). Public, no sign-in, never indexed.

The public address is https://www.profit.com/academy/verify/<ID>. On a static host the page is verify/index.html and
reads the ID from `?id=` or from the path after /verify/, so a server rewrite /academy/verify/<ID> →
/academy/verify/?id=<ID> serves it (ARCHITECTURE.md › Certificates). Python renders the frame and the search state
(it works without JS: the form is a GET to ?id=); static/js/verify.js looks the ID up with AC.certs.lookup and shows the
verified certificate or "No certificate found". Its own minimal shell (logo · ACADEMY, Start learning free, the one
line naming the operator), not the Academy side nav."""
import re

import lib
from lib import esc, SITE
from pages.certificates import cert_data, CERT_CSS, CERT_JS


def logo_svg(cls):
    """The Profit.com logo (assets/logo.svg) inline, its colours from CSS (the word follows the theme)."""
    src = (SITE / "assets" / "logo.svg").read_text()
    paths = re.findall(r'<path[^>]*?\sd="([^"]+)"[^>]*?fill="([^"]+)"', src)
    body = "".join(f'<path class="{"vf-logo__word" if fill.upper() == "#FFFFFF" else "vf-logo__green"}" d="{d}"/>' for d, fill in paths)
    return f'<svg class="{cls}" viewBox="0 0 156 28" role="img" aria-label="Profit.com">{body}</svg>'


SEARCH_ICON = ('<svg class="vf-field__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" '
               'stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>')


def search_form(t, value="", button="verify.btn", small=False):
    return (f'<form class="vf-form{" vf-form--sm" if small else ""}" action="index.html" method="get" role="search" novalidate>'
            f'<label class="vf-field">{"" if small else SEARCH_ICON}<span class="vf-vh">{esc(t("verify.label"))}</span>'
            f'<input class="vf-field__input" name="id" type="text" value="{esc(value)}" placeholder="{esc(t("verify.placeholder"))}" '
            f'autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" aria-describedby="vfHint"></label>'
            f'<button class="vf-btn" type="submit">{esc(t(button))}</button></form>')


def body(ctx):
    t = ctx.t
    search = f'''<section class="vf-search" aria-labelledby="vfTitle">
  <div class="vf-search__text">
    <span class="vf-eyebrow">{esc(t("verify.eyebrow"))}</span>
    <h1 class="vf-h1" id="vfTitle">{esc(t("verify.title"))}</h1>
    <p class="vf-lead">{esc(t("verify.lead"))}</p>
    {search_form(t)}
    <p class="vf-hint" id="vfHint">{esc(t("verify.hint"))}</p>
  </div>
  <figure class="vf-sample">
    <div class="vf-sample__cert" data-vf-sample role="img" aria-label="{esc(t("verify.sampleAlt"))}"><span class="vf-sample__mark" aria-hidden="true"></span></div>
    <figcaption class="vf-sample__cap"><b>{esc(t("verify.where"))}</b> {esc(t("verify.whereText"))}</figcaption>
  </figure>
</section>'''
    return f'''<div class="vf">
<header class="vf-top">
  <a class="vf-brand" href="../index.html" aria-label="{esc(t("verify.home"))}">{logo_svg("vf-logo")}<span class="vf-brand__sep" aria-hidden="true"></span><span class="vf-brand__name">{esc(t("verify.brand"))}</span></a>
  <a class="vf-btn vf-btn--top" href="../index.html">{esc(t("verify.start"))}</a>
</header>
<main class="vf-main" id="main"><div class="vf-wrap" id="vfRoot" aria-live="polite">{search}</div></main>
<footer class="vf-foot"><p>{esc(t("verify.footer"))}</p></footer>
</div>'''


def routes(ctx):
    t = ctx.t
    yield "verify", lib.page(t, route="verify", title=t("verify.meta.title"), description=t("verify.meta.description"),
                             body=body(ctx), index=False, shell=False, main=False, body_class="ac-public vf-body",
                             css=CERT_CSS + ("verify.css",), js=CERT_JS + ("verify.js",), data=cert_data(ctx), locale=ctx.locale)
