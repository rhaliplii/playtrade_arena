#!/usr/bin/env python3
"""Share images (og:image, 1200×630) for the hub and the five calculators.

    python3 trading_calculators/_src/og.py

Each image is the calculator's card artwork (trading_calculators/art/<id>.webp) beside its name and
one line of what it does, rendered with headless Chrome into trading_calculators/og/<id>.jpg.
Re-run after changing a cover or a page's name; build.py only links the files.
"""
import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
CALC = HERE.parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

from build import PAGE_IDS, load  # noqa: E402

PAGE = """<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{calc}/../styles.css"><link rel="stylesheet" href="{calc}/calc.css">
<style>
  html, body {{ margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #13161b; font-family: Montserrat, sans-serif; color: #fff; }}
  .og {{ display: grid; grid-template-columns: 1fr 520px; height: 100%; }}
  .og__copy {{ display: flex; flex-direction: column; justify-content: center; gap: 22px; padding: 0 0 0 80px; }}
  .og__brand {{ display: flex; align-items: center; gap: 10px; font-size: 26px; font-weight: 700; color: #3dbb9a; }}
  .og__brand img {{ height: 34px; }}
  .og h1 {{ margin: 0; font-size: 64px; line-height: 70px; font-weight: 800; letter-spacing: -2px; }}
  .og p {{ margin: 0; font-size: 28px; line-height: 38px; font-weight: 500; color: rgba(255,255,255,.7); max-width: 560px; }}
  .og__free {{ align-self: flex-start; padding: 8px 16px; border-radius: 100px; background: rgba(61,187,154,.16); color: #6fe3b8; font-size: 20px; font-weight: 700; }}
  .og__art {{ position: relative; overflow: hidden; }}
  .og__art .hub-card__art::after {{ display: none; }}
</style></head><body><div class="og">
  <div class="og__copy">
    <div class="og__brand"><img src="{calc}/../assets/logo.svg" alt=""></div>
    <h1>{title}</h1><p>{text}</p><span class="og__free">Free · no sign-up</span>
  </div>
  <div class="og__art">{art}</div>
</div></body></html>"""


def render(out, title, text, art):
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, dir=CALC) as f:
        f.write(PAGE.format(calc=CALC.as_posix(), title=title, text=text, art=art))
        page = pathlib.Path(f.name)
    try:
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1200,630",
                        "--virtual-time-budget=4000", "--allow-file-access-from-files", f"--screenshot={out}",
                        f"file://{page}"], check=True, capture_output=True)
    finally:
        page.unlink()
    from PIL import Image                         # PNG → a small JPEG (share images need no alpha)
    Image.open(out).convert("RGB").save(out.with_suffix(".jpg"), quality=84, optimize=True)
    out.unlink()


def main():
    (CALC / "og").mkdir(exist_ok=True)
    pages = [load(i) for i in PAGE_IDS]
    for p in pages:
        render(CALC / "og" / f"{p.ID}.png", p.APP_NAME, p.HUB_TEXT, f'<span class="hub-card__art hub-card__art--{p.ID}" style="position:absolute;inset:0;aspect-ratio:auto"><img class="hub-card__img" src="{CALC.as_posix()}/art/{p.ID}.webp" alt=""></span>')
        print("og", p.ID)
    covers = "".join(f'<div style="position:absolute;width:250px;height:190px;left:{x}px;top:{y}px;border-radius:24px;overflow:hidden"><span class="hub-card__art hub-card__art--{i}" style="position:absolute;inset:0;aspect-ratio:auto"><img class="hub-card__img" src="{CALC.as_posix()}/art/{i}.webp" alt=""></span></div>'
                     for i, (x, y) in zip(PAGE_IDS, [(10, 40), (265, 40), (10, 245), (265, 245), (137, 440)]))
    render(CALC / "og" / "hub.png", "Trading Calculators", "Profit, position size, options and margin call price for stocks, crypto and options.", covers)
    print("og hub")


if __name__ == "__main__":
    main()
