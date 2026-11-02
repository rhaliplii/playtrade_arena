"""Validate build/tests/visual-samples.json against the schemas and the visual gates:
   python3 academy/build/tests/check_samples.py"""
import json, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import validate as V
d = json.loads((pathlib.Path(__file__).parent / "visual-samples.json").read_text())
errs = []
seen = set()
for i, s in enumerate(d["visuals"]):
    errs += V.validate(s["v"], "visual.schema.json", f"visuals[{i}] {s['board']}")
    for v in V.visuals_in(s["v"]):
        seen.add(v["kind"])
        errs += V.visual_gates(v, f"visuals[{i}] {s['board']}")
lesson = V.schema("lesson.schema.json")
for i, e in enumerate(d["exercises"]):
    sub, root = V.resolve("#/$defs/exercise", lesson)
    V.check(e["card"], sub, root, f"exercises[{i}]", errs)
missing = set(V.schema("visual.schema.json")["discriminator"]["mapping"]) - seen
print("\n".join(errs) or "samples OK", "· kinds covered:", len(seen), "· missing:", sorted(missing))
sys.exit(1 if errs or missing else 0)
