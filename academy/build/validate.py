"""Content validation: a JSON Schema subset (no third-party packages) plus the spec's quality gates.

Schema keywords supported: type, required, properties, additionalProperties (bool or schema), enum, const,
pattern, minLength/maxLength, minimum/maximum, items, minItems/maxItems, $ref (local and file), and a custom
`discriminator` {propertyName, mapping} for typed cards and visuals.
"""
import json
import re

from lib import CONTENT

SCHEMAS = {}


def schema(name):
    if name not in SCHEMAS:
        SCHEMAS[name] = json.loads((CONTENT / "schema" / name).read_text())
    return SCHEMAS[name]


def resolve(ref, root):
    if ref == "#":
        return root, root
    if ref.startswith("#/"):
        node = root
        for part in ref[2:].split("/"):
            node = node[part]
        return node, root
    file, _, frag = ref.partition("#")
    other = schema(file)
    return (resolve("#" + frag, other) if frag else (other, other))


TYPES = {"object": dict, "array": list, "string": str, "integer": int, "number": (int, float), "boolean": bool, "null": type(None)}


def check(value, sch, root, path, errors):
    if "$ref" in sch:
        sch, root = resolve(sch["$ref"], root)
    if "discriminator" in sch and isinstance(value, dict):
        d = sch["discriminator"]
        key = value.get(d["propertyName"])
        if key not in d["mapping"]:
            errors.append(f"{path}: unknown {d['propertyName']} '{key}' (known: {', '.join(d['mapping'])})")
            return
        sub, root2 = resolve(d["mapping"][key], root)
        check(value, sub, root2, path, errors)
        return
    t = sch.get("type")
    if t:
        ts = t if isinstance(t, list) else [t]
        ok = any(isinstance(value, TYPES[x]) and not (x in ("integer", "number") and isinstance(value, bool)) for x in ts)
        if not ok:
            errors.append(f"{path}: expected {t}, got {type(value).__name__}")
            return
    if "const" in sch and value != sch["const"]:
        errors.append(f"{path}: must be {sch['const']!r}")
    if "enum" in sch and value not in sch["enum"]:
        errors.append(f"{path}: {value!r} not in {sch['enum']}")
    if isinstance(value, str):
        if "maxLength" in sch and len(value) > sch["maxLength"]:
            errors.append(f"{path}: {len(value)} chars > {sch['maxLength']}")
        if "minLength" in sch and len(value) < sch["minLength"]:
            errors.append(f"{path}: too short")
        if "pattern" in sch and not re.search(sch["pattern"], value):
            errors.append(f"{path}: {value!r} doesn't match {sch['pattern']}")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in sch and value < sch["minimum"]:
            errors.append(f"{path}: {value} < {sch['minimum']}")
        if "maximum" in sch and value > sch["maximum"]:
            errors.append(f"{path}: {value} > {sch['maximum']}")
    if isinstance(value, list):
        if "minItems" in sch and len(value) < sch["minItems"]:
            errors.append(f"{path}: {len(value)} items < {sch['minItems']}")
        if "maxItems" in sch and len(value) > sch["maxItems"]:
            errors.append(f"{path}: {len(value)} items > {sch['maxItems']}")
        if "items" in sch:
            for i, v in enumerate(value):
                check(v, sch["items"], root, f"{path}[{i}]", errors)
    if isinstance(value, dict):
        for r in sch.get("required", []):
            if r not in value:
                errors.append(f"{path}: missing '{r}'")
        props = sch.get("properties", {})
        extra = sch.get("additionalProperties", True)
        for k, v in value.items():
            if k in props:
                check(v, props[k], root, f"{path}.{k}", errors)
            elif extra is False:
                errors.append(f"{path}: unexpected property '{k}'")
            elif isinstance(extra, dict):
                check(v, extra, root, f"{path}.{k}", errors)


def validate(value, schema_file, label):
    errors = []
    root = schema(schema_file)
    check(value, root, root, label, errors)
    if schema_file == "chapter.schema.json" and not errors:   # Challenge questions may carry visuals too
        ch = value.get("challenge", {})
        for setname in ("questions", "retry"):
            for i, q in enumerate(ch.get(setname, [])):
                for k, v in enumerate(visuals_in(q)):
                    errors += visual_gates(v, f"{label} challenge.{setname}[{i}] visual {k + 1} ({v['kind']})")
                if not (0 <= q.get("answer", -1) < len(q.get("options", []))):
                    errors.append(f"{label} challenge.{setname}[{i}]: answer index out of range")
        if ch.get("retry") and [q["lesson"] for q in ch["retry"]] != [q["lesson"] for q in ch.get("questions", [])]:
            errors.append(f"{label}: challenge.retry must have the same length and lesson order as challenge.questions")
    return errors


