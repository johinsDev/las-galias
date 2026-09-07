import type { Core } from "@strapi/strapi";

import { applySpanishAdminLabels } from "./utils/admin-labels";
import { applyAdminLayouts } from "./utils/admin-layouts";
import { scheduleDeploy } from "./utils/deploy-hook";
import { ensureConfig, invalidateContext } from "./utils/faq-bot-context";
import { LEAD_UID, schedulePushLeadToCrm } from "./utils/lead-rules";
import { PQR_UID, scheduleNotifyPqr, stampPqr } from "./utils/pqr-rules";
import {
  createAutoRedirect,
  disableAutoRedirect,
  PROJECT_UID,
  validateFieldsByStage,
  validateRecommendedSameCity,
} from "./utils/project-rules";
import {
  guardSincoCatalog,
  SINCO_PROJECT_UID,
  syncSincoCatalogIfEmpty,
} from "./utils/sinco-catalog";

/**
 * Content types whose publish/unpublish must rebuild the static site.
 *
 * The rule is simply "does the website read it": anything the build queries has
 * to be here, or an editor publishes a change and the site never shows it —
 * with nothing in any log to explain why.
 */
const PUBLIC_UIDS = new Set<string>([
  PROJECT_UID,
  "api::post.post",
  "api::home-banner.home-banner",
  "api::macroproject.macroproject",
  "api::city.city",
  "api::zone.zone",
  "api::amenity.amenity",
  "api::point-of-interest.point-of-interest",
  "api::redirect.redirect",
  "api::faq.faq",
  "api::foreign-buyer-page.foreign-buyer-page",
  "api::home-page.home-page",
  "api::legal-document.legal-document",
]);

const DEPLOY_ACTIONS = new Set(["publish", "unpublish", "discardDraft", "delete"]);

/**
 * Single types sin borrador: no se "publican", se guardan. El sitio hornea
 * algunos de sus campos al compilar (si el asistente está encendido y sus
 * preguntas sugeridas), así que guardarlos también tiene que reconstruir — si
 * no, el editor da al interruptor, no pasa nada, y no hay forma de saber por qué.
 */
