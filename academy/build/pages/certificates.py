"""Certificates (/academy/me/certificates): the learner's certificate (earned, or the in-progress preview) with
Download PDF, share image, verify page and LinkedIn; every path's certificate below.

Shared with the finale, the public profile and the verify page: `CERT_CSS` / `CERT_JS` (the certificate component,
static/js/cert.js + vendor QR) and `cert_data(ctx)` (#ac-certpaths: every path's certificate facts; #ac-cert-seed:
the demo registry, content/demo/certificates.json)."""
import json

from lib import CONTENT
from pages import me
from pages.path import art_key

CERT_CSS = ("cert.css",)
CERT_JS = ("vendor/qrcode.js", "cert.js")
SEED = CONTENT / "demo" / "certificates.json"


def path_live(ctx, p):
    """A Pro path is live once its lessons exist (content/<locale>/paths/<id>.json); until then it's 'coming soon'."""
    if p.get("status") == "soon" or p.get("soon") or p.get("comingSoon"):
        return False
    return any((CONTENT / loc / "paths" / f'{p.get("id")}.json').exists() for loc in (ctx.locale, "en"))


def cert_catalog(ctx):
    """Every path in catalog order, for the certificates grid and the finale's "What's next" (me-pages.js)."""
    return [{"id": p.get("id"), "title": p.get("title"), "tier": p.get("tier"), "art": p.get("art") or f'path-{art_key(p.get("id"))}.webp',
             "outcome": p.get("outcome", ""), "live": path_live(ctx, p)}
            for p in (ctx.catalog or {}).get("paths", []) if p.get("id")]


def cert_paths(ctx):
    """path id → what its certificate and verify page print: title, tier, lessons, chapter names, level (Pro:
    catalog `certLevel`, else the end of the `level` range), ID prefix."""
    out = {}
    for p in (ctx.catalog or {}).get("paths", []):
        if not p.get("id"):
            continue
        if p["id"] == ctx.path["id"]:
            names = [c.get("short") or c["title"] for c in ctx.path["chapters"]]
            lessons = sum(len(c.get("lessons") or []) for c in ctx.path["chapters"])
        else:
            chs = p.get("chapters") if isinstance(p.get("chapters"), list) else []
            names = [c.get("short") or c.get("title", "") for c in chs]
            lessons = p.get("lessons") or sum(len(c.get("lessons") or []) for c in chs)
        level = p.get("certLevel") or str(p.get("level", "")).split("→")[-1].strip()
        out[p["id"]] = {"title": p.get("title", ""), "tier": "pro" if p.get("tier") == "pro" else "free", "lessons": lessons,
                        "chapters": names, "level": level, "prefix": p.get("certPrefix", "")}
    return out


def cert_seed():
    return json.loads(SEED.read_text()) if SEED.exists() else {"certificates": []}


def cert_data(ctx, seed=True):
    d = {"ac-certpaths": cert_paths(ctx)}
    if seed:
        d["ac-cert-seed"] = cert_seed()
    return d


def routes(ctx):
    data = {"me-catalog": cert_catalog(ctx)}
    data.update(cert_data(ctx))
    yield "me/certificates", me.page(ctx, "me/certificates", "certs", '<div id="meRoot" class="me-root"></div>', "progress",
                                     wrap_head=False, data=data, css=CERT_CSS, js=CERT_JS)
