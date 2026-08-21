import type { Core } from "@strapi/strapi";

import { contentTypeKey, type StoredConfig, updateStoredConfig } from "./admin-store";

/**
 * Edit-view layouts as code.
 *
 * Strapi's default form is the schema's attribute order, one field after
 * another — which on `project` means thirty fields with the price three screens
 * away from the Sinco switch that overwrites it. "Configure the view" fixes it
 * per database, so a new stage is a mess again; declaring it here applies the
 * same form everywhere.
 *
 * A row is a list of fields shown side by side. Grouping is by RELATION (fields
 * an editor reads together sit in the same row or in adjacent rows) and by
 * PRIORITY (what gets filled first is on top; logs and integration plumbing sink
 * to the bottom).
 *
 * Strapi has no section headings: the only visual break in the form is the
 * bordered card it draws around a component. That is why components — location,
 * unitTypes, specSheet, financing, salesRoom, seo — are used as the separators
 * between blocks instead of being scattered among the flat fields.
 *
 * Sizes come out of the grid of 12: a row of two fields is 6+6, of three 4+4+4.
 * `field:8` overrides that when a field deserves more room. Blocks and
 * components always take a full row — Strapi refuses any other size for them
 * and would move the field to the end of the form on the next boot.
 */
const EDIT_LAYOUTS: Record<string, string[][]> = {
  "api::project.project": [
    // Sin cabecera: lo que identifica al proyecto se ve siempre.
    ["name", "slug"],
    ["stage", "constructionStatus"],
    ["appliesSubsidy", "lastUnits", "hasDiscount"],
    // El rastro ciudad · zona · barrio, y luego el mapa.
    ["sectionLocation"],
    ["city", "zone", "neighborhood"],
    ["macroproject:6"],
    ["location"],
    // El precio, pegado a lo que puede sobreescribirlo.
    ["sectionPricing"],
    ["priceFromCOP", "priceLocked", "priceFromSincoCOP"],
    ["sincoProject:8", "syncFromSinco:4"],
    // Lo que se lee y se ve en la página, del más visible al menos.
    ["sectionContent"],
    ["description"],
    ["heroDesktop", "heroMobile"],
    ["logo", "gallery"],
    ["video", "tour360Url"],
    // La ficha del producto.
    ["sectionProduct"],
    ["unitTypes"],
    ["amenities"],
    ["specSheet"],
    ["financing"],
    ["salesRoom"],
    ["constructionProgress"],
    ["sectionRelated"],
    ["recommended"],
    ["seo"],
  ],
  "api::lead.lead": [
    ["name", "email"],
    ["phone", "residenceCountry"],
    ["project", "source"],
    ["message:12"],
    // Los permisos juntos: se leen como un bloque cuando alguien reclama.
    ["acceptsDataPolicy", "acceptsWhatsApp", "acceptsCall"],
    ["acceptsEmail", "acceptsSms"],
    ["utmSource", "utmMedium", "utmCampaign"],
    // El viaje al CRM, al final: nadie lo escribe, se consulta cuando falla.
    ["crmStatus", "crmVisitId", "crmAttempts"],
    ["crmLastError:12"],
  ],
  "api::sinco-project.sinco-project": [
    ["label:12"],
    ["name", "sincoId"],
    ["macroName", "macroSincoId"],
    ["lastSyncedAt:12"],
  ],
  "api::post.post": [
    ["title", "slug"],
    ["category", "featured"],
    ["author", "readingMinutes", "publishedOn"],
    ["excerpt:12"],
    ["cover:12"],
    ["content"],
    ["seo"],
  ],
  "api::macroproject.macroproject": [
    ["name", "slug"],
    ["city:6"],
    ["description"],
    ["location"],
    ["gallery:12"],
    ["pointsOfInterest:12"],
  ],
  "api::point-of-interest.point-of-interest": [
    ["name", "category"],
    ["macroproject", "distanceText"],
  ],
  "api::city.city": [["name", "slug"], ["department", "image"], ["projects:12"]],
  "api::zone.zone": [["name", "slug"], ["city:6"]],
  "api::amenity.amenity": [
    ["name:12"],
    ["iconKey", "iconColor"],
    ["icon", "description"],
    ["projects:12"],
  ],
  "api::faq.faq": [["question:12"], ["audience", "order"], ["answer"]],
  "api::home-banner.home-banner": [
    ["title", "link"],
    ["active", "order"],
    ["desktopImage", "mobileImage"],
  ],
  "api::redirect.redirect": [
    ["from", "to"],
    ["enabled", "permanent", "source"],
  ],
  "api::job-run.job-run": [["task", "status"], ["ranAt", "durationMs"], ["message:12"]],
  "api::faq-bot-question.faq-bot-question": [
    ["question:12"],
    ["answer:12"],
    ["askedAt", "wasCached", "model"],
    ["inputTokens", "outputTokens", "cacheReadTokens"],
    ["cacheKey:12"],
  ],
  // El interruptor primero: lo que un editor viene a tocar.
  "api::faq-bot-config.faq-bot-config": [
    ["enabled", "model", "maxAnswerTokens"],
    ["organizationContext:12"],
    ["promptExtra:12"],
    ["fallbackMessage:12"],
    ["suggestedQuestions"],
    // Los frenos de gasto, juntos y al final.
    ["dailyQuestionCap", "ratePerIpPerHour"],
  ],
  "api::calculator-config.calculator-config": [
    ["annualInterestRate", "maxTermYears", "maxFinancingPercent"],
    ["leasingFinancingPercent", "visFinancingPercent"],
    ["maxIncomeRatioPercent", "paymentIncomeRatioPercent"],
  ],
  "api::exchange-rate.exchange-rate": [
    ["copPerUsd", "copPerEur"],
    ["usdSource", "eurSource"],
    ["validFrom", "fetchedAt"],
  ],
  // En el orden en que la página se lee de arriba abajo.
  "api::foreign-buyer-page.foreign-buyer-page": [
    ["eyebrow", "heroTitle"],
    ["heroSubtitle:12"],
    ["heroImage", "heroCtaLabel"],
    ["trustBadges"],
    ["stepsTitle:12"],
    ["steps"],
    ["priceDisclaimer:12"],
    ["formTitle", "formBody"],
    ["formBullets"],
    ["seo"],
  ],
};