# ------------------------------------------------------------------ quality gates (spec §12)
LEARN = {"learn", "walkthrough", "trap", "myth", "pro"}
SCORED = ("call", "exercise", "check")
WORDS_MAX = 60


def words(s):
    return len(re.sub(r"\*\*|\{/?(up|down)\}|\[\[[a-z0-9-]+\|", " ", s or "").split())


def item_text(x):
    """sort items are chips (strings) or cards {text, sub}"""
    return x["text"] if isinstance(x, dict) else x


def chart_len(ch):
    """number of candles a chart spec draws (explicit ohlc, or a generated path)"""
    if ch.get("ohlc"):
        return len(ch["ohlc"])
    if ch.get("path"):
        return ch.get("n") or int(max(p[0] for p in ch["path"])) + 1
    return 0


def visuals_in(obj):
    """every visual spec (a dict with a `kind` that is a visual kind) anywhere inside obj"""
    kinds = set(schema("visual.schema.json")["discriminator"]["mapping"])
    out = []

    def walk(x):
        if isinstance(x, dict):
            if x.get("kind") in kinds and x.get("type") is None:
                out.append(x)
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
    walk(obj)
    return out


def visual_gates(v, where):
    """checks the schema can't express: a chart needs candles; indexes must point at candles; sizes must match"""
    errors = []
    charts = []
    if v["kind"] in ("candles", "drawline"):
        charts.append(v.get("chart") or {})
    for it in v.get("items", []) if v["kind"] in ("chart-pair", "compare", "bullbear") else []:
        if it.get("chart"):
            charts.append(it["chart"])
    for ch in charts:
        n = chart_len(ch)
        if not n:
            errors.append(f"{where}: {v['kind']} chart needs `ohlc` or `path`")
            continue
        for key in ("marks", "swings", "vlines"):
            for m in ch.get(key, []):
                if not (0 <= m["i"] < n + (ch.get("future") or 0) + 1):
                    errors.append(f"{where}: {key} index {m['i']} is outside the {n} candles")
        for key, arrs in (("volume", [ch.get("volume")]), ("overlays", [o.get("values") for o in ch.get("overlays", [])])):
            for a in arrs:
                if a and len(a) > n:
                    errors.append(f"{where}: {key} has {len(a)} values for {n} candles")
        for p in ch.get("panels", []):
            for a in (p.get("values"), p.get("macd"), p.get("signal"), p.get("hist")):
                if a and len(a) > n:
                    errors.append(f"{where}: {p['type']} panel has {len(a)} values for {n} candles")
        for z in ch.get("zones", []):
            if not (0 <= z["from"] <= z["to"] < n):
                errors.append(f"{where}: zone {z['from']}–{z['to']} is outside the {n} candles")
    if v["kind"] == "drawline":
        mode = v.get("mode", "trend")
        st, tg = v.get("start", {}), v.get("target", {})
        if mode == "level" and ("price" not in st or not ("price" in tg or "min" in tg or "max" in tg)):
            errors.append(f"{where}: drawline level needs start.price and target.price (or target.min/max)")
        if mode == "trend" and not all(k in d for d in (st, tg) for k in ("from", "to")):
            errors.append(f"{where}: drawline trend needs start.from/to and target.from/to")
    if v["kind"] == "series":
        for sr in v.get("series", []):
            for pt in v.get("points", []):
                if pt.get("s", 0) == v["series"].index(sr) and not (0 <= pt["i"] < len(sr["values"])):
                    errors.append(f"{where}: series point index {pt['i']} is outside the values")
    if v["kind"] == "planbar" and v.get("current", 0) >= len(v.get("sections", [])):
        errors.append(f"{where}: planbar current is outside the sections")
    if v["kind"] == "barchart":
        n = max(len(g["values"]) for g in v["groups"])
        if v.get("series") and len(v["series"]) < n:
            errors.append(f"{where}: barchart has {n} values per group but {len(v['series'])} series")
    if v["kind"] == "table":
        widths = {len(r["cells"]) for r in v["rows"]} | ({len(v["cols"])} if v.get("cols") else set())
        if len(widths) > 1:
            errors.append(f"{where}: table rows and cols have different lengths {sorted(widths)}")
    return errors


