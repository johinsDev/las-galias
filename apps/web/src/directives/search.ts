import type { ClientDirective } from "astro";

/**
 * `client:search`: the header's command palette hydrates only when someone asks
 * for it — a click on a `[data-open-search]` trigger (which dispatches
 * `lg:open-search`) or ⌘K / Ctrl+K.
 *
 * With `client:load` the palette (a closed dialog that paints nothing) pulled
 * React, react-dom and Base UI's combobox into the critical path of every page.
 * The flag on `<html>` tells the component, once mounted, that it owes the
 * visitor an open panel: hydration happens inside React's `startTransition`, so
 * the event that triggered it is long gone by the time the effects run.
 */
const search: ClientDirective = (load) => {
  let started = false;
  const hydrate = async () => {
    if (started) return;
    started = true;
    document.documentElement.dataset.lgOpenSearch = "1";
    const run = await load();
    await run();
  };

  document.addEventListener("lg:open-search", hydrate, { once: true });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      void hydrate();
    }
  });
};

export default search;
