import { factories } from "@strapi/strapi";
import type { Core } from "@strapi/strapi";

import { syncProjectFromSinco } from "../../../utils/project-rules";

export default factories.createCoreController(
  "api::project.project",
  ({ strapi }: { strapi: Core.Strapi }) => ({
    /**
     * Explicit "Sync from Sinco" for a single project — the interactive
     * counterpart to the nightly cron. Deliberately not wired into save, so an
     * editor pays the ERP round trip only when they ask for it.
     *
     * Admin-only: the route is registered outside the public content API and is
     * never granted to the public role in bootstrap.
     */
    async syncSinco(ctx) {
      const { documentId } = ctx.params as { documentId?: string };
      if (!documentId) return ctx.badRequest("documentId is required");

      const project = await strapi
        .documents("api::project.project")
        .findOne({ documentId, populate: ["sincoProject"] });
      if (!project) return ctx.notFound("Project not found");
      if (project.syncFromSinco !== true) {
        return ctx.badRequest('This project has "sync from Sinco" disabled');
      }

      try {
        const updated = await syncProjectFromSinco(strapi, documentId);
        return { data: { documentId, updated } };
      } catch (err) {
        strapi.log.error(`Manual Sinco sync failed for ${documentId}: ${String(err)}`);
        // The ERP being down is not the editor's fault and not a 500 in our app.
        return ctx.badGateway(`Sinco did not answer: ${String(err)}`);
      }
    },
  }),
);
