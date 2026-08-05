import type { Core } from "@strapi/strapi";

import { applySpanishAdminLabels } from "./utils/admin-labels";
import { scheduleDeploy } from "./utils/deploy-hook";
import { LEAD_UID, schedulePushLeadToCrm } from "./utils/lead-rules";
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
]);

const DEPLOY_ACTIONS = new Set(["publish", "unpublish", "discardDraft", "delete"]);

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.documents.use(async (context, next) => {
      const { uid, action } = context;
      const params = context.params as {
        documentId?: string;
        data?: Record<string, unknown>;
      };

      if (uid === SINCO_PROJECT_UID) {
        guardSincoCatalog(action);
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

      if (PUBLIC_UIDS.has(uid) && DEPLOY_ACTIONS.has(action)) {
        scheduleDeploy(strapi);
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
    ].flatMap((uid) => [`${uid}.find`, `${uid}.findOne`]);
    const singles = [
      "api::calculator-config.calculator-config.find",
      "api::exchange-rate.exchange-rate.find",
      "api::foreign-buyer-page.foreign-buyer-page.find",
    ];
    const actions = [...reads, ...singles, "api::lead.lead.create"];

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

    // Field labels in Spanish. Idempotent and cheap: it only writes when a
    // label actually differs.
    await applySpanishAdminLabels(strapi);

    // The Sinco picker must not come up empty on a fresh install; afterwards the
    // cron owns it. Not awaited — a slow ERP must not hold up the boot.
    void syncSincoCatalogIfEmpty(strapi);
  },
};
