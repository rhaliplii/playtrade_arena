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

// Hero carousel: arrows, dots, swipe and a gentle autoplay
(() => {
  const track = document.getElementById("heroTrack");
  if (!track) return;
  const hero = track.closest(".hero");
  const slides = [...track.children];
  const dots = [...hero.querySelectorAll(".hero__dot")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const AUTOPLAY_MS = 7000;
  let current = 0;
  let timer = 0;

  const go = (i) => {
    current = (i + slides.length) % slides.length;
    track.style.transform = `translateX(${-100 * current}%)`;
    slides.forEach((s, idx) => {
      const on = idx === current;
      s.toggleAttribute("inert", !on); // keeps links in hidden slides out of the tab order
      s.setAttribute("aria-hidden", String(!on));
    });
    dots.forEach((d, idx) => {
      d.classList.toggle("is-active", idx === current);
      d.setAttribute("aria-selected", String(idx === current));
    });
  };

  const stop = () => clearInterval(timer);
  const start = () => {
    stop();
    if (!reduceMotion) timer = setInterval(() => go(current + 1), AUTOPLAY_MS);
  };
  const goAndRestart = (i) => { go(i); start(); };

  dots.forEach((d, i) => d.addEventListener("click", () => goAndRestart(i)));
  hero.querySelector(".hero__arrows button:not(.is-next)")?.addEventListener("click", () => goAndRestart(current - 1));
  hero.querySelector(".hero__arrows .is-next")?.addEventListener("click", () => goAndRestart(current + 1));

  // Pause while the pointer or keyboard focus is on the banner
  hero.addEventListener("mouseenter", stop);
  hero.addEventListener("mouseleave", start);
  hero.addEventListener("focusin", stop);
  hero.addEventListener("focusout", (e) => { if (!hero.contains(e.relatedTarget)) start(); });

  // Swipe on touch screens
  let x0 = null;
  track.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; stop(); }, { passive: true });
  track.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
    start();
  });

  go(0);
  start();
})();
