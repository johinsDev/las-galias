import { createHash } from "node:crypto";

import type { Core } from "@strapi/strapi";

import { QUESTION_UID } from "./faq-bot-context";

/**
 * Spend brakes for the assistant.
 *
 * The endpoint is public and unauthenticated, and every call that reaches the
 * model costs money — without these it is a tap anyone can leave running. Two
 * independent limits, because they stop different things: the per-IP one stops
 * a single visitor hammering it, and the daily cap bounds what a distributed
 * flood can cost in one day.
 */

/** Per-IP counters. In memory on purpose: one CMS task, and losing them on a
 *  restart only costs one extra window. The daily cap is the real ceiling. */
const hits = new Map<string, number[]>();

/** Keeps the map from growing forever on a long-lived container. */
function sweep(now: number, windowMs: number): void {
  for (const [ip, times] of hits) {
    const live = times.filter((t) => now - t < windowMs);
    if (live.length === 0) hits.delete(ip);
    else hits.set(ip, live);
  }
}

export function rateLimit(ip: string, perHour: number): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  if (hits.size > 5000) sweep(now, windowMs);

  const times = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (times.length >= perHour) {
    hits.set(ip, times);
    return false;
  }
  times.push(now);
  hits.set(ip, times);
  return true;
}

/**
 * A ceiling on paid answers per minute across EVERYONE, on top of the per-IP one.
 *
 * The per-IP limit assumes an abuser keeps the same IP, and a bot net does not:
 * rotating addresses walks straight past it and only stops at the daily cap,
 * having spent the whole day's budget in a couple of minutes. This spreads that
 * budget out, so a flood degrades into the fallback message instead of burning
 * the day before a human notices.
 *
 * Not editable from the admin on purpose: 30 real visitors asking in the same
 * minute is already far beyond this site's traffic, so the only thing an editor
 * could do with the knob is disable the protection.
 */
const BURST_PER_MINUTE = 30;
let burst: number[] = [];

export function burstOk(): boolean {
  const now = Date.now();
  burst = burst.filter((t) => now - t < 60_000);
  if (burst.length >= BURST_PER_MINUTE) return false;
  burst.push(now);
  return true;
}

/** Model calls made today. Cached answers do not count — they cost nothing. */
export async function spentToday(strapi: Core.Strapi): Promise<number> {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  return strapi.documents(QUESTION_UID).count({
    filters: { wasCached: false, askedAt: { $gte: midnight.toISOString() } },
  });
}

/**
 * Cache key for a question. Normalising by lowercasing, stripping accents and
 * punctuation and collapsing whitespace is what makes "¿Cuánto es la cuota
 * inicial?" and "cuanto es la cuota inicial" a single paid answer.
 */
export function cacheKeyFor(question: string): string {
  const normalized = question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

/**
 * A previous answer to the same question, if the context has not been rebuilt
 * since. Answers are dropped when they are older than the content they were
 * based on, so a price change never gets served from cache.
 */
export async function cachedAnswer(
  strapi: Core.Strapi,
  cacheKey: string,
  notBefore: number,
): Promise<string | null> {
  const [hit] = await strapi.documents(QUESTION_UID).findMany({
    filters: { cacheKey, wasCached: false, answer: { $notNull: true } },
    sort: "askedAt:desc",
    limit: 1,
  });
  if (!hit?.answer) return null;
  const askedAt = hit.askedAt ? new Date(hit.askedAt).getTime() : 0;
  return askedAt >= notBefore ? hit.answer : null;
}
