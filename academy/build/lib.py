"""Shared helpers for the Academy build: paths, i18n, formatting, the Profit.com shell, html helpers."""
import html
import json
import pathlib
import re

BUILD = pathlib.Path(__file__).resolve().parent
ACADEMY = BUILD.parent                 # academy/
SITE = ACADEMY.parent                  # site root (styles.css, topnav.js, assets/)
CONTENT = ACADEMY / "content"
ORIGIN = "https://www.profit.com"
DEFAULT_LOCALE = "en"
LOCALES = {"en": {"prefix": "", "intl": "en-US", "name": "English"}}   # add a locale here + content/<loc> + locales/<loc>.json
PSEUDO = "xa"                          # en-XA pseudo-locale for the 35% text-growth check (built with --pseudo)

# Scripts every page loads, in order (plain scripts, no modules, so file:// works)
CORE_JS = ["core.js", "store.js", "services.js", "certs.js", "engine.js", "sound.js", "gsearch.js", "shell.js"]

REPORT = {"missing_strings": set(), "fallback_content": []}
INDEX = {}   # path index inlined on every page as #ac-index (set by build.py per locale)


# ------------------------------------------------------------------ i18n
def merge_locale(locale):
    out, seen = {}, {}
    folder = ACADEMY / "locales" / locale
    for f in sorted(folder.glob("*.json")) if folder.exists() else []:
        for k, v in json.loads(f.read_text()).items():
            if k in seen:
                raise ValueError(f"duplicate UI string '{k}' in {f.name} and {seen[k]}")
            seen[k] = f.name
            out[k] = v
    return out


class I18n:
    """UI strings live in locales/<locale>/<area>.json (one file per area, merged; a key may appear once)."""
    def __init__(self, locale):
        self.locale = locale
        self.en = merge_locale("en")
        self.own = merge_locale(locale) if locale not in ("en", PSEUDO) else {}
        if locale == PSEUDO:
            self.own = {k: pseudo(v) for k, v in self.en.items()}

    def raw(self, key):
        if key in self.own:
            return self.own[key]
        if key in self.en:
            if self.locale not in ("en", PSEUDO):
                REPORT["missing_strings"].add(f"{self.locale}:{key}")
            return self.en[key]
        raise KeyError(f"missing UI string '{key}' in locales/en.json")

    def __call__(self, key, **v):
        s = self.raw(key)
        if isinstance(s, dict):
            n = v.get("n", 1)
            s = s.get("one") if n == 1 and "one" in s else s.get("other")
        for k, val in v.items():
            s = s.replace("{" + k + "}", fmt_num(val) if isinstance(val, (int, float)) and not isinstance(val, bool) else str(val))
        return s

    def table(self, namespaces=None):
        """Strings inlined for the client (AC.t): every string, or only those of the given locale files (namespaces)."""
        out = dict(self.en)
        out.update(self.own)
        if namespaces is not None:
            keep = set().union(*(NAMESPACES().get(n, set()) for n in namespaces))
            out = {k: v for k, v in out.items() if k in keep}
        return out


_NS, _NS_PREFIX = {}, {}


def NAMESPACES():
    """locale file stem (shell, learn, player, me, ref) → its keys (English is the source, so every locale has the same keys)."""
    if not _NS:
        for f in sorted((ACADEMY / "locales" / DEFAULT_LOCALE).glob("*.json")):
            keys = set(json.loads(f.read_text()))
            _NS[f.stem] = keys
            # every dotted prefix of every key ("pm", "pm.l", "pm.l.ready")
            _NS_PREFIX[f.stem] = {".".join(k.split(".")[:i]) for k in keys for i in range(1, k.count(".") + 2)}
    return _NS


_KEY_LIT = re.compile(r"""["']([A-Za-z][A-Za-z0-9_.\-]*\.[A-Za-z0-9_.\-]*)["']""")
_KEY_TOK = re.compile(r"[A-Za-z][A-Za-z0-9_]*\.[A-Za-z0-9_.\-]*")
_JS_NS = {}


def _namespaces_in(literals):
    """Locale files a set of string literals points into: a full key, or a dotted prefix of keys ("pm.l." / "gym.empty")."""
    out = set()
    for n in NAMESPACES():
        if any("." in lit.rstrip(".") and lit.rstrip(".") in _NS_PREFIX[n] for lit in literals):
            out.add(n)
    return out


