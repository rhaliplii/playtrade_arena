#!/bin/bash
# Double-click to view the Playtrade prototype (Arena + Academy) over http://.
#
# The Academy's animated Bull also plays from file://, so this is optional. Use it
# to see the prototype exactly as it will behave once deployed (for example on
# GitHub Pages): real http, real caching, and Safari loading the .mov clips.
cd "$(dirname "$0")" || exit 1
PORT=8765
while lsof -i :$PORT >/dev/null 2>&1 && ! curl -s -o /dev/null "http://127.0.0.1:$PORT/academy/index.html"; do
  PORT=$((PORT+1))
done
URL="http://127.0.0.1:$PORT/academy/index.html"
if ! curl -s -o /dev/null "$URL"; then
  python3 -m http.server $PORT >/dev/null 2>&1 &
  sleep 1
fi
echo "Playtrade Academy is running at $URL"
echo "The Arena is at http://127.0.0.1:$PORT/index.html"
echo "Leave this window open while you browse. Close it to stop the server."
open "$URL"
wait
