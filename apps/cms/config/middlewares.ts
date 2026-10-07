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

/**
 * The admin's own Content-Security-Policy only lets images load from the CMS
 * itself, and the uploads live in S3: every thumbnail in the Media Library and
 * in a form's image field came out as a broken image with its file name. The
 * bucket's two hostnames (with and without the region) are added to the image
 * and media sources. Without a bucket — local dev, uploads on disk — Strapi's
 * defaults already cover it.
 */
const bucket = process.env.UPLOADS_BUCKET ?? "";
const region = process.env.AWS_REGION ?? "us-east-1";
const uploadHosts = bucket
  ? [`https://${bucket}.s3.${region}.amazonaws.com`, `https://${bucket}.s3.amazonaws.com`]
  : [];

const config: Core.Config.Middlewares = [
  "strapi::logger",
  "strapi::errors",
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "img-src": [
            "'self'",
            "data:",
            "blob:",
            "https://market-assets.strapi.io",
            ...uploadHosts,
          ],
          "media-src": ["'self'", "data:", "blob:", ...uploadHosts],
        },
      },
    },
  },
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
