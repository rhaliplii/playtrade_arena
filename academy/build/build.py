#!/usr/bin/env python3
"""Build the Profit.com Academy.

    python3 academy/build/build.py            validate content + locales, then write every route
    python3 academy/build/build.py --check    validate only
    python3 academy/build/build.py --pseudo   also build the en-XA pseudo-locale (text +35%) under academy/xa/

Pages live in build/pages/<name>.py. Each module exposes `routes(ctx)` yielding (route, html), where route is
relative to academy/ ('' = the Academy home). Generated folders are listed in build/.generated so a later build
can remove routes that no longer exist.
"""
import importlib
import json
import pathlib
import re
import shutil
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import lib  # noqa: E402
from lib import ACADEMY, BUILD, CONTENT, I18n, load_json, content_path, REPORT  # noqa: E402
import validate as V  # noqa: E402

MANIFEST = BUILD / ".generated"


class Ctx:
    """Everything a page module needs: content, strings, helpers."""
    def __init__(self, locale):
        self.locale = locale
        self.t = I18n(locale)
        self.path = load_json(content_path(locale, "paths/learn-to-trade.json"))
        self.catalog = load_json(content_path(locale, "catalog.json")) if content_path(locale, "catalog.json").exists() else {"paths": []}
        self._sync_catalog()
        self.glossary = load_json(content_path(locale, "glossary.json"))["terms"]
        self.chapters = {}
        self.lessons = {}          # lesson id → lesson
        self.lesson_order = []     # every playable lesson id in path order
        for ch in self.path["chapters"]:
            if not ch.get("available"):
                continue
            c = load_json(content_path(locale, f"chapters/{ch['id']}.json"))
            self.chapters[c["id"]] = c
            for lid in c["lessons"]:
                les = load_json(content_path(locale, f"lessons/{c['id']}/{lid}.json"))
                self.lessons[lid] = les
                self.lesson_order.append(lid)
        self.ideas = self._ideas()
        names = content_path(locale, "ideas.json")
        self.idea_names = load_json(names)["ideas"] if names.exists() else {}
        lib.INDEX = self.index()

    def _sync_catalog(self):
        """The catalog's card for this path takes its counts from the path (which takes them from the chapter files)."""
        p = self.path
        for entry in self.catalog.get("paths", []):
            if entry.get("id") != p["id"]:
                continue
            entry["chapters"] = len(p["chapters"])
            entry["lessons"] = sum(len(c.get("lessons") or []) for c in p["chapters"])
            for k in ("hours", "xp", "title", "outcome"):
                if p.get(k) is not None:
                    entry[k] = p[k]

    PLAN_KEYS = ("style", "entry", "risk", "checklist", "review")

    def plan(self):
        """My Trading Plan: the five sections, one per lesson of the path's last chapter (Building Your Trading Plan).
        Its `plan` rows ({label, value}, in lesson order) give each section's label and the default a finished
        lesson fills in. Keys are fixed (stored in the learner's record), labels and defaults come from the content."""
        last = self.path["chapters"][-1]["id"] if self.path["chapters"] else None
        c = self.chapters.get(last)
        pre = (c or {}).get("plan") or []
        if not c or len(pre) != len(self.PLAN_KEYS):
            return None
        return {"chapter": c["id"], "n": c["n"], "sections": [
            {"key": k, "label": item["label"], "value": item["value"], "lesson": c["lessons"][i] if i < len(c["lessons"]) else None}
            for i, (k, item) in enumerate(zip(self.PLAN_KEYS, pre))]}

    def index(self):
        """Small path index every page gets as #ac-index (side nav, previews, links)."""
        return {"path": self.path["id"], "chapters": [
            {"id": ch["id"], "n": ch["n"], "title": ch["title"], "short": ch["short"], "available": bool(ch.get("available")),
             "lessons": [{"id": lid, "title": self.lessons[lid]["title"], "minutes": self.lessons[lid]["minutes"]}
                         for lid in self.chapters[ch["id"]]["lessons"]] if ch.get("available") else []}
            for ch in self.path["chapters"]], "plan": self.plan(),
            # certificate ID prefix per path (catalog.json certPrefix): AC.certs issues IDs with it
            "certPrefix": {p["id"]: p["certPrefix"] for p in self.catalog.get("paths", []) if p.get("id") and p.get("certPrefix")}}

    def _ideas(self):
        """idea id → every question that checks it (Rico's Gym draws from these)."""
        out = {}
        for lid, les in self.lessons.items():
            for c in les["cards"]:
                if c.get("idea") and (c.get("options") or c.get("kind") in ("sort",)):
                    out.setdefault(c["idea"], []).append({"lesson": lid, "chapter": les["chapter"], "card": c})
        for cid, ch in self.chapters.items():
            for q in ch["challenge"]["questions"]:
                out.setdefault(q["idea"], []).append({"chapter": cid, "challenge": q})
        return out

    def chapter_of(self, lesson_id):
        return self.chapters[self.lessons[lesson_id]["chapter"]]


