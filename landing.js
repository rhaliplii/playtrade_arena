// Landing page (Figma: Landing, node 14013:14828)
(() => {
  // ---- Comparison table: Profit.com, Bloomberg, Yahoo Finance, TradingView, Investing.com, Finviz, Koyfin
  const ROWS = [
    ["Market Screeners", "1111111"],
    ["Advanced Charts", "1111111"],
    ["Custom Watchlists", "1111111"],
    ["Price Alerts", "1111101"],
    ["Billionaire & Insider Tracking", "1000100"],
    ["AI Market Brief", "1000000"],
    ["Simulated Trading Tournaments", "1001000"],
  ];
  const body = document.querySelector("#compareTable tbody");
  if (body) {
    body.innerHTML = ROWS.map(([label, marks]) => {
      const cells = [...marks].map((m, i) => {
        if (m === "0") return '<td><img class="lp-x" src="assets/lp-cmp-x2.svg" alt="No"></td>';
        return `<td><img src="assets/${i === 0 ? "lp-cmp-check.svg" : "lp-cmp-check-grey.svg"}" alt="Yes"></td>`;
      });
      return `<tr><th scope="row">${label.replace("&", "&amp;")}</th>${cells.join("")}</tr>`;
    }).join("");
  }

  // ---- Monthly / yearly billing switch
  const sw = document.querySelector(".lp-switch");
  const plans = document.getElementById("plans");
  if (sw && plans) {
    const set = (yearly) => {
      sw.setAttribute("aria-checked", String(yearly));
      sw.setAttribute("aria-label", yearly ? "Bill yearly" : "Bill monthly");
      plans.classList.toggle("is-monthly", !yearly);
    };
    sw.addEventListener("click", () => set(sw.getAttribute("aria-checked") !== "true"));
    plans.querySelectorAll(".lp-billing__opt").forEach((el) =>
      el.addEventListener("click", () => set(el.dataset.opt === "yearly"))
    );
  }
  // ---- Footer: a current year, and columns that fold on phones
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  const foldCols = () => {
    const fold = window.matchMedia("(max-width: 600px)").matches;
    // Without JS the sections stay open, which is the safe default; here we collapse them
    // so the footer is a short scroll on a phone.
    document.querySelectorAll(".pf-col:not(.pf-col--app)").forEach((c) => {
      if (fold && !c.dataset.touched) c.removeAttribute("open");
      if (!fold) c.setAttribute("open", "");
      // Off a phone the headings are not controls, so they stay out of the tab order
      const s = c.querySelector("summary");
      if (s) s.tabIndex = fold ? 0 : -1;
    });
  };
  document.querySelectorAll(".pf-col > summary").forEach((s) =>
    s.addEventListener("click", () => (s.parentElement.dataset.touched = "1"))
  );
  foldCols();
  addEventListener("resize", foldCols);

  // The footer language control is a menu, and it changes the language through the top
  // navigation's own options, so there is one source of truth.
  const langWrap = document.querySelector(".pf-lang");
  if (langWrap) {
    const LANGS = [["en", "English", "EN"], ["es", "Español", "ES"], ["fr", "Français", "FR"]];
    const btn = langWrap.querySelector(".pf-footer__lang");
    const panel = langWrap.querySelector(".pf-lang__panel");
    const read = () => { try { return localStorage.getItem("pt_lang") || "en"; } catch { return "en"; } };
    const tick = '<svg class="lang-dd__tick" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 6.3 12 13 4.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const render = () => {
      const cur = read();
      panel.innerHTML = LANGS.map(([code, label, short]) =>
        `<button class="lang-dd__opt${code === cur ? " is-on" : ""}" type="button" role="menuitemradio" aria-checked="${code === cur}" data-footer-lang="${code}"><span class="lang-dd__short">${short}</span>${label}${tick}</button>`).join("");
      const [, label, short] = LANGS.find((l) => l[0] === cur) || LANGS[0];
      btn.querySelector("[data-lang-value]").textContent = short; // the bar is tight: the code, not the name
      btn.setAttribute("aria-label", `Language: ${label}`);
    };
    const open = (on) => {
      langWrap.classList.toggle("is-open", on);
      btn.setAttribute("aria-expanded", String(on));
    };
    btn.addEventListener("click", (e) => { e.stopPropagation(); open(!langWrap.classList.contains("is-open")); });
    panel.addEventListener("click", (e) => {
      const opt = e.target.closest("[data-footer-lang]");
      if (!opt) return;
      const code = opt.dataset.footerLang;
      const navOpt = document.querySelector(`[data-lang-opt="${code}"]`);
      if (navOpt) navOpt.click(); // lets topnav.js store it and update every other control
      else { try { localStorage.setItem("pt_lang", code); } catch { /* storage unavailable */ } }
      render();
      open(false);
    });
    document.addEventListener("click", (e) => { if (!langWrap.contains(e.target)) open(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") open(false); });
    render();
  }
})();