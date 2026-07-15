import type { Core } from "@strapi/strapi";

const DEBOUNCE_MS = 60_000;

let timer: NodeJS.Timeout | null = null;

/**
 * Triggers the Vercel Deploy Hook with a 60s debounce: a burst of publishes
 * produces ONE rebuild. Without VERCEL_DEPLOY_HOOK_URL it is a no-op (local
 * dev). Lives as code (not an admin-configured webhook) so it is versioned
 * and reproduced in every environment without clicks.
 */
export function scheduleDeploy(strapi: Core.Strapi): void {
  const url = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!url) return;

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    fetch(url, { method: "POST" })
      .then((res) => {
        if (res.ok) {
          strapi.log.info("Vercel deploy hook triggered (site rebuild on its way)");
        } else {
          strapi.log.error(`Vercel deploy hook responded ${res.status}`);
        }
      })
      .catch((err: unknown) => {
        strapi.log.error(`Vercel deploy hook call failed: ${String(err)}`);
      });
  }, DEBOUNCE_MS);
  timer.unref();
}
