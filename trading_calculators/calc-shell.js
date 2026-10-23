// Profit.com trading calculators — page shell. Loaded in <head>, before the shared nav.
//
// 1. Paths. The calculators live below the site root, but topnav.js and the footer write
//    root-relative URLs (assets/…, index.html). <html data-root="../../"> says how far up
//    the root is; we rewrite those URLs as they appear (topnav.js renders lazily).
// 2. Sign-up CTAs. Every [data-cta] link points at the sign-up route with
//    ?ref=calc-<page>-<placement>, and a click pushes
//    { event: "signup_cta_click", cta: "<ref>" } to the dataLayer (GTM picks it up).
// 3. The FAQ accordion (the platform .faq-item component).
// 4. Dropdowns. Every <select> in a calculator is drawn as the platform dropdown (the
//    language menu's panel: .lang-dd in styles.css); the native select stays underneath,
//    hidden, as the value the calculator reads and writes.
(() => {
  const ROOT = document.documentElement.dataset.root || "";
  // The prototype has no sign-up page yet: the free plan on the Plans page stands in.
  // Point this one constant at the real route when it exists.
  const SIGNUP = "landing.html";
  const SIGNUP_HASH = "#plans";

  // ---------------------------------------------------------------- paths
  const PAGE = /^[a-z0-9-]+\.html([#?].*)?$/i;
  const fixNode = (n) => {
    if (!ROOT || !n.getAttribute) return;
    const s = n.getAttribute("src");
    if (s && s.startsWith("assets/")) n.setAttribute("src", ROOT + s);
    const h = n.getAttribute("href");
    if (h && (h.startsWith("assets/") || h.startsWith("trading_calculators/") || h.startsWith("academy/") || PAGE.test(h))) {
      n.setAttribute("href", ROOT + h);
    }
  };
  const fix = (root) => {
    if (!root || root.nodeType !== 1) return;
    fixNode(root);
    root.querySelectorAll("[src],[href]").forEach(fixNode);
  };
  new MutationObserver((recs) => {
    for (const r of recs) {
      if (r.type === "attributes") fixNode(r.target);
      else r.addedNodes.forEach(fix);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "href"] });

  // ---------------------------------------------------------------- analytics
  const push = (o) => { (window.dataLayer = window.dataLayer || []).push(o); };
  window.CalcTrack = push;

  const pageId = () => document.body.dataset.calc || "hub";
  const ctaRef = (placement) => `calc-${pageId()}-${placement}`;
  const ctaHref = (ref) => `${ROOT}${SIGNUP}?ref=${encodeURIComponent(ref)}${SIGNUP_HASH}`;
  // exposed so a calculator can tag CTAs it renders itself (the one under the results)
  const member = () => document.body.dataset.user === "member";
  window.CalcCTA = { ref: ctaRef, href: ctaHref, member };

  // a CTA with data-member-href (the house ad's "Play free") takes signed-in users there instead
  const tagCtas = (root) => root.querySelectorAll("a[data-cta]").forEach((a) => {
    const ref = ctaRef(a.dataset.cta);
    a.dataset.ref = ref;
    a.setAttribute("href", member() && a.dataset.memberHref ? ROOT + a.dataset.memberHref : ctaHref(ref));
  });

  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[data-cta]");
    if (a) push({ event: "signup_cta_click", cta: a.dataset.ref || ctaRef(a.dataset.cta) });
  }, true);

  // ---------------------------------------------------------------- page ready
  // ---------------------------------------------------------------- dropdowns
  const TICK = '<svg class="c-dd__tick" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 6.3 12 13 4.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  let ddSeq = 0;
  function dropdown(sel) {
    const box = sel.closest(".fld__box");
    if (!box || box.classList.contains("has-dd")) return;
    const id = `c-dd${++ddSeq}`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "c-dd__btn";
    btn.id = `${sel.id || id}-btn`;
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", id);
    const panel = document.createElement("div");
    panel.className = "c-dd__panel";
    panel.id = id;
    panel.setAttribute("role", "listbox");
    panel.innerHTML = [...sel.options].map((o) => `<button type="button" class="c-dd__opt" role="option" data-v="${o.value.replace(/"/g, "&quot;")}" tabindex="-1"><span>${o.textContent}</span>${TICK}</button>`).join("");
    // the label now names the button; the select is kept for the value only
    const label = sel.id && document.querySelector(`label[for="${sel.id}"]`);
    if (label) label.htmlFor = btn.id; else btn.setAttribute("aria-label", sel.getAttribute("aria-label") || "Choose");
    sel.tabIndex = -1;
    sel.setAttribute("aria-hidden", "true");
    box.classList.add("has-dd");
    box.append(btn, panel);

    const opts = () => [...panel.querySelectorAll(".c-dd__opt")];
    const refresh = () => {
      const o = sel.options[sel.selectedIndex];
      btn.textContent = o ? o.textContent : "";
      opts().forEach((b) => { const on = b.dataset.v === sel.value; b.classList.toggle("is-on", on); b.setAttribute("aria-selected", String(on)); });
    };
    // the calculator sets select.value directly (URL state, reset): redraw when it does
    const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    Object.defineProperty(sel, "value", { configurable: true, get() { return desc.get.call(this); }, set(v) { desc.set.call(this, v); refresh(); } });

    const open = (focusOn) => {
      document.querySelectorAll(".fld__box.is-open").forEach((b) => b !== box && b.closeDd && b.closeDd());
      // the calculator card clips its overflow, so the panel is placed against the window:
      // below the field, or above it when there isn't room
      const r = box.getBoundingClientRect(), h = Math.min(panel.scrollHeight, 340), below = innerHeight - r.bottom - 12;
      panel.style.minWidth = `${r.width}px`;
      panel.style.top = `${below >= h || below >= r.top ? r.bottom + 8 : Math.max(8, r.top - 8 - h)}px`;
      panel.style.left = box.closest(".calc-tool__actions") ? `${Math.max(8, r.right - Math.max(panel.offsetWidth, r.width))}px` : `${r.left}px`;
      box.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      const target = focusOn === "last" ? opts().at(-1) : opts().find((b) => b.classList.contains("is-on")) || opts()[0];
      target && target.focus();
    };
    const close = (refocus) => {
      if (!box.classList.contains("is-open")) return;
      box.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      if (refocus) btn.focus();
    };
    box.closeDd = close;
    const choose = (v) => {
      if (v !== sel.value) { sel.value = v; sel.dispatchEvent(new Event("change", { bubbles: true })); }
      close(true);
    };
    btn.addEventListener("click", () => (box.classList.contains("is-open") ? close(true) : open()));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(e.key === "ArrowUp" ? "last" : null); }
    });
    panel.addEventListener("click", (e) => { const b = e.target.closest(".c-dd__opt"); if (b) choose(b.dataset.v); });
    panel.addEventListener("keydown", (e) => {
      const all = opts(), n = all.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); all[(n + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length].focus(); }
      else if (e.key === "Home" || e.key === "End") { e.preventDefault(); (e.key === "Home" ? all[0] : all.at(-1)).focus(); }
      else if (e.key === "Escape") { e.preventDefault(); close(true); }
      else if (e.key === "Tab") close(false);
    });
    document.addEventListener("pointerdown", (e) => { if (!box.contains(e.target)) close(false); });
    addEventListener("scroll", () => close(false), { passive: true });
    addEventListener("resize", () => close(false));
    refresh();
  }

  document.addEventListener("DOMContentLoaded", () => {
    fix(document.documentElement);
    tagCtas(document);
    // signed out: topnav.js (which builds on DOMContentLoaded too, after this handler) adds
    // "Log in" and a CTA; once it has, make that "Get Started" CTA a tracked sign-up button
    setTimeout(() => {
      const head = document.body.dataset.user === "guest" && document.querySelector(".topnav__cta");
      if (head) { head.dataset.cta = "header"; tagCtas(document.querySelector(".topnav")); }
    }, 0);

    document.querySelectorAll(".calc-tool select").forEach(dropdown);

    // mobile chip row: bring the current calculator's chip into view without moving the page
    // (centred where it can be; run again once fonts have set the chip widths)
    const centreChip = () => document.querySelectorAll("[data-chips]").forEach((row) => {
      const on = row.querySelector(".is-active");
      if (on) row.scrollLeft = on.offsetLeft + on.offsetWidth / 2 - row.clientWidth / 2;
    });
    centreChip();
    window.addEventListener("load", centreChip, { once: true });

    // "More trading calculators" carousel: edge fades and arrows follow the scroll position
    document.querySelectorAll("[data-carousel]").forEach((wrap) => {
      const row = wrap.querySelector(".calc-more__row");
      const prev = wrap.querySelector(".calc-more__nav--prev"), next = wrap.querySelector(".calc-more__nav--next");
      const update = () => {
        const max = row.scrollWidth - row.clientWidth;
        const start = row.scrollLeft <= 2, end = row.scrollLeft >= max - 2;
        wrap.classList.toggle("at-start", start);
        wrap.classList.toggle("at-end", end);
        prev.hidden = start; next.hidden = end;
      };
      const step = () => {
        const card = row.querySelector(".hub-card");
        return card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(row).columnGap || 16) : row.clientWidth;
      };
      prev.addEventListener("click", () => row.scrollBy({ left: -step(), behavior: "smooth" }));
      next.addEventListener("click", () => row.scrollBy({ left: step(), behavior: "smooth" }));
      row.addEventListener("scroll", update, { passive: true });
      addEventListener("resize", update);
      update();
    });

    // FAQ accordion: the platform component's behaviour (script.js) — one open per column
    document.querySelectorAll("[data-accordion]").forEach((col) => col.addEventListener("click", (e) => {
      const q = e.target.closest(".faq-item__q");
      if (!q) return;
      const item = q.parentElement;
      const open = !item.classList.contains("is-open");
      col.querySelectorAll(".faq-item").forEach((i) => {
        i.classList.remove("is-open");
        i.querySelector(".faq-item__q").setAttribute("aria-expanded", "false");
      });
      item.classList.toggle("is-open", open);
      q.setAttribute("aria-expanded", String(open));
    }));

  });
})();
