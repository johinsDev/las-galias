import type { Core } from "@strapi/strapi";

const DEBOUNCE_MS = 60_000;

let timer: NodeJS.Timeout | null = null;

/**
 * Dispara el Deploy Hook de Vercel con debounce de 60s: una ráfaga de
 * publicaciones produce UN solo rebuild. Sin VERCEL_DEPLOY_HOOK_URL es no-op
 * (dev local). Vive como código (no como webhook del admin) para que quede
 * versionado y se reproduzca en cada entorno sin clicks.
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
          strapi.log.info("Deploy hook de Vercel disparado (rebuild del sitio en camino)");
        } else {
          strapi.log.error(`Deploy hook de Vercel respondió ${res.status}`);
        }
      })
      .catch((err: unknown) => {
        strapi.log.error(`Error llamando el deploy hook de Vercel: ${String(err)}`);
      });
  }, DEBOUNCE_MS);
  timer.unref();
}
