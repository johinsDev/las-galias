"use strict";

/**
 * Backfills `lead.form` for the rows that arrived before the site sent it.
 *
 * `form` is the closed list the admin filters by ("which form on the site");
 * until now the only trace was `source`, free text. The mapping below is the
 * same one `inferLeadForm` applies in @lasgalias/schemas — repeated in SQL
 * because a migration cannot import TypeScript. Keep the two in step.
 *
 * WHY A MIGRATION: Strapi's schema sync adds the column with no value, and the
 * attribute's `default` only applies to rows created afterwards. Every lead
 * already stored would list as "manual" for good.
 *
 * Ordering, verified against @strapi/database 5.50.1: `migrations.up()` runs
 * BEFORE `syncSchema()`, so the column does not exist yet and is created here
 * with the same type the sync would give an enumeration (a plain string), so
 * the sync then finds it matching and leaves it alone. Idempotent: it only
 * touches rows still empty.
 */

const TABLE = "leads";
const COLUMN = "form";

module.exports = {
  async up(knex) {
    // A fresh database has no leads table yet: nothing to backfill.
    if (!(await knex.schema.hasTable(TABLE))) return;

    if (!(await knex.schema.hasColumn(TABLE, COLUMN))) {
      await knex.schema.alterTable(TABLE, (table) => {
        table.string(COLUMN);
      });
    }

    const updated = await knex(TABLE)
      .whereNull(COLUMN)
      .update({
        [COLUMN]: knex.raw(`
          CASE
            WHEN source LIKE 'pdp:%'
              OR source LIKE 'pdp-expectation:%'
              OR source LIKE 'pdp-asesoria:%' THEN 'pdp'
            WHEN source = 'proyectos' THEN 'listado'
            WHEN source IN ('lotes', 'locales', 'exterior', 'lanzamiento', 'whatsapp') THEN source
            ELSE 'manual'
          END
        `),
      });

    if (updated > 0) {
      const [{ count }] = await knex(TABLE).where(COLUMN, "manual").count({ count: "*" });
      console.log(
        `[migration] lead.form backfilled on ${updated} row(s); ${count} fell back to "manual"`,
      );
    }
  },

  // Deliberately a no-op: dropping the column would throw away the answer for
  // every lead, and the attribute stays in the schema either way.
  async down() {},
};
