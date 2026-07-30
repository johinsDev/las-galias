import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";

import { NotImplementedError, type ExternalProjectData } from "@lasgalias/providers";
import { getProjectDataProvider } from "./providers";
import { extractRelationIds } from "./relations";

export const PROJECT_UID = "api::project.project";
const REDIRECT_UID = "api::redirect.redirect";
const PROJECTS_HOME = "/proyectos";

interface DocParams {
  documentId?: string;
  data?: Record<string, unknown>;
}

const SINCO_PROJECT_UID = "api::sinco-project.sinco-project";

/**
 * The Sinco project code behind the picked catalog entry — from the payload if
 * the editor just changed it, otherwise from what is already stored.
 */
async function resolveSincoId(
  strapi: Core.Strapi,
  data: Record<string, unknown>,
  documentId?: string,
): Promise<string> {
  let entryId: string | undefined = extractRelationIds(data.sincoProject)[0];
  if (!entryId && documentId) {
    const current = await strapi.documents(PROJECT_UID).findOne({
      documentId,
      populate: ["sincoProject"],
    });
    entryId = (current?.sincoProject as { documentId?: string } | undefined)?.documentId;
  }
  if (!entryId) return "";
  const entry = await strapi.documents(SINCO_PROJECT_UID).findOne({ documentId: entryId });
  return typeof entry?.sincoId === "string" ? entry.sincoId : "";
}

/** The stored "price fixed by hand" flag, for updates that omit it. */
async function isPriceLocked(strapi: Core.Strapi, documentId?: string): Promise<boolean> {
  if (!documentId) return false;
  const current = await strapi.documents(PROJECT_UID).findOne({ documentId });
  return current?.priceLocked === true;
}

interface UnitTypeEntry {
  name?: string;
  areaM2?: number;
  priceCOP?: string;
  [key: string]: unknown;
}

/**
 * Field ownership. Sinco only writes what Sinco actually knows — price and
 * areas. Everything else stays the CMS's:
 *
 * - `name`: in Sinco it is an operational code ("INACTIVO CONJUNTO RESIDENCIAL
 *   ARBOLEDA DEL PARQUE-BLOQUE13A"), never a brand name.
 * - `constructionStatus`: does not exist in Sinco (`etapa` labels towers).
 * - `bathrooms`: does not exist. `bedrooms`: only filled on ~40% of projects,
 *   so overwriting would replace good data with blanks.
 *
 * Unit types are matched by name and only their area and price are refreshed —
 * a sync never adds, removes or reorders what an editor curated.
 */
function mergeUnitTypes(current: unknown, external: ExternalProjectData): UnitTypeEntry[] | null {
  if (!external.unitTypes || !Array.isArray(current)) return null;
  const bySincoName = new Map(external.unitTypes.map((u) => [u.name.trim().toLowerCase(), u]));
  let touched = false;
  const merged = (current as UnitTypeEntry[]).map((entry) => {
    const match = bySincoName.get((entry.name ?? "").trim().toLowerCase());
    if (!match) return entry;
    touched = true;
    return { ...entry, areaM2: match.areaM2, priceCOP: String(match.priceCOP) };
  });
  return touched ? merged : null;
}

/**
 * Rule: on create/update with "sync from Sinco" enabled and a Sinco project
 * picked, Sinco refreshes price and areas. Provider failures never block the
 * editor: log and fall back to what is stored.
 *
 * `priceFromSincoCOP` always records what the CRM says, so the editor can see
 * the two side by side; `priceFromCOP` (what the site shows) is only touched
 * while `priceLocked` is off.
 */
export async function mergeSincoData(strapi: Core.Strapi, params: DocParams): Promise<void> {
  const data = params.data;
  if (!data || data.syncFromSinco !== true) return;
  const sincoId = await resolveSincoId(strapi, data, params.documentId);
  if (!sincoId) return;

  const provider = getProjectDataProvider();
  try {
    const external = await provider.getProjectById(sincoId);
    if (!external) {
      strapi.log.warn(`Provider "${provider.name}" did not find external project ${sincoId}`);
      return;
    }
    if (external.priceFromCOP !== undefined) {
      data.priceFromSincoCOP = String(external.priceFromCOP);
      // A partial update may not carry the flag; falling back to the stored one
      // means a locked price stays locked.
      const locked = data.priceLocked ?? (await isPriceLocked(strapi, params.documentId));
      if (locked !== true) data.priceFromCOP = String(external.priceFromCOP);
    }
    const unitTypes = mergeUnitTypes(data.unitTypes, external);
    if (unitTypes) data.unitTypes = unitTypes;

    strapi.log.info(`Project ${sincoId} price and areas refreshed from "${provider.name}"`);
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
