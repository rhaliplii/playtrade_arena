// Command-line entry for JavaScriptCore (see run.sh): load the modules and the tests,
// print one line per test, exit non-zero on any failure.
var here = arguments[0];
["../lib/core.js", "../lib/stock.js", "../lib/crypto.js", "../lib/position.js", "../lib/options.js", "../lib/margin.js",
 "options-examples.data.js", "harness.js", "stock.test.js", "crypto.test.js", "position.test.js", "options.test.js", "margin.test.js"]
  .forEach(function (f) { load(here + "/" + f); });
var failed = T.results.filter(function (r) { return !r.ok; });
T.results.forEach(function (r) { print((r.ok ? "  ✓ " : "  ✗ ") + r.name + (r.ok ? "" : "\n      " + r.message)); });
print("\n" + (T.results.length - failed.length) + " passed, " + failed.length + " failed, " + T.results.length + " total");
if (failed.length) quit(1);