def js_namespaces(name):
    """Locale files a static/js script reads through AC.t (scanned once per build)."""
    if name not in _JS_NS:
        f = ACADEMY / "static" / "js" / name
        _JS_NS[name] = _namespaces_in(set(_KEY_LIT.findall(f.read_text()))) if f.exists() else set()
    return _JS_NS[name]


def page_namespaces(scripts, *texts):
    """shell + whatever the page's scripts and its markup / inlined data refer to. Only these strings are inlined."""
    need = {"shell"}
    for j in scripts:
        need |= js_namespaces(j)
    toks = set()
    for x in texts:
        toks |= set(_KEY_TOK.findall(x))
    return need | _namespaces_in({t for t in toks if not t.endswith((".js", ".css", ".html", ".webp", ".svg", ".png"))})


def pseudo(v):
    """en-XA: accents + ~35% padding, keeps {placeholders}."""
    if isinstance(v, dict):
        return {k: pseudo(x) for k, x in v.items()}
    acc = str.maketrans("aeiouAEIOUcnyCNY", "àéîõüÀÉÎÕÜçñýÇÑÝ")
    parts = re.split(r"(\{\w+\}|\*\*|\[\[.*?\]\])", v)
    s = "".join(p if p.startswith(("{", "**", "[[")) else p.translate(acc) for p in parts)
    pad = "·" * max(1, round(len(v) * 0.35 / 3))
    return f"⟦{s} {pad}⟧"


# ------------------------------------------------------------------ formatting (en-US rules; extend per locale)
def fmt_num(n, digits=None):
    if isinstance(n, float) and digits is None:
        digits = 0 if n.is_integer() else 2
    return f"{n:,.{digits}f}" if digits is not None else f"{n:,}"


def fmt_money(n, digits=2):
    sign = "−" if n < 0 else ""
    return f"{sign}${abs(n):,.{digits}f}"


def esc(s):
    return html.escape(str(s), quote=True)


def rich(s):
    """Inline content markup → HTML (same rules as AC.rich in core.js)."""
    out = esc(s)
    out = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", out)
    out = re.sub(r"\{up\}(.+?)\{/up\}", r'<b class="ac-up">\1</b>', out)
    out = re.sub(r"\{down\}(.+?)\{/down\}", r'<b class="ac-down">\1</b>', out)
    out = re.sub(r"\[\[([a-z0-9-]+)\|(.+?)\]\]", r'<button type="button" class="ac-term" data-term="\1">\2</button>', out)
    return out


# ------------------------------------------------------------------ content
def load_json(path):
    p = pathlib.Path(path)
    data = json.loads(p.read_text())
    if p.parent.name == "paths" and isinstance(data, dict) and isinstance(data.get("chapters"), list):
        mark_available(p.parent.parent, data)
    return data


def mark_available(root, path_data):
    """A chapter is available once its content exists: content/<locale>/chapters/<id>.json plus every lesson file it
    lists (lessons/<id>/<lesson>.json). Then it switches from "Coming soon" to real rows everywhere (path, chapter and
    home pages, the #ac-index gates) with no edit to the path file. A chapter whose file exists but whose lessons are
    still being written stays "Coming soon". `"available": true` in the path file is kept (the build then reports the
    missing files).
    An available chapter's summary in the path (title, short, promise, minutes, lesson titles) is then
    taken from the chapter and lesson files, and the path's hours and XP are recomputed, so the path file can't drift."""
    root = pathlib.Path(root)
    for ch in path_data["chapters"]:
        if not ch.get("id"):
            continue
        cfile = root / "chapters" / f"{ch['id']}.json"
        if not cfile.exists():
            continue
        try:
            chapter = json.loads(cfile.read_text())
        except ValueError:
            ch["available"] = True   # a broken chapter file: let validation report it rather than hide it
            continue
        lessons = chapter.get("lessons") or []
        files = [root / "lessons" / ch["id"] / f"{lid}.json" for lid in lessons]
        if not (lessons and all(f.exists() for f in files)):
            continue
        ch["available"] = True
        try:
            sync_chapter(ch, chapter, [json.loads(f.read_text()) for f in files])
        except (ValueError, KeyError, TypeError):
            pass   # validation reports the broken file
    sync_path_totals(path_data)


def sync_chapter(entry, chapter, lessons):
    """The path's summary of an authored chapter, from the chapter and lesson files."""
    for k in ("title", "short", "promise"):
        if chapter.get(k):
            entry[k] = chapter[k]
    entry["lessons"] = [les.get("title", "") for les in lessons]
    entry["minutes"] = chapter.get("minutes") or sum(int(les.get("minutes") or 0) for les in lessons) or entry.get("minutes", 0)
    entry.pop("added", None)


