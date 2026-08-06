import { factories } from "@strapi/strapi";
import type { Core } from "@strapi/strapi";

import { recordJobRun } from "../../../utils/job-log";
import { syncProjectFromSinco } from "../../../utils/project-rules";

export default factories.createCoreController(
  "api::project.project",
  ({ strapi }: { strapi: Core.Strapi }) => ({
    /**
     * Explicit "Sync from Sinco" for a single project — the interactive
     * counterpart to the nightly cron. Deliberately not wired into save, so an
     * editor pays the ERP round trip only when they ask for it.
     *
     * Admin-only: the route is registered on the admin router from register()
     * (see src/index.ts) and is never granted to the public role in bootstrap.
     *
     * Messages are in Spanish because they are shown verbatim as a toast in the
     * Content Manager — they are copy, not log lines.
     */
    async syncSinco(ctx) {
      const { documentId } = ctx.params as { documentId?: string };
      if (!documentId) return ctx.badRequest("Falta el identificador del proyecto");

      const project = await strapi
        .documents("api::project.project")
        .findOne({ documentId, populate: ["sincoProject"] });
      if (!project) return ctx.notFound("No se encontró el proyecto");
      if (project.syncFromSinco !== true) {
        return ctx.badRequest(
          "Este proyecto tiene «Sincronizar desde Sinco» desactivado. Actívalo y guarda antes de sincronizar.",
        );
      }

      // A manual run belongs in the same log as the nightly one: otherwise the
      // "Registro de tareas" screen only ever shows the cron, and an editor
      // clicking the button has no trace of what happened.
      const startedAt = Date.now();
      const task = "Sincronización manual desde Sinco";
      try {
        const updated = await syncProjectFromSinco(strapi, documentId);
        await recordJobRun(
          strapi,
          task,
          "ok",
          updated
            ? `${project.name}: precio y áreas actualizados`
            : `${project.name}: Sinco no devolvió cambios`,
          Date.now() - startedAt,
        );
        return { data: { documentId, updated } };
      } catch (err) {
        strapi.log.error(`Manual Sinco sync failed for ${documentId}: ${String(err)}`);
        await recordJobRun(
          strapi,
          task,
          "error",
          `${project.name}: ${String(err)}`,
          Date.now() - startedAt,
        );
        // The ERP being down is not the editor's fault and not a 500 in our app.
        return ctx.badGateway(`Sinco no respondió: ${String(err)}`);
      }
    },
  }),
);