def lesson_gates(lesson, glossary_ids):
    errors, warnings = [], []
    cards = lesson["cards"]
    types = [c["type"] for c in cards]
    label = f"{lesson['chapter']}/{lesson['id']}"
    # order: call first, check second to last, keep last; between them 1–5 learn cards and exactly one exercise
    # (anywhere)
    if types[0] != "call" or types[-1] != "keep" or types[-2] != "check" or "exercise" not in types[1:-2]:
        errors.append(f"{label}: card order must be call → learn cards and one exercise → check → keep (got {types})")
    middle = [t for t in types[1:-2] if t != "exercise"]
    if not (1 <= len(middle) <= 5) or any(t not in LEARN for t in middle):
        errors.append(f"{label}: 1–5 learn cards between the Call and the check (got {middle})")
    if [t for t in types if t in SCORED] != ["call"] + [t for t in types if t == "exercise"] + ["check"] or types.count("exercise") != 1:
        errors.append(f"{label}: exactly one call, one exercise and one check")
    for i, c in enumerate(cards):
        where = f"{label} card {i + 1} ({c['type']})"
        opts = c.get("options")
        if opts is not None and not (0 <= c.get("answer", -1) < len(opts)):
            errors.append(f"{where}: answer index out of range")
        if c["type"] == "exercise" and c.get("kind") == "choice" and not opts:
            errors.append(f"{where}: a choice exercise needs options")
        if c["type"] == "exercise" and c.get("kind") == "sort":
            sol = c.get("solution") or {}
            placed = sorted(x for v in sol.values() for x in v)
            if placed != sorted(item_text(x) for x in c.get("items", [])):
                errors.append(f"{where}: solution must place every item exactly once")
            ids = {b["id"] for b in c.get("buckets", [])}
            for b in list(sol) + [g["bucket"] for g in c.get("given", [])]:
                if b not in ids:
                    errors.append(f"{where}: unknown bucket '{b}'")
        for k, v in enumerate(visuals_in(c)):
            errors += visual_gates(v, f"{where} visual {k + 1} ({v['kind']})")
        if c["type"] == "exercise" and c.get("kind") == "point":
            ch = (c.get("visual") or {}).get("chart") if (c.get("visual") or {}).get("kind") == "candles" else None
            if not ch:
                errors.append(f"{where}: a point exercise needs a candles visual")
            elif not (0 <= c.get("answer", -1) < chart_len(ch)):
                errors.append(f"{where}: point answer must be a candle index (0–{chart_len(ch) - 1})")
            if not c.get("right") or not c.get("wrong"):
                errors.append(f"{where}: a point exercise needs `right` and `wrong` feedback")
        if c["type"] == "exercise" and c.get("kind") == "order":
            n = len(c.get("items", []))
            st = c.get("start")
            if n < 3:
                errors.append(f"{where}: an order exercise needs at least 3 items")
            if st is not None and (sorted(st) != list(range(n)) or st == list(range(n))):
                errors.append(f"{where}: order start must list every item index once, not already in order")
            if not c.get("right") or not c.get("wrong"):
                errors.append(f"{where}: an order exercise needs `right` and `wrong` feedback")
        if c["type"] == "exercise" and c.get("kind") == "line":
            if (c.get("visual") or {}).get("kind") != "drawline":
                errors.append(f"{where}: a line exercise needs a drawline visual")
            if not c.get("right") or not c.get("wrong"):
                errors.append(f"{where}: a line exercise needs `right` and `wrong` feedback")
        if c["type"] == "exercise" and c.get("scale"):
            if any("amount" not in o for o in opts or []):
                errors.append(f"{where}: with a scale, every option needs an amount")
        if c.get("footTone") and not c.get("foot"):
            errors.append(f"{where}: footTone without a foot")
        if c["type"] == "myth" and re.match(r"^(\*\*)?Rule:", str(c.get("text", ""))):
            errors.append(f"{where}: put the rule in `rule` (rendered as the gold Rule: box), not in `text`")
        if c["type"] == "myth" and re.match(r"^(\*\*)?Rule:", str(c.get("rule", ""))):
            errors.append(f"{where}: write `rule` without the \"Rule:\" label (the card adds it)")
        if c["type"] == "exercise" and str(c.get("name", "")).strip().lower() == "try it":
            warnings.append(f"{where}: name \"Try it\" repeats the eyebrow; leave it out")
        for k, b in enumerate(c.get("blocks", [])):
            kinds =[x for x in ("p", "visual", "tip", "say", "chips") if x in b]
            if len(kinds) != 1:
                errors.append(f"{where}: block {k + 1} needs exactly one of p / visual / tip / say / chips (got {kinds})")
        for o in opts or []:
            if words(o["feedback"]) > 40:
                errors.append(f"{where}: feedback over 40 words: {o['feedback'][:50]}…")
            if re.search(r"right answer|correct answer is", o["feedback"], re.I):
                errors.append(f"{where}: feedback must not name the right option")
        body = " ".join([str(c.get(k, "")) for k in ("situation", "text", "q", "myth", "reality")] +
                        [str(b.get("p", "")) + " " + str(b.get("tip", "")) for b in c.get("blocks", [])])
        if words(body) > WORDS_MAX:
            warnings.append(f"{where}: {words(body)} words (> {WORDS_MAX})")
        for term in re.findall(r"\[\[([a-z0-9-]+)\|", json.dumps(c)):
            if term not in glossary_ids:
                errors.append(f"{where}: glossary term '{term}' not in glossary.json")
    return errors, warnings
