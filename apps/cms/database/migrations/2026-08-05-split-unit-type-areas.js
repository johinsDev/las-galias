"use strict";

/**
 * Splits `unit-type.areaM2` into `builtAreaM2` + `privateAreaM2`.
 *
 * The design shows both "Área construida" and "Área privada" per typology, and
 * Sinco's `UnidadConAreas` already returns them separately (`areaConstruida`,
 * `areaPrivada`) — we were collapsing them on our side.
 *
 * WHY A MIGRATION AND NOT JUST THE SCHEMA CHANGE: Strapi does not migrate
 * renames. On boot it would see `areaM2` gone and `builtAreaM2` new, drop the
 * old column and create an empty one — every area loaded so far, lost. This
 * renames the column first, so the schema sync afterwards finds it already
 * matching and only has to add `privateAreaM2`.
 *
 * Ordering is load-bearing and verified against @strapi/database 5.50.1:
 * `schema.sync()` calls `migrations.up()` BEFORE `syncSchema()`.
 *
 * Column names are Strapi's snake_case of the attribute: `areaM2` becomes
 * `area_m_2` (note the underscore before the digit), not `area_m2`.
 */

const TABLE = "components_project_unit_types";
const OLD = "area_m_2";
const NEW = "built_area_m_2";

module.exports = {
  async up(knex) {
    // A fresh database has no table yet — the schema sync will create it with
    // the new columns and there is nothing to rename.
    if (!(await knex.schema.hasTable(TABLE))) return;

    const hasOld = await knex.schema.hasColumn(TABLE, OLD);
    const hasNew = await knex.schema.hasColumn(TABLE, NEW);

    if (hasOld && !hasNew) {
      await knex.schema.alterTable(TABLE, (table) => {
        table.renameColumn(OLD, NEW);
      });
      return;
    }

    // Both present: a previous partial run, or the schema sync got there first.
    // Carry over anything the new column is still missing rather than leaving
    // the data stranded in the old one.
    if (hasOld && hasNew) {
      await knex(TABLE)
        .whereNull(NEW)
        .whereNotNull(OLD)
        .update({ [NEW]: knex.ref(OLD) });
      await knex.schema.alterTable(TABLE, (table) => {
        table.dropColumn(OLD);
      });
    }
  },

  async down(knex) {
    if (!(await knex.schema.hasTable(TABLE))) return;
    const hasNew = await knex.schema.hasColumn(TABLE, NEW);
    const hasOld = await knex.schema.hasColumn(TABLE, OLD);
    if (hasNew && !hasOld) {
      await knex.schema.alterTable(TABLE, (table) => {
        table.renameColumn(NEW, OLD);
      });
    }
  },
};
