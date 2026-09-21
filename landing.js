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
})();