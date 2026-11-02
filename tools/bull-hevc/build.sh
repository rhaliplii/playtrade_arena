#!/bin/bash
# Build the Safari twins of the Bull clips: HEVC-with-alpha .mov next to each .webm.
# Needs only macOS (Chrome + the Swift toolchain); no ffmpeg.
#   tools/bull-hevc/build.sh            all clips
#   tools/bull-hevc/build.sh bull-idle.webm
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/../.."
WORK="$(mktemp -d)"; trap 'kill $SRV 2>/dev/null; pkill -f "$WORK/chrome" 2>/dev/null; rm -rf "$WORK"' EXIT
swiftc -O "$HERE/encode.swift" -o "$WORK/encode"
python3 "$HERE/server.py" "$WORK/frames" > "$WORK/port" & SRV=$!
sleep 1; PORT=$(head -1 "$WORK/port")
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --user-data-dir="$WORK/chrome" "http://127.0.0.1:$PORT/tools/bull-hevc/extract.html${1:+?only=$1}" >/dev/null 2>&1 &
until [ -f "$WORK/frames/_done.txt" ]; do sleep 1; done
pkill -f "$WORK/chrome" || true
for d in "$WORK"/frames/*/; do
  name=$(basename "$d")
  "$WORK/encode" "$d" "$ROOT/assets/mascot/bull/animations/$name.mov" 30
done
python3 "$ROOT/tools/bull-manifest.py"
