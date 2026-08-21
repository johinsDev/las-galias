import type { Core } from "@strapi/strapi";

/**
 * The Content Manager keeps its view configuration — labels, layouts, which
 * fields are read-only — in the core store, one row per content type. The usual
 * way to change it is "Configure the view" in the admin, which lives only in
 * that environment's database: every new stage would come up with the raw
 * English defaults again.
 *
 * So we declare it as code and merge it into that row on every boot. This
 * module is only the plumbing; the declarations live in `admin-labels.ts`
 * (labels and help text) and `admin-layouts.ts` (field order and grouping).
 */

export interface StoredConfig {
  metadatas?: Record<string, { edit?: Record<string, unknown>; list?: Record<string, unknown> }>;
  layouts?: { edit?: { name: string; size: number }[][]; list?: string[] };
  [key: string]: unknown;
}

export const contentTypeKey = (uid: string): string =>
  `plugin_content_manager_configuration_content_types::${uid}`;

export const componentKey = (uid: string): string =>
  `plugin_content_manager_configuration_components::${uid}`;

/**
 * Reads one configuration row, hands it to `mutate`, and writes it back only if
 * `mutate` reports an actual change — a normal boot does no database work.
 */
export async function updateStoredConfig(
  strapi: Core.Strapi,
  key: string,
  mutate: (config: StoredConfig) => boolean,
): Promise<boolean> {
  const store = strapi.db.query("strapi::core-store");
  const row = (await store.findOne({ where: { key } })) as { id: number; value: string } | null;
  if (!row) return false;

  let config: StoredConfig;
  try {
    config = JSON.parse(row.value) as StoredConfig;
  } catch {
    return false;
  }

  if (!mutate(config)) return false;

  await store.update({ where: { id: row.id }, data: { value: JSON.stringify(config) } });
  return true;
}
