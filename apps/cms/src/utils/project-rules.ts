import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";

import type { ExternalProjectData } from "@lasgalias/providers";
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
  builtAreaM2?: number;
  privateAreaM2?: number;
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
    return {
      ...entry,
      // Only overwrite an area the ERP actually reported: `areaPrivada` is not
      // populated on every project, and a blank there must not wipe the CMS's.
      ...(match.builtAreaM2 !== undefined ? { builtAreaM2: match.builtAreaM2 } : {}),
      ...(match.privateAreaM2 !== undefined ? { privateAreaM2: match.privateAreaM2 } : {}),
      priceCOP: String(match.priceCOP),
    };
  });
  return touched ? merged : null;
}

/**
 * Pulls price and areas for ONE project and writes them back.
 *
 * Deliberately NOT a create/update middleware: every "Save" in the admin would
 * cost an auth plus 2-3 HTTP calls against an ERP that is also serving live
 * sales rooms. It runs from the nightly cron and from the explicit
 * `POST /api/projects/:documentId/sync-sinco` action instead.
 *
 * Ownership is unchanged (see `mergeUnitTypes`): Sinco only ever writes price
 * and areas. `priceFromSincoCOP` always records what the CRM says so an editor
 * can compare the two; `priceFromCOP` — what the site shows — is only touched
 * while `priceLocked` is off.
 *
 * Returns whether anything actually changed.
 */
export async function syncProjectFromSinco(
  strapi: Core.Strapi,
  documentId: string,
): Promise<boolean> {
  const doc = await strapi.documents(PROJECT_UID).findOne({
    documentId,
    populate: ["sincoProject", "unitTypes"],
  });
  if (!doc || doc.syncFromSinco !== true) return false;

  const sincoId = await resolveSincoId(strapi, {}, documentId);
  if (!sincoId) return false;

  const provider = getProjectDataProvider();
  const external = await provider.getProjectById(sincoId);
  if (!external) {
    strapi.log.warn(`Provider "${provider.name}" did not find external project ${sincoId}`);
    return false;
  }

  const data: Record<string, unknown> = {};
  if (external.priceFromCOP !== undefined) {
    data.priceFromSincoCOP = String(external.priceFromCOP);
    if (!(await isPriceLocked(strapi, documentId))) {
      data.priceFromCOP = String(external.priceFromCOP);
    }
  }
  const unitTypes = mergeUnitTypes(doc.unitTypes, external);
  if (unitTypes) data.unitTypes = unitTypes;

  if (Object.keys(data).length === 0) return false;

  await strapi.documents(PROJECT_UID).update({ documentId, data });
  strapi.log.info(`Project ${sincoId} price and areas refreshed from "${provider.name}"`);
  return true;
}

/**
 * Nightly pass over every project with "sync from Sinco" enabled. One failing
 * project never stops the rest — the ERP is flaky enough that an all-or-nothing
 * pass would mean no project ever syncs.
 */
export async function syncAllProjectsFromSinco(strapi: Core.Strapi): Promise<void> {
  const projects = await strapi.documents(PROJECT_UID).findMany({
    filters: { syncFromSinco: true },
    fields: ["name"],
    status: "draft",
  });
  if (projects.length === 0) return;

  let updated = 0;
  for (const project of projects) {
    try {
      if (await syncProjectFromSinco(strapi, project.documentId)) updated += 1;
    } catch (err) {
      strapi.log.error(`Sinco sync failed for project ${project.documentId}: ${String(err)}`);
    }
  }
  strapi.log.info(`Sinco project sync: ${updated}/${projects.length} project(s) updated`);
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