/**
 * Columns of the list view.
 *
 * The default is "the first four attributes", which on a project means wasting
 * two columns on the slug and on a switch, and none on the price or the city.
 */
const LIST_LAYOUTS: Record<string, string[]> = {
  "api::project.project": ["name", "city", "stage", "constructionStatus", "priceFromCOP"],
  "api::lead.lead": ["name", "phone", "project", "crmStatus", "createdAt"],
  "api::sinco-project.sinco-project": ["label", "sincoId", "macroName", "lastSyncedAt"],
  "api::post.post": ["title", "category", "publishedOn", "featured"],
  "api::macroproject.macroproject": ["name", "city", "slug"],
  "api::point-of-interest.point-of-interest": ["name", "category", "macroproject", "distanceText"],
  "api::city.city": ["name", "department", "slug"],
  "api::zone.zone": ["name", "city", "slug"],
  "api::amenity.amenity": ["name", "iconKey", "description"],
  "api::faq.faq": ["question", "audience", "order"],
  "api::home-banner.home-banner": ["title", "active", "order"],
  "api::redirect.redirect": ["from", "to", "enabled", "source"],
  "api::job-run.job-run": ["task", "status", "ranAt", "durationMs"],
  "api::faq-bot-question.faq-bot-question": ["question", "wasCached", "model", "askedAt"],
};

/**
 * Fields the admin shows disabled, because something else owns them.
 *
 * `"*"` is every field of the type. Writing them by hand does nothing useful:
 * the next sync or the next job overwrites the value, and until then the admin
 * is showing a number nobody upstream agrees with.
 */
const READ_ONLY: Record<string, string[] | "*"> = {
  "api::project.project": ["priceFromSincoCOP"],
  "api::lead.lead": ["crmVisitId", "crmAttempts", "crmLastError"],
  "api::sinco-project.sinco-project": "*",
  "api::job-run.job-run": "*",
  "api::faq-bot-question.faq-bot-question": "*",
};

/** Strapi refuses any size other than 12 for these, and drops the field if given one. */
const FULL_ROW_TYPES = new Set(["component", "dynamiczone", "json", "richtext", "blocks"]);

/** The section heading is registered with a fixed full-row size; same rule. */
const SECTION_CUSTOM_FIELD = "global::section";

/** Never part of a layout: Strapi renders them outside the form. */
const NOT_EDITABLE = new Set([
  "id",
  "documentId",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "createdBy",
  "updatedBy",
  "locale",
  "localizations",
]);

const NOT_LISTABLE_TYPES = new Set(["json", "password", "richtext", "dynamiczone", "blocks"]);

interface SchemaLike {
  attributes: Record<string, { type: string; customField?: string } | undefined>;
}

/** True when Strapi only accepts this field at the full width of the row. */
function needsFullRow(attribute: { type: string; customField?: string } | undefined): boolean {
  if (!attribute) return false;
  return FULL_ROW_TYPES.has(attribute.type) || attribute.customField === SECTION_CUSTOM_FIELD;
}

type EditRow = { name: string; size: number }[];

function schemaOf(strapi: Core.Strapi, uid: string): SchemaLike | undefined {
  return (strapi.contentTypes as unknown as Record<string, SchemaLike | undefined>)[uid];
}

