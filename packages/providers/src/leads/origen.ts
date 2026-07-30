import type { LeadAttribution } from "./types";

/**
 * `/SalaVentas/OrigenesInformacion` ids, verified against the instance.
 * The sales room filters its funnel by these, so a lead that arrived through a
 * paid campaign must not look like organic traffic.
 */
const ORIGEN = {
  web: 1,
  facebookAds: 13,
  googleAds: 14,
} as const;

const GOOGLE_SOURCES = new Set(["google", "googleads", "google_ads", "adwords", "youtube"]);
const META_SOURCES = new Set(["facebook", "fb", "meta", "instagram", "ig"]);
/** Mediums that mean the visit was *not* paid, whatever the source says. */
const UNPAID_MEDIUMS = new Set(["organic", "referral", "email", "none", "(none)", "social"]);

/**
 * Traffic source → `origenInformacion`. Default "Web"; paid traffic split into
 * Google and Meta.
 *
 * A recognised `utm_source` is treated as paid unless the medium says otherwise:
 * organic visits do not normally carry UTM tags, so `utm_source=google` in
 * practice means a tagged campaign.
 */
export function resolveOrigenInformacion(attribution?: LeadAttribution): number {
  const source = attribution?.source?.trim().toLowerCase() ?? "";
  const medium = attribution?.medium?.trim().toLowerCase() ?? "";
  if (!source || UNPAID_MEDIUMS.has(medium)) return ORIGEN.web;
  if (GOOGLE_SOURCES.has(source)) return ORIGEN.googleAds;
  if (META_SOURCES.has(source)) return ORIGEN.facebookAds;
  return ORIGEN.web;
}
