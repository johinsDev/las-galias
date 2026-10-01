import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";

/**
 * Business rules for `launch` — the pre-sale landing that lives at
 * /lanzamientos/<slug> without a project behind it. Same two guarantees a
 * project in expectation gets: it cannot publish without a banner, and a
 * launch that disappears leaves a 301 to the catalogue instead of a 404 on
 * the campaign links already out there.
 */

export const LAUNCH_UID = "api::launch.launch";
const REDIRECT_UID = "api::redirect.redirect";
const LAUNCHES_HOME = "/lanzamientos";
const PROJECTS_HOME = "/proyectos-de-vivienda";

interface DocParams {
  documentId?: string;
}

/** Rule: a landing is its banner. Publishing needs the desktop or the mobile image. */
export async function validateLaunchOnPublish(
  strapi: Core.Strapi,
  params: DocParams,
): Promise<void> {
  if (!params.documentId) return;
  const doc = await strapi.documents(LAUNCH_UID).findOne({
    documentId: params.documentId,
    populate: ["heroDesktop", "heroMobile"],
  });
  if (!doc) return;
  if (!doc.heroDesktop && !doc.heroMobile) {
    throw new errors.ValidationError(
      "No se puede publicar el lanzamiento sin imagen: sube la de escritorio o la de móvil.",
    );
  }
}

/** On unpublish or delete, /lanzamientos/<slug> redirects to the catalogue. Upsert by `from`. */
export async function createLaunchRedirect(strapi: Core.Strapi, params: DocParams): Promise<void> {
  if (!params.documentId) return;
  const doc = await strapi.documents(LAUNCH_UID).findOne({ documentId: params.documentId });
  if (!doc?.slug) return;

  const from = `${LAUNCHES_HOME}/${doc.slug}`;
  const existing = await strapi.documents(REDIRECT_UID).findFirst({ filters: { from } });
  if (existing) {
    await strapi.documents(REDIRECT_UID).update({
      documentId: existing.documentId,
      data: { to: PROJECTS_HOME, enabled: true, source: "auto-unpublish" },
    });
  } else {
    await strapi.documents(REDIRECT_UID).create({
      data: { from, to: PROJECTS_HOME, enabled: true, source: "auto-unpublish" },
    });
  }
  strapi.log.info(`Auto redirect ${from} → ${PROJECTS_HOME} enabled`);
}

/** On re-publish, that automatic redirect is turned off again. */
export async function disableLaunchRedirect(strapi: Core.Strapi, params: DocParams): Promise<void> {
  if (!params.documentId) return;
  const doc = await strapi.documents(LAUNCH_UID).findOne({ documentId: params.documentId });
  if (!doc?.slug) return;

  const redirect = await strapi.documents(REDIRECT_UID).findFirst({
    filters: { from: `${LAUNCHES_HOME}/${doc.slug}`, source: "auto-unpublish", enabled: true },
  });
  if (redirect) {
    await strapi.documents(REDIRECT_UID).update({
      documentId: redirect.documentId,
      data: { enabled: false },
    });
    strapi.log.info(`Auto redirect for ${LAUNCHES_HOME}/${doc.slug} disabled (re-published)`);
  }
}