/**
 * Turns the declaration above into what the Content Manager stores.
 *
 * Anything the declaration forgot is appended at the end instead of dropped: a
 * field missing from the layout disappears from the form, and an editor would
 * have no way to tell that from a field that was never added.
 */
function buildEditLayout(strapi: Core.Strapi, uid: string, rows: string[][]): EditRow[] {
  const schema = schemaOf(strapi, uid);
  if (!schema) return [];

  const placed = new Set<string>();
  const layout: EditRow[] = [];

  for (const row of rows) {
    const fields = row
      .map((entry) => {
        const [name, size] = entry.split(":");
        return { name, size: size ? Number(size) : undefined };
      })
      .filter(({ name }) => {
        if (!schema.attributes[name] || NOT_EDITABLE.has(name)) {
          strapi.log.warn(`Admin layout for ${uid}: no such editable field "${name}", skipped`);
          return false;
        }
        return true;
      });
    if (fields.length === 0) continue;

    const evenSize = Math.floor(12 / fields.length);
    let current: EditRow = [];

    for (const { name, size } of fields) {
      placed.add(name);
      // A component or a rich text block only exists at full width, so it gets
      // its own row — which is also how it reads best, as a card of its own.
      if (needsFullRow(schema.attributes[name])) {
        if (current.length > 0) layout.push(current);
        current = [];
        layout.push([{ name, size: 12 }]);
        continue;
      }
      current.push({ name, size: size ?? evenSize });
    }

    if (current.length > 0) {
      const width = current.reduce((sum, field) => sum + field.size, 0);
      if (width > 12)
        strapi.log.warn(
          `Admin layout for ${uid}: row "${row.join(", ")}" is wider than 12 columns`,
        );
      layout.push(current);
    }
  }

  const forgotten = Object.keys(schema.attributes).filter(
    (name) => !placed.has(name) && !NOT_EDITABLE.has(name),
  );
  if (forgotten.length > 0) {
    // Dropping it from the layout would hide it from the form, and a hidden
    // field looks exactly like a field nobody ever added.
    strapi.log.warn(
      `Admin layout for ${uid}: ${forgotten.join(", ")} not declared, appended at the end`,
    );
    for (const name of forgotten) layout.push([{ name, size: 12 }]);
  }

  return layout;
}

function buildListLayout(strapi: Core.Strapi, uid: string, fields: string[]): string[] {
  const schema = schemaOf(strapi, uid);
  if (!schema) return [];
  return fields.filter((name) => {
    const attribute = schema.attributes[name];
    if (!attribute || NOT_LISTABLE_TYPES.has(attribute.type)) {
      strapi.log.warn(`Admin list layout for ${uid}: "${name}" cannot be a column, skipped`);
      return false;
    }
    return true;
  });
}

function mergeReadOnly(config: StoredConfig, fields: string[] | "*"): boolean {
  if (!config.metadatas) return false;
  const names =
    fields === "*"
      ? Object.keys(config.metadatas).filter((name) => !NOT_EDITABLE.has(name))
      : fields;

  let changed = false;
  for (const name of names) {
    const meta = config.metadatas[name]?.edit;
    if (!meta || meta.editable === false) continue;
    meta.editable = false;
    changed = true;
  }
  return changed;
}

/**
 * Idempotent: it compares before writing, so a boot that changes nothing does no
 * database work. Never throws — a form that is laid out badly is a nuisance, a
 * CMS that does not start is an outage.
 */
export async function applyAdminLayouts(strapi: Core.Strapi): Promise<void> {
  try {
    const uids = new Set([
      ...Object.keys(EDIT_LAYOUTS),
      ...Object.keys(LIST_LAYOUTS),
      ...Object.keys(READ_ONLY),
    ]);

    let updated = 0;
    for (const uid of uids) {
      const rows = EDIT_LAYOUTS[uid];
      const columns = LIST_LAYOUTS[uid];
      const readOnly = READ_ONLY[uid];

      const edit = rows ? buildEditLayout(strapi, uid, rows) : undefined;
      const list = columns ? buildListLayout(strapi, uid, columns) : undefined;

      const changed = await updateStoredConfig(strapi, contentTypeKey(uid), (config) => {
        if (!config.layouts) return false;
        let dirty = readOnly ? mergeReadOnly(config, readOnly) : false;
        if (edit && JSON.stringify(config.layouts.edit) !== JSON.stringify(edit)) {
          config.layouts.edit = edit;
          dirty = true;
        }
        if (list && JSON.stringify(config.layouts.list) !== JSON.stringify(list)) {
          config.layouts.list = list;
          dirty = true;
        }
        return dirty;
      });
      if (changed) updated += 1;
    }

    if (updated > 0) strapi.log.info(`Admin layouts applied to ${updated} type(s)`);
  } catch (err) {
    strapi.log.warn(`Could not apply admin layouts: ${String(err)}`);
  }
}
