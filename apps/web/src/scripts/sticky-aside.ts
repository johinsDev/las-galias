/**
 * Two-way sticky for an aside that can be taller than the viewport
 * (`[data-sticky-aside]`, the project page's lead form).
 *
 * Plain `position: sticky; top` pins the top of the aside under the header and
 * leaves whatever does not fit below the fold unreachable: the form is ~830px
 * and a laptop has ~690px free, so the submit button never came into view.
 * Here the CSS still does the sticking; this only moves the `top` it sticks
 * to. Scrolling down lowers `top` by the distance scrolled, so the aside
 * travels with the page until its bottom edge reaches the bottom of the
 * viewport and holds there; scrolling up raises it back until the top clears
 * the header. When the aside fits, both limits are the same value and it is
 * an ordinary sticky.
 *
 * Idempotent: re-runs on every astro:page-load (View Transitions).
 */
const BOTTOM_GAP = 24;

let aside: HTMLElement | null = null;
let observer: ResizeObserver | null = null;
/** The `top` the stylesheet asks for: the header clearance. */
let baseTop = 0;
let height = 0;
/** Null until the first measure, which starts it at `baseTop`. */
let top: number | null = null;
let lastY = 0;
let listening = false;

function lowestTop(): number {
  return Math.min(baseTop, window.innerHeight - height - BOTTOM_GAP);
}

function apply(next: number): void {
  if (!aside) return;
  top = Math.max(lowestTop(), Math.min(baseTop, next));
  aside.style.top = `${top}px`;
}

function measure(): void {
  if (!aside) return;
  // The stylesheet's own value, which changes with the breakpoint.
  aside.style.top = "";
  const styles = getComputedStyle(aside);
  if (styles.position !== "sticky") {
    // Below `lg` the aside is in the flow and there is nothing to move.
    baseTop = height = 0;
    return;
  }
  baseTop = parseFloat(styles.top) || 0;
  height = aside.offsetHeight;
  apply(top ?? baseTop);
}

function onScroll(): void {
  const y = window.scrollY;
  const delta = y - lastY;
  lastY = y;
  if (!aside || height === 0 || top === null) return;
  apply(top - delta);
}

export function initStickyAside(): void {
  const found = document.querySelector<HTMLElement>("[data-sticky-aside]");
  if (found === aside) return;

  observer?.disconnect();
  aside = found;
  if (!aside) return;

  top = null;
  lastY = window.scrollY;
  // The form grows when it shows validation errors, and the limits with it.
  observer = new ResizeObserver(measure);
  observer.observe(aside);

  if (listening) return;
  listening = true;
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
}
