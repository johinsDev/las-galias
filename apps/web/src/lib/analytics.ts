/**
 * Conversion events, sent two ways at once: pushed to the GTM `dataLayer`
 * (the container maps them to whatever tags marketing sets up) and, when the
 * Meta pixel the container loads is already on the page, fired on `fbq`
 * directly with the standard event name, so Meta gets Lead / Contact /
 * ViewContent without anyone editing the container.
 *
 * GTM loads late on purpose (first gesture or ten seconds after load, see
 * Base.astro), so `fbq` is often missing when a page view fires. That is fine:
 * GTM replays the `dataLayer` it finds when it boots, so nothing pushed before
 * it arrived is lost; only the direct `fbq` call is skipped.
 */
type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
  }
}

/** Standard Meta events the site uses. */
export type MetaEvent = "Lead" | "Contact" | "ViewContent" | "Subscribe" | "Search";

export function track(event: string, meta: MetaEvent | null, params: Params = {}): void {
  if (typeof window === "undefined") return;
  const clean: Params = {};
  for (const [key, value] of Object.entries(params)) if (value !== undefined) clean[key] = value;

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...clean });
  if (meta && typeof window.fbq === "function") window.fbq("track", meta, clean);
}