def validate_all(locale):
    errors, warnings = [], []
    glossary = load_json(content_path(locale, "glossary.json"))
    errors += V.validate(glossary, "glossary.schema.json", "glossary")
    ids = set(glossary["terms"])
    path = load_json(content_path(locale, "paths/learn-to-trade.json"))
    errors += V.validate(path, "path.schema.json", "path:learn-to-trade")
    for ch in path["chapters"]:
        if not ch.get("available"):
            continue
        cfile = content_path(locale, f"chapters/{ch['id']}.json")
        if not cfile.exists():
            errors.append(f"chapter file missing: {cfile}")
            continue
        c = load_json(cfile)
        errors += V.validate(c, "chapter.schema.json", f"chapter:{c['id']}")
        if len(c["challenge"]["questions"]) != len(c["lessons"]):
            errors.append(f"chapter:{c['id']}: the Challenge needs one question per lesson")
        for i, q in enumerate(c["challenge"]["questions"]):
            if not 0 <= q["answer"] < len(q["options"]):
                errors.append(f"chapter:{c['id']}: challenge question {i + 1} answer out of range")
            if V.words(q["why"]) > 40:
                errors.append(f"chapter:{c['id']}: challenge question {i + 1} 'why' over 40 words")
        for t in c["terms"]:
            if t not in ids:
                errors.append(f"chapter:{c['id']}: term '{t}' not in glossary")
        for lid in c["lessons"]:
            lfile = content_path(locale, f"lessons/{c['id']}/{lid}.json")
            if not lfile.exists():
                errors.append(f"lesson file missing: {lfile}")
                continue
            les = load_json(lfile)
            errors += V.validate(les, "lesson.schema.json", f"lesson:{c['id']}/{lid}")
            e, w = V.lesson_gates(les, ids)
            errors += e
            warnings += w
    ideas_file = content_path(locale, "ideas.json")
    named = load_json(ideas_file)["ideas"] if ideas_file.exists() else {}
    used = set()
    for f in (CONTENT / locale / "lessons").rglob("*.json"):
        used |= {c["idea"] for c in load_json(f)["cards"] if c.get("idea")}
    for f in (CONTENT / locale / "chapters").glob("*.json"):
        used |= {q["idea"] for q in load_json(f)["challenge"]["questions"]}
    for i in sorted(used - set(named)):
        errors.append(f"idea '{i}' has no name in ideas.json")
    # guest onboarding: the 5-question quick challenge (/academy/start)
    ofile = content_path(locale, "onboarding.json")
    if ofile.exists():
        onb = load_json(ofile)
        errors += V.validate(onb, "onboarding.schema.json", "onboarding")
        n_ch = len(path["chapters"])
        for i, q in enumerate(onb.get("questions", [])):
            where = f"onboarding question {i + 1}"
            if not 0 <= q.get("answer", -1) < len(q.get("options", [])):
                errors.append(f"{where}: answer out of range")
            if V.words(q.get("why", "")) > 40:
                errors.append(f"{where}: feedback over 40 words")
            if not 1 <= q.get("chapter", 0) <= n_ch:
                errors.append(f"{where}: chapter {q.get('chapter')} not on the path")
            for k, v in enumerate(V.visuals_in(q)):
                errors += V.visual_gates(v, f"{where} visual {k + 1} ({v['kind']})")
    return errors, warnings


