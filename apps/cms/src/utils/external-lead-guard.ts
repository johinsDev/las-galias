import { createHash, timingSafeEqual } from "node:crypto";

/**
 * The checks a partner's request goes through before its lead is read
 * (`POST /api/leads/external/<slug>`).
 *
 * Pure on purpose — no Strapi, no request object — so each rule can be tested
 * with `node --test` (external-lead-guard.test.ts). The handler is the only
 * caller and decides which HTTP status each refusal becomes.
 */

/** One value per line, the way the admin's text area holds them. */
export function parseList(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** The key as the request carries it: `Authorization: Bearer <key>` or `X-Api-Key`. */
export function readApiKey(headers: {
  authorization?: string | null;
  apiKey?: string | null;
}): string | null {
  const bearer = /^Bearer\s+(.+)$/i.exec(headers.authorization?.trim() ?? "")?.[1]?.trim();
  return bearer || headers.apiKey?.trim() || null;
}

/**
 * Compared through a digest so both sides have the same length — which is what
 * `timingSafeEqual` demands — and the comparison tells nothing about how much
 * of a guess was right.
 */
export function keyMatches(given: string | null, expected: string | null | undefined): boolean {
  if (!given || !expected) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

const normalizeOrigin = (origin: string) => origin.trim().toLowerCase().replace(/\/+$/, "");

/**
 * A request without an `Origin` header is a server talking to a server, which
 * is what a partner integration is: the key and the IP list are its checks. One
 * that carries the header comes from a browser, and is only let in from an
 * origin on the list — so with an empty list no web page can use the key, even
 * one that got hold of it.
 */
export function originAllowed(origin: string | null | undefined, allowed: string[]): boolean {
  if (!origin) return true;
  return allowed.map(normalizeOrigin).includes(normalizeOrigin(origin));
}

/** Node reports an IPv4 peer on a dual-stack socket as `::ffff:1.2.3.4`. */
const normalizeIp = (ip: string) => ip.trim().replace(/^::ffff:/i, "");

/** An empty list accepts any address. Exact addresses only, no ranges. */
export function ipAllowed(ip: string | null | undefined, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  if (!ip) return false;
  return allowed.map(normalizeIp).includes(normalizeIp(ip));
}

/**
 * Sliding window per key, in memory: one CMS task, and losing the counters on
 * a restart only costs one extra window — the daily cap, which is counted in
 * the database, is the real ceiling.
 */
const hits = new Map<string, number[]>();

export function withinRate(
  key: string,
  limit: number,
  windowMs = 60_000,
  now = Date.now(),
): boolean {
  const live = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  if (live.length >= limit) {
    hits.set(key, live);
    return false;
  }
  live.push(now);
  hits.set(key, live);
  return true;
}

/**
 * Empty strings and nulls out before validating: a portal's form sends every
 * field it has, filled or not, and `email: ""` is "no email", not a bad one.
 */
export function dropEmpty(body: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(body).filter(
      ([, value]) => value !== null && !(typeof value === "string" && value.trim() === ""),
    ),
  );
}