# XP a chapter of n lessons can pay: n × (60 + 3 × 10) per lesson, n × 30 + 50 for the Challenge
def max_chapter_xp(n):
    return n * 90 + n * 30 + 50


def sync_path_totals(path_data):
    """hours (to the half hour) and the most XP the path pays, from the chapters' minutes and lesson counts."""
    chs = path_data.get("chapters") or []
    if not chs or not all(isinstance(c.get("lessons"), list) for c in chs):
        return
    minutes = sum(int(c.get("minutes") or 0) for c in chs)
    if minutes:
        path_data["hours"] = round(minutes / 30.0) / 2.0
    path_data["xp"] = sum(max_chapter_xp(len(c["lessons"])) for c in chs) + int((path_data.get("finale") or {}).get("xp", 500))


def content_path(locale, rel):
    """content/<locale>/<rel>, falling back to English (reported)."""
    p = CONTENT / locale / rel
    if p.exists():
        return p
    if locale not in (DEFAULT_LOCALE, PSEUDO):
        REPORT["fallback_content"].append(f"{locale}:{rel}")
    return CONTENT / DEFAULT_LOCALE / rel


# ------------------------------------------------------------------ the Profit.com shell
def rebase(markup, root):
    markup = re.sub(r'(src|href)="assets/', rf'\1="{root}assets/', markup)
    markup = re.sub(r'href="([a-z0-9-]+\.html(?:[#?][^"]*)?)"', rf'href="{root}\1"', markup)
    markup = re.sub(r'href="(academy/|trading_calculators/)', rf'href="{root}\1', markup)
    return markup


def topnav(root, base=None, section=""):
    """The platform top nav, read live from index.html so it never drifts. topnav.js adds theme, language, guest state.
    On Academy pages "Upgrade" opens the Academy's Pro page (the phone drawer copies this link), and `section`
    ("Academy") follows the logo: phones only (base.css), where the side nav and its breadcrumb are in the drawer."""
    src = (SITE / "index.html").read_text()
    m = re.search(r'(<header class="topnav">.*?</header>)', src, re.S)
    markup = rebase(m.group(1), root)
    if base is not None:
        markup = re.sub(r'(<a class="btn-brand topnav__upgrade" href=")#(")', rf'\1{base}pro/index.html\2', markup)
        if section:
            markup = re.sub(r'(<img class="topnav__logo"[^>]*></a>)', lambda m: m.group(1) + f'\n    <a class="topnav__section" href="{base}index.html">{esc(section)}</a>', markup, count=1)
    return markup


def footer(root):
    src = (SITE / "index.html").read_text()
    m = re.search(r'(\s*<!-- ============ Global footer.*?</footer>)', src, re.S)
    if not m:
        return ""
    # the platform footer's in-page anchors (#plans, #faq) don't exist on Academy pages: point them at the real sections
    markup = m.group(1).replace('href="#plans"', 'href="landing.html#plans"').replace('href="#faq"', 'href="index.html#faq-title"')
    return rebase(markup, root)


ICON = {  # 24px stroke icons used by the Academy side nav (from the canvas)
    "home": '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
    "paths": '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7"/>',
    "leaderboard": '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3"/>',
    "gym": '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
    "progress": '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    "how": '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14"/><path d="M12 17v.5"/>',
    "glossary": '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M9 7h6"/>',
    "settings": '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    "search": '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
}


def svg_icon(name, size=20):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICON[name]}</svg>')


