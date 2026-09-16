import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";

import { fetchProjectCatalog, sincoConfigFromEnv, SincoClient } from "@lasgalias/providers";

export const SINCO_PROJECT_UID = "api::sinco-project.sinco-project";

/**
 * The Sinco towers on sale — the only ones mirrored — keyed by macroproject.
 * Sinco also lists sales rooms, PQR queues and projects sold out years ago (662
 * towers in all), which only buried the right entry in the picker. Source: the
 * company's "Macroproyectos y proyectos activos" export of 2026-09-16. A new
 * tower for sale has to be added here or it never shows up in the picker.
 */
const SINCO_ACTIVE_TOWERS: Readonly<Record<string, readonly string[]>> = {
  "109": ["1212", "1213", "1214", "1215", "1216"], // Urbanización Mirador de Llano Grande · Pereira
  "137": ["704"], // Atardeceres de la Francia · Manizales
  "143": ["675", "677", "678", "680", "687", "688"], // Parque Central Fontibón 1 · Bogotá
  "144": ["728", "729", "1211"], // Portal de los Cámbulos · Manizales
  "154": ["770", "840"], // Verde Niza · Manizales
  "155": ["518"], // Atardeceres de la Francia II · Manizales
  "157": ["1098"], // Novaflora (locales) · Cali
  "158": ["830", "831"], // 48 Living · Manizales
  "159": ["863", "977", "1220"], // Altavista 2000 · Cali
  "160": ["867", "868", "869", "870"], // Parque Central Fontibón 2 · Bogotá
  "164": ["892", "893", "894", "895", "896"], // Estación Fontibón · Bogotá
  "165": ["1205", "1206", "1207", "1208", "1209", "1210", "1240", "1241"], // Bosques de Cuba 2 · Pereira
  "166": ["939", "986"], // Atardeceres de Madelena · Bogotá
  "167": ["1012", "1090"], // Mirador de los Alcázares · Manizales
  "169": ["947", "967", "989", "1015", "1058", "1088", "1096"], // Primavera 6-39 II · Bogotá
  "170": ["945", "966", "1059", "1095"], // Paseo de la Rivera · Bogotá
  "188": ["1002", "1003"], // Foresta de la Sultana · Manizales
  "189": ["1014", "1022", "1024", "1069"], // Foretti · Bogotá
  "190": [
    "1025",
    "1026",
    "1027",
    "1028",
    "1029",
    "1030",
    "1031",
    "1032",
    "1033",
    "1034",
    "1035",
    "1036",
  ], // Brezza · Bogotá
  "191": ["1061", "1062"], // Atardeceres de Madelena II · Bogotá
  "192": ["1064", "1065"], // Molinos Caracas · Bogotá
  "193": ["1075", "1076", "1077", "1078", "1079", "1080"], // Terra Castilla · Bogotá
  "195": ["1091", "1092", "1100", "1101", "1194", "1195"], // Sabantti · Bogotá
  "196": ["1104"], // Ronda de Verano · Bogotá
  "199": ["1158", "1159"], // Londres · Bogotá
  "201": ["1161"], // Barcelona · Bogotá
  "202": ["1176"], // Chipichape 6-35 · Cali
  "203": ["1182", "1183"], // Nueva York · Bogotá
  "204": ["1184", "1185", "1188", "1191"], // Brisas de Belmonte · Pereira
  "205": ["1275", "1276"], // Soffio · Bogotá
  "206": ["1230", "1231", "1273", "1274"], // Alborada de Cuba (I) · Pereira
  "210": ["1232", "1233", "1236", "1237"], // Reserva de Llano Grande (I) · Pereira
  "212": ["1235", "1243"], // Altavista del Parque (I) · Pereira
  "213": ["1238", "1242"], // Foresta de la Sultana (I) · Manizales
  "215": ["1219", "1234", "1244"], // Mirador de los Alcázares (I) · Manizales
  "218": ["1239"], // Amsterdam · Bogotá
  "219": ["1249", "1250", "1251"], // Ciudad Campestre · Pereira
  "220": ["1255", "1256", "1257"], // Heliconias · Manizales
  "221": ["1278"], // Moratti · Bogotá
};
const ACTIVE_MACROS = Object.keys(SINCO_ACTIVE_TOWERS);
const ACTIVE_TOWERS = Object.values(SINCO_ACTIVE_TOWERS).flat();
const ACTIVE_TOWER_SET = new Set(ACTIVE_TOWERS);

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
  const entries = (await fetchProjectCatalog(client, ACTIVE_MACROS)).filter((entry) =>
    ACTIVE_TOWER_SET.has(entry.sincoId),
  );
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
 * Drops the entries of towers that are not on sale. Goes through the
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
      sincoId: { $notIn: ACTIVE_TOWERS },
      ...(keep.length > 0 ? { id: { $notIn: keep } } : {}),
    },
  });
  if (count > 0) strapi.log.info(`Sinco catalog pruned: ${count} towers not on sale`);
}

/**
 * Boot with credentials configured: fill the picker when it is empty or lacks a
 * tower on sale (a fresh install, or a tower just added to the list above).
 */
export async function syncSincoCatalogIfIncomplete(strapi: Core.Strapi): Promise<void> {
  if (!process.env.SINCO_BASE_URL || !process.env.SINCO_PASSWORD) return;
  const present = await strapi.documents(SINCO_PROJECT_UID).count({
    filters: { sincoId: { $in: ACTIVE_TOWERS } },
  });
  if (present >= ACTIVE_TOWER_SET.size) return;
  try {
    await syncSincoCatalog(strapi);
  } catch (err) {
    strapi.log.error(`Sinco catalog sync on boot failed: ${String(err)}`);
  }
}
