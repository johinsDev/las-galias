import { randomBytes } from "node:crypto";

import type { Core } from "@strapi/strapi";
import * as v from "valibot";

import { ExternalLeadSchema } from "@lasgalias/schemas";

import {
  dropEmpty,
  ipAllowed,
  keyMatches,
  originAllowed,
  parseList,
  withinRate,
} from "./external-lead-guard";
import { LEAD_UID } from "./lead-rules";
import { PROJECT_UID } from "./project-rules";

export const LEAD_INTEGRATION_UID = "api::lead-integration.lead-integration";

/**
 * Leads from outside the site: a partner (a portal such as Zonario) posts to
 * `/api/leads/external/<slug>` and the lead is stored like any other, then
 * pushed to Sinco by the same middleware and cron as the site's own.
 *
 * Each partner is one row of «Integración de leads» — its key, its brakes and
 * whether its leads go on to Sinco — so adding one, pausing it or cutting it
 * off is an edit in the admin, not a deploy. docs/leads-externos.md is the
 * contract a partner is handed.
 */
interface IntegrationDoc {
  documentId: string;
  name: string;
  slug: string;
  enabled?: boolean | null;
  apiKey?: string | null;
  allowedOrigins?: string | null;
  allowedIps?: string | null;
  ratePerMinute?: number | null;
  dailyCap?: number | null;
  sendToCrm?: boolean | null;
}

/**
 * The key is made here, never typed: on create, and again whenever the field
 * is saved empty — which is how an editor rotates it after a leak.
 */
export function stampApiKey(action: string, data: Record<string, unknown> | undefined): void {
  if (!data) return;
  const blank = typeof data.apiKey !== "string" || data.apiKey.trim() === "";
  const asked = action === "create" || "apiKey" in data;
  if (asked && blank) data.apiKey = `lg_${randomBytes(24).toString("base64url")}`;
}

export interface ExternalLeadRequest {
  slug: string;
  apiKey: string | null;
  origin?: string | null;
  ip?: string | null;
  body: unknown;
}

export interface ExternalLeadResponse {
  status: 200 | 201 | 400 | 401 | 403 | 404 | 429;
  body: Record<string, unknown>;
  /** Seconds, for the `Retry-After` header of a 429. */
  retryAfter?: number;
}

const refuse = (
  status: ExternalLeadResponse["status"],
  message: string,
  extra: Partial<ExternalLeadResponse> = {},
): ExternalLeadResponse => ({ status, body: { error: { status, message } }, ...extra });

function startOfToday(): string {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  return midnight.toISOString();
}

/**
 * One delivery, from the first check to the stored lead. Returns the answer
 * instead of writing it, so the controller stays a thin HTTP shell.
 *
 * The order matters: the key is checked before anything that would tell a
 * stranger the integration exists but is paused, and the brakes run before the
 * body is parsed, so a flood costs a map lookup and not a validation each.
 */
export async function receiveExternalLead(
  strapi: Core.Strapi,
  request: ExternalLeadRequest,
): Promise<ExternalLeadResponse> {
  const integration = (await strapi.documents(LEAD_INTEGRATION_UID).findFirst({
    filters: { slug: request.slug },
  })) as IntegrationDoc | null;

  if (!integration || !keyMatches(request.apiKey, integration.apiKey)) {
    return refuse(401, "Invalid or missing API key");
  }
  if (!integration.enabled) {
    return refuse(403, "This integration is switched off");
  }
  if (!originAllowed(request.origin, parseList(integration.allowedOrigins))) {
    return refuse(403, "Origin not allowed");
  }
  if (!ipAllowed(request.ip, parseList(integration.allowedIps))) {
    strapi.log.warn(
      `[leads-externos] ${integration.slug}: IP ${request.ip ?? "?"} not on the list`,
    );
    return refuse(403, "IP address not allowed");
  }
  if (!withinRate(integration.documentId, integration.ratePerMinute ?? 60)) {
    return refuse(429, "Too many requests, slow down", { retryAfter: 60 });
  }

  const dailyCap = integration.dailyCap ?? 0;
  if (dailyCap > 0) {
    const today = await strapi.documents(LEAD_UID).count({
      filters: {
        integration: { documentId: integration.documentId },
        createdAt: { $gte: startOfToday() },
      },
    });
    if (today >= dailyCap) {
      strapi.log.warn(`[leads-externos] ${integration.slug}: daily cap of ${dailyCap} reached`);
      return refuse(429, "Daily limit reached", { retryAfter: 3600 });
    }
  }

  // Both the bare object and Strapi's own `{ data: {...} }` envelope.
  const raw = request.body as { data?: unknown } | null | undefined;
  const payload = raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return refuse(400, "Send the lead as a JSON object");
  }

  const parsed = v.safeParse(ExternalLeadSchema, dropEmpty(payload as Record<string, unknown>));
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: {
          status: 400,
          message: "Invalid lead",
          issues: parsed.issues.map((issue) => ({
            field: issue.path?.map((segment) => String(segment.key)).join("."),
            message: issue.message,
          })),
        },
      },
    };
  }
  const { project: projectSlug, ...lead } = parsed.output;

  // A partner that retries a delivery must not create the lead twice — nor
  // send the advisor the same person twice.
  if (lead.externalId) {
    const [existing] = (await strapi.documents(LEAD_UID).findMany({
      filters: {
        integration: { documentId: integration.documentId },
        externalId: lead.externalId,
      },
      fields: ["documentId", "crmStatus"],
      limit: 1,
    })) as { documentId: string; crmStatus?: string }[];
    if (existing) {
      return {
        status: 200,
        body: { data: { id: existing.documentId, crmStatus: existing.crmStatus, duplicate: true } },
      };
    }
  }

  // A project the site does not have is not a reason to lose the lead: it is
  // stored without one, routed by the integration's own Sinco project, and the
  // partner is told so it can fix its mapping.
  const warnings: string[] = [];
  let projectDocumentId: string | undefined;
  if (projectSlug) {
    const project = (await strapi.documents(PROJECT_UID).findFirst({
      filters: { slug: projectSlug },
      status: "published",
      fields: ["documentId"],
    })) as { documentId: string } | null;
    if (project) projectDocumentId = project.documentId;
    else warnings.push(`Unknown project "${projectSlug}": the lead was stored without one`);
  }

  // Through the document service, so the middleware in src/index.ts pushes it
  // to the CRM exactly as it does a lead from the site.
  const created = (await strapi.documents(LEAD_UID).create({
    data: {
      ...lead,
      form: "externo",
      source: `externo:${integration.slug}`,
      integration: integration.documentId,
      ...(projectDocumentId ? { project: projectDocumentId } : {}),
      crmStatus: integration.sendToCrm === false ? "skipped" : "pending",
    },
  })) as { documentId: string; crmStatus?: string };

  // Straight to the table: through the document service this would run the
  // integration's own middleware (and re-queue its leads) on every delivery.
  void strapi.db
    .query(LEAD_INTEGRATION_UID)
    .updateMany({
      where: { documentId: integration.documentId },
      data: { lastLeadAt: new Date() },
    })
    .catch((err: unknown) => {
      strapi.log.warn(`[leads-externos] could not stamp ${integration.slug}: ${String(err)}`);
    });

  return {
    status: 201,
    body: {
      data: { id: created.documentId, crmStatus: created.crmStatus, duplicate: false },
      ...(warnings.length > 0 ? { warnings } : {}),
    },
  };
}
