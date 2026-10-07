import type { Core } from "@strapi/strapi";

import { FOOTER_DEFAULTS } from "@lasgalias/schemas";

export const FOOTER_UID = "api::footer.footer";

/**
 * Creates the «Footer» single type with the links the site already shows, so
 * the first time an editor opens it there is a list to change instead of an
 * empty form — and saving that empty form would have wiped the footer. A row
 * that exists is never touched: from then on it is the editor's.
 */
export async function ensureFooter(strapi: Core.Strapi): Promise<void> {
  try {
    if (await strapi.documents(FOOTER_UID).findFirst()) return;
    await strapi.documents(FOOTER_UID).create({ data: FOOTER_DEFAULTS });
    strapi.log.info("[footer] created with the default links");
  } catch (err) {
    strapi.log.warn(`[footer] could not create the defaults: ${String(err)}`);
  }
}
