import { factories } from "@strapi/strapi";
import * as v from "valibot";

import {
  ForeignLeadSubmissionSchema,
  inferLeadForm,
  LEAD_FORMS,
  LeadSubmissionSchema,
  type LeadFormId,
} from "@lasgalias/schemas";

import { resendLeadsByStatus, resendLeadToCrm, type CrmStatus } from "../../../utils/lead-rules";

/**
 * The public `create` is the only door the CRM bookkeeping must never come
 * through, and the two `resend*` handlers are the admin's — mounted on the
 * admin router from src/index.ts, never on a content-api route.
 */
export default factories.createCoreController("api::lead.lead", ({ strapi }) => ({
  /**
   * What the site's islands POST. The body is re-shaped through the shared
   * valibot schema before Strapi sees it: only the form's own fields survive,
   * so `crmStatus`, `crmAttempts` and friends cannot be set from outside, and
   * a phone or a consent the browser skipped validating is refused here.
   *
   * `form` is taken from the body when it is a known value, and inferred from
   * `source` when the body has none — the site keeps working through the
   * minutes between this CMS deploying and the web deploying after it.
   */
  async create(ctx) {
    const body = (ctx.request.body as { data?: unknown } | undefined)?.data;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return ctx.badRequest("Missing data");
    }
    const data = body as Record<string, unknown>;

    // Honeypot: a field no person sees. Bots fill it; the response looks like
    // success so they do not learn anything, and nothing is stored.
    if (typeof data.website === "string" && data.website.trim() !== "") {
      ctx.status = 201;
      ctx.body = { data: null, meta: {} };
      return;
    }

    let form: LeadFormId;
    if (data.form === undefined || data.form === null) {
      form = inferLeadForm(typeof data.source === "string" ? data.source : undefined);
    } else if (
      typeof data.form === "string" &&
      (LEAD_FORMS as readonly string[]).includes(data.form)
    ) {
      form = data.form as LeadFormId;
    } else {
      return ctx.badRequest("Formulario desconocido");
    }

    const schema = form === "exterior" ? ForeignLeadSubmissionSchema : LeadSubmissionSchema;
    const parsed = v.safeParse(schema, data);
    if (!parsed.success) {
      return ctx.badRequest("Datos inválidos", {
        issues: parsed.issues.map((issue) => ({
          path: issue.path?.map((segment) => String(segment.key)).join("."),
          message: issue.message,
        })),
      });
    }

    ctx.request.body = { data: { ...parsed.output, form } };
    // The core `create` keeps Strapi's own sanitising, the 201 and the
    // `{ data, meta }` shape the islands expect — and goes through the
    // document service, so the middleware in src/index.ts still pushes the
    // lead to the CRM.
    return super.create(ctx);
  },

  /**
   * «Reenviar al CRM» for one lead. Spanish messages: they are shown verbatim
   * as a toast in the Content Manager.
   */
  async resendCrm(ctx) {
    const { documentId } = ctx.params as { documentId?: string };
    if (!documentId) return ctx.badRequest("Falta el identificador del lead");
    const force = (ctx.query as { force?: string }).force === "1";

    const result = await resendLeadToCrm(strapi, documentId, { force });
    if (!result) return ctx.notFound("No se encontró el lead");
    return { data: result };
  },

  /** «Reenviar fallidos» / «Reenviar sin proyecto» from the list. */
  async resendFailedCrm(ctx) {
    const requested = (ctx.query as { status?: string }).status ?? "failed";
    const byName: Record<string, CrmStatus[]> = {
      failed: ["failed"],
      unrouted: ["unrouted"],
      all: ["failed", "unrouted"],
    };
    const statuses = byName[requested];
    if (!statuses) return ctx.badRequest("Estado desconocido");

    const result = await resendLeadsByStatus(strapi, statuses);
    return { data: result };
  },
}));
