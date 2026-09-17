import type { ClientDirective } from "astro";

/**
 * `client:interact`: hydrate a small island the moment the visitor shows
 * interest in it — hover, focus or a finger landing on it — and, if a click
 * arrives before the JS has, remember it so the component opens itself on mount.
 *
 * Used by the share menu: a button that is above the fold on every project page
 * and would otherwise drag React + Base UI in with `client:idle`.
 */
const interact: ClientDirective = (load, _options, element) => {
  const WARM = ["pointerenter", "focusin", "touchstart"] as const;
  let started = false;
  const hydrate = async () => {
    if (started) return;
    started = true;
    WARM.forEach((type) => element.removeEventListener(type, hydrate, true));
    const run = await load();
    await run();
  };

  WARM.forEach((type) => element.addEventListener(type, hydrate, { capture: true, passive: true }));
  element.addEventListener(
    "click",
    (event) => {
      if (element.hasAttribute("ssr") === false) return; // already hydrated
      event.preventDefault();
      document.documentElement.dataset.lgOpenShare = "1";
      void hydrate();
    },
    { capture: true },
  );
};

export default interact;