def lint_css():
    """No hex colours outside tokens.css."""
    out = []
    for f in (ACADEMY / "static" / "css").glob("*.css"):
        if f.name == "tokens.css":
            continue
        for n, line in enumerate(f.read_text().splitlines(), 1):
            if re.search(r"#[0-9a-fA-F]{3,8}\b", line) and not line.strip().startswith("/*"):
                out.append(f"{f.name}:{n}: hex colour outside tokens.css")
    for f in (ACADEMY / "static" / "js").glob("*.js"):
        for n, line in enumerate(f.read_text().splitlines(), 1):
            if re.search(r"['\"]#[0-9a-fA-F]{6}['\"]", line):
                out.append(f"js/{f.name}:{n}: hex colour in JS (use a tone or a CSS class)")
    return out


def write_routes(ctx, out_root, written):
    for mod_file in sorted((BUILD / "pages").glob("*.py")):
        if mod_file.name.startswith("_"):
            continue
        mod = importlib.import_module(f"pages.{mod_file.stem}")
        for route, html in mod.routes(ctx):
            route = route.strip("/")
            target = out_root / route / "index.html" if route else out_root / "index.html"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(html)
            written.append(str(target.relative_to(ACADEMY)))


def main():
    args = set(sys.argv[1:])
    errors, warnings = validate_all("en")
    css = lint_css()
    for w in warnings:
        print("warn ", w)
    for e in css:
        print("lint ", e)
    for e in errors:
        print("ERROR", e)
    if errors:
        sys.exit(f"\n{len(errors)} content error(s). Nothing written.")
    if "--check" in args:
        print("content OK")
        return

    old = set(MANIFEST.read_text().split()) if MANIFEST.exists() else set()
    written = []
    ctx = Ctx("en")
    write_routes(ctx, ACADEMY, written)
    # the top bar's search panel (static/js/gsearch.js, Academy tab) loads the search index on first open, as a
    # script (not fetch) so it also works from file://
    from pages.search import index_json
    (ACADEMY / "static" / "data").mkdir(exist_ok=True)
    (ACADEMY / "static" / "data" / "search-index.json").unlink(missing_ok=True)
    (ACADEMY / "static" / "data" / "search-index.js").write_text("window.AC_SEARCH_INDEX=" + index_json(ctx) + ";\n")
    if "--pseudo" in args:
        write_routes(Ctx(lib.PSEUDO), ACADEMY / "xa", written)
    # remove generated pages that no longer exist
    for stale in sorted(old - set(written)):
        p = ACADEMY / stale
        if p.exists() and p.name == "index.html":
            p.unlink()
            try:
                p.parent.rmdir()
            except OSError:
                pass
    MANIFEST.write_text("\n".join(sorted(written)))
    # sitemap of the indexable routes (pages without a noindex robots tag)
    urls = []
    for rel in sorted(written):
        f = ACADEMY / rel
        if rel.startswith("xa/") or 'name="robots" content="noindex' in f.read_text():
            continue
        route = rel[: -len("index.html")]
        urls.append(f"  <url><loc>{lib.ORIGIN}/academy/{route}</loc></url>")
    (ACADEMY / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>\n")
    print(f"{len(written)} pages written")
    if REPORT["missing_strings"]:
        print("missing translations:", len(REPORT["missing_strings"]))
    if REPORT["fallback_content"]:
        print("content falling back to English:", ", ".join(REPORT["fallback_content"]))


if __name__ == "__main__":
    main()