def side_nav(t, active, base):
    """Academy side nav on the platform's .side-nav component. Guest/member blocks are toggled by shell.js."""
    def item(key, label, route, extra=""):
        cur = ' aria-current="page"' if key == active else ""
        cls = "side-nav__item ac-nav__item" + (" is-active" if key == active else "")
        return (f'<a class="{cls}" href="{base}{route}index.html" data-label="{esc(label)}"{cur}>'
                f'<span class="side-nav__icon">{svg_icon(key)}</span><span class="side-nav__label">{esc(label)}</span>{extra}</a>')
    gym_badge = '<span class="ac-nav__badge" data-bind="gym-due" hidden></span>'
    main = "".join([
        item("home", t("nav.home"), ""),
        item("paths", t("nav.paths"), "paths/"),
        item("leaderboard", t("nav.leaderboard"), "leaderboard/"),
        item("gym", t("nav.gym"), "gym/", gym_badge),
        item("progress", t("nav.progress"), "me/"),
        item("how", t("nav.how"), "how-it-works/"),
        item("glossary", t("nav.glossary"), "glossary/"),
        item("search", t("nav.search"), "search/"),
    ])
    # My Trading Plan and My rewards are tabs inside My progress (me_tabs in pages/me.py), not side nav items
    account = item("settings", t("nav.settings"), "settings/")
    return f'''<aside class="side-nav ac-nav" id="acNav" aria-label="{esc(t("nav.aria"))}">
  <div class="side-nav__scroll">
    <span class="ac-nav__crumb">{esc(t("nav.crumb.learn"))} › <b>{esc(t("nav.crumb.academy"))}</b></span>
    <nav class="side-nav__group" aria-label="{esc(t("nav.aria.main"))}">{main}</nav>
    <div class="side-nav__bottom ac-nav__bottom">
      <div class="ac-nav__card ac-nav__card--pro" data-show="guest member">
        <b>{esc(t("nav.pro.title"))}</b><span>{esc(t("nav.pro.text"))}</span>
        <a class="ac-btn ac-btn--pro ac-btn--sm" href="{base}pro/index.html">{esc(t("nav.pro.cta"))}</a>
      </div>
      <script>if(document.body.dataset.pro)document.currentScript.previousElementSibling.remove()</script>
      <nav class="side-nav__group" aria-label="{esc(t("nav.aria.account"))}" data-show="member">{account}</nav>

    </div>
  </div>
  <button class="side-nav__toggle" type="button"><img src="{base}../assets/nav-toggle-arrow.svg" alt=""></button>
</aside>'''


def tab_bar(t, active, base):
    """Mobile bottom tab bar (canvas Home-Mobile): Learn · Gym · Top · Me. Shown under 860px, where the side nav hides."""
    tabs = [("home", "tabs.learn", "", ("home", "paths", "how", "glossary")), ("gym", "tabs.gym", "gym/", ("gym",)),
            ("leaderboard", "tabs.top", "leaderboard/", ("leaderboard",)), ("progress", "tabs.me", "me/", ("progress", "settings"))]
    items = ""
    for icon, label, route, keys in tabs:
        on = active in keys
        cur = ' aria-current="page"' if on else ""
        cls = "ac-tabbar__item is-active" if on else "ac-tabbar__item"
        items += f'<a class="{cls}" href="{base}{route}index.html"{cur}>{svg_icon(icon, 22)}<span>{esc(t(label))}</span></a>'
    return f'<nav class="ac-tabbar" aria-label="{esc(t("tabs.aria"))}">{items}</nav>'


# Tell the platform top nav (topnav.js) whether the Academy learner is signed in, before it renders:
# signed out → Log in / Get Started instead of the avatar, alerts and Upgrade. Mirrors AC.auth (services.js).
# Pro members (AC.auth.isPro(): ?as=pro or a Pro account) get data-pro="1": the side nav drops its "Upgrade to Pro" card.
GUEST_FLAG = ("try{var q=(location.search.match(/[?&]as=(guest|new|member|pro|certified|real|me)\\b/)||[])[1]||null,u=null;"
              "if(q==='real'||q==='me')q=null;else if(!q)q=localStorage.getItem('ac_preview');"
              "if(/[?&]logout=1/.test(location.search))localStorage.setItem('ac_v1_session',JSON.stringify({user:null}));"
              "else{var x=JSON.parse(localStorage.getItem('ac_v1_session')||'null');u=x&&x.user}"
              "document.body.dataset.user=(q?q!=='guest':!!u)?'member':'guest';"
              "if(q==='pro'||q==='certified'||(q!=='guest'&&u&&u.pro))document.body.dataset.pro='1'}catch(e){document.body.dataset.user='guest'}")


# Settings › Reduce motion: html.ac-reduce-motion before first paint, from the current account's saved settings
# (same account rules as AC.auth in services.js: ?as= / ac_preview, then the session).
MOTION_FLAG = ("try{var q=(location.search.match(/[?&]as=(guest|new|member|pro|real|me)\\b/)||[])[1]||null,a='guest';"
               "if(q==='real'||q==='me')q=null;else if(!q)q=localStorage.getItem('ac_preview');"
               "if(q==='guest')a='preview-guest';else if(q&&q!=='real')a='preview-'+q;else if(!q){var x=JSON.parse(localStorage.getItem('ac_v1_session')||'null');if(x&&x.user)a=x.user.id}"
               "var r=JSON.parse(localStorage.getItem('ac_v1_record_'+a)||'null');"
               "if(r&&r.settings&&r.settings.motion===false)document.documentElement.classList.add('ac-reduce-motion')}catch(e){}")


