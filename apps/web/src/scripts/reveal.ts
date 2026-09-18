/**
 * Scroll reveals: any element with [data-reveal] fades and rises into view when
 * it enters the viewport. Pure CSS transition driven by an IntersectionObserver
 * (`.reveal-out` / `.reveal-in` in globals.css) — it used to import `motion`,
 * 23 KB gz on every page for a single opacity/translate tween.
 *
 * Idempotent: re-runs on every astro:page-load (View Transitions).
 *
 * Anything already on screen when the page loads is left alone. Hiding it and
 * animating it back was a visible flash — the browser had already painted it,
 * and only then did this script set `opacity: 0`. Above the fold there is no
 * "entrance" to play anyway; the reader is looking at it.
 */
export function initReveals(): void {
  const pending = [
    ...document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-reveal-bound])"),
  ];
  if (pending.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        el.classList.remove("reveal-out");
        el.classList.add("reveal-in");
        observer.unobserve(el);
      });
    },
    { threshold: 0.2 },
  );

  // Measure everything first, then write: a read after a class change forces
  // the browser to lay the page out again for every single element (PageSpeed
  // reported it as a forced reflow on the 30-card listing).
  const viewport = window.innerHeight;
  const offScreen = pending.map((el) => {
    const box = el.getBoundingClientRect();
    return !(box.top < viewport && box.bottom > 0);
  });

  pending.forEach((el, i) => {
    el.dataset.revealBound = "true";
    if (!offScreen[i]) return;
    el.classList.add("reveal-out");
    observer.observe(el);
  });
}
