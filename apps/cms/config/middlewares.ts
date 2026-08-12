import type { Core } from "@strapi/strapi";

/**
 * The public site is static and served from another origin, so the browser
 * talks to this CMS cross-origin (lead form, FAQ assistant). Strapi's default
 * CORS allows every origin; now that one of those endpoints spends money per
 * call, the allow-list is worth being explicit about.
 *
 * `CORS_ORIGINS` is a comma-separated list. Empty falls back to "*", which is
 * what local development needs — locking it down there would break `bun run dev`
 * on whatever port Astro picks.
 */
const origins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const config: Core.Config.Middlewares = [
  "strapi::logger",
  "strapi::errors",
  "strapi::security",
  {
    name: "strapi::cors",
    config: { origin: origins.length > 0 ? origins : ["*"] },
  },
  "strapi::poweredBy",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];

export default config;
