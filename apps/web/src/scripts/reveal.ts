import { animate, inView } from "motion";

/**
 * Scroll reveals con motion (API vanilla, ~5kb): cualquier elemento con
 * [data-reveal] aparece con fade + rise al entrar al viewport.
 * Idempotente: se re-ejecuta en cada astro:page-load (View Transitions).
 */
export function initReveals(): void {
  document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-reveal-bound])").forEach((el) => {
    el.dataset.revealBound = "true";
    el.style.opacity = "0";
    inView(
      el,
      () => {
        animate(
          el,
          { opacity: [0, 1], transform: ["translateY(24px)", "translateY(0px)"] },
          { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
        );
      },
      { amount: 0.2 },
    );
  });
}
