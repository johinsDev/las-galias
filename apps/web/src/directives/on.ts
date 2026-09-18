import type { ClientDirective } from "astro";

/**
 * `client:on="<event>"`: hydrate when that custom event first fires on
 * `document`, and hand the component the event it missed. For islands that
 * paint nothing until asked — a modal opened from many plain-markup buttons —
 * so React never loads on a page where nobody clicks.
 *
 * The event that triggers hydration happens before the component exists, so
 * its type and detail are parked on `<html>`; the component reads and clears
 * them on mount, then listens for the next ones itself.
 */
const on: ClientDirective = (load, options) => {
  const type = typeof options.value === "string" ? options.value : "";
  if (!type) return;

  const hydrate = async (event: Event) => {
    document.removeEventListener(type, hydrate);
    document.documentElement.dataset.lgPendingEvent = JSON.stringify({
      type,
      detail: (event as CustomEvent).detail ?? null,
    });
    const run = await load();
    await run();
  };

  document.addEventListener(type, hydrate);
};

export default on;
