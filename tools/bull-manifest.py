#!/usr/bin/env python3
"""Rebuild assets/mascot/bull/manifest.js from manifest.json.

Adds "clipHevc" for every clip that has a matching .mov in animations/, so a
new Safari render is picked up by running this once. No page code changes.
"""
import json, os
D = os.path.join(os.path.dirname(__file__), "..", "assets", "mascot", "bull")
m = json.load(open(os.path.join(D, "manifest.json")))
for st in m["states"].values():
    for k, hk in (("clip", "clipHevc"), ("clipBust", "clipBustHevc")):
        if k in st:
            mov = st[k].replace(".webm", ".mov")
            if os.path.exists(os.path.join(D, "animations", mov)): st[hk] = mov
            else: st.pop(hk, None)
json.dump(m, open(os.path.join(D, "manifest.json"), "w"), indent=2)
open(os.path.join(D, "manifest.js"), "w").write(
    "// Generated from manifest.json by tools/bull-manifest.py. A script rather than a fetch,\n"
    "// so the clips also play when the Academy is opened straight from disk (file://).\n"
    "window.BULL_MANIFEST = " + json.dumps(m, indent=2) + ";\n")
print("manifest.js:", sum(1 for s in m["states"].values() for k in s if k.endswith("Hevc")), "Safari clips")
