#!/bin/bash
# Unit tests for every calculator formula, run in macOS's built-in JavaScriptCore
# (no Node needed). Also syntax-checks every JS file under trading_calculators/.
#   trading_calculators/tests/run.sh
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
echo "Syntax check"
for f in $(find "$HERE/.." -name '*.js' -not -path '*/tests/cli.js'); do
  "$JSC" -e "checkSyntax('$f')" >/dev/null || { echo "  ✗ $f"; exit 1; }
done
echo "  ✓ all files parse"
echo "Unit tests"
"$JSC" "$HERE/cli.js" -- "$HERE"
