/* Profit.com Academy · lesson card components (shared by the lesson player, the Chapter Challenge and Rico's Gym).
   AC.cards.render(card, ctx) → a card controller:
     { el, type, side?, bubble?, sheet?, cta() → {label, disabled}, primary() → "next" | undefined, reveal?(pick) }
   The player owns the one fixed primary button; it asks the controller for its label and calls primary() on press.
   ctx: { lesson, chapter, mode: "lesson" | "gym" | "challenge", answer(slot, correct, idea) → {xp}, changed() }
   Layout (canvas-ch1v2): one column on phones; on desktop elements marked [data-side] move to the right-hand column
   (the frame does it, see frame().place) and the feedback sheet goes under them. */
(function () {
  "use strict";
  var AC = (window.AC = window.AC || {});
  var esc = function (s) { return AC.esc(s); };
  var LETTERS = "ABCDEF";
  var TONE = { call: "gold", learn: "primary", walkthrough: "primary", trap: "down", myth: "down", pro: "gold", exercise: "primary", check: "sky", keep: "primary", challenge: "gold", gym: "primary" };
  var CHEV = '<svg class="ac-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  var GRIP = '<svg class="ac-grip" width="12" height="18" viewBox="0 0 12 18" aria-hidden="true"><circle cx="3" cy="3" r="1.6"/><circle cx="9" cy="3" r="1.6"/><circle cx="3" cy="9" r="1.6"/><circle cx="9" cy="9" r="1.6"/><circle cx="3" cy="15" r="1.6"/><circle cx="9" cy="15" r="1.6"/></svg>';
  var uid = 0;

  // not lazy: feedback and completion poses must show offline too (frame() preloads them)
  function rico(pose, cls, alt) { return '<img class="ac-rico ' + (cls || "") + '" src="' + AC.rico(pose || "think") + '" alt="' + esc(alt || "") + '">'; }
  function eyebrow(label, tone, chip) {
    return '<div class="ac-eb ac-tone--' + tone + '"><span class="ac-eb__label">' + esc(label) + "</span>" + (chip ? '<span class="ac-eb__chip" data-chip>' + esc(chip) + "</span>" : '<span class="ac-eb__chip" data-chip hidden></span>') + "</div>";
  }
  function label(type, extra) {
    var l = AC.t("cards.eyebrow." + type);
    return extra && String(extra).trim().toLowerCase() !== l.trim().toLowerCase() ? l + " · " + extra : l;
  }
  var TIP_TONES = ["sky", "plain", "red", "gold", "green"];
  /** a toned note box (tips, walk-through feet, trap notes): sky (default), plain, red, gold, green */
  function tipBox(text, tn, attrs) { return '<div class="ac-tip ac-tip--' + (TIP_TONES.indexOf(tn) >= 0 ? tn : "sky") + '"' + (attrs || "") + ">" + AC.rich(text) + "</div>"; }
  function title(s, cls) { return '<h2 class="ac-c__title ' + (cls || "") + '">' + esc(s) + "</h2>"; }
  function para(s, cls) { return s ? '<p class="ac-c__text ' + (cls || "") + '">' + AC.rich(s) + "</p>" : ""; }
  /** text with blank-line paragraphs → several <p> */
  function paras(s, cls) { return String(s || "").split(/\n\s*\n/).map(function (p) { return para(p, cls); }).join(""); }
  function bubble(text, pose, big) {
    return '<div class="ac-bubble' + (big ? " ac-bubble--big" : "") + '">' + (big ? "" : rico(pose, "ac-bubble__rico")) + '<span class="ac-bubble__text">' + esc(text) + "</span>" + (big ? rico(pose, "ac-bubble__rico") : "") + "</div>";
  }
  function stripLead(s) { return String(s || "").replace(/^(Right|Correct|Exactly|Yes)[.:!,]\s*/, ""); }
  /** "+10 XP first try" only where it can still be earned: a first play of a lesson (not a replay, not a tested-out lesson) */
  function chipFirstTry(ctx) { return ctx && ctx.mode === "lesson" && !ctx.replay ? AC.t("cards.chip.firstTry", { n: AC.progress.XP.firstTry }) : null; }
  /** {n} / {total} placeholders (choice exercises with a stepper) */
  function fill(s, vars) { return vars ? String(s || "").replace(/\{(n|total)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : s; }
  /** Rico + the gold question box (Rico's Call, Pro Move); without a pose, the box alone (Quick check) */
  function callHead(pose, inner, cls) {
    return '<div class="ac-call ' + (pose ? "" : "ac-call--box ") + (cls || "") + '">' + (pose ? rico(pose, "ac-call__rico ac-rico--idle", AC.t("cards.rico")) : "") + '<div class="ac-call__box">' + inner + "</div></div>";
  }

  // ------------------------------------------------------------------ blocks (learn-type cards, canvas-ch1v2)
  function sayList(s) {
    return '<div class="ac-say"><span class="ac-say__k">' + esc(s.title) + "</span>" + s.rows.map(function (r) {
      var t = r.tone || "up";
      return '<div class="ac-say__row ac-tone--' + t + '"><span class="ac-say__term ac-v__ink">' + AC.visual.trendIcon(t === "down" ? "down" : t === "up" ? "up" : "flat", 20) + "<b>" + AC.rich(r.term) + '</b></span><span class="ac-say__line" aria-hidden="true"></span><span class="ac-say__text">' + esc(r.text) + "</span></div>";
    }).join("") + "</div>";
  }
  /** o: {explore (walk-through: visuals get their taps / ▶ Play), side (auto two-column: true for this block)} */
  function block(b, o) {
    o = o || {};
    var side = b.side || o.side ? " data-side" : "";
    if (b.p) return '<p class="ac-c__text"' + side + ">" + AC.rich(b.p) + "</p>";
    if (b.visual) return '<div class="ac-c__visual ac-c__visual--block"' + side + ">" + AC.visual(b.visual, o.explore ? { explore: true } : undefined) + "</div>";
    if (b.tip) return tipBox(b.tip, b.tone, side);
    if (b.say) return "<div" + side + ">" + sayList(b.say) + "</div>";
    if (b.chips) return '<div class="ac-chips"' + side + ">" + b.chips.map(function (c) { return '<span class="ac-chips__c">' + esc(c) + "</span>"; }).join("") + "</div>";
    return "";
  }
  function blocks(list, o) { return (list || []).map(function (b) { return block(b, o); }).join(""); }
  /* Two columns on desktop (canvas-p1 boards, Chapters 2–10): the text stays left; the first visual and everything after
     it (more visuals, tips, the foot) go to the right column. Cards that place blocks themselves (side: true) are left
     alone, and so are the canvas-ch1v2 lessons (ctx.split is off). Phones: one column, same order. */
  function autoSide(card, ctx) {
    if (!ctx || !ctx.split) return false;
    var bl = card.blocks || [];
    if (bl.some(function (b) { return b.side; })) return false;
    return !!(card.visual || bl.some(function (b) { return b.visual; }));
  }
  /** blocks for an auto two-column card: p blocks before the first visual stay left */
  function blocksSplit(list, explore, on) {
    return (list || []).map(function (b) { if (b.visual) on = true; return block(b, { side: on && !b.p, explore: explore }); }).join("");
  }

  // ------------------------------------------------------------------ option rows
  function optText(o) { return typeof o === "string" ? o : o.text; }
  /** Four short answers sit in a 2×2 grid (canvas-p1): money ($10, −$5.00), numbers, percents (−2%), ratios (1:3),
      and other one- or two-word answers ("No stop"). Answers with candle glyphs keep their rows. */
  var SHORT_NUM = /^[+−-]?\$?[\d,.]+(%|×|x|k|M|B)?$|^\d+(\.\d+)?\s?:\s?\d+(\.\d+)?$|^\d+\s?\/\s?\d+$/;
  function isGrid(opts) {
    if (opts.length !== 4 || opts.some(function (o) { return o && o.candles; })) return false;
    var t = opts.map(function (o) { return String(optText(o)).trim(); });
    return t.every(function (x) { return SHORT_NUM.test(x) || x.length <= 8; }) && t.some(function (x) { return SHORT_NUM.test(x); });
  }
  function optionsHtml(opts, grid) {
    return '<div class="ac-opts' + (grid ? " ac-opts--grid" : "") + '" role="group">' + opts.map(function (o, i) {
      var gl = o && o.candles && AC.visual.glyph ? '<span class="ac-opt__glyph">' + AC.visual.glyph(o.candles, o.candles.length > 1 ? 40 : 26, 44) + "</span>" : "";
      return '<button type="button" class="ac-opt' + (gl ? " ac-opt--glyph" : "") + '" data-i="' + i + '" aria-pressed="false"><span class="ac-opt__key" aria-hidden="true">' + LETTERS[i] + "</span>" + gl + '<span class="ac-opt__text"><span class="ac-visually-hidden">' + LETTERS[i] + '. </span><span class="ac-opt__label">' + esc(optText(o)) + '</span><span class="ac-opt__note" hidden></span></span></button>';
    }).join("") + "</div>";
  }
  function bindOptions(root, onPick) {
    var btns = AC.$$(".ac-opt", root);
    btns.forEach(function (b, k) {
      b.addEventListener("click", function () {
        if (b.closest(".ac-opts").classList.contains("is-locked")) return;
        btns.forEach(function (x) { x.classList.toggle("is-sel", x === b); x.setAttribute("aria-pressed", String(x === b)); });
        onPick(+b.dataset.i);
      });
      // arrow keys move between the rows (Home / End jump to the first / last)
      b.addEventListener("keydown", function (e) {
        var to = { ArrowDown: k + 1, ArrowRight: k + 1, ArrowUp: k - 1, ArrowLeft: k - 1, Home: 0, End: btns.length - 1 }[e.key];
        if (to == null || e.altKey || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        btns[(to + btns.length) % btns.length].focus();
      });
    });
  }
  /** Lock the rows and show right / wrong (and dim the rest when dim). */
  function revealOptions(root, answer, pick, dim) {
    var group = AC.$(".ac-opts", root) || root;
    group.classList.add("is-locked");
    AC.$$(".ac-opt", group).forEach(function (b) {
      var i = +b.dataset.i, note = AC.$(".ac-opt__note", b), st = dim === false ? "other" : "dim", n = "";
      if (i === answer) { st = "right"; n = '<span class="ac-popin" aria-hidden="true">✓</span> ' + esc(AC.t("cards.opt.right")); }
      else if (i === pick) { st = "wrong"; n = '<span class="ac-popin" aria-hidden="true">✕</span> ' + esc(AC.t("cards.opt.yours")); }
      b.classList.remove("is-sel");
      b.classList.add("is-" + st);
      b.setAttribute("aria-disabled", "true");
      b.removeAttribute("aria-pressed");
      if (n) { note.innerHTML = n; note.hidden = false; }
    });
  }

  // ------------------------------------------------------------------ feedback sheet
  /** {ok, text (rich), work, xp, gym, title, rico} → Element. Rico + "Good call" (+XP chip) / "Not quite".
      rico: false for a box without Rico (every lesson feedback box has him: the design boards draw one there). */
  function sheet(o) {
    var ok = !!o.ok;
    var h = '<section class="ac-sheet ac-sheet--' + (ok ? "ok" : "miss") + (o.rico === false ? " ac-sheet--plain" : "") + '" role="status" aria-live="polite" tabindex="-1">' + (o.rico === false ? "" : rico(ok ? "thumbs" : "worried", "ac-sheet__rico " + (ok ? "ac-react--cheer" : "ac-react--wobble"))) +
      '<div class="ac-sheet__body"><div class="ac-sheet__head"><b class="ac-sheet__title">' + esc(o.title || AC.t(ok ? "cards.sheet.right" : "cards.sheet.wrong")) + "</b>" +
      (o.xp ? '<span class="ac-sheet__xp ac-popin">' + esc(AC.t("cards.sheet.xp", { n: o.xp })) + "</span>" : "") + "</div>" +
      '<p class="ac-sheet__text">' + AC.rich(o.text || "") + "</p>" +
      (o.work ? '<div class="ac-sheet__work"><span>' + esc(AC.t("cards.sheet.working")) + '</span><b class="ac-num">' + AC.rich(o.work) + "</b></div>" : "") +
      (!ok && o.gym ? '<span class="ac-sheet__gym"><span aria-hidden="true">↻</span> ' + esc(AC.t("cards.sheet.gym")) + "</span>" : "") +
      "</div></section>";
    return AC.h(h);
  }

  // ------------------------------------------------------------------ Go deeper: inline, expands in place
  function deeper(d) {
    if (!d) return "";
    var id = "acDeep" + (++uid);
    return '<div class="ac-deep"><button type="button" class="ac-deep__btn" aria-expanded="false" aria-controls="' + id + '" data-deeper><span class="ac-deep__k">' + esc(AC.t("cards.deeper.eyebrow")) + '</span><span class="ac-deep__t">' + esc(d.title) + "</span>" + CHEV + "</button>" +
      '<div class="ac-deep__body" id="' + id + '" hidden>' + paras(d.text) + (d.note ? '<p class="ac-deep__note">' + AC.rich(d.note) + "</p>" : "") +
      (d.href ? '<a class="ac-link" href="' + esc(/^(https?:|\/)/.test(d.href) ? d.href : AC.base + d.href) + '">' + esc(AC.t("cards.deeper.more")) + " ›</a>" : "") + "</div></div>";
  }
  // ------------------------------------------------------------------ base controller
  function base(card, html, ctx) {
    var el = AC.h('<section class="ac-c ac-c--' + card.type + (card.kind ? " ac-c--" + card.kind : "") + '" aria-label="' + esc(card.title || card.headline || "") + '">' + html + "</section>");
    var ctl = { el: el, type: card.type, card: card, cta: function () { return { label: AC.t("common.continue") }; }, primary: function () { return "next"; } };
    var d = AC.$("[data-deeper]", el);
    if (d) {
      d.addEventListener("click", function () {
        var on = d.getAttribute("aria-expanded") !== "true", body = document.getElementById(d.getAttribute("aria-controls"));
        d.setAttribute("aria-expanded", String(on)); body.hidden = !on; el.classList.toggle("is-deep", on);
        if (on && !AC.reducedMotion()) { body.classList.remove("ac-in"); void body.offsetWidth; body.classList.add("ac-in"); }
      });
      ctl.openDeeper = function () { if (d.getAttribute("aria-expanded") !== "true") d.click(); };
    }
    return ctl;
  }
  function changed(ctx) { if (ctx && ctx.changed) ctx.changed(); }

  // ------------------------------------------------------------------ scored multiple choice (call, check, exercise choice, challenge, gym)
  /** spec: {type, eyebrow, tone, chip, head (html above options), visual (html, desktop side), options [{text, feedback, amount}], answer, work, slot, idea,
             ctaLabel, nextLabel, why (one line for every option, challenge), gym (show "Added to Rico's Gym"), dim (challenge: dim the other rows),
             scale ({label, value, min, max, step}: a stepper that re-prices options with an amount)} */
  function mcq(card, spec, ctx) {
    var grid = isGrid(spec.options);
    var sc = spec.scale, n = sc ? sc.value : null;
    var side = (spec.visual || "") + (sc ? stepperHtml(sc) : "");
    if (side && sc) side = '<div class="ac-v__box ac-c__scalebox">' + side + "</div>";
    var ctl = base(card, (spec.eyebrow ? eyebrow(spec.eyebrow, spec.tone, spec.chip) : "") + '<div class="ac-c__q">' + spec.head + "</div>" +
      (side ? '<div class="ac-c__visual ac-c__visual--q"' + (spec.visualMain ? "" : " data-side") + ">" + side + "</div>" : "") + optionsHtml(spec.options, grid), ctx);
    var pick = null, vq = AC.$(".ac-c__visual--q", ctl.el);
    ctl.answered = false;
    bindOptions(ctl.el, function (i) { pick = i; changed(ctx); });
    function money2(v) { var a = Math.abs(v) < 1e-9 ? 0 : v; return (a > 0 ? "+" : a < 0 ? "−" : "") + AC.fmt.money(Math.abs(a), "USD", 2); }
    function vars() {
      if (!sc) return null;
      var right = spec.options[spec.answer] || {}, tot = Math.abs((right.amount || 0) * n);
      return { n: AC.fmt.num(n), total: AC.fmt.money(tot, "USD", Math.abs(tot - Math.round(tot)) < 1e-9 ? 0 : 2) };
    }
    function reprice() {
      AC.$$(".ac-opt", ctl.el).forEach(function (b) { var o = spec.options[+b.dataset.i]; if (o && o.amount != null) AC.$(".ac-opt__label", b).textContent = money2(Math.round(o.amount * n * 100) / 100); });
      AC.$$("[data-fill]", ctl.el).forEach(function (x) { x.innerHTML = AC.rich(fill(x.getAttribute("data-fill"), vars())); });
      var v = AC.$("[data-scale-v]", ctl.el); if (v) v.textContent = AC.fmt.num(n);
      AC.$$("[data-scale]", ctl.el).forEach(function (b) { b.disabled = ctl.answered || (b.dataset.scale === "-" ? n <= sc.min : n >= sc.max); });
    }
    if (sc) {
      AC.$$("[data-scale]", ctl.el).forEach(function (b) {
        b.addEventListener("click", function () {
          if (ctl.answered) return;
          n = Math.max(sc.min, Math.min(sc.max, n + (b.dataset.scale === "-" ? -sc.step : sc.step)));
          reprice();
          var v = AC.$("[data-scale-v]", ctl.el); if (v && !AC.reducedMotion()) { v.classList.remove("ac-tick"); void v.offsetWidth; v.classList.add("ac-tick"); }
        });
      });
      reprice();
    }
    ctl.cta = function () {
      if (ctl.answered) return { label: spec.nextLabel || AC.t("common.continue") };
      return { label: spec.ctaLabel || AC.t("player.cta.check"), disabled: pick == null };
    };
    ctl.reveal = function (p) {
      pick = p;
      var ok = pick === spec.answer;
      var res = (ctx.answer && ctx.answer(spec.slot, ok, spec.idea, pick)) || {};
      AC.sound.play(ok ? "correct" : "wrong");
      revealOptions(ctl.el, spec.answer, pick, spec.dim ? true : false);
      ctl.el.classList.add("is-revealed", ok ? "is-right" : "is-wrong");
      ctl.answered = true;
      if (sc) reprice();
      // after answering: in a lesson the visual steps aside and the feedback takes its place (the canvas-ch1v2 and
      // canvas-p1 answered states, desktop and phones); the Chapter Challenge (and the Gym) keeps it under the question
      if (vq && (spec.keepVisual === false || spec.stepAside)) vq.hidden = true;
      else if (vq) vq.classList.add("is-kept");
      var o = spec.options[pick] || {};
      ctl.sheet = sheet({ ok: ok, text: fill(spec.why || stripLead(o.feedback), vars()), work: fill(spec.work, vars()), xp: res.xp, gym: spec.gym !== false && !ok, rico: spec.sheetRico });
      ctl.result = { ok: ok, pick: pick };
    };
    ctl.primary = function () {
      if (ctl.answered) return "next";
      if (pick == null) return;
      ctl.reveal(pick);
    };
    ctl.pick = function (i) { var b = AC.$('.ac-opt[data-i="' + i + '"]', ctl.el); if (b) b.click(); };
    /** resume: how it was answered, and back into that answered state */
    ctl.snapshot = function () { return ctl.result ? { pick: ctl.result.pick, n: n } : null; };
    ctl.restore = function (st) { if (sc && st.n != null) { n = st.n; reprice(); } ctl.pick(st.pick); ctl.reveal(st.pick); };
    ctl.answerIndex = spec.answer;
    ctl.optionCount = spec.options.length;
    return ctl;
  }
  function stepperHtml(sc) {
    return '<div class="ac-stepper"><span class="ac-stepper__k">' + esc(sc.label) + '</span><span class="ac-stepper__ctl">' +
      '<button type="button" class="ac-stepper__b" data-scale="-" aria-label="' + esc(AC.t("cards.scale.less", { x: sc.label })) + '">−</button>' +
      '<b class="ac-num" data-scale-v aria-live="polite">' + esc(AC.fmt.num(sc.value)) + "</b>" +
      '<button type="button" class="ac-stepper__b" data-scale="+" aria-label="' + esc(AC.t("cards.scale.more", { x: sc.label })) + '">+</button></span></div>';
  }

  function call(card, ctx) {
    var head = callHead(card.pose || "point", title(card.title) + para(card.situation));
    return mcq(card, {
      eyebrow: label("call", card.name), tone: "gold", chip: chipFirstTry(ctx), head: head,
      visual: card.visual ? AC.visual(card.visual, { question: true }) : "", keepVisual: keepVisual(card.visual),
      options: card.options, answer: card.answer, work: card.work, slot: "call", idea: card.idea, ctaLabel: AC.t("player.cta.lock"), gym: ctx.mode === "lesson",
      stepAside: true,   // the feedback box has its own Rico too (design board P1-Ch01-L1: pointing at the question, reacting in the feedback)
    }, ctx);
  }
  function check(card, ctx) {
    var head = callHead(card.pose === "none" ? null : (card.pose || "detective"), title(card.title) + para(card.q));   // design boards: the detective next to the question (pose "none": a board without him), Rico again in the feedback
    return mcq(card, {
      eyebrow: label("check"), tone: "sky", chip: chipFirstTry(ctx), head: head,
      visual: card.visual ? AC.visual(card.visual, { question: true }) : "", keepVisual: keepVisual(card.visual),
      options: card.options, answer: card.answer, work: card.work, slot: "check", idea: card.idea, gym: ctx.mode === "lesson", stepAside: true,
    }, ctx);
  }
  /** Chapter 1–2 visuals that step aside for the feedback (a ticket, a position, quotes, an ad…); everything else stays */
  var STEP_ASIDE = ["ticket", "position", "lines", "quotes", "quote", "ad", "handshake", "spread", "book", "ladder", "bullbear", "columns", "flow", "timeline"];
  function keepVisual(v) { return !!v && STEP_ASIDE.indexOf(v.kind) < 0; }
  function fieldsHtml(f) { return f && f.length ? AC.visual({ kind: "fields", items: f }) : ""; }

  // ------------------------------------------------------------------ exercise (Try it)
  function exercise(card, ctx) {
    var kind = card.kind || "choice";
    var chip = chipFirstTry(ctx);
    var eb = label("exercise", card.name);
    if (kind !== "sort" && kind !== "slider" && kind !== "point" && kind !== "order" && kind !== "line") {   // choice (and a predict written as options)
      var q = card.scale ? '<p class="ac-c__text" data-fill="' + esc(card.q || "") + '">' + AC.rich(fill(card.q, { n: AC.fmt.num(card.scale.value) })) + "</p>" : (card.q ? (card.blocks || card.scale ? para(card.q) : '<p class="ac-c__ask">' + AC.rich(card.q) + "</p>") : "");
      return mcq(card, {
        eyebrow: eb, tone: "primary", chip: chip, head: title(card.title) + fieldsHtml(card.fields) + q,
        visual: card.visual ? AC.visual(card.visual, { question: true }) : "", keepVisual: keepVisual(card.visual), scale: card.scale,
        options: card.options, answer: card.answer, work: card.work, slot: "exercise", idea: card.idea, gym: ctx.mode === "lesson", stepAside: true,
      }, ctx);
    }
    var top = eyebrow(eb, "primary", chip) + title(card.title) + para(card.q);
    if (kind === "point") return pointEx(card, ctx, top);
    if (kind === "order") return orderEx(card, ctx, top);
    if (kind === "line") return lineEx(card, ctx, top);
    return kind === "sort" ? sortEx(card, ctx, top) : sliderEx(card, ctx, top);
  }
  function finishEx(ctl, card, ctx, ok, text) {
    var res = (ctx.answer && ctx.answer("exercise", ok, card.idea)) || {};
    AC.sound.play(ok ? "correct" : "wrong");
    ctl.el.classList.add("is-revealed", ok ? "is-right" : "is-wrong");
    ctl.sheet = sheet({ ok: ok, text: text, work: card.work, xp: res.xp, gym: ctx.mode === "lesson" && !ok });
    ctl.answered = true;
    ctl.result = { ok: ok };
  }

  /** Sort: drag (mouse, touch, pen) or tap a card then tap its box. `given` items sit in their box already. */
  function sortEx(card, ctx, top) {
    var norm = function (x) { return typeof x === "string" ? { text: x } : x; };
    var items = (card.items || []).map(norm), buckets = card.buckets || [], given = (card.given || []).map(function (g) { return { item: norm(g.item), bucket: g.bucket }; });
    var cards = items.concat(given.map(function (g) { return g.item; })).some(function (x) { return x.sub; });
    function chipHtml(it, i, isGiven) {
      return '<button type="button" class="ac-sort__chip' + (cards ? " ac-sort__chip--card" : "") + (isGiven ? " is-given" : "") + '"' + (isGiven ? ' aria-disabled="true" tabindex="-1"' : ' data-item="' + i + '" aria-pressed="false"') + ">" + (isGiven ? "" : GRIP) +
        '<span class="ac-sort__ct"><b class="ac-num">' + esc(it.text) + "</b>" + (it.sub ? "<span>" + esc(it.sub) + "</span>" : "") + "</span>" + (isGiven ? '<span class="ac-visually-hidden"> · ' + esc(AC.t("cards.sort.example")) + "</span>" : "") + "</button>";
    }
    var pool = '<div class="ac-sort__pool' + (cards ? " ac-sort__pool--cards" : "") + '" data-pool aria-label="' + esc(AC.t("cards.sort.pool")) + '">' + items.map(function (it, i) { return chipHtml(it, i); }).join("") + "</div>";
    var bks = '<div class="ac-sort__buckets' + (cards ? " ac-sort__buckets--rows" : "") + '">' + buckets.map(function (b) {
      var g = given.filter(function (x) { return x.bucket === b.id; });
      return '<div class="ac-sort__bucket ac-tone--' + esc(b.tone || "muted") + '" data-bucket="' + esc(b.id) + '">' +
        '<button type="button" class="ac-sort__drop"><span class="ac-sort__bl ac-v__ink">' + (b.icon ? AC.visual.trendIcon(b.icon, 18) : "") + esc(b.label) + "</span>" + (b.sub ? '<span class="ac-sort__bs">' + esc(b.sub) + "</span>" : "") +
        '<span class="ac-visually-hidden"> · ' + esc(AC.t("cards.sort.place")) + "</span></button>" +
        '<div class="ac-sort__in">' + g.map(function (x) { return chipHtml(x.item, -1, true); }).join("") + '<span class="ac-sort__ph" aria-hidden="true">' + esc(AC.t("cards.sort.drop")) + "</span></div></div>";
    }).join("") + "</div>";
    var html = top + (cards ? pool + '<div class="ac-sort" data-side>' + bks + "</div>" : '<div class="ac-sort" data-side>' + pool + bks + "</div>") +
      '<p class="ac-c__hint ac-visually-hidden">' + esc(AC.t("cards.sort.hint")) + "</p>";
    var ctl = base(card, html, ctx);
    var place = {}, sel = null, el = ctl.el, poolEl = AC.$("[data-pool]", el), dragged = false;
    function root() { return el.ownerDocument; }
    function chip(i) { var q = '.ac-sort__chip[data-item="' + i + '"][data-sort="' + sortId + '"]'; return el.querySelector(q) || root().querySelector(q); }
    var sortId = "s" + (++uid);
    AC.$$(".ac-sort__chip[data-item]", el).forEach(function (c) { c.setAttribute("data-sort", sortId); });
    var bucketEls = AC.$$(".ac-sort__bucket", el);
    function bucketEl(id) { return bucketEls.filter(function (b) { return b.dataset.bucket === id; })[0]; }
    function select(i) {
      sel = i;
      items.forEach(function (it, k) { var c = chip(k); if (c) { var on = k === i; c.classList.toggle("is-sel", on); c.setAttribute("aria-pressed", String(on)); } });
      bucketEls.concat([el]).forEach(function (x) { x.classList.toggle("is-picking", i != null); });
      var s = AC.$(".ac-sort", el); if (s) s.classList.toggle("is-picking", i != null);
    }
    function put(i, bucket) {
      var c = chip(i);
      if (bucket == null) { delete place[i]; poolEl.appendChild(c); }
      else { place[i] = bucket; var inn = AC.$(".ac-sort__in", bucketEl(bucket)); inn.insertBefore(c, AC.$(".ac-sort__ph", inn)); }
      if (!AC.reducedMotion()) { c.classList.remove("ac-drop"); void c.offsetWidth; c.classList.add("ac-drop"); }
      select(null);
      changed(ctx);
    }
    // pointer drag: lift a copy that follows the pointer, drop on a box (or back on the pool)
    function drag(e, c) {
      if (ctl.answered || (e.pointerType === "mouse" && e.button !== 0)) return;
      var i = +c.dataset.item, sx = e.clientX, sy = e.clientY, ghost = null, over = null, z = 1, r0 = null;
      function target(x, y) {
        var t = document.elementFromPoint(x, y);
        return t ? (t.closest('.ac-sort__bucket') || (t.closest("[data-pool]") === poolEl ? poolEl : null)) : null;
      }
      function move(ev) {
        var dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!ghost) {
          if (Math.abs(dx) + Math.abs(dy) < 6) return;
          r0 = c.getBoundingClientRect(); z = r0.width / (c.offsetWidth || r0.width) || 1;
          ghost = c.cloneNode(true); ghost.classList.add("ac-sort__ghost"); ghost.removeAttribute("data-item"); ghost.setAttribute("aria-hidden", "true");
          ghost.style.width = c.offsetWidth + "px"; ghost.style.left = r0.left / z + "px"; ghost.style.top = r0.top / z + "px"; if (z !== 1) ghost.style.zoom = z;
          document.body.appendChild(ghost);
          c.classList.add("is-dragging"); select(i);
        }
        ghost.style.transform = "translate(" + dx / z + "px," + dy / z + "px)";
        ghost.style.visibility = "hidden";
        var t = target(ev.clientX, ev.clientY);
        ghost.style.visibility = "";
        if (t !== over) { if (over) over.classList.remove("is-over"); over = t; if (over) over.classList.add("is-over"); }
        ev.preventDefault();
      }
      function up() {
        window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
        if (!ghost) return;
        dragged = true; setTimeout(function () { dragged = false; }, 0);
        ghost.remove(); c.classList.remove("is-dragging");
        if (over) over.classList.remove("is-over");
        if (over === poolEl) put(i, null); else if (over) put(i, over.dataset.bucket); else select(null);
      }
      window.addEventListener("pointermove", move, { passive: false }); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
    }
    items.forEach(function (it, i) {
      var c = chip(i);
      c.addEventListener("pointerdown", function (e) { drag(e, c); });
      c.addEventListener("click", function () {
        if (ctl.answered || dragged) return;
        // another card is selected: a tap on a placed card means "put it in this box", not "take this one out"
        if (place[i] != null && sel != null && sel !== i) { put(sel, place[i]); return; }
        if (place[i] != null) { put(i, null); select(i); return; }
        select(sel === i ? null : i);
      });
    });
    bucketEls.forEach(function (b) {
      AC.$(".ac-sort__drop", b).addEventListener("click", function () { if (!ctl.answered && sel != null) put(sel, b.dataset.bucket); });
      b.addEventListener("click", function (e) { if (!ctl.answered && sel != null && !e.target.closest(".ac-sort__chip[data-item]") && !e.target.closest(".ac-sort__drop")) put(sel, b.dataset.bucket); });
    });
    var rightOf = {};
    Object.keys(card.solution || {}).forEach(function (bid) { (card.solution[bid] || []).forEach(function (t) { rightOf[t] = bid; }); });
    ctl.cta = function () {
      if (ctl.answered) return { label: AC.t("common.continue") };
      return { label: AC.t("player.cta.check"), disabled: Object.keys(place).length < items.length };
    };
    ctl.solve = function (wrong) { items.forEach(function (t, i) { var b = rightOf[t.text]; if (wrong && i === 0) b = buckets.filter(function (x) { return x.id !== b; })[0].id; put(i, b); }); };
    ctl.snapshot = function () { return ctl.answered ? { place: Object.assign({}, place) } : null; };
    ctl.restore = function (st) { Object.keys(st.place || {}).forEach(function (i) { put(+i, st.place[i]); }); ctl.primary(); };
    ctl.primary = function () {
      if (ctl.answered) return "next";
      if (Object.keys(place).length < items.length) return;
      var wrongItems = [];
      items.forEach(function (t, i) {
        var ok = rightOf[t.text] === place[i], c = chip(i);
        c.classList.add(ok ? "is-right" : "is-wrong");
        c.setAttribute("aria-label", t.text + " · " + AC.t(ok ? "cards.sort.ok" : "cards.sort.no"));
        if (!ok) wrongItems.push(t.text);
      });
      var ok = !wrongItems.length;
      var fb = card.itemFeedback || {};
      var why = wrongItems.filter(function (t) { return fb[t]; })[0];
      finishEx(ctl, card, ctx, ok, ok ? card.right : (why ? fb[why] : (card.wrong || card.right || "")));
    };
    return ctl;
  }

  function sliderEx(card, ctx, top) {
    var m = card.model || {};
    var spec = card.visual && card.visual.kind === "slider" ? Object.assign({}, card.visual) : { kind: "slider", model: m.model || "leverage", params: m.params || {}, label: m.label };
    if (m.start != null) spec.value = m.start;
    var ctl = base(card, top + fieldsHtml(card.fields) + '<div class="ac-c__visual">' + AC.visual(spec) + '</div><p class="ac-c__hint">' + esc(m.hint || AC.t("cards.slider.hint")) + "</p>", ctx);
    var moved = false;
    var api = AC.visual.mount(ctl.el, { onProgress: function () { moved = true; changed(ctx); } });
    ctl.cta = function () { return ctl.answered ? { label: AC.t("common.continue") } : { label: AC.t("player.cta.check"), disabled: !moved }; };
    ctl.primary = function () {
      if (ctl.answered) return "next";
      var v = api.value(), tol = m.tolerance != null ? m.tolerance : 0;
      var ok = m.target != null ? Math.abs(v - m.target) <= tol + 1e-9 : true;
      var input = AC.$(".ac-v__range", ctl.el);
      if (input) input.disabled = true;
      finishEx(ctl, card, ctx, ok, ok ? card.right : card.wrong);
    };
    ctl.solve = function (wrong) { var input = AC.$(".ac-v__range", ctl.el); input.value = wrong ? input.min : m.target; input.dispatchEvent(new Event("input")); };
    ctl.snapshot = function () { return ctl.answered ? { value: api.value() } : null; };
    ctl.restore = function (st) { var input = AC.$(".ac-v__range", ctl.el); if (input && st.value != null) { input.value = st.value; input.dispatchEvent(new Event("input")); } moved = true; ctl.primary(); };
    return ctl;
  }


  /** Point: tap the candle the question asks for (card.answer = candle index; card.tolerance = ± candles still right).
      A row of invisible hit columns sits over the chart; arrow keys move between candles (one tab stop). */
  function pointEx(card, ctx, top) {
    var v = Object.assign({}, card.visual || {}), c = v.chart || {}, geo = null;
    var svg = AC.visual.candles(c, { geo: function (g) { geo = g; } });
    var n = geo.n, d = geo.data, tol = card.tolerance || 0;
    function m(q) { return AC.fmt.money(q, "USD", Math.abs(q % 1) > 1e-9 ? 2 : 0); }
    var hits = "";
    for (var i = 0; i < n; i++) {
      var x0 = (geo.X(i) - geo.step / 2) / geo.w * 100, wd = geo.step / geo.w * 100;
      hits += '<button type="button" class="ac-pt__hit" data-pt="' + i + '" tabindex="' + (i === n - 1 ? 0 : -1) + '" role="radio" aria-checked="false" style="left:' + x0.toFixed(2) + "%;width:" + wd.toFixed(2) + '%" aria-label="' +
        esc(AC.t("cards.point.candle", { n: i + 1, total: n, o: m(d[i][0]), h: m(d[i][1]), l: m(d[i][2]), c: m(d[i][3]) })) + '"><span class="ac-pt__col"></span></button>';
    }
    var hTop = (geo.top - 4) / 1, chart = '<div class="ac-v ac-v--candles"><div class="ac-v__box ac-v__box--chart">' +
      (v.title || v.aside ? '<div class="ac-v__hdr ac-v__hdr--chart"><b>' + AC.rich(v.title || "") + '</b><span class="ac-v__aside">' + AC.rich(v.aside || "") + "</span></div>" : "") +
      '<div class="ac-v__plot"><div class="ac-pt" role="radiogroup" aria-label="' + esc(AC.t("cards.point.group")) + '" style="--pt-top:' + (hTop / geo.h * 100).toFixed(2) + "%;--pt-h:" + ((geo.bot - geo.top + 8) / geo.h * 100).toFixed(2) + '%;--pt-ar:' + geo.w + " / " + geo.h + '">' + svg + '<div class="ac-pt__hits">' + hits + "</div></div></div>" + (v.foot ? '<div class="ac-v__foot">' + AC.rich(v.foot) + "</div>" : "") + "</div></div>";
    var ctl = base(card, top + fieldsHtml(card.fields) + '<div class="ac-c__visual" data-side>' + chart + '<p class="ac-c__hint">' + esc(card.hint || AC.t("cards.point.hint")) + "</p></div>", ctx);
    var pick = null, btns = AC.$$(".ac-pt__hit", ctl.el);
    function select(i, focus) {
      if (ctl.answered) return;
      pick = i;
      btns.forEach(function (b, k) { var on = k === i; b.classList.toggle("is-sel", on); b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
      if (focus) btns[i].focus();
      changed(ctx);
    }
    btns.forEach(function (b, i) {
      b.addEventListener("click", function () { select(i); });
      b.addEventListener("keydown", function (e) {
        var to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
        if (to == null) return; e.preventDefault(); select(Math.max(0, Math.min(n - 1, to)), true);
      });
    });
    function right(i) { return Math.abs(i - card.answer) <= tol; }
    ctl.cta = function () { return ctl.answered ? { label: AC.t("common.continue") } : { label: AC.t("player.cta.check"), disabled: pick == null }; };
    ctl.primary = function () {
      if (ctl.answered) return "next";
      if (pick == null) return;
      var ok = right(pick);
      btns.forEach(function (b, k) { b.disabled = true; if (k === card.answer) b.classList.add("is-right"); if (k === pick && !ok) b.classList.add("is-wrong"); });
      var hint = card.hints && card.hints[String(pick)];
      finishEx(ctl, card, ctx, ok, ok ? card.right : (hint || card.wrong));
    };
    ctl.solve = function (wrong) { select(wrong ? (card.answer + tol + 2 < n ? card.answer + tol + 2 : Math.max(0, card.answer - tol - 2)) : card.answer); };
    ctl.snapshot = function () { return ctl.answered ? { pick: pick } : null; };
    ctl.restore = function (st) { select(st.pick); ctl.primary(); };
    return ctl;
  }

  /** Order: put the rows in the right order. card.items is the right order; card.start (indexes) the shuffled start.
      Drag a row (mouse, touch, pen) or use its ▲ ▼ buttons. */
  function orderEx(card, ctx, top) {
    var items = (card.items || []).map(function (x) { return typeof x === "string" ? { text: x } : x; });
    var start = card.start || items.map(function (x, i) { return i; }).reverse();
    var UP = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>';
    var DN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    var rows = start.map(function (k) {
      var it = items[k];
      return '<li class="ac-ord__row" data-k="' + k + '">' + GRIP + '<span class="ac-ord__n ac-num" aria-hidden="true"></span><span class="ac-ord__t"><b>' + AC.rich(it.text) + "</b>" + (it.sub ? "<span>" + esc(it.sub) + "</span>" : "") + "</span>" +
        '<span class="ac-ord__btns"><button type="button" class="ac-ord__b" data-mv="-1" aria-label="' + esc(AC.t("cards.order.up", { x: it.text })) + '">' + UP + '</button><button type="button" class="ac-ord__b" data-mv="1" aria-label="' + esc(AC.t("cards.order.down", { x: it.text })) + '">' + DN + "</button></span></li>";
    }).join("");
    var ctl = base(card, top + fieldsHtml(card.fields) + (card.visual ? '<div class="ac-c__visual">' + AC.visual(card.visual) + "</div>" : "") +
      '<div class="ac-ord" data-side><ol class="ac-ord__list">' + rows + '</ol><p class="ac-c__hint">' + esc(card.hint || AC.t("cards.order.hint")) + '</p><p class="ac-visually-hidden" aria-live="polite" data-ord-live></p></div>', ctx);
    var list = AC.$(".ac-ord__list", ctl.el), live = AC.$("[data-ord-live]", ctl.el), moved = false;
    function rowsNow() { return AC.$$(".ac-ord__row", list); }
    function renum() { rowsNow().forEach(function (r, i, a) { AC.$(".ac-ord__n", r).textContent = String(i + 1); AC.$('[data-mv="-1"]', r).disabled = ctl.answered || i === 0; AC.$('[data-mv="1"]', r).disabled = ctl.answered || i === a.length - 1; }); }
    function moveRow(r, dir, focusBtn) {
      if (ctl.answered) return;
      var a = rowsNow(), i = a.indexOf(r), j = i + dir;
      if (j < 0 || j >= a.length) return;
      if (dir < 0) list.insertBefore(r, a[j]); else list.insertBefore(r, a[j].nextSibling);
      moved = true; renum();
      if (!AC.reducedMotion()) { r.classList.remove("ac-drop"); void r.offsetWidth; r.classList.add("ac-drop"); }
      live.textContent = AC.t("cards.order.moved", { x: items[+r.dataset.k].text, n: j + 1, total: a.length });
      if (focusBtn) { var b = AC.$('[data-mv="' + dir + '"]', r); (b && !b.disabled ? b : AC.$('[data-mv="' + -dir + '"]', r)).focus(); }
      changed(ctx);
    }
    rowsNow().forEach(function (r) {
      AC.$$("[data-mv]", r).forEach(function (b) { b.addEventListener("click", function () { moveRow(r, +b.dataset.mv, true); }); });
      r.addEventListener("pointerdown", function (e) {
        if (ctl.answered || e.target.closest("button") || (e.pointerType === "mouse" && e.button !== 0)) return;
        var sy = e.clientY, dragging = false;
        function mv(ev) {
          if (!dragging) { if (Math.abs(ev.clientY - sy) < 6) return; dragging = true; r.classList.add("is-dragging"); }
          ev.preventDefault();
          var a = rowsNow(), i = a.indexOf(r);
          var prev = a[i - 1], next = a[i + 1];
          if (prev) { var pb = prev.getBoundingClientRect(); if (ev.clientY < pb.top + pb.height / 2) moveRow(r, -1); }
          if (next) { var nb = next.getBoundingClientRect(); if (ev.clientY > nb.top + nb.height / 2) moveRow(r, 1); }
        }
        function up() { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); r.classList.remove("is-dragging"); }
        window.addEventListener("pointermove", mv, { passive: false }); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
      });
    });
    renum();
    function order() { return rowsNow().map(function (r) { return +r.dataset.k; }); }
    ctl.cta = function () { return ctl.answered ? { label: AC.t("common.continue") } : { label: AC.t("player.cta.check"), disabled: !moved }; };
    ctl.primary = function () {
      if (ctl.answered) return "next";
      if (!moved) return;
      var o = order(), ok = o.every(function (k, i) { return k === i; });
      ctl.answered = true; renum(); ctl.answered = false;
      rowsNow().forEach(function (r, i) { var good = +r.dataset.k === i; r.classList.add(good ? "is-right" : "is-wrong"); r.setAttribute("aria-label", items[+r.dataset.k].text + " · " + AC.t(good ? "cards.order.ok" : "cards.order.no")); });
      finishEx(ctl, card, ctx, ok, ok ? card.right : (card.wrong || card.right || ""));
    };
    ctl.solve = function (wrong) {
      var want = items.map(function (x, i) { return i; }); if (wrong) want = want.reverse();
      want.forEach(function (k) { var r = AC.$('.ac-ord__row[data-k="' + k + '"]', list); list.appendChild(r); });
      moved = true; renum();
    };
    ctl.snapshot = function () { return ctl.answered ? { order: order() } : null; };
    ctl.restore = function (st) { (st.order || []).forEach(function (k) { list.appendChild(AC.$('.ac-ord__row[data-k="' + k + '"]', list)); }); moved = true; renum(); ctl.primary(); };
    return ctl;
  }

  /** Line: drag a line on a chart into place (a level: the stop, the support; or a trendline). card.visual is a drawline. */
  function lineEx(card, ctx, top) {
    var spec = Object.assign({}, card.visual, { quiet: true });
    var ctl = base(card, top + fieldsHtml(card.fields) + '<div class="ac-c__visual" data-side>' + AC.visual(spec) + "</div>", ctx);
    var w = AC.$('[data-interactive="drawline"]', ctl.el), dl = AC.visual.wireDrawline(w, function () { changed(ctx); });
    ctl.cta = function () { return ctl.answered ? { label: AC.t("common.continue") } : { label: AC.t("player.cta.check"), disabled: !dl.moved() }; };
    ctl.primary = function () {
      if (ctl.answered) return "next";
      if (!dl.moved()) return;
      var ok = dl.fit();
      dl.lock(); dl.reveal(ok);
      finishEx(ctl, card, ctx, ok, ok ? card.right : card.wrong);
    };
    ctl.solve = function (wrong) { dl.solve(wrong); };
    ctl.snapshot = function () { return ctl.answered ? { value: dl.value() } : null; };
    ctl.restore = function (st) { dl.restore(st.value || []); ctl.primary(); };
    return ctl;
  }

  // ------------------------------------------------------------------ learn cards
  function visualDiv(v, side, opts) { return v ? '<div class="ac-c__visual"' + (side ? " data-side" : "") + ">" + AC.visual(v, opts) + "</div>" : ""; }
  function learn(card, ctx) {
    var split = autoSide(card, ctx);
    var ctl = base(card, eyebrow(label("learn", card.tag), "primary") + title(card.title) + paras(card.text) +
      visualDiv(card.visual, split) + (split ? blocksSplit(card.blocks, false, !!card.visual) : blocks(card.blocks)) + deeper(card.deeper), ctx);
    if (AC.visual.interactive(card.visual) || (card.blocks || []).some(function (b) { return AC.visual.interactive(b.visual); })) AC.visual.mount(ctl.el, {});
    return ctl;
  }
  function pro(card, ctx) {
    // no Rico picture on a Pro Move unless the card asks for one (card.rico); the box then sits next to him
    var split = !card.rico && autoSide(card, ctx);
    var text = card.rico ? callHead(card.pose || "point", '<p class="ac-c__text ac-c__text--box">' + AC.rich(card.text) + "</p>", "ac-call--pro") : paras(card.text);
    var ctl = base(card, eyebrow(label("pro", card.tag), "gold") + title(card.title) + text + visualDiv(card.visual, split) +
      (split ? blocksSplit(card.blocks, false, !!card.visual) : blocks(card.blocks)), ctx);
    if (AC.visual.interactive(card.visual) || (card.blocks || []).some(function (b) { return AC.visual.interactive(b.visual); })) AC.visual.mount(ctl.el, {});
    return ctl;
  }
  /** The walk-through foot: shown once everything is seen. With footTone it is a toned box (canvas-p1), else a line. */
  function footHtml(card, side) {
    if (!card.foot) return "";
    var at = " data-foot hidden" + (side ? " data-side" : "");
    return card.footTone ? tipBox(card.foot, card.footTone, at + ' role="status"') : '<p class="ac-c__foot"' + at + ">" + AC.rich(card.foot) + "</p>";
  }
  function walkthrough(card, ctx) {
    var steps = card.steps || [];
    var rows = steps.length && steps.some(function (s) { return s.sub; });
    var stepsHtml = "";
    if (rows) {
      stepsHtml = '<div class="ac-players" data-side>' + steps.map(function (s, i) {
        var id = "acPl" + (++uid);
        return '<div class="ac-player"><button type="button" class="ac-player__btn" aria-expanded="false" aria-controls="' + id + '" data-step="' + i + '"><span class="ac-player__tick" aria-hidden="true"></span>' +
          '<span class="ac-player__who"><b>' + esc(s.label) + "</b>" + (s.sub ? "<span>" + esc(s.sub) + "</span>" : "") + "</span>" + CHEV + "</button>" +
          '<div class="ac-player__body" id="' + id + '" hidden>' + (s.edge ? '<span class="ac-player__edge"><b>' + esc(AC.t("cards.walk.edge")) + "</b> " + AC.rich(s.edge) + "</span>" : "") +
          (s.move ? '<span class="ac-player__move"><b>' + esc(AC.t("cards.walk.move")) + "</b> " + AC.rich(s.move) + "</span>" : "") + (s.text ? '<span class="ac-player__edge">' + AC.rich(s.text) + "</span>" : "") + "</div></div>";
      }).join("") + "</div>";
    } else if (steps.length) {
      stepsHtml = '<ol class="ac-steps">' + steps.map(function (s, i) {
        return '<li><button type="button" class="ac-step" aria-expanded="false" data-step="' + i + '"><span class="ac-step__n" aria-hidden="true">' + (i + 1) + '</span><span class="ac-step__body"><b>' + esc(s.label) + '</b><span class="ac-step__text">' + AC.rich(s.text) + "</span></span></button></li>";
      }).join("") + "</ol>";
    }
    // a walk-through built from blocks works like one built from `visual`: its visuals get their taps / ▶ Play,
    // the tag stays in the eyebrow, and on desktop the visual (and the foot, the tips) take the right column
    var split = !rows && autoSide(card, ctx);
    var bl = card.blocks || [], lastV = -1;
    bl.forEach(function (b, i) { if (b.visual) lastV = i; });
    var body;
    if (card.visual) body = visualDiv(card.visual, split, { explore: true }) + footHtml(card, split) + (split ? blocksSplit(bl, true, true) : blocks(bl, { explore: true }));
    else if (lastV >= 0) {
      var on = false;
      // the foot follows the last visual, in its column (an explicit `side: true` block takes it along)
      body = bl.map(function (b, i) { if (b.visual) on = true; return block(b, { explore: true, side: split && on && !b.p }) + (i === lastV ? footHtml(card, split || !!b.side) : ""); }).join("");
    } else body = blocks(bl, { explore: true }) + footHtml(card, false);
    var ctl = base(card, eyebrow(label("walkthrough", card.tag), "primary") + title(card.title) + paras(card.text) + body + stepsHtml, ctx);
    var seen = {};
    var api = AC.visual.mount(ctl.el, { onProgress: function () { update(); } });
    var btns = AC.$$("[data-step]", ctl.el);
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-expanded") !== "true";
        if (rows && on) btns.forEach(function (x) { if (x !== b && x.getAttribute("aria-expanded") === "true") { x.setAttribute("aria-expanded", "false"); x.parentNode.classList.remove("is-open"); document.getElementById(x.getAttribute("aria-controls")).hidden = true; } });
        b.setAttribute("aria-expanded", String(on)); b.classList.toggle("is-open", on); b.classList.add("is-seen");
        if (rows) { b.parentNode.classList.toggle("is-open", on); b.parentNode.classList.add("is-seen"); var body = document.getElementById(b.getAttribute("aria-controls")); body.hidden = !on; if (on && !AC.reducedMotion()) { body.classList.remove("ac-in"); void body.offsetWidth; body.classList.add("ac-in"); } }
        seen[b.dataset.step] = true; update();
      });
    });
    function total() { return steps.length + api.total(); }
    function done() { return Object.keys(seen).length + api.done(); }
    function update() {
      var f = AC.$("[data-foot]", ctl.el) || document.querySelector("[data-foot]");
      if (f && done() >= total() && f.hidden) { f.hidden = false; if (!AC.reducedMotion()) f.classList.add("ac-in"); }
      changed(ctx);
    }
    ctl.cta = function () {
      if (done() >= total()) return { label: AC.t("common.continue") };
      if (api.hasSlider() && !steps.length) return { label: AC.t("cards.walk.ends", { n: api.done(), total: 2 }), disabled: true };
      if (api.parts.some(function (p) { return p.drawline; }) && api.total() === 1 && !steps.length) return { label: AC.t("cards.walk.drag"), disabled: true };
      return { label: AC.t("cards.walk.tapped", { n: done(), total: total() }), disabled: true };
    };
    ctl.openAll = function () {
      api.openAll();
      if (rows) { btns.forEach(function (b, i) { if (i < btns.length) { seen[b.dataset.step] = true; b.classList.add("is-seen"); b.parentNode.classList.add("is-seen"); } }); if (btns[0]) btns[0].click(); }
      else btns.forEach(function (b) { if (!b.classList.contains("is-open")) b.click(); });
      update();
    };
    ctl.primary = function () { return done() >= total() ? "next" : undefined; };
    if (!total()) update();
    return ctl;
  }
  function trap(card, ctx) {
    var pose = card.pose || "worried";
    // `note`: a red box under the rule (not Rico's line); Rico's speech bubble holds only `line`
    var note = card.note ? tipBox(card.note, card.noteTone || "red") : "";
    if (card.blocks) {
      var sideRule = card.blocks.some(function (b) { return b.side; }) ? " data-side" : "";
      var ctl2 = base(card, eyebrow(label("trap"), "down") + title(card.title) + paras(card.text) + blocks(card.blocks) +
        '<div class="ac-trap-rule"' + sideRule + ">" + rico(pose, "ac-trap-rule__rico ac-react--wobble") + '<p class="ac-trap-rule__text">' + esc(AC.t("cards.trap.rule")) + " " + AC.rich(card.rule) + "</p></div>" + note, ctx);
      return ctl2;
    }
    var ctl = base(card, eyebrow(label("trap"), "down") + title(card.title) + paras(card.text) +
      (card.visual ? '<div class="ac-c__visual">' + AC.visual(card.visual) + "</div>" : "") +
      '<div class="ac-rule"><b>' + esc(AC.t("cards.trap.rule")) + "</b> " + AC.rich(card.rule) + "</div>" + note, ctx);
    ctl.bubble = AC.h(card.line ? bubble(card.line, pose) : '<div class="ac-bubble">' + rico(pose, "ac-bubble__rico") + "</div>");
    ctl.side = AC.h('<div class="ac-side">' + (card.line ? bubble(card.line, pose, true) : rico(pose, "ac-side__rico")) + "</div>");
    ctl.onShow = function () {
      if (AC.reducedMotion()) return;
      ctl.el.classList.add("is-shaking");
      setTimeout(function () { ctl.el.classList.remove("is-shaking"); }, 300);
    };
    if (AC.visual.interactive(card.visual)) AC.visual.mount(ctl.el, {});
    return ctl;
  }
  /** Myth or reality: the myth, then the reality (canvas-ch1v2: both shown, the reality slides in).
      canvas-p1: an optional `visual` (after the reality, or between myth and reality with visualPos "before")
      and the `rule` in a gold "Rule:" box. */
  function myth(card, ctx) {
    var vis = card.visual ? '<div class="ac-c__visual">' + AC.visual(card.visual) + "</div>" : "";
    var before = card.visualPos === "before";
    var ctl = base(card, eyebrow(label("myth"), "down") + title(card.title) +
      '<div class="ac-myth2 ac-myth2--myth"><span class="ac-myth2__stamp">' + esc(AC.t("cards.myth.stamp")) + '</span><b class="ac-myth2__quote">“' + esc(card.myth) + "”</b></div>" +
      (before ? vis : "") +
      '<div class="ac-myth2 ac-myth2--real"><span class="ac-myth2__stamp">' + esc(AC.t("cards.myth.realityStamp")) + '</span><span class="ac-myth2__text">' + AC.rich(card.reality) + "</span></div>" +
      (before ? "" : vis) + (card.text ? para(card.text) : "") +
      (card.rule ? '<div class="ac-tip ac-tip--gold ac-myth2__rule"><b>' + esc(AC.t("cards.trap.rule")) + "</b> " + AC.rich(card.rule) + "</div>" : ""), ctx);
    if (AC.visual.interactive(card.visual)) AC.visual.mount(ctl.el, {});
    return ctl;
  }
  function keep(card) {
    return base(card, eyebrow(label("keep"), "primary") + title(card.headline) + '<ul class="ac-keep">' + card.lines.map(function (l) { return "<li>" + AC.rich(l) + "</li>"; }).join("") + "</ul>");
  }


  // ------------------------------------------------------------------ the full-screen frame (lesson, Challenge, Level Up, Gym)
  var CLOSE_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  var BACK_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';
  var SND_ON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var SND_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6M21 9l-5 6"/></svg>';
  var FLAME = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path class="ac-flame" d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z"/></svg>';
  var ARROW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var POSES = ["thumbs", "worried", "star", "celebrate", "think"];   // feedback sheet, completion and result screens
  /** opts: {close: href, closeLabel, back: bool, kicker, title, heading (challenge-style bold title), aside (right label),
             segments: n, count: bool ("2 of 6" on the right), streak: bool, zoom: bool (canvas-ch1v2 desktop: columns at 1.28×),
             sheetMain: bool (desktop: sheet under the card, not in the right column), sheetDock: bool (phones: sheet above the button),
             keys: () → the current card controller (letter shortcuts)}.
     Returns {el, main, side, dock, extra, cta, setProgress(i, done), setCta(o), setAside(t), layout(name), placeSheet(el), setRico(), isDesktop(),
              go(href) (navigate, or the offline note), offline() (shows the note when offline → true), locked(lock, here) (the "not yet" screen)} */
  function frame(o) {
    var mq = window.matchMedia("(min-width: 861px)");
    var segs = "";
    for (var i = 0; i < (o.segments || 0); i++) segs += "<span></span>";
    var el = AC.h('<div class="ac-pl' + (o.heading ? " ac-pl--titled" : "") + (o.zoom ? " ac-pl--zoom" : "") + (o.count ? " ac-pl--count" : "") + '">' +
      '<header class="ac-pl__top">' +
        '<a class="ac-iconbtn ac-pl__close" href="' + esc(o.close) + '" aria-label="' + esc(o.closeLabel) + '">' + (o.back ? BACK_SVG : CLOSE_SVG) + "</a>" +
        (o.heading ? '<b class="ac-pl__heading">' + esc(o.heading) + "</b>" : "") +
        (o.title ? '<div class="ac-pl__label"><span>' + esc(o.kicker || "") + "</span><b>" + esc(o.title) + "</b></div>" : "") +
        (o.segments ? '<div class="ac-pl__prog" role="progressbar" aria-label="' + esc(AC.t("player.progress")) + '" aria-valuemin="0" aria-valuemax="' + o.segments + '">' + segs + "</div>" : (o.heading ? "" : '<span class="ac-pl__spacer"></span>')) +
        (o.aside != null ? '<span class="ac-pl__aside" data-aside>' + esc(o.aside) + "</span>" : "") +
        (o.count ? '<span class="ac-pl__count ac-num" data-count></span>' : "") +
        '<button type="button" class="ac-iconbtn ac-pl__snd" data-snd aria-pressed="false"></button>' +
        (o.streak ? '<span class="ac-pl__streak" title="' + esc(AC.t("player.streak")) + '">' + FLAME + '<b data-streak class="ac-num"></b><span class="ac-visually-hidden"> ' + esc(AC.t("player.streak")) + "</span></span>" : "") +
      "</header>" +
      '<div class="ac-pl__stage"><div class="ac-pl__grid"><div class="ac-pl__main"></div><aside class="ac-pl__side" hidden></aside></div></div>' +
      '<footer class="ac-pl__foot"><div class="ac-pl__dock"></div><div class="ac-pl__bar"><div class="ac-pl__extra"></div><button type="button" class="ac-btn ac-btn--primary ac-btn--lg ac-pl__cta"></button></div></footer></div>');
    var f = {
      el: el, main: AC.$(".ac-pl__main", el), side: AC.$(".ac-pl__side", el), dock: AC.$(".ac-pl__dock", el), extra: AC.$(".ac-pl__extra", el),
      cta: AC.$(".ac-pl__cta", el), stage: AC.$(".ac-pl__stage", el), grid: AC.$(".ac-pl__grid", el), foot: AC.$(".ac-pl__foot", el),
      isDesktop: function () { return mq.matches; },
    };
    // the speaker button: sound on / off, saved with the learner's settings
    var snd = AC.$("[data-snd]", el);
    function sndSync() {
      var on = AC.sound.enabled();
      snd.innerHTML = on ? SND_ON : SND_OFF;
      snd.setAttribute("aria-pressed", on ? "false" : "true");
      snd.setAttribute("aria-label", AC.t(on ? "player.sound.mute" : "player.sound.unmute"));
      snd.title = AC.t(on ? "player.sound.mute" : "player.sound.unmute");
    }
    snd.addEventListener("click", function () { AC.sound.set(!AC.sound.enabled()); sndSync(); });
    sndSync();
    f.streak = function () { var s = AC.$("[data-streak]", el); if (s) s.textContent = AC.fmt.num(AC.progress.summary().streak); };
    f.setProgress = function (i, done) {
      AC.$$(".ac-pl__prog span", el).forEach(function (s, k) {
        var cls = k < i || (k === i && done) ? "is-done" : k === i ? "is-now" : "";
        if (o.count && k <= i) cls = k === i && s.className !== "is-done" ? "is-now" : "is-done";
        s.className = cls;
      });
      var p = AC.$(".ac-pl__prog", el); if (p) p.setAttribute("aria-valuenow", String(Math.max(0, Math.min(o.segments, i + (done || o.count ? 1 : 0)))));
      var c = AC.$("[data-count]", el); if (c) c.textContent = AC.t("player.count", { n: Math.max(1, Math.min(o.segments, i + 1)), total: o.segments });
    };
    f.setAside = function (t) { var a = AC.$("[data-aside]", el); if (a) a.textContent = t; };
    /** {label, sub, disabled, tone: "gold", arrow, stack (two-line, centred)} · a sub line turns the button into the two-line "Next lesson" pill */
    f.setCta = function (c) {
      var b = f.cta;
      b.disabled = !!c.disabled;
      b.className = "ac-btn ac-btn--primary ac-btn--lg ac-pl__cta" + (c.sub && !c.stack ? " ac-pl__cta--next" : "") + (c.stack ? " ac-pl__cta--stack" : "") + (c.tone ? " ac-pl__cta--" + c.tone : "");
      b.innerHTML = c.stack ? '<span class="ac-pl__cta-a">' + esc(c.label) + '</span><span class="ac-pl__cta-b">' + esc(c.sub || "") + "</span>"
        : c.sub ? '<span class="ac-pl__cta-txt"><b>' + esc(c.label) + "</b><span>" + esc(c.sub) + '</span></span><span class="ac-pl__cta-ico">' + ARROW + "</span>"
        : esc(c.label) + (c.arrow ? ARROW : "");
    };
    f.layout = function (name) { el.dataset.layout = name || ""; };
    /* Placement. Phones: one column, the sheet right under the card (or docked above the button), Rico's line in the dock.
       Desktop: [data-side] elements of the card move to the right-hand column, the sheet goes under them. */
    var sheetEl = null, bubbleEl = null, sideEl = null, sides = [];
    function place() {
      var desk = mq.matches;
      sides.forEach(function (s) { if (desk) f.side.appendChild(s.el); else if (s.ph.parentNode) s.ph.parentNode.insertBefore(s.el, s.ph.nextSibling); });
      if (sideEl) { if (desk && !sides.length) f.side.insertBefore(sideEl, f.side.firstChild); else sideEl.remove(); }
      if (bubbleEl) { if ((desk && sideEl) || (sheetEl && !desk)) bubbleEl.remove(); else if (bubbleEl.parentNode !== f.dock) f.dock.insertBefore(bubbleEl, f.dock.firstChild); }
      if (sheetEl) {
        if (desk) (o.sheetMain ? f.main : f.side).appendChild(sheetEl);
        else (o.sheetDock ? f.dock : f.main).appendChild(sheetEl);
      }
      f.foot.classList.toggle("has-sheet", !!(sheetEl && sheetEl.parentNode === f.dock));
      var has = desk && f.side.children.length > 0;
      f.side.hidden = !has; f.grid.classList.toggle("has-side", has);
    }
    f.place = place;
    f.placeSheet = function (s) { sheetEl = s; place(); };
    /** Phones, after an answer: scroll so the option you picked and the start of the feedback are both in view (the
        feedback refers to them). Feedback longer than the screen: its first lines, never past its top. */
    f.showAnswer = function () {
      if (!sheetEl || mq.matches) return;
      setTimeout(function () {
        var opt = AC.$(".ac-opt.is-wrong", f.main) || AC.$(".ac-opt.is-right", f.main);
        var topH = AC.$(".ac-pl__top", el).getBoundingClientRect().height, footH = f.foot.getBoundingClientRect().height;
        var y = window.scrollY, s = sheetEl.getBoundingClientRect();
        var sheetTop = y + s.top - topH - 12;
        var target = opt ? y + opt.getBoundingClientRect().top - topH - 12 : sheetTop;
        target = Math.max(target, y + s.top - (window.innerHeight - footH - 160));   // at least ~160px of the feedback showing
        target = Math.min(target, sheetTop);
        window.scrollTo({ top: Math.max(0, target), behavior: AC.reducedMotion() ? "auto" : "smooth" });
      }, 40);
    };
    /** Call after the card is in f.main: picks up its [data-side] parts and Rico's line (bubble: phones dock, side: desktop column). */
    f.setRico = function (bubble, side) {
      bubbleEl = bubble || null; sideEl = side || null;
      sides.forEach(function (s) { s.ph.remove(); });
      sides = AC.$$("[data-side]", f.main).map(function (x) { var ph = document.createComment(""); x.parentNode.insertBefore(ph, x); return { el: x, ph: ph }; });
      place();
    };
    f.clear = function () {
      el.classList.remove("is-sheetcta");   // set while a Challenge answer sheet carries the button; never outlives its screen
      f.main.innerHTML = ""; f.dock.innerHTML = ""; f.extra.innerHTML = "";
      sheetEl = null; bubbleEl = null; sideEl = null; sides = []; f.side.innerHTML = ""; f.side.hidden = true; f.grid.classList.remove("has-side"); f.foot.classList.remove("has-sheet");
      f.stage.scrollTop = 0; window.scrollTo(0, 0);
    };
    if (mq.addEventListener) mq.addEventListener("change", place); else if (mq.addListener) mq.addListener(place);
    if (o.streak) f.streak();

    /* Offline: Rico's feedback and completion poses are fetched now, so they still show if the connection drops.
       Leaving the player offline (a link or f.go) shows a note instead of the browser's error page. */
    POSES.forEach(function (p) { var im = new Image(); im.src = AC.rico(p); });
    try { var nr = AC.progress.summary().level.nextRank; if (nr) new Image().src = AC.rankLook(nr); } catch (e) {}
    f.offline = function () {
      if (navigator.onLine !== false) return false;
      var note = AC.$(".ac-pl__offline", el);
      if (!note) { note = AC.h('<p class="ac-pl__offline" role="alert"></p>'); f.foot.insertBefore(note, f.foot.firstChild); }
      note.textContent = AC.t("player.offline");
      return true;
    };
    f.go = function (href) { if (!f.offline()) location.href = href; };
    el.addEventListener("click", function (e) {
      var a = e.target.closest("a[href]");
      if (a && !a.target && f.offline()) e.preventDefault();
    });
    window.addEventListener("online", function () { var n = AC.$(".ac-pl__offline", el); if (n) n.remove(); });

    /* Keyboard: Esc leaves (same as the X); Enter presses the main button when focus is not on another control
       (or is on the option already picked); A–D / 1–4 pick an option of the current question (o.keys() → its controller). */
    document.addEventListener("keydown", function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
      var t = e.target, field = t.closest && t.closest("input, textarea, select, [contenteditable]");
      if (e.key === "Escape") {
        var pop = document.querySelector(".ac-pop");
        if (pop) { pop.remove(); return; }   // a glossary pop closes first
        if (!field) { e.preventDefault(); f.go(AC.$(".ac-pl__close", el).href); }
        return;
      }
      if (field) return;
      var ctl = o.keys ? o.keys() : null;
      if (e.key === "Enter") {
        var onPicked = t.closest && t.closest(".ac-opt.is-sel, .ac-opts.is-locked .ac-opt");
        if (t.closest && t.closest("button, a[href], summary") && !onPicked) return;
        var sheetBtn = el.classList.contains("is-sheetcta") ? AC.$(".ac-sheet__cta", el) : null, btn = sheetBtn || f.cta;
        if (btn && !btn.disabled && btn.textContent.trim()) { e.preventDefault(); btn.click(); }
        return;
      }
      if (e.shiftKey || !ctl || !ctl.pick || ctl.answered) return;
      var k = e.key.toUpperCase(), n = "ABCD".indexOf(k) >= 0 ? "ABCD".indexOf(k) : "1234".indexOf(k);
      if (k.length === 1 && n >= 0 && n < (ctl.optionCount || 2)) { e.preventDefault(); ctl.pick(n); }
    });
    /* Fit to screen (desktop, zoomed layouts): the design is drawn at 1.28× for a 1440×900 frame. On smaller windows
       (a 14" laptop leaves ~800px) the card scales down to fit the stage, never below 0.8×, never above 1.28×. */
    if (o.zoom) {
      var fitting = false;
      var fit = function () {
        if (fitting || !mq.matches) { el.style.removeProperty("--pl-z"); return; }
        fitting = true;
        el.style.setProperty("--pl-z", "1");
        var cs = getComputedStyle(f.stage);
        var availH = f.stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 8;
        var availW = f.stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        var h = Math.max(f.main.getBoundingClientRect().height, f.side.hidden ? 0 : f.side.getBoundingClientRect().height);
        var w = f.grid.scrollWidth;
        var z = Math.min(1.28, h ? availH / h : 1.28, w ? availW / w : 1.28);
        el.style.setProperty("--pl-z", String(Math.max(0.8, Math.round(z * 100) / 100)));
        fitting = false;
      };
      f.fit = fit;
      var queued = false;
      var queue = function () { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; fit(); }); };
      new MutationObserver(queue).observe(f.grid, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class"] });
      window.addEventListener("resize", queue);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
      queue();
    }
    return f;
  }
  /** The "not open yet" screen for a lesson or Challenge opened out of order (lk: AC.progress.lockReason()).
      No Rico: a neutral step icon, what to do first, and a button that goes there. */
  var STEPS = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19h5v-5h5V9h6"/><path d="M17 6l3 3-3 3"/></svg>';
  function locked(f, lk, chapterId, what) {
    var chs = AC.index().chapters, here = chs.filter(function (c) { return c.id === chapterId; })[0] || {};
    var lc = chs.filter(function (c) { return c.id === lk.chapter; })[0] || {};
    var li = -1; (lc.lessons || []).forEach(function (l, i) { if (l.id === lk.lesson) li = i; });
    var les = li >= 0 ? lc.lessons[li] : null;
    var key = lk.reason === "lesson" ? (what === "challenge" ? "challenge" : "lesson") : lk.reason;
    var v = { n: lc.n, m: here.n, lesson: les ? les.title : "" };
    var text = AC.t("player.lock." + key + ".text", v) + (les && lk.reason === "chapter" ? " " + AC.t("player.lock.upNext", v) : "");
    var go = les ? [AC.t("player.lock.cta.lesson", { n: li + 1, title: les.title }), AC.url("learn-to-trade/" + lk.chapter + "/" + les.id)]
      : lk.reason === "chapter" ? [AC.t("player.lock.cta.challenge", { n: lc.n }), AC.url("learn-to-trade/" + lk.chapter + "/challenge")]
      : [AC.t("player.lock.cta.path"), AC.url("learn-to-trade")];
    f.clear(); f.layout("gate");
    if (f.setAside) f.setAside("");
    f.main.innerHTML = '<div class="ac-gate"><span class="ac-gate__ico">' + STEPS + '</span><span class="ac-eb ac-tone--primary"><span class="ac-eb__label">' + esc(AC.t("player.lock.eyebrow")) + "</span></span>" +
      '<h1 class="ac-c__title">' + esc(AC.t("player.lock." + key + ".title", v)) + '</h1><p class="ac-c__text">' + esc(text) + "</p></div>";
    f.setCta({ label: go[0], arrow: true });
    f.cta.addEventListener("click", function () { f.go(go[1]); });
    f.extra.appendChild(ghost(AC.t("player.backChapter"), AC.url("learn-to-trade/" + chapterId)));
    var h = AC.$(".ac-c__title", f.main); h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true });
  }
  function ghost(label, href, onClick, arrow) {
    var inner = esc(label) + (arrow ? ARROW : "");
    var b = AC.h(href ? '<a class="ac-btn ac-btn--ghost ac-btn--lg" href="' + esc(href) + '">' + inner + "</a>" : '<button type="button" class="ac-btn ac-btn--ghost ac-btn--lg">' + inner + "</button>");
    if (onClick) b.addEventListener("click", onClick);
    return b;
  }
  /** Debug/preview query params for screenshots: ?card=N (0-based), ?state=right|wrong|open|done */
  function param(name) { var m = location.search.match(new RegExp("[?&]" + name + "=([^&#]*)")); return m ? decodeURIComponent(m[1]) : null; }
  /** Drive a controller into a state (screenshots, harness) */
  function drive(ctl, state) {
    if (!ctl || !state) return;
    if (state === "open") { if (ctl.openAll) ctl.openAll(); if (ctl.openDeeper) ctl.openDeeper(); return; }
    if (state !== "right" && state !== "wrong") return;
    var c = ctl.card || {}, wrong = state === "wrong";
    if (ctl.solve) { ctl.solve(wrong); return true; }
    if (ctl.pick) {
      var ans = c.options ? c.answer : (c.model && c.model.answer === "down" ? 1 : 0);
      if (ctl.answerIndex != null) ans = ctl.answerIndex;
      var w = param("pick");
      ctl.pick(wrong ? (w != null ? +w : ans === 0 ? 1 : 0) : ans);
      return true;
    }
  }

  var RENDER = { call: call, check: check, exercise: exercise, learn: learn, walkthrough: walkthrough, trap: trap, myth: myth, pro: pro, keep: keep };

  AC.cards = {
    TONE: TONE,
    render: function (card, ctx) { return (RENDER[card.type] || learn)(card, ctx || { mode: "lesson" }); },
    mcq: mcq,
    keepVisual: keepVisual,
    tipBox: tipBox,
    eyebrow: eyebrow,
    options: optionsHtml,
    bindOptions: bindOptions,
    revealOptions: revealOptions,
    sheet: sheet,
    bubble: bubble,
    rico: rico,
    title: title,
    para: para,
    paras: paras,
    frame: frame,
    ghost: ghost,
    locked: locked,
    param: param,
    drive: drive,
    ARROW: ARROW,
    /** Is this card a scored question? → its slot */
    slot: function (card) { return { call: "call", exercise: "exercise", check: "check" }[card.type] || null; },
    /** glossary term ids used by any text in a card list */
    terms: function (obj) { var out = {}; JSON.stringify(obj).replace(/\[\[([a-z0-9-]+)\|/g, function (m, id) { out[id] = 1; }); return Object.keys(out); },
  };
})();