const DEPLOY_ON_UPDATE = new Set<string>([
  "api::faq-bot-config.faq-bot-config",
  "api::calculator-config.calculator-config",
  // Las opciones de los desplegables de calificación se hornean en el HTML de
  // cada ficha de proyecto, así que añadir un rango sin reconstruir lo deja
  // invisible en el sitio.
  "api::lead-form-config.lead-form-config",
  // The daily cron writes here, and the site is static: without a redeploy the
  // TRM refreshes in the CMS every morning and the published pages keep quoting
  // whatever rate was current at the last build. USD and EUR prices were stale
  // by however long it had been since someone published something else.
  "api::exchange-rate.exchange-rate",
]);

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    /**
     * The section headings of the edit form.
     *
     * Strapi has no sections, so one is faked with a field: `global::section`
     * stores nothing, is declared `private` on every schema that uses it so it
     * never reaches the API, and takes a full row the admin fills with a
     * collapsible heading (src/admin/components/SectionHeader.tsx). Registering
     * it here is what makes `customField: "global::section"` in a schema load
     * instead of failing the boot.
     */
    strapi.customFields.register({
      name: "section",
      type: "string",
      inputSize: { default: 12, isResizable: false },
    });

    /**
     * "Sincronizar desde Sinco" for the Content Manager button.
     *
     * Registered here and NOT as a route file under an api folder: Strapi's
     * registerAPIRoutes does `router.type = "content-api"` unconditionally, so
     * a route declared there can never accept the admin JWT — which is the only
     * credential the admin panel has. Every click answered "Missing or invalid
     * credentials", then 405 once the path fell through to the panel's
     * catch-all. Going through server.routes({ type: "admin" }) is what
     * actually mounts it on the admin router.
     */
    strapi.server.routes({
      type: "admin",
      routes: [
        {
          method: "POST",
          path: "/projects/:documentId/sync-sinco",
          handler: "api::project.project.syncSinco",
          config: { policies: [] },
          info: { pluginName: "admin", type: "admin" },
        },
      ],
    });

    strapi.documents.use(async (context, next) => {
      const { uid, action } = context;
      const params = context.params as {
        documentId?: string;
        data?: Record<string, unknown>;
      };

      if (uid === SINCO_PROJECT_UID) {
        guardSincoCatalog(action);
      }

      // Before next(): the radicado has to exist on the row from the very first
      // write. It is the receipt the citizen is shown, and a PQR that exists for
      // even a moment without one is a PQR that cannot be quoted back.
      if (uid === PQR_UID && action === "create") {
        await stampPqr(strapi, params);
      }

      if (uid === PROJECT_UID) {
        if (action === "create" || action === "update") {
          // NOTE: pulling from Sinco does NOT happen here on purpose — see
          // syncProjectFromSinco. Saving must never wait on the ERP.
          await validateRecommendedSameCity(strapi, params);
        }
        if (action === "publish") {
          await validateFieldsByStage(strapi, params);
        }
        if (action === "unpublish" || action === "delete") {
          // Before next(): on delete the document still exists so we can read the slug.
          await createAutoRedirect(strapi, params);
        }
      }

      const result = await next();

      if (uid === PROJECT_UID && action === "publish") {
        await disableAutoRedirect(strapi, params);
      }

      // After next(): the lead must exist (and own a documentId) before it can
      // be pushed. Not awaited — the public form never waits on the CRM.
      if (uid === LEAD_UID && action === "create") {
        const documentId = (result as { documentId?: string } | undefined)?.documentId;
        if (documentId) schedulePushLeadToCrm(strapi, documentId);
      }

      // Same shape as the lead push, same reason: the person filing a complaint
      // must never wait on an SMTP server to get their radicado back.
      if (uid === PQR_UID && action === "create") {
        const documentId = (result as { documentId?: string } | undefined)?.documentId;
        if (documentId) scheduleNotifyPqr(strapi, documentId);
      }

      const changesTheSite =
        (PUBLIC_UIDS.has(uid) && DEPLOY_ACTIONS.has(action)) ||
        (DEPLOY_ON_UPDATE.has(uid) && action === "update");

      if (changesTheSite) {
        scheduleDeploy(strapi);
        // The assistant answers from a snapshot of this same content, so the
        // snapshot — and any cached answer built on it — dies with the change.
        // Otherwise a corrected price keeps being quoted from the answer cache.
        invalidateContext();
      }

      return result;
    });
  },

  /**
   * Public role permissions as code: read access to the site content and
   * create-only on leads. Idempotent — runs on every boot.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const publicRole = await strapi
      .query("plugin::users-permissions.role")
      .findOne({ where: { type: "public" } });
    if (!publicRole) return;

    const reads = [
      "api::project.project",
      "api::post.post",
      "api::city.city",
      "api::zone.zone",
      "api::macroproject.macroproject",
      "api::amenity.amenity",
      "api::point-of-interest.point-of-interest",
      "api::home-banner.home-banner",
      "api::redirect.redirect",
      "api::faq.faq",
      "api::legal-document.legal-document",
    ].flatMap((uid) => [`${uid}.find`, `${uid}.findOne`]);
    const singles = [
      "api::calculator-config.calculator-config.find",
      "api::exchange-rate.exchange-rate.find",
      "api::foreign-buyer-page.foreign-buyer-page.find",
      "api::home-page.home-page.find",
      "api::lead-form-config.lead-form-config.find",
    ];
    const actions = [
      ...reads,
      ...singles,
      "api::lead.lead.create",
      // Create only, never read: a PQR carries a name, an email and a
      // complaint, so a public `find` would publish other people's grievances.
      "api::pqr.pqr.create",
      // Igual con el boletín: un `find` abierto publicaría la lista de correos.
      "api::newsletter-subscriber.newsletter-subscriber.create",
      // The assistant. Its config single type is deliberately NOT public — the
      // site reads the two fields it needs through faq-bot.publicConfig.
      "api::faq-bot.faq-bot.ask",
      "api::faq-bot.faq-bot.publicConfig",
    ];

    for (const action of actions) {
      const existing = await strapi
        .query("plugin::users-permissions.permission")
        .findOne({ where: { action, role: publicRole.id } });
      if (!existing) {
        await strapi
          .query("plugin::users-permissions.permission")
          .create({ data: { action, role: publicRole.id } });
        strapi.log.info(`Public permission granted: ${action}`);
      }
    }

    // El asistente arranca con su configuración lista para editar, en vez de
    // obligar a alguien a escribir cinco campos antes de poder encenderlo.
    await ensureConfig(strapi);

    // Field labels in Spanish. Idempotent and cheap: it only writes when a
    // label actually differs.
    await applySpanishAdminLabels(strapi);

    // El orden de los formularios. Va después de las etiquetas porque las dos
    // escriben la misma fila del store, y así la segunda lee lo que dejó la
    // primera en vez de pisarla.
    await applyAdminLayouts(strapi);

    // The Sinco picker must not come up empty on a fresh install; afterwards the
    // cron owns it. Not awaited — a slow ERP must not hold up the boot.
    void syncSincoCatalogIfEmpty(strapi);
  },
};
