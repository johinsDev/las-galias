import type { Core } from "@strapi/strapi";

import { scheduleDeploy } from "./utils/deploy-hook";
import {
  createAutoRedirect,
  disableAutoRedirect,
  mergeSincoData,
  PROJECT_UID,
  validateFieldsByStage,
  validateRecommendedSameCity,
} from "./utils/project-rules";

/** Content types whose publish/unpublish must rebuild the static site. */
const PUBLIC_UIDS = new Set<string>([
  PROJECT_UID,
  "api::post.post",
  "api::home-banner.home-banner",
  "api::macroproject.macroproject",
  "api::city.city",
  "api::amenity.amenity",
  "api::point-of-interest.point-of-interest",
  "api::redirect.redirect",
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

      if (uid === PROJECT_UID) {
        if (action === "create" || action === "update") {
          await mergeSincoData(strapi, params);
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
      "api::macroproject.macroproject",
      "api::amenity.amenity",
      "api::point-of-interest.point-of-interest",
      "api::home-banner.home-banner",
      "api::redirect.redirect",
    ].flatMap((uid) => [`${uid}.find`, `${uid}.findOne`]);
    const singles = [
      "api::calculator-config.calculator-config.find",
      "api::exchange-rate.exchange-rate.find",
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
  },
};
