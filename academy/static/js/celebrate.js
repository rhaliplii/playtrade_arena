/* Profit.com Academy · celebration burst: confetti + Profit Coins from a point (a results hero, the finale badge).
   AC.celebrate(el, {coins: n}) · el: the element the burst comes from (centre). coins: how many coins fly (0 = none).
   Each piece animates once for 300 ms (css/celebrate.css), starts are staggered over ~250 ms, the layer is removed after.
   Does nothing at all under reduced motion (AC.reducedMotion: the OS setting or Settings › Reduce motion). */
(function () {
  "use strict";
  var AC = (window.AC = window.AC || {});
  var COLORS = ["var(--ac-primary)", "var(--ac-gold)", "var(--ac-sky)", "var(--ac-coral)", "var(--ac-primary-ink)"];

  AC.celebrate = function (el, opts) {
    opts = opts || {};
    if (!el || !el.getBoundingClientRect || AC.reducedMotion()) return null;
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    var x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 120);
    var layer = document.createElement("div");
    layer.className = "ac-cele-burst";
    layer.setAttribute("aria-hidden", "true");
    var html = "", pieces = opts.pieces || 28, coins = Math.min(8, opts.coins == null ? 0 : opts.coins);
    var reach = Math.max(140, Math.min(320, r.width * 0.6));
    function piece(cls, i, n, extra) {
      var a = (i / n) * Math.PI * 2 + Math.random() * 0.5, d = reach * (0.55 + Math.random() * 0.45);
      return '<span class="' + cls + '" style="--x:' + x.toFixed(0) + "px;--y:" + y.toFixed(0) + "px;--tx:" + (Math.cos(a) * d).toFixed(0) + "px;--ty:" + (Math.sin(a) * d - 40).toFixed(0) +
        "px;--r:" + Math.round(Math.random() * 540 - 270) + "deg;--d:" + Math.round(Math.random() * 250) + (extra ? "ms;" + extra : "ms") + '"></span>';
    }
    for (var i = 0; i < pieces; i++) html += piece("ac-cele-burst__p" + (i % 3 === 0 ? " ac-cele-burst__p--round" : ""), i, pieces, "--c:" + COLORS[i % COLORS.length]);
    for (var j = 0; j < coins; j++) html += piece("ac-cele-burst__coin", j + 0.5, coins);
    layer.innerHTML = html;
    document.body.appendChild(layer);
    setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 700);
    return layer;
  };
})();
