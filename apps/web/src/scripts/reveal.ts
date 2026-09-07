import { animate, inView } from "motion";

/**
 * Scroll reveals with motion (vanilla API, ~5kb): any element with
 * [data-reveal] fades and rises into view when it enters the viewport.
 * Idempotent: re-runs on every astro:page-load (View Transitions).
 *
 * Anything already on screen when the page loads is left alone. Hiding it and
 * animating it back was a visible flash — the browser had already painted it,
 * and only then did this script set `opacity: 0`. Above the fold there is no
 * "entrance" to play anyway; the reader is looking at it.
 */
export function initReveals(): void {
  document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-reveal-bound])").forEach((el) => {
    el.dataset.revealBound = "true";

    const box = el.getBoundingClientRect();
    const onScreen = box.top < window.innerHeight && box.bottom > 0;
    if (onScreen) return;

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
