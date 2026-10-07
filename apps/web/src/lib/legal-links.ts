/**
 * Where a legal document lives. Almost all of them are /legales/<slug>; the
 * ones listed here have an address of their own, and their /legales URL is a
 * 301 to it (`ROUTE_REDIRECTS` in redirects.ts — keep the two in step).
 */
const OWN_ADDRESS: Record<string, string> = {
  "tips-para-comprar": "/tips-para-comprar",
};

export function hasOwnAddress(slug: string): boolean {
  return slug in OWN_ADDRESS;
}

export function legalDocumentHref(slug: string): string {
  return OWN_ADDRESS[slug] ?? `/legales/${slug}`;
}
