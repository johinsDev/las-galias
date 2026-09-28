/**
 * Figures that count up the first time they scroll into view — the home's
 * indicators band and the same numbers on /nosotros.
 *
 * The HTML always carries the final value: this only rewinds a figure that is
 * still off screen, so without JavaScript — or with reduced motion — the page
 * reads exactly as the editor wrote it. `data-count-from` is where the count
 * starts (0 unless the markup says otherwise: "#1" climbs down from 10, since
 * 0 → 1 is not a count).
 *
 * Idempotent: re-runs on every astro:page-load (View Transitions).
 */
const DURATION = 1600;
const format = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

function animate(el: HTMLElement, from: number, to: number) {
  const start = performance.now();
  const tick = (now: number) => {
    const progress = Math.min(1, (now - start) / DURATION);
    // easeOutCubic: fast at first, settling into the final figure.
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = format.format(Math.round(from + (to - from) * eased));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function initCounters(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const pending = [
    ...document.querySelectorAll<HTMLElement>("[data-count-to]:not([data-count-bound])"),
  ];
  if (pending.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);
        animate(el, Number(el.dataset.countFrom ?? 0), Number(el.dataset.countTo));
      });
    },
    { threshold: 0.2 },
  );

  // Same rule as scripts/reveal.ts: read every box first, write after, and
  // leave alone whatever is already on screen — rewinding a painted figure
  // would be a visible flash.
  const viewport = window.innerHeight;
  const offScreen = pending.map((el) => {
    const box = el.getBoundingClientRect();
    return !(box.top < viewport && box.bottom > 0);
  });

  pending.forEach((el, i) => {
    el.dataset.countBound = "true";
    if (!offScreen[i]) return;
    el.textContent = format.format(Number(el.dataset.countFrom ?? 0));
    observer.observe(el);
  });
}
