// In-browser behaviour checks for one calculator page. tests/e2e.sh injects this file into
// a copy of each built page; it drives the real DOM and reports back with postMessage.
(() => {
  const out = [];
  const ok = (name, cond, info = "") => out.push({ name, ok: !!cond, info: cond ? "" : String(info) });
  const $ = (s) => document.querySelector(s);
  const type = (sel, v) => { const el = $(sel); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); };
  // the headline result: the big figure, or position size's "Buy 125 shares"
  const big = () => { const e = $(".res-big") || $(".ps-head"); return e ? e.textContent.trim() : ""; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const page = document.body.dataset.calc;

  const run = async () => {
    await wait(300);
    const before = big();
    ok("renders a result on load", before && before !== "—", `got "${before}"`);
    ok("no NaN or Infinity on the page", !/NaN|Infinity/.test(document.body.innerText), "found NaN/Infinity");

    // header CTA: real sign-up route with the ref, and a dataLayer push on click
    const head = $(".topnav [data-cta]");
    ok("header CTA has ref", head && head.href.includes(`ref=calc-${page}-header`), head && head.href);
    window.dataLayer = [];
    head.addEventListener("click", (e) => e.preventDefault(), { once: true });
    head.click();
    ok("header CTA pushes signup_cta_click", dataLayer.some((d) => d.event === "signup_cta_click" && d.cta === `calc-${page}-header`), JSON.stringify(dataLayer));
    ok("article tip present, no sign-up prompt in the article", !!document.querySelector(".calc-article .calc-tip") && !document.querySelector('.calc-article a[data-cta]'));

    // live update: change the first numeric field and the headline result changes
    // the first plain field that drives the result (row editors store several values under one key)
    const first = [...document.querySelectorAll(".calc-form input[inputmode=decimal][data-k]")].find((i) => i.value && !i.closest("[hidden]") && i.dataset.k !== "und");
    const old = first.value;
    type(`#${first.id}`, String(Number(old) * 2 || 7));
    await wait(50);
    ok("result updates as you type", big() !== before, `still "${big()}" after ${first.id}=${first.value}`);

    // URL state: the change is in the query string after the debounce
    await wait(250);
    const key = first.dataset.k;
    ok("input is stored in the URL", new URLSearchParams(location.search).get(key) === first.value, location.search);

    // currency selector changes the symbol
    const cur = $("#in-cur");
    cur.value = "EUR"; cur.dispatchEvent(new Event("change", { bubbles: true }));
    await wait(50);
    ok("currency selector switches to €", /€/.test($(".calc-out").innerText) || /€/.test(big()), $(".calc-out").innerText.slice(0, 80));

    // empty a required field → a clear message, never NaN
    type(`#${first.id}`, "");
    await wait(50);
    ok("empty input shows a message", $(".res-empty") !== null, $(".calc-out").innerText.slice(0, 80));
    ok("empty input never shows NaN", !/NaN|Infinity/.test($(".calc-out").innerText));
    type(`#${first.id}`, "-5");
    await wait(50);
    ok("negative input flagged on the field", document.querySelector(".fld.is-invalid") !== null);

    // reset restores the defaults
    $("[data-reset]").click();
    await wait(50);
    ok("reset restores the default result", big() === before, `"${big()}" vs "${before}"`);
    await wait(250);
    ok("reset clears the URL", location.search === "", location.search);

    // keyboard: arrow keys move a toggle
    const seg = document.querySelector(".calc-form .seg .tab.is-active");
    if (seg) {
      seg.focus();
      seg.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      await wait(30);
      ok("arrow keys move a toggle", document.activeElement !== seg && document.activeElement.classList.contains("is-active"));
    }

    // accessibility basics: every visible input and dropdown has a label (a select drawn as the
    // platform dropdown is hidden; its button carries the label)
    const unlabelled = [...document.querySelectorAll(".calc-form input, .calc-form select, .calc-tool .c-dd__btn, #in-cur")].filter((i) => !i.closest("[hidden]") && i.getAttribute("aria-hidden") !== "true" && i.type !== "hidden")
      .filter((i) => !(i.id && document.querySelector(`label[for="${i.id}"]`)) && !i.getAttribute("aria-label"));
    ok("every input has a label", unlabelled.length === 0, unlabelled.map((i) => i.id || i.outerHTML.slice(0, 40)).join(", "));
    const nonDecimal = [...document.querySelectorAll(".calc-form input[type=text]")].filter((i) => i.dataset.k !== "coin" && i.inputMode !== "decimal");
    ok("numeric inputs use inputmode=decimal", nonDecimal.length === 0, nonDecimal.map((i) => i.id).join(", "));

    // SEO basics
    ok("has canonical", !!document.querySelector('link[rel=canonical]'));
    const types = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)["@type"]);
    ok("JSON-LD WebApplication + BreadcrumbList + FAQPage", ["WebApplication", "BreadcrumbList", "FAQPage"].every((t) => types.includes(t)), types.join(","));
    ok("no email box; one ad slot (the rail)", !document.querySelector(".mail") && document.querySelectorAll(".ad-slot").length === 1);
    const adCta = $(".calc-rail a[data-cta]");
    ok("ad slot: Playtrade house ad, tagged sign-up link", adCta && /Play free/.test(adCta.textContent) && adCta.href.includes(`ref=calc-${page}-adslot`), adCta && adCta.href);
    ok("calculator nav: hub + 5 calculators, current one marked", document.querySelectorAll(".calc-nav .side-nav__item").length === 6 && document.querySelectorAll(".calc-chip").length === 6
      && new URL(".", document.querySelector(".calc-nav [aria-current]").href).pathname === new URL(".", location.href).pathname, document.querySelector(".calc-nav [aria-current]")?.href);
    ok("no sign-up prompt inside the calculator", !document.querySelector(".calc-tool [data-cta], .res-cta"));
    ok("disclaimer present", /For education and planning only, not investment advice\./.test(document.body.innerText));
    ok("no broker or trade-button wording in the page body", !/open an account with|deposit bonus|buy now|trade now/i.test($("main").innerText));

    parent.postMessage(JSON.stringify({ page, results: out }), "*");
  };
  addEventListener("load", () => run().catch((e) => parent.postMessage(JSON.stringify({ page, results: [{ name: "crashed", ok: false, info: e.message }] }), "*")));
})();
