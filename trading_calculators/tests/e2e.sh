#!/bin/bash
# In-browser behaviour checks for every calculator page, in headless Chrome:
# live update, URL state, currency, empty/negative input, reset, keyboard toggles,
# labels, inputmode, CTA refs + dataLayer, SEO tags, ad slots, disclaimer.
#   trading_calculators/tests/e2e.sh
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/.."
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"; rm -f "$ROOT"/*/_e2e.html' EXIT
fail=0
for d in stock-profit-calculator crypto-profit-calculator position-size-calculator options-profit-calculator margin-calculator; do
  t="$ROOT/$d/_e2e.html"
  sed 's#</body>#<script src="../tests/e2e.js"></script></body>#' "$ROOT/$d/index.html" > "$t"
  echo "<body><iframe src=\"file://$t\" width=\"1280\" height=\"900\"></iframe><pre id=o></pre><script>addEventListener('message',e=>{o.textContent=e.data})</script></body>" > "$WORK/f.html"
  res=$("$C" --headless=new --disable-gpu --user-data-dir="$WORK/p" --window-size=1300,900 --virtual-time-budget=8000 \
    --allow-file-access-from-files --dump-dom "file://$WORK/f.html" 2>/dev/null | grep -o '<pre id="o">.*</pre>' | sed 's/<[^>]*>//g;s/&quot;/"/g;s/&amp;/\&/g')
  python3 - "$d" "$res" <<'PY' || fail=1
import json, sys
d, raw = sys.argv[1], sys.argv[2]
if not raw: print(f"✗ {d}: no result (page crashed?)"); sys.exit(1)
r = json.loads(raw); bad = [x for x in r["results"] if not x["ok"]]
print(f"{'✓' if not bad else '✗'} {d}: {len(r['results']) - len(bad)}/{len(r['results'])} checks")
for x in bad: print(f"    ✗ {x['name']}: {x['info'][:160]}")
sys.exit(1 if bad else 0)
PY
done
exit $fail