def theme_color():
    """<meta name="theme-color">: the dark page background, read from tokens.css (the only place colours live)."""
    css = (ACADEMY / "static" / "css" / "tokens.css").read_text()
    m = re.search(r"--ac-page:\s*(#[0-9a-fA-F]{3,8})", css)
    return m.group(1) if m else "black"


OG_IMAGE = f"{ORIGIN}/academy/static/img/rico/hero.webp"   # default share image: Rico's hero pose


def json_script(v):
    return json.dumps(v, ensure_ascii=False).replace("</", "<\\/")


def page(t, *, route, title, description, body, active="home", index=True, css=(), js=(), data=None,
         shell=True, body_class="", canonical=None, jsonld=None, locale="en", main=True):
    """Write-ready HTML for one Academy route. `route` is relative to /academy ('' = home).
    shell=False: no platform nav (full-screen players, the public verify page); main=False: the body brings its own
    <header>/<main>/<footer> (verify page)."""
    depth = len([p for p in route.strip("/").split("/") if p]) + (1 if locale == PSEUDO else 0)
    base = "../" * depth                      # → academy/
    root = base + "../"                       # → site root
    prefix = LOCALES.get(locale, {}).get("prefix", "") if locale != PSEUDO else "xa/"
    url = f"{ORIGIN}/{prefix}academy/{route.strip('/') + '/' if route.strip('/') else ''}"
    title = title.replace(" | ", " · ")       # one title separator everywhere
    robots = "" if index else '\n  <meta name="robots" content="noindex, nofollow">'
    css_links = "".join(f'\n  <link rel="stylesheet" href="{base}static/css/{c}">' for c in ("tokens.css", "base.css", "gsearch.css") + tuple(css) + ("interact.css",))
    js_tags = "".join(f'\n  <script defer src="{base}static/js/{j}"></script>' for j in tuple(CORE_JS) + tuple(js))
    datas = "".join(f'\n<script type="application/json" id="{k}">{json_script(v)}</script>' for k, v in (data or {}).items())
    ld = "".join(f'\n  <script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in (jsonld or []))
    shell_top = (topnav(root, base, t("nav.crumb.academy")) + '\n<script>' + GUEST_FLAG + '</script>' + f'\n<script src="{root}topnav.js"></script>\n<div class="shell ac-shell">\n' + side_nav(t, active, base) + '\n<main class="ac-main" id="main">') if shell else ('<main class="ac-main ac-main--bare" id="main">' if main else "")
    # the platform footer (read live from index.html) closes every page with the shell; full-screen players have none
    shell_end = ("<div class=\"ac-footer\">" + footer(root) + f"\n</div>\n<script src=\"{root}footer.js\"></script>\n</main>\n</div>\n" + tab_bar(t, active, base)) if shell else ("</main>" if main else "")
    # inline only the strings this page can use: shell + the locale files its scripts and markup refer to
    strings = page_namespaces(tuple(CORE_JS) + tuple(js), body, datas)
    return f'''<!doctype html>
<html lang="{esc(LOCALES.get(locale, {}).get("intl", "en-US"))}" data-root="{root}" data-academy="{base}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(description)}">
  <link rel="canonical" href="{esc(canonical or url)}">{robots}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Profit.com">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:url" content="{esc(canonical or url)}">
  <meta property="og:image" content="{OG_IMAGE}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="{theme_color()}">
  <link rel="icon" type="image/svg+xml" href="{root}assets/ft-logo-mark.svg">{ld}
  <script>try{{var m=location.search.match(/[?&]theme=(light|dark)/);if(m)localStorage.setItem("pt_theme",m[1]);document.documentElement.dataset.theme=localStorage.getItem("pt_theme")||"dark"}}catch(e){{}}</script>
  <script>{MOTION_FLAG}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{root}styles.css">{css_links}
  <script src="{base}static/js/platform-paths.js"></script>{js_tags}
</head>
<body class="ac-body {body_class}" data-nav-active="none">
{shell_top}
{body}
{shell_end}
<script type="application/json" id="ac-i18n">{json_script(t.table(strings))}</script>
<script type="application/json" id="ac-index">{json_script(INDEX)}</script>{datas}
</body>
</html>
'''
