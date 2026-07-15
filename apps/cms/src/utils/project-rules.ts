import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";

import { NotImplementedError } from "@lasgalias/providers";
import { getProjectDataProvider } from "./providers";
import { extractRelationIds } from "./relations";

export const PROJECT_UID = "api::project.project";
const REDIRECT_UID = "api::redirect.redirect";
const PROJECTS_HOME = "/proyectos";

interface DocParams {
  documentId?: string;
  data?: Record<string, unknown>;
}

/**
 * Rule: on create/update with "sync from Sinco" enabled and a sincoId set,
 * the external provider owns name/price/status/unit types (merged into data
 * before persisting). Provider failures never block the editor: log and fall
 * back to manual input.
 */
export async function mergeSincoData(strapi: Core.Strapi, params: DocParams): Promise<void> {
  const data = params.data;
  if (!data || data.syncFromSinco !== true) return;
  const sincoId = typeof data.sincoId === "string" ? data.sincoId.trim() : "";
  if (!sincoId) return;

  const provider = getProjectDataProvider();
  try {
    const external = await provider.getProjectById(sincoId);
    if (!external) {
      strapi.log.warn(`Provider "${provider.name}" did not find external project ${sincoId}`);
      return;
    }
    if (external.name !== undefined) data.name = external.name;
    if (external.priceFromCOP !== undefined) data.priceFromCOP = String(external.priceFromCOP);
    if (external.constructionStatus !== undefined)
      data.constructionStatus = external.constructionStatus;
    if (external.unitTypes !== undefined) {
      data.unitTypes = external.unitTypes.map((u) => ({
        name: u.name,
        areaM2: u.areaM2,
        bedrooms: u.bedrooms,
        bathrooms: u.bathrooms,
        priceCOP: String(u.priceCOP),
      }));
    }
    strapi.log.info(`Project ${sincoId} data pulled from provider "${provider.name}"`);
  } catch (err) {
    if (err instanceof NotImplementedError) {
      strapi.log.warn(
        `Provider "${provider.name}" not implemented yet — manual input: ${err.message}`,
      );
      return;
    }
    strapi.log.error(`Provider "${provider.name}" lookup failed: ${String(err)}`);
  }
}

/**
 * Rule: recommended projects on a PDP must belong to the same city as the
 * project that recommends them.
 */
export async function validateRecommendedSameCity(
  strapi: Core.Strapi,
  params: DocParams,
): Promise<void> {
  const data = params.data;
  if (!data || data.recommended === undefined) return;

  const recommendedIds = extractRelationIds(data.recommended);
  if (recommendedIds.length === 0) return;

  // The project's city: from the payload, or from the stored document if unchanged.
  let cityId: string | undefined = extractRelationIds(data.city)[0];
  if (!cityId && params.documentId) {
    const current = await strapi.documents(PROJECT_UID).findOne({
      documentId: params.documentId,
      populate: ["city"],
    });
    cityId = (current?.city as { documentId?: string } | undefined)?.documentId;
  }
  if (!cityId) return;

  for (const documentId of recommendedIds) {
    if (params.documentId && documentId === params.documentId) {
      throw new errors.ValidationError("A project cannot recommend itself");
    }
    const recommended = await strapi.documents(PROJECT_UID).findOne({
      documentId,
      populate: ["city"],
    });
    const recommendedCity = (recommended?.city as { documentId?: string } | undefined)?.documentId;
    if (recommendedCity !== cityId) {
      throw new errors.ValidationError(
        `Recommended project "${recommended?.name ?? documentId}" belongs to another city. ` +
          "Recommended projects must be in the same city as the project.",
      );
    }
  }
}

/**
 * Rule: stage-dependent required fields on publish. expectation publishes
 * with the minimum (name/slug/city are schema-required + one hero image);
 * sale requires the full listing (price, unit types and gallery).
 */
export async function validateFieldsByStage(strapi: Core.Strapi, params: DocParams): Promise<void> {
  if (!params.documentId) return;
  const doc = await strapi.documents(PROJECT_UID).findOne({
    documentId: params.documentId,
    populate: ["city", "unitTypes", "gallery", "heroDesktop", "heroMobile"],
  });
  if (!doc) return;

  const missing: string[] = [];
  if (!doc.heroDesktop && !doc.heroMobile) missing.push("hero image (desktop or mobile)");

  if (doc.stage === "sale") {
    if (!doc.priceFromCOP) missing.push("starting price (COP)");
    if (!Array.isArray(doc.unitTypes) || doc.unitTypes.length === 0) missing.push("unit types");
    if (!Array.isArray(doc.gallery) || doc.gallery.length === 0) missing.push("gallery");
  }

  if (missing.length > 0) {
    throw new errors.ValidationError(
      `Cannot publish in stage "${doc.stage}": missing ${missing.join(", ")}.`,
    );
  }
}

/**
 * Rule: when a project is unpublished (or deleted) its PDP must redirect to
 * the projects landing page. Upsert by `from`.
 */
export async function createAutoRedirect(strapi: Core.Strapi, params: DocParams): Promise<void> {
  if (!params.documentId) return;
  const doc = await strapi.documents(PROJECT_UID).findOne({ documentId: params.documentId });
  if (!doc?.slug) return;

  const from = `${PROJECTS_HOME}/${doc.slug}`;
  const existing = await strapi.documents(REDIRECT_UID).findFirst({
    filters: { from },
  });

  if (existing) {
    await strapi.documents(REDIRECT_UID).update({
      documentId: existing.documentId,
      data: { to: PROJECTS_HOME, enabled: true, source: "auto-unpublish" },
    });
  } else {
    await strapi.documents(REDIRECT_UID).create({
      data: {
        from,
        to: PROJECTS_HOME,
        permanent: false,
        enabled: true,
        source: "auto-unpublish",
      },
    });
  }
  strapi.log.info(`Auto redirect ${from} → ${PROJECTS_HOME} enabled`);
}

/** On re-publish, the automatic redirect for that slug is turned off. */
export async function disableAutoRedirect(strapi: Core.Strapi, params: DocParams): Promise<void> {
  if (!params.documentId) return;
  const doc = await strapi.documents(PROJECT_UID).findOne({ documentId: params.documentId });
  if (!doc?.slug) return;

  const redirect = await strapi.documents(REDIRECT_UID).findFirst({
    filters: { from: `${PROJECTS_HOME}/${doc.slug}`, source: "auto-unpublish", enabled: true },
  });
  if (redirect) {
    await strapi.documents(REDIRECT_UID).update({
      documentId: redirect.documentId,
      data: { enabled: false },
    });
    strapi.log.info(`Auto redirect for ${PROJECTS_HOME}/${doc.slug} disabled (re-published)`);
  }
}
