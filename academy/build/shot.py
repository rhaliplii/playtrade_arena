#!/usr/bin/env python3
"""Screenshot built Academy pages (and canvas designs) with headless Chrome.

    python3 academy/build/shot.py <route>[?query][:WIDTHxHEIGHT] ...      e.g.  "" "learn-to-trade:1440x1800" "?as=member"
    (canvas designs: python3 academy/build/canvas_render.py Main.dc.html:HEIGHT[:WIDTH])
    python3 academy/build/shot.py --theme light <route> ...               light theme

PNGs go to academy/build/.shots/. Uses file:// so no server is needed.
"""
import pathlib, re, subprocess, sys, json
ACADEMY = pathlib.Path(__file__).resolve().parent.parent
OUT = ACADEMY / "build" / ".shots"
OUT.mkdir(exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

def chrome(url, png, w, h):
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
                    f"--screenshot={png}", f"--window-size={w},{h}", "--virtual-time-budget=6000", url], capture_output=True)
    print(png)

args = sys.argv[1:]
theme = None
if args and args[0] == "--theme":
    theme, args = args[1], args[2:]
for a in args:
    route, _, size = a.rpartition(":") if re.search(r":\d+x\d+$", a) else (a, "", "")
    w, h = (size or "1440x1200").split("x")
    path, _, query = route.partition("?")
    f = ACADEMY / path.strip("/") / "index.html"
    q = ("?" + query if query else "")
    if theme:
        q += ("&" if q else "?") + "theme=" + theme
    name = (path.strip("/").replace("/", "_") or "home") + ("_" + re.sub(r"\W+", "-", query) if query else "") + (f"_{theme}" if theme else "")
    url = "file://" + str(f) + q
    if int(w) < 500:  # headless Chrome won't lay out narrower than ~500px: frame the page at the real width
        frame = OUT / f"_frame_{name}.html"
        frame.write_text(f'<!doctype html><body style="margin:0;background:#000"><iframe src="{url}" style="border:0;width:{w}px;height:{h}px;display:block"></iframe></body>')
        url, w = "file://" + str(frame), 500
    chrome(url, OUT / f"{name}.png", int(w), int(h))
