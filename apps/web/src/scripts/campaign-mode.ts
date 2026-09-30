/**
 * Campaign mode: any page opened with `?campana=1` hides the header's
 * navigation and the footer's link columns, leaving the logo and the legal
 * links. Ads and mailings link to a project this way so the visitor has no
 * exit but the page (and its forms).
 *
 * The site is static, so the flag lives in the URL and is applied in the
 * browser: `html[data-campana]` is set before the first paint by the inline
 * script in Base.astro, and again here after every View Transitions swap. The
 * chrome hides with the `campana:` Tailwind variant (globals.css).
 *
 * Internal links get the parameter appended, so a click on a recommended
 * project or a legal document stays in campaign mode.
 */
export const CAMPAIGN_PARAM = "campana";

function isCampaign(): boolean {
  return new URLSearchParams(location.search).has(CAMPAIGN_PARAM);
}

export function applyCampaignFlag(): void {
  document.documentElement.toggleAttribute("data-campana", isCampaign());
}

export function propagateCampaignParam(): void {
  if (!isCampaign()) return;
  document.querySelectorAll<HTMLAnchorElement>("a[href^='/']").forEach((anchor) => {
    const href = anchor.getAttribute("href") ?? "";
    // "//cdn…" is another origin, not a path.
    if (href.startsWith("//")) return;
    const url = new URL(href, location.origin);
    if (url.searchParams.has(CAMPAIGN_PARAM)) return;
    url.searchParams.set(CAMPAIGN_PARAM, "1");
    anchor.setAttribute("href", `${url.pathname}${url.search}${url.hash}`);
  });
}

export function initCampaignMode(): void {
  applyCampaignFlag();
  propagateCampaignParam();
}
