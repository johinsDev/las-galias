import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";

import { fetchProjectCatalog, sincoConfigFromEnv, SincoClient } from "@lasgalias/providers";

export const SINCO_PROJECT_UID = "api::sinco-project.sinco-project";

/**
 * The Sinco macroprojects the site sells — the only ones mirrored. Sinco also
 * lists sales rooms, PQR queues and projects sold out years ago (662 towers in
 * all), which only buried the right entry in the picker. Cross-checked against
 * the company's project sheet on 2026-09-16; a new project needs its macro id
 * added here.
 */
const SINCO_MACRO_ALLOWLIST = [
  "108", // Bosques de Cuba
  "144", // Portal de los Cámbulos
  "159", // Altavista 2000
  "160", // Parque Central Fontibón 2
  "164", // Estación Fontibón
  "165", // Bosques de Cuba 2
  "167", // Mirador de los Alcázares
  "170", // Paseo de la Rivera
  "173", // Reserva de Llano Grande
  "185", // Alborada de Cuba
  "188", // Foresta de la Sultana
  "190", // Brezza
  "192", // Molinos Caracas
  "193", // Terra Castilla
  "194", // Altavista del Parque
  "195", // Sabantti
  "202", // Chipichape 6-35
  "204", // Brisas de Belmonte
  "206", // Alborada de Cuba (I)
  "210", // Reserva de Llano Grande (II)
  "214", // Brisas de Belmonte (I)
  "215", // Mirador de los Alcázares (II)
] as const;

/**
 * The catalog is a mirror, not content. Deleting an entry silently breaks the
 * lead push of every project pointing at it — the form keeps answering 200 and
 * the leads pile up in `failed` where nobody looks. Editing is pointless too:
 * the next sync overwrites it.
 */
export function guardSincoCatalog(action: string): void {
  if (action === "delete") {
    throw new errors.ApplicationError(
      "Las entradas del catálogo de Sinco no se borran: un proyecto puede estar apuntando a esta " +
        "y sus leads dejarían de llegar al CRM. El catálogo se actualiza solo desde Sinco.",
    );
  }
}

interface CatalogRow {
  documentId: string;
  sincoId: string;
  label: string;
}

/** What the editor reads in the picker: "BREZZA TORRE 3 · CONJUNTO CERRADO BREZZA". */
function buildLabel(name: string, macroName: string): string {
  return macroName ? `${name} · ${macroName}` : name;
}

/**
 * Mirrors the Sinco project catalog into `sinco-project` so the editor picks a
 * project from a searchable list instead of typing an id — and so the
 * macroproject (which the CRM requires) is never typed by hand.
 *
 * Rebuilding the whole catalog is ~110 calls / ~1.5 s, cheap enough to run on a
 * schedule; nothing calls Sinco while somebody is editing.
 *
 * Entries that vanish from Sinco are kept, not deleted: a project may already be
 * referenced by one of ours, and losing the reference would silently break its
 * lead push. Stale ones simply stop being refreshed (`lastSyncedAt` shows it).
 */
export async function syncSincoCatalog(strapi: Core.Strapi): Promise<number> {
  const client = new SincoClient(sincoConfigFromEnv(process.env));
  const entries = await fetchProjectCatalog(client, SINCO_MACRO_ALLOWLIST);
  if (entries.length === 0) {
    strapi.log.warn("Sinco catalog came back empty; keeping the current one");
    return 0;
  }

  const existing = (await strapi.documents(SINCO_PROJECT_UID).findMany({
    fields: ["sincoId", "label"],
    limit: -1,
  })) as CatalogRow[];
  const byId = new Map(existing.map((row) => [row.sincoId, row]));

  const lastSyncedAt = new Date().toISOString();
  let created = 0;
  let updated = 0;

  for (const entry of entries) {
    const label = buildLabel(entry.name, entry.macroName);
    const data = { ...entry, label, lastSyncedAt };
    const current = byId.get(entry.sincoId);
    if (!current) {
      await strapi.documents(SINCO_PROJECT_UID).create({ data });
      created++;
    } else {
      await strapi.documents(SINCO_PROJECT_UID).update({ documentId: current.documentId, data });
      if (current.label !== label) updated++;
    }
  }

  strapi.log.info(
    `Sinco catalog synced: ${entries.length} projects (${created} new, ${updated} renamed)`,
  );
  await pruneSincoCatalog(strapi);
  return entries.length;
}

/**
 * Drops the entries of macroprojects outside the allowlist. Goes through the
 * query engine on purpose, below `guardSincoCatalog`, and still honours what
 * that guard protects: an entry a project points at stays, whatever its macro.
 * Only touches our database, so it is safe to run on every boot.
 */
export async function pruneSincoCatalog(strapi: Core.Strapi): Promise<void> {
  const linked = (await strapi.db.query("api::project.project").findMany({
    select: ["id"],
    populate: { sincoProject: { select: ["id"] } },
  })) as { sincoProject?: { id: number } | null }[];
  const keep = linked.flatMap((project) => (project.sincoProject ? [project.sincoProject.id] : []));

  const { count } = await strapi.db.query(SINCO_PROJECT_UID).deleteMany({
    where: {
      macroSincoId: { $notIn: [...SINCO_MACRO_ALLOWLIST] },
      ...(keep.length > 0 ? { id: { $notIn: keep } } : {}),
    },
  });
  if (count > 0) strapi.log.info(`Sinco catalog pruned: ${count} entries outside the allowlist`);
}

/** First boot with credentials configured: fill the picker so it is not empty. */
export async function syncSincoCatalogIfEmpty(strapi: Core.Strapi): Promise<void> {
  if (!process.env.SINCO_BASE_URL || !process.env.SINCO_PASSWORD) return;
  const count = await strapi.documents(SINCO_PROJECT_UID).count({});
  if (count > 0) return;
  try {
    await syncSincoCatalog(strapi);
  } catch (err) {
    strapi.log.error(`Initial Sinco catalog sync failed: ${String(err)}`);
  }
}
