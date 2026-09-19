// Tabs: one active pill per group
document.querySelectorAll("[data-tabs]").forEach((group) => {
  group.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    group.querySelectorAll(".tab").forEach((t) => {
      const active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });
  });
});

// FAQ accordion: one open item per column
document.querySelectorAll("[data-accordion]").forEach((col) => {
  col.addEventListener("click", (e) => {
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
  });
});

// Hero slider dots and arrows
(() => {
  const dots = [...document.querySelectorAll(".hero__dot")];
  let current = 0;
  const go = (i) => {
    current = (i + dots.length) % dots.length;
    dots.forEach((d, idx) => d.classList.toggle("is-active", idx === current));
  };
  dots.forEach((d, i) => d.addEventListener("click", () => go(i)));
  document.querySelector(".hero__arrows button:not(.is-next)")?.addEventListener("click", () => go(current - 1));
  document.querySelector(".hero__arrows .is-next")?.addEventListener("click", () => go(current + 1));
})();
