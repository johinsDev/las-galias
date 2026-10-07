import { factories } from "@strapi/strapi";

import {
  LEAD_INTEGRATION_UID,
  rotateApiKey,
  summarizeIntegration,
} from "../../../utils/lead-integration";

interface AdminUser {
  roles?: { code?: string }[];
}

/** These two hand out an API key, so they are the Super Admin's only. */
const isSuperAdmin = (user: AdminUser | undefined) =>
  user?.roles?.some((role) => role.code === "strapi-super-admin") === true;

/**
 * The integration's panel in the admin. Both handlers are mounted on the admin
 * router from src/index.ts — no content-api route points at them, so the key
 * can never be read with an API token or by the public role.
 */
export default factories.createCoreController(LEAD_INTEGRATION_UID, ({ strapi }) => ({
  /** Address, key, the message for the partner and the delivery figures. */
  async summary(ctx) {
    if (!isSuperAdmin(ctx.state.user as AdminUser)) {
      return ctx.forbidden("Solo el Super Admin puede ver la clave de una integración");
    }
    const { documentId } = ctx.params as { documentId?: string };
    // The CMS's public address when it is configured; else the one the admin
    // itself was reached at, which is the same host.
    const baseUrl = String(strapi.config.get("server.url") || "") || ctx.request.origin;
    const summary = documentId ? await summarizeIntegration(strapi, documentId, baseUrl) : null;
    if (!summary) return ctx.notFound("No se encontró la integración");
    return { data: summary };
  },

  /** «Generar clave nueva». Spanish messages: shown verbatim as a toast. */
  async rotateKey(ctx) {
    if (!isSuperAdmin(ctx.state.user as AdminUser)) {
      return ctx.forbidden("Solo el Super Admin puede cambiar la clave de una integración");
    }
    const { documentId } = ctx.params as { documentId?: string };
    const apiKey = documentId ? await rotateApiKey(strapi, documentId) : null;
    if (!apiKey) return ctx.notFound("No se encontró la integración");
    return { data: { apiKey } };
  },
}));
