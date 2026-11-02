/* Profit.com Academy · the certificate (one template for every path).
   AC.cert.html(m)          the certificate as HTML/CSS (static/css/cert.css): a 1200 × 848 design canvas that scales
                            to its container (container query units), Montserrat only. Free paths: green; Pro paths:
                            violet + "PRO PATH". Same seal on every path.
   AC.cert.model(o)         {id, name, path, d, preview} + the path's facts (#ac-certpaths) → the data the template shows
   AC.cert.print(m)         "Download PDF": a print view with only the certificate on one A4 landscape page
   AC.cert.shareImage(m)    the 1200 × 627 share image, drawn with Canvas 2D from the same data → Promise<canvas>
   AC.cert.downloadShare(m) saves it as a PNG
   AC.cert.linkedIn(m)      LinkedIn "Add to profile" link (Licenses & certifications)
   The QR code (vendor/qrcode.js, MIT) encodes the public verify address (AC.certs.verifyUrl). */
(function () {
  "use strict";
  var AC = window.AC;
  var t = function (k, v) { return AC.t(k, v); };
  var esc = AC.esc;
  var W = 1200, H = 848;            // design canvas (A4 landscape ratio)
  var SW = 1200, SH = 627;          // share image

  // the Profit mark (26.25 × 28) and the Profit.com logo (156 × 28: "profit" word + ".com" in green)
  var MARK = "M13.1239 0C5.87283 0 0 5.95165 0 13.3037C0 17.7149 2.1133 21.6204 5.37513 24.04C5.69672 23.2854 9.09638 15.521 9.32608 14.9453C9.46391 14.6029 9.68596 14.3851 9.99989 14.2062C11.8146 13.2026 15.7808 11.032 15.7808 11.032L8.77479 28L10.8421 26.4674C10.8421 26.4674 12.7564 26.5996 13.1239 26.5996C20.3673 26.5996 26.2478 20.6402 26.2478 13.2959C26.2478 5.95165 20.3673 0 13.1239 0ZM21.8681 12.2223C21.8987 14.4473 20.8956 16.1278 19.6093 17.6449C18.6828 18.7341 17.496 19.4654 16.2709 20.15C15.9033 20.3523 14.9309 20.7724 14.9309 20.7724C14.9309 20.7724 17.6568 14.3462 19.0427 11.0709C19.2571 10.5574 18.8283 10.0128 18.2923 10.1217C13.6063 11.1253 4.87743 13.0081 2.3966 13.5449C2.12096 13.6071 1.89891 13.3193 2.02142 13.0547C2.48083 12.1056 3.33074 10.324 3.76719 9.41373C3.98158 8.97027 4.31083 8.72131 4.79321 8.62795C8.13927 7.99 11.47 7.30536 14.8237 6.69075C17.2663 6.23951 19.2724 7.0564 20.7578 9.07141C21.4316 9.98166 21.8527 11.0864 21.8681 12.2301V12.2223Z";
  var LOGO_WORD = ["M45.0154 8.14608C43.9856 7.49324 42.7886 7.16235 41.442 7.16235C40.4826 7.16235 39.6113 7.3591 38.8103 7.75259C38.4143 7.94933 38.0534 8.18185 37.7278 8.45014V7.44853H33.2478V27.9994H37.6661V20.9166C38.0094 21.1938 38.3879 21.4353 38.8103 21.632C39.6113 22.0076 40.4914 22.1954 41.442 22.1954C42.7886 22.1954 43.9768 21.8645 45.0154 21.2117C46.0716 20.5589 46.8901 19.6646 47.471 18.5378C48.0783 17.411 48.3775 16.1232 48.3775 14.6744C48.3775 13.2257 48.0783 11.9379 47.471 10.8111C46.8901 9.68426 46.0628 8.78997 45.0154 8.13713V8.14608ZM43.4311 16.4451C43.1583 16.9638 42.7798 17.3662 42.2869 17.6614C41.8204 17.9565 41.266 18.1085 40.6234 18.1085C40.0161 18.1085 39.4704 17.9565 38.9864 17.6614C38.4935 17.3662 38.115 16.9549 37.8422 16.4451C37.5869 15.9264 37.4637 15.3451 37.4637 14.6923C37.4637 14.0395 37.6045 13.4224 37.8774 12.9037C38.1502 12.385 38.5199 11.9915 38.9864 11.7143C39.4704 11.4192 40.0337 11.2672 40.6498 11.2672C41.2659 11.2672 41.8204 11.4192 42.2869 11.7143C42.771 11.9915 43.1583 12.385 43.4311 12.9037C43.704 13.4224 43.8448 14.0126 43.8448 14.6923C43.8448 15.372 43.704 15.9354 43.4311 16.4451Z", "M59.2557 7.49324C58.7452 7.27861 58.1555 7.16235 57.469 7.16235C55.9111 7.16235 54.6877 7.62739 53.8076 8.55745V7.45747H49.3276V21.9093H53.8076V13.9679C53.8076 13.0379 54.0188 12.3403 54.4501 11.8842C54.899 11.4102 55.4975 11.1688 56.2368 11.1688C56.6065 11.1688 56.9409 11.2314 57.2314 11.3476C57.5218 11.4639 57.7683 11.6338 57.9619 11.8574L60.6287 8.44119C60.2415 8.00299 59.7838 7.68999 59.2557 7.49324Z", "M71.0874 8.12044C69.9168 7.46761 68.5878 7.13672 67.1091 7.13672C65.6305 7.13672 64.3014 7.47655 63.1308 8.14727C61.9602 8.8001 61.0361 9.6944 60.3496 10.8212C59.6631 11.948 59.3286 13.2269 59.3286 14.6577C59.3286 16.0886 59.6719 17.3764 60.3496 18.5211C61.0273 19.6658 61.9602 20.5869 63.1308 21.2576C64.319 21.9104 65.6481 22.2413 67.1091 22.2413C68.5702 22.2413 69.9168 21.9104 71.0874 21.2576C72.258 20.5869 73.1821 19.6747 73.8687 18.5211C74.5552 17.3674 74.8896 16.0797 74.8896 14.6577C74.8896 13.2358 74.5464 11.948 73.8687 10.8212C73.1909 9.66757 72.258 8.77328 71.0874 8.1115V8.12044ZM69.9168 16.4731C69.6615 16.9918 69.2919 17.3943 68.8078 17.6894C68.3237 17.9666 67.7516 18.1097 67.1091 18.1097C66.4666 18.1097 65.9297 17.9666 65.4368 17.6894C64.9527 17.3943 64.5655 16.9829 64.2926 16.4731C64.0198 15.9366 63.879 15.3463 63.879 14.6935C63.879 14.0407 64.0198 13.4236 64.2926 12.9049C64.5655 12.3862 64.9439 11.9927 65.4368 11.7155C65.9209 11.4204 66.4842 11.2684 67.1091 11.2684C67.734 11.2684 68.3061 11.4204 68.7814 11.7155C69.2655 11.9927 69.6527 12.3862 69.9256 12.9049C70.1984 13.3968 70.3393 13.987 70.3393 14.6577C70.3393 15.3284 70.1984 15.9366 69.9256 16.4731H69.9168Z", "M103.8 7.46793H100.579V1.48511H96.0988V7.46793H92.8862V11.3313H96.0988V21.9197H100.579V11.3313H103.8V7.46793Z", "M87.0693 7.46735H82.2373V5.67876C82.2373 5.1869 82.3605 4.79341 82.6158 4.51618C82.871 4.22107 83.2407 4.06904 83.7248 4.06904C83.936 4.06904 84.1384 4.09586 84.3056 4.15846C84.4993 4.22107 84.6929 4.31944 84.8953 4.45358L87.1221 1.12681C86.6116 0.733321 86.0923 0.447147 85.5379 0.268288C84.9922 0.0894294 84.3849 0 83.7248 0C82.4925 0 81.4364 0.268288 80.5386 0.804864C79.6585 1.32355 78.9807 2.0211 78.4879 2.9154C78.0038 3.80969 77.7573 4.8113 77.7573 5.92022V7.46735H74.624V11.3307H77.7573V21.9191H82.2373V11.3307H87.0693V21.9191H91.5493V7.46735H87.0693Z"];
  var LOGO_COM = ["M106.288 6.53088C105.763 6.53088 105.299 6.42781 104.901 6.22168C104.498 6.01555 104.18 5.72977 103.95 5.36436C103.72 4.99894 103.603 4.58199 103.603 4.11819C103.603 3.65439 103.72 3.22807 103.95 2.86734C104.18 2.50661 104.498 2.22084 104.901 2.01002C105.304 1.7992 105.768 1.69614 106.288 1.69614C106.808 1.69614 107.276 1.80857 107.66 2.03813C108.044 2.26768 108.321 2.58157 108.48 2.98446L107.211 3.64034C107.103 3.42015 106.967 3.26087 106.803 3.16249C106.639 3.06411 106.466 3.01257 106.278 3.01257C106.091 3.01257 105.918 3.05474 105.763 3.14375C105.608 3.22807 105.487 3.35457 105.398 3.51385C105.309 3.67313 105.262 3.87927 105.262 4.12756C105.262 4.37586 105.309 4.56325 105.398 4.73191C105.491 4.90056 105.613 5.02705 105.763 5.11138C105.918 5.1957 106.086 5.24255 106.278 5.24255C106.47 5.24255 106.644 5.19102 106.803 5.09264C106.962 4.99426 107.098 4.83029 107.211 4.61478L108.48 5.26129C108.321 5.66419 108.044 5.97807 107.66 6.20763C107.276 6.43718 106.817 6.54962 106.288 6.54962V6.53088Z", "M111.394 6.53088C110.883 6.53088 110.429 6.42781 110.031 6.22168C109.632 6.01555 109.323 5.72977 109.094 5.36436C108.869 4.99894 108.752 4.58199 108.752 4.11819C108.752 3.65439 108.864 3.22807 109.094 2.86266C109.319 2.49724 109.632 2.21147 110.031 2.00533C110.429 1.7992 110.883 1.69614 111.394 1.69614C111.905 1.69614 112.364 1.7992 112.762 2.00533C113.16 2.21147 113.474 2.49724 113.704 2.86266C113.928 3.22807 114.046 3.64502 114.046 4.11819C114.046 4.59136 113.933 4.99894 113.704 5.36436C113.479 5.72977 113.165 6.01555 112.762 6.22168C112.364 6.42781 111.905 6.53088 111.394 6.53088ZM111.394 5.2285C111.577 5.2285 111.745 5.18633 111.891 5.09732C112.036 5.013 112.153 4.88182 112.242 4.71317C112.331 4.54451 112.378 4.34306 112.378 4.10414C112.378 3.86521 112.331 3.65908 112.242 3.49979C112.153 3.34051 112.036 3.21402 111.891 3.12969C111.745 3.04537 111.577 2.99852 111.394 2.99852C111.211 2.99852 111.043 3.04068 110.897 3.12969C110.752 3.21402 110.635 3.34051 110.541 3.49979C110.448 3.65908 110.405 3.86053 110.405 4.10414C110.405 4.34775 110.448 4.54451 110.541 4.71317C110.635 4.88182 110.747 5.013 110.897 5.09732C111.043 5.18165 111.211 5.2285 111.394 5.2285Z", "M120.886 1.69189C121.246 1.69189 121.57 1.76685 121.855 1.91677C122.141 2.06668 122.366 2.29155 122.53 2.59607C122.694 2.90058 122.774 3.29411 122.774 3.77664V6.45168H121.134V4.04368C121.134 3.71106 121.068 3.46745 120.942 3.31285C120.815 3.15825 120.642 3.08329 120.427 3.08329C120.267 3.08329 120.122 3.12077 120 3.19573C119.878 3.27068 119.78 3.38312 119.71 3.53772C119.64 3.69232 119.607 3.88908 119.607 4.13738V6.45168H117.967V4.04368C117.967 3.71106 117.906 3.46745 117.78 3.31285C117.653 3.15825 117.48 3.08329 117.26 3.08329C117.105 3.08329 116.964 3.12077 116.838 3.19573C116.712 3.27068 116.613 3.38312 116.538 3.53772C116.468 3.69232 116.43 3.88908 116.43 4.13738V6.45168H114.791V1.77154H116.36V3.08329L116.051 2.71319C116.22 2.38056 116.449 2.12758 116.749 1.95425C117.049 1.78091 117.381 1.69658 117.752 1.69658C118.178 1.69658 118.548 1.80433 118.867 2.01983C119.18 2.23533 119.396 2.57264 119.504 3.03176L118.97 2.90995C119.138 2.53516 119.387 2.24002 119.724 2.01983C120.061 1.79965 120.445 1.69189 120.886 1.69189Z", "M89.3576 6.42891C90.6603 6.42891 91.7164 5.35587 91.7164 4.0322C91.7164 2.70854 90.6603 1.6355 89.3576 1.6355C88.0548 1.6355 86.9988 2.70854 86.9988 4.0322C86.9988 5.35587 88.0548 6.42891 89.3576 6.42891Z"];

  function cssVar(name, el) { return getComputedStyle(el || document.documentElement).getPropertyValue(name).trim(); }

  // ---------------------------------------------------------------- data
  function pathInfo(id) {
    var all = AC.data("ac-certpaths") || {};
    return all[id] || { title: id, tier: "free", lessons: 0, chapters: [], level: "" };
  }
  function dateOf(ds) { return new Date(String(ds).length <= 10 ? ds + "T12:00:00" : ds); }
  /** Certificate data: {id, name, path, d (YYYY-MM-DD), preview, sample} → everything the template prints.
      sample: a specimen (the home's "Get your certificate" sheet): its date, a placeholder ID (PREFIX-XXXX-XXXX), an
      empty QR box and a SAMPLE ribbon, so it can't pass for a real certificate. */
  function model(o) {
    var p = pathInfo(o.path);
    var chapters = (p.chapters || []).length;
    var sample = !!o.sample;
    return {
      id: sample ? t("cert.sampleId", { prefix: p.prefix || "AC" }) : o.id ? AC.certs.pretty(o.id) : "", name: o.name || "", path: o.path, title: p.title, tier: p.tier === "pro" ? "pro" : "free",
      lessons: p.lessons || 0, chapters: chapters, chapterNames: p.chapters || [], level: p.level || "",
      d: o.d || o.issued_at || "", date: (o.d || o.issued_at) ? AC.fmt.date(dateOf(o.d || o.issued_at), { month: "short", day: "numeric", year: "numeric" }) : "",
      preview: !sample && (!!o.preview || !o.id), sample: sample,
      url: o.id && !sample ? AC.certs.verifyUrl(o.id) : "",
    };
  }
  function summary(m) {
    return m.tier === "pro" ? t("cert.sum.pro", { lessons: m.lessons, chapters: m.chapters, level: m.level })
      : t("cert.sum.free", { lessons: m.lessons, chapters: m.chapters });
  }
  // long names step down so they stay on one line
  function nameSize(name) { var n = String(name || "").length; return n > 30 ? "xs" : n > 24 ? "s" : n > 18 ? "m" : ""; }

  // ---------------------------------------------------------------- QR (vendor/qrcode.js)
  function qr(text) {
    if (typeof window.qrcode !== "function" || !text) return null;
    var q = window.qrcode(0, "M");
    q.addData(text);
    q.make();
    var n = q.getModuleCount(), d = "";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + c + " " + r + "h1v1h-1z";
    return { n: n, d: d, dark: function (r, c) { return q.isDark(r, c); } };
  }
  function qrSvg(text) {
    var q = qr(text);
    if (!q) return "";
    return '<svg class="ac-cert__qrcode" viewBox="0 0 ' + q.n + " " + q.n + '" shape-rendering="crispEdges" role="img" aria-label="' + esc(t("cert.qrAlt")) + '" data-qr="' + esc(text) + '"><path d="' + q.d + '"/></svg>';
  }

  // ---------------------------------------------------------------- pieces
  var uid = 0;
  function seal() {
    var k = "acSeal" + (++uid);
    return '<svg class="ac-cert__seal" viewBox="0 0 150 150" aria-hidden="true"><defs>' +
      '<path id="' + k + 't" d="M 19,75 a 56,56 0 1,1 112,0"/><path id="' + k + 'b" d="M 12,75 a 63,63 0 0,0 126,0"/></defs>' +
      '<circle class="ac-cert__sealFace" cx="75" cy="75" r="73"/><circle class="ac-cert__sealGold" cx="75" cy="75" r="66"/>' +
      '<text class="ac-cert__sealText" text-anchor="middle"><textPath href="#' + k + 't" startOffset="50%">' + esc(t("cert.seal.top")) + "</textPath></text>" +
      '<text class="ac-cert__sealText" text-anchor="middle"><textPath href="#' + k + 'b" startOffset="50%">' + esc(t("cert.seal.bottom")) + "</textPath></text>" +
      '<circle class="ac-cert__sealDot" cx="16" cy="78" r="2"/><circle class="ac-cert__sealDot" cx="134" cy="78" r="2"/>' +
      '<circle class="ac-cert__sealDash" cx="75" cy="75" r="38"/>' +
      '<path class="ac-cert__sealMark" transform="translate(51.6 50) scale(1.786)" d="' + MARK + '"/></svg>';
  }
  function logo(cls) {
    return '<svg class="' + cls + '" viewBox="0 0 156 28" role="img" aria-label="Profit.com"><path class="ac-logo__mark" d="' + MARK + '"/>' +
      LOGO_WORD.map(function (d) { return '<path class="ac-logo__word" d="' + d + '"/>'; }).join("") +
      LOGO_COM.map(function (d) { return '<path class="ac-logo__com" d="' + d + '"/>'; }).join("") + "</svg>";
  }

  /** The certificate as HTML. opts: {label: an aria label override}. */
  function html(m) {
    var cls = "ac-cert ac-cert--" + m.tier + (m.preview ? " is-preview" : "") + (m.sample ? " is-sample" : "");
    var size = nameSize(m.name);
    var label = m.sample ? t("cert.sampleAria", { path: m.title }) : t("cert.aria", { name: m.name, path: m.title });
    return '<figure class="' + cls + '" aria-label="' + esc(label) + '"><div class="ac-cert__page">' +
      '<svg class="ac-cert__wm" viewBox="0 0 26.25 28" aria-hidden="true"><path d="' + MARK + '"/></svg>' +
      (m.sample ? '<span class="ac-cert__sample" aria-hidden="true">' + esc(t("cert.sample")) + "</span>" : "") +
      '<span class="ac-cert__frame" aria-hidden="true"></span><span class="ac-cert__rule" aria-hidden="true"></span>' + seal() +
      '<div class="ac-cert__body">' + logo("ac-cert__logo") +
      '<span class="ac-cert__academy"><i aria-hidden="true"></i>' + esc(t("cert.academy")) + '<i aria-hidden="true"></i></span>' +
      '<span class="ac-cert__kind">' + esc(t("cert.kind")) + "</span>" +
      '<span class="ac-cert__small ac-cert__small--to">' + esc(t("cert.awarded")) + "</span>" +
      '<b class="ac-cert__name' + (size ? " ac-cert__name--" + size : "") + '">' + esc(m.name) + "</b>" +
      '<span class="ac-cert__line" aria-hidden="true"></span>' +
      '<span class="ac-cert__small ac-cert__small--for">' + esc(t("cert.for")) + "</span>" +
      (m.tier === "pro" ? '<span class="ac-cert__pro">' + esc(t("cert.pro")) + "</span>" : "") +
      '<b class="ac-cert__path">' + esc(m.title) + "</b>" +
      '<span class="ac-cert__sum">' + esc(summary(m)) + "</span>" +
      '<div class="ac-cert__foot">' +
      '<span class="ac-cert__cell"><span>' + esc(t("cert.date")) + "</span><b>" + esc(m.preview ? t("cert.notYet") : m.date) + "</b></span>" +
      '<span class="ac-cert__cell ac-cert__cell--mid"><span>' + esc(t("cert.issuedBy")) + "</span><b>" + esc(t("cert.issuer")) + "</b></span>" +
      '<span class="ac-cert__cell ac-cert__cell--end"><span>' + esc(t("cert.id")) + '</span><b class="ac-cert__id">' + esc(m.preview ? t("cert.onFinish") : m.id) + "</b>" +
      '<span class="ac-cert__verify">' + esc(t("cert.verifyAt", { host: AC.certs.verifyHost() })) + "</span></span>" +
      // a sample shows a real QR to the verify page itself (no ID), so it looks finished and scans somewhere honest
      '<span class="ac-cert__qr">' + (m.sample ? qrSvg("https://" + AC.certs.verifyHost() + "/") : m.preview ? "" : qrSvg(m.url)) + "</span></div>" +
      '<span class="ac-cert__fine">' + esc(t("cert.fine")) + "</span></div></div></figure>";
  }

  // ---------------------------------------------------------------- PDF (print view)
  function print(m) {
    var old = document.querySelector(".ac-cert-print");
    if (old) old.remove();
    var box = AC.h('<div class="ac-cert-print" aria-hidden="true">' + html(m) + "</div>");
    document.body.appendChild(box);
    var root = document.documentElement;
    root.classList.add("ac-printing");
    var prevTitle = document.title;
    document.title = t("cert.file", { id: m.id || "preview" });   // the PDF's suggested file name
    function done() { root.classList.remove("ac-printing"); box.remove(); document.title = prevTitle; window.removeEventListener("afterprint", done); }
    window.addEventListener("afterprint", done);
    // let the fonts settle, then print (a browser without afterprint keeps the view until the next call)
    var go = function () { try { window.print(); } catch (e) {} };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
    AC.analytics.track("share", { net: "pdf", what: "certificate" });
    return box;
  }

  // ---------------------------------------------------------------- Canvas 2D (share image)
  function rgba(hex, a) {
    var h = String(hex).replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16);
    return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
  }
  function palette(tier) {
    var pro = tier === "pro";
    return {
      paper: cssVar("--ac-paper"), ink: cssVar("--ac-paper-ink"), gold: cssVar("--ac-cert-gold"),
      accent: cssVar(pro ? "--ac-cert-violet" : "--ac-cert-green"), accentInk: cssVar(pro ? "--ac-cert-violet-ink" : "--ac-cert-green-ink"),
      muted: cssVar("--ac-cert-muted"), body: cssVar("--ac-cert-body"), faint: cssVar("--ac-cert-faint"),
      qrBg: cssVar("--ac-cert-qr-bg"), qrEdge: cssVar("--ac-cert-qr-edge"), shadow: cssVar("--ac-cert-shadow"),
      logoWord: cssVar("--ac-paper-ink"), logoGreen: cssVar("--ac-cert-green"),
      bgA: cssVar(pro ? "--ac-share-pro-a" : "--ac-share-free-a"), bgB: cssVar(pro ? "--ac-share-pro-b" : "--ac-share-free-b"),
      white: cssVar("--ac-share-text"), whiteSoft: cssVar("--ac-share-text-soft"), pill: cssVar("--ac-share-pill"),
      line: cssVar("--ac-share-line"), ricoShadow: cssVar("--ac-share-rico-shadow"),
    };
  }
  var FONT = "Montserrat, sans-serif";
  function font(w, px) { return w + " " + px + "px " + FONT; }
  function spacing(ctx, px) { if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px"; }
  /** text centred on x, its line box starting at y (CSS line-height lh) */
  function text(ctx, s, x, y, lh, align) {
    ctx.textAlign = align || "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s, x, y + lh / 2 + 1);
  }
  function drawLogo(ctx, x, y, h, wordColor, green) {
    var k = h / 28;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = green; ctx.fill(new Path2D(MARK));
    LOGO_COM.forEach(function (d) { ctx.fill(new Path2D(d)); });
    ctx.fillStyle = wordColor;
    LOGO_WORD.forEach(function (d) { ctx.fill(new Path2D(d)); });
    ctx.restore();
  }
  function arcText(ctx, s, cx, cy, r, top) {
    var widths = s.split("").map(function (ch) { return ctx.measureText(ch).width + 2.4; });
    var total = widths.reduce(function (a, b) { return a + b; }, 0) - 2.4;
    var ang = top ? -Math.PI / 2 - total / 2 / r : Math.PI / 2 + total / 2 / r;
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    s.split("").forEach(function (ch, i) {
      var half = (widths[i] - 2.4) / 2 / r;
      var a = top ? ang + half : ang - half;
      ctx.save(); ctx.translate(cx, cy);
      if (top) { ctx.rotate(a + Math.PI / 2); ctx.fillText(ch, 0, -r); }
      else { ctx.rotate(a - Math.PI / 2); ctx.fillText(ch, 0, r); }
      ctx.restore();
      ang = top ? ang + widths[i] / r : ang - widths[i] / r;
    });
  }
  /** The certificate on a 2D context, in design units (0..1200 × 0..848). */
  function drawCert(ctx, m, c) {
    spacing(ctx, 0);
    ctx.fillStyle = c.paper; ctx.fillRect(0, 0, W, H);
    // corner glow: radial-gradient(60% 60% at 100% 100%, accent, transparent 70%)
    ctx.save(); ctx.translate(W, H); ctx.scale(1, (0.6 * H) / (0.6 * W));
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.6 * W);
    g.addColorStop(0, rgba(c.accent, m.tier === "pro" ? 0.07 : 0.06)); g.addColorStop(0.7, rgba(c.accent, 0));
    ctx.fillStyle = g; ctx.fillRect(-W, -W, W, W); ctx.restore();
    // watermark
    ctx.save(); ctx.translate(W + 60 - 420, H + 70 - 452); ctx.scale(16, 16); ctx.globalAlpha = 0.035; ctx.fillStyle = c.accentInk; ctx.fill(new Path2D(MARK)); ctx.restore();
    // frames
    ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.strokeRect(19, 19, W - 38, H - 38);
    ctx.strokeStyle = c.gold; ctx.lineWidth = 1; ctx.strokeRect(26.5, 26.5, W - 53, H - 53);
    // seal
    ctx.save(); ctx.translate(W - 64 - 150, 56);
    ctx.beginPath(); ctx.arc(75, 75, 73, 0, Math.PI * 2); ctx.fillStyle = c.paper; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = c.accent; ctx.stroke();
    ctx.beginPath(); ctx.arc(75, 75, 66, 0, Math.PI * 2); ctx.lineWidth = 0.8; ctx.strokeStyle = c.gold; ctx.stroke();
    ctx.fillStyle = c.accentInk; ctx.font = font(700, 9);
    arcText(ctx, t("cert.seal.top").toUpperCase(), 75, 75, 56, true);
    arcText(ctx, t("cert.seal.bottom").toUpperCase(), 75, 75, 63, false);
    ctx.fillStyle = c.gold; [16, 134].forEach(function (x) { ctx.beginPath(); ctx.arc(x, 78, 2, 0, Math.PI * 2); ctx.fill(); });
    ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(75, 75, 38, 0, Math.PI * 2); ctx.lineWidth = 0.8; ctx.strokeStyle = c.gold; ctx.stroke(); ctx.setLineDash([]);
    ctx.translate(51.6, 50); ctx.scale(1.786, 1.786); ctx.fillStyle = c.accent; ctx.fill(new Path2D(MARK));
    ctx.restore();
    // body: the same flow as cert.css (content box 106..1094 × 76..792)
    var cx = W / 2, y = 76;
    drawLogo(ctx, cx + 20 - (156 * 34 / 28) / 2, y, 34, c.logoWord, c.logoGreen);
    y += 34 + 12;
    ctx.font = font(700, 13); spacing(ctx, 6);
    var aw = ctx.measureText(t("cert.academy").toUpperCase()).width;
    ctx.fillStyle = c.accentInk; text(ctx, t("cert.academy").toUpperCase(), cx + 3, y, 13);
    ctx.globalAlpha = 0.7; ctx.fillStyle = c.gold;
    ctx.fillRect(cx - aw / 2 - 14 - 56, y + 6, 56, 1); ctx.fillRect(cx + aw / 2 + 14, y + 6, 56, 1); ctx.globalAlpha = 1;
    y += 13 + 52;
    ctx.font = font(600, 28); spacing(ctx, 10); ctx.fillStyle = c.ink; text(ctx, t("cert.kind").toUpperCase(), cx + 5, y, 30.8);
    y += 30.8 + 18; spacing(ctx, 0);
    ctx.font = font(500, 18); ctx.fillStyle = c.muted; text(ctx, t("cert.awarded"), cx, y, 23.4);
    y += 23.4 + 18;
    var ns = { "": 72, m: 60, s: 50, xs: 42 }[nameSize(m.name)];
    ctx.font = font(800, ns); spacing(ctx, -1.5); ctx.fillStyle = c.ink; text(ctx, m.name, cx, y, 75.6);
    y += 75.6 + 16; spacing(ctx, 0);
    ctx.fillStyle = c.accent; ctx.fillRect(cx - 45, y, 90, 2);
    y += 2 + 24;
    ctx.font = font(500, 18); ctx.fillStyle = c.muted; text(ctx, t("cert.for"), cx, y, 23.4);
    y += 23.4;
    if (m.tier === "pro") {
      y += 22;
      ctx.font = font(800, 11); spacing(ctx, 1.6);
      var pw = ctx.measureText(t("cert.pro").toUpperCase()).width + 24;
      ctx.fillStyle = c.accent; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - pw / 2, y, pw, 24, 12) : ctx.rect(cx - pw / 2, y, pw, 24); ctx.fill();
      ctx.fillStyle = c.paper; text(ctx, t("cert.pro").toUpperCase(), cx + 0.8, y, 24);
      y += 24; spacing(ctx, 0);
    }
    y += 8;
    ctx.font = font(800, 42); spacing(ctx, -0.5); ctx.fillStyle = c.accentInk; text(ctx, m.title, cx, y, 46.2);
    y += 46.2 + 16;
    ctx.font = font(600, 16); spacing(ctx, 0.3); ctx.fillStyle = c.body; text(ctx, summary(m), cx, y, 20.8);
    spacing(ctx, 0);
    // footer (bottom-aligned) and fine print
    ctx.font = font(500, 11); ctx.fillStyle = c.faint; text(ctx, t("cert.fine"), cx, 792 - 13.2, 13.2);
    var fy = 792 - 13.2 - 18 - 73;
    var col = (988 - 84 - 74) / 3.3;
    var x1 = 106, x2 = x1 + col + 28, x3 = x2 + col * 1.3 + 28, x4 = x3 + col + 28;
    function cell(label, value, x, align, extra) {
      ctx.font = font(700, 10); spacing(ctx, 2); ctx.fillStyle = c.muted; text(ctx, label.toUpperCase(), x, fy, 12, align);
      ctx.font = font(700, 16); spacing(ctx, 0); ctx.fillStyle = c.ink; text(ctx, value, x, fy + 18, 20.8, align);
      if (extra) { ctx.font = font(600, 13); ctx.fillStyle = c.accentInk; text(ctx, extra, x, fy + 44.8, 16.9, align); }
    }
    cell(t("cert.date"), m.preview ? t("cert.notYet") : m.date, x1, "left");
    cell(t("cert.issuedBy"), t("cert.issuer"), x2 + col * 1.3 / 2, "center");
    cell(t("cert.id"), m.preview ? t("cert.onFinish") : m.id, x3 + col, "right", t("cert.verifyAt", { host: AC.certs.verifyHost() }));
    if (!m.preview && !m.sample) {
      ctx.fillStyle = c.qrBg; ctx.fillRect(x4, fy, 73, 73);
      ctx.strokeStyle = c.qrEdge; ctx.lineWidth = 1; ctx.strokeRect(x4 + 0.5, fy + 0.5, 72, 72);
      var q = qr(m.url);
      if (q) {
        var s = 63 / q.n; ctx.fillStyle = c.ink;
        for (var r = 0; r < q.n; r++) for (var k = 0; k < q.n; k++) if (q.dark(r, k)) ctx.fillRect(x4 + 5 + k * s, fy + 5 + r * s, s + 0.02, s + 0.02);
      }
    }
  }
  function wrap(ctx, s, max) {
    var words = String(s).split(" "), lines = [], line = "";
    words.forEach(function (w) { var tryL = line ? line + " " + w : w; if (ctx.measureText(tryL).width > max && line) { lines.push(line); line = w; } else line = tryL; });
    if (line) lines.push(line);
    return lines;
  }
  function loadImg(src) {
    return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; });
  }
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([500, 600, 700, 800].map(function (w) { return document.fonts.load(w + " 20px Montserrat"); })).catch(function () {});
  }
  /** The 1200 × 627 share image (boards' section B) → Promise<canvas>. */
  function shareImage(m) {
    return Promise.all([fontsReady(), loadImg(AC.rico("hero"))]).then(function (res) {
      var rico = res[1];
      var cv = document.createElement("canvas"); cv.width = SW; cv.height = SH;
      var ctx = cv.getContext("2d"), c = palette(m.tier);
      // background: linear-gradient(120deg, a, b)
      var dx = Math.sin(Math.PI * 2 / 3), dy = -Math.cos(Math.PI * 2 / 3), half = (Math.abs(SW * dx) + Math.abs(SH * dy)) / 2;
      var g = ctx.createLinearGradient(SW / 2 - dx * half, SH / 2 - dy * half, SW / 2 + dx * half, SH / 2 + dy * half);
      g.addColorStop(0, c.bgA); g.addColorStop(1, c.bgB);
      ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
      // left column
      drawLogo(ctx, 64, 64, 26, c.white, c.logoGreen);
      ctx.fillStyle = c.line; ctx.fillRect(64 + 145 + 12 - 14, 64 + 4, 1, 18);
      ctx.font = font(700, 13); spacing(ctx, 13 * 0.14); ctx.fillStyle = c.white; text(ctx, t("cert.academy").toUpperCase(), 64 + 145 + 12 - 14 + 1 + 12, 64 + 3, 20, "left");
      spacing(ctx, -1); ctx.font = font(800, 46); ctx.fillStyle = c.white;
      var y = 64 + 26 + 56;
      wrap(ctx, t("cert.share.title", { path: m.title }), 470).forEach(function (l) { text(ctx, l, 64, y, 51.5, "left"); y += 51.5; });
      spacing(ctx, 0); ctx.font = font(500, 18); ctx.fillStyle = c.whiteSoft; y += 18;
      var sub = m.tier === "pro" ? t("cert.share.sub.pro", { lessons: m.lessons, chapters: m.chapters }) : t("cert.share.sub.free", { lessons: m.lessons, chapters: m.chapters });
      wrap(ctx, sub, 470).forEach(function (l) { text(ctx, l, 64, y, 27, "left"); y += 27; });
      ctx.font = font(700, 14); var cta = t("cert.share.cta"), pw = ctx.measureText(cta).width + 36;
      ctx.fillStyle = c.pill; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(64, 563 - 38, pw, 38, 19) : ctx.rect(64, 563 - 38, pw, 38); ctx.fill();
      ctx.fillStyle = c.white; text(ctx, cta, 64 + 18, 563 - 38 + 10, 18.2, "left");
      // the tilted certificate
      ctx.save(); ctx.translate(560, 92); ctx.rotate(-4 * Math.PI / 180); ctx.scale(0.52, 0.52);
      ctx.save(); ctx.shadowColor = c.shadow; ctx.shadowBlur = 90 * 0.52; ctx.shadowOffsetY = 40 * 0.52; ctx.fillStyle = c.paper; ctx.fillRect(0, 0, W, H); ctx.restore();
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      drawCert(ctx, m, c);
      ctx.restore();
      // Rico
      if (rico) {
        var rh = 300, rw = rico.naturalWidth * rh / rico.naturalHeight;
        ctx.save(); ctx.shadowColor = c.ricoShadow; ctx.shadowBlur = 30; ctx.shadowOffsetY = 20;
        ctx.drawImage(rico, SW - 18 - rw, SH + 14 - rh, rw, rh); ctx.restore();
      }
      return cv;
    });
  }
  function fileName(m, ext) { return t("cert.file", { id: m.id || "preview" }) + "." + ext; }
  function downloadShare(m) {
    return shareImage(m).then(function (cv) {
      return new Promise(function (ok) {
        cv.toBlob(function (blob) {
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob); a.download = fileName(m, "png");
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
          AC.analytics.track("share", { net: "image", what: "certificate" });
          ok(blob);
        }, "image/png");
      });
    });
  }
  /** LinkedIn "Add license or certification" with the issuer, date, ID and verify address. */
  function linkedIn(m) {
    var d = dateOf(m.d);
    var q = { startTask: "CERTIFICATION_NAME", name: m.title, organizationName: t("cert.issuer"), issueYear: d.getFullYear(), issueMonth: d.getMonth() + 1, certId: m.id, certUrl: m.url };
    return "https://www.linkedin.com/profile/add?" + Object.keys(q).map(function (k) { return k + "=" + encodeURIComponent(q[k]); }).join("&");
  }
  /** Share sheet with the share image as its preview. */
  function share(m) {
    return shareImage(m).then(function (cv) {
      AC.share({ title: t("cert.share.title", { path: m.title }), text: t("cert.share.text", { path: m.title }), url: m.url, image: cv.toDataURL("image/png"),
        heading: t("cert.share.heading"), sub: m.id, what: "certificate" });
    });
  }
  /** Wire [data-cert-act="pdf|png|share|copy"] buttons inside `root` to a model (or a function returning the current one). */
  function bind(root, model) {
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cert-act]");
      if (!b || !root.contains(b)) return;
      var m = typeof model === "function" ? model() : model;
      if (!m) return;
      var act = b.getAttribute("data-cert-act");
      if (act === "pdf") { e.preventDefault(); print(m); }
      else if (act === "png") { e.preventDefault(); b.setAttribute("aria-busy", "true"); downloadShare(m).then(function () { b.removeAttribute("aria-busy"); }); }
      else if (act === "share") { e.preventDefault(); share(m); }
      else if (act === "copy") {
        e.preventDefault();
        var label = b.textContent, okc = function () { b.textContent = t("cert.copied"); setTimeout(function () { b.textContent = label; }, 1600); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(m.url).then(okc, okc); else okc();
      }
    });
  }

  AC.cert = { model: model, html: html, qr: qr, qrSvg: qrSvg, logo: logo, print: print, draw: drawCert, palette: palette, shareImage: shareImage,
    downloadShare: downloadShare, linkedIn: linkedIn, share: share, bind: bind, summary: summary, pathInfo: pathInfo };
})();
