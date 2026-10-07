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
import { buildPartnerInstructions, buildPartnerPrompt } from "./partner-instructions";
import { PROJECT_UID } from "./project-rules";

export const LEAD_INTEGRATION_UID = "api::lead-integration.lead-integration";
const REQUEST_UID = "api::lead-integration-request.lead-integration-request";

/** How a delivery ended; `accepted` and `duplicate` are the two that are not refusals. */
type RequestOutcome =
  | "accepted"
  | "duplicate"
  | "invalid"
  | "unauthorized"
  | "disabled"
  | "origin"
  | "ip"
  | "rate"
  | "cap";

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

/** The answer plus what «Peticiones de integraciones» keeps of it. */
interface Verdict extends ExternalLeadResponse {
  outcome: RequestOutcome;
  detail?: string;
  leadDocumentId?: string;
  externalId?: string;
}

const refuse = (
  status: ExternalLeadResponse["status"],
  message: string,
  outcome: RequestOutcome,
  extra: Partial<Verdict> = {},
): Verdict => ({ status, body: { error: { status, message } }, outcome, ...extra });

function startOfToday(): string {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  return midnight.toISOString();
}

/**
 * Leaves one row per delivery in «Peticiones de integraciones» — the refused
 * ones too, which is the only place a partner's wrong key or a body it keeps
 * getting wrong can be seen. Only for a slug that exists: a stranger probing
 * random addresses must not be able to fill the table, and for the same
 * reason a flood on a real one stops being written past a ceiling per minute
 * (the leads themselves are never dropped by it).
 */
const LOGGED_PER_MINUTE = 120;

function recordRequest(
  strapi: Core.Strapi,
  integration: IntegrationDoc,
  request: ExternalLeadRequest,
  verdict: Verdict,
): void {
  if (!withinRate(`log:${integration.documentId}`, LOGGED_PER_MINUTE)) return;
  void strapi
    .documents(REQUEST_UID)
    .create({
      data: {
        integration: integration.documentId,
        outcome: verdict.outcome,
        status: verdict.status,
        detail: verdict.detail?.slice(0, 1000),
        lead: verdict.leadDocumentId,
        externalId: verdict.externalId,
        ip: request.ip ?? undefined,
        origin: request.origin ?? undefined,
        receivedAt: new Date().toISOString(),
      },
    })
    .catch((err: unknown) => {
      strapi.log.debug(`[leads-externos] could not log a request: ${String(err)}`);
    });
}

/** Deliveries older than this are history nobody reads; the leads stay. */
const KEEP_REQUESTS_DAYS = 90;

export async function pruneIntegrationRequests(strapi: Core.Strapi): Promise<void> {
  try {
    const before = new Date(Date.now() - KEEP_REQUESTS_DAYS * 86_400_000);
    await strapi.db.query(REQUEST_UID).deleteMany({ where: { receivedAt: { $lt: before } } });
  } catch (err) {
    strapi.log.warn(`[leads-externos] could not prune old requests: ${String(err)}`);
  }
}

export async function receiveExternalLead(
  strapi: Core.Strapi,
  request: ExternalLeadRequest,
): Promise<ExternalLeadResponse> {
  const integration = (await strapi.documents(LEAD_INTEGRATION_UID).findFirst({
    filters: { slug: request.slug },
  })) as IntegrationDoc | null;

  const { outcome, detail, leadDocumentId, externalId, ...response } = await judge(
    strapi,
    integration,
    request,
  );
  if (integration) {
    recordRequest(strapi, integration, request, {
      ...response,
      outcome,
      detail,
      leadDocumentId,
      externalId,
    });
  }
  return response;
}

/**
 * One delivery, from the first check to the stored lead. Returns the answer
 * instead of writing it, so the controller stays a thin HTTP shell.
 *
 * The order matters: the key is checked before anything that would tell a
 * stranger the integration exists but is paused, and the brakes run before the
 * body is parsed, so a flood costs a map lookup and not a validation each.
 */
/**
 * Who is asking: the key, the switch, the origin and the IP list. Shared by
 * the delivery and by the projects listing, so a partner that is paused or
 * cut off is so for both. `null` means it may come in.
 */
function admit(
  strapi: Core.Strapi,
  integration: IntegrationDoc | null,
  request: Omit<ExternalLeadRequest, "body">,
): Verdict | null {
  if (!integration || !keyMatches(request.apiKey, integration.apiKey)) {
    return refuse(401, "Invalid or missing API key", "unauthorized", {
      detail: request.apiKey ? "Clave incorrecta" : "Sin clave",
    });
  }
  if (!integration.enabled) {
    return refuse(403, "This integration is switched off", "disabled");
  }
  if (!originAllowed(request.origin, parseList(integration.allowedOrigins))) {
    return refuse(403, "Origin not allowed", "origin", { detail: request.origin ?? undefined });
  }
  if (!ipAllowed(request.ip, parseList(integration.allowedIps))) {
    strapi.log.warn(
      `[leads-externos] ${integration.slug}: IP ${request.ip ?? "?"} not on the list`,
    );
    return refuse(403, "IP address not allowed", "ip", { detail: request.ip ?? undefined });
  }
  return null;
}

async function judge(
  strapi: Core.Strapi,
  integration: IntegrationDoc | null,
  request: ExternalLeadRequest,
): Promise<Verdict> {
  const refusal = admit(strapi, integration, request);
  if (refusal || !integration)
    return refusal ?? refuse(401, "Invalid or missing API key", "unauthorized");

  if (!withinRate(integration.documentId, integration.ratePerMinute ?? 60)) {
    return refuse(429, "Too many requests, slow down", "rate", { retryAfter: 60 });
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
      return refuse(429, "Daily limit reached", "cap", { retryAfter: 3600 });
    }
  }

  // Both the bare object and Strapi's own `{ data: {...} }` envelope.
  const raw = request.body as { data?: unknown } | null | undefined;
  const payload = raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return refuse(400, "Send the lead as a JSON object", "invalid", {
      detail: "El cuerpo no es un objeto JSON",
    });
  }

  const parsed = v.safeParse(ExternalLeadSchema, dropEmpty(payload as Record<string, unknown>));
  if (!parsed.success) {
    const issues = parsed.issues.map((issue) => ({
      field: issue.path?.map((segment) => String(segment.key)).join("."),
      message: issue.message,
    }));
    return {
      status: 400,
      body: { error: { status: 400, message: "Invalid lead", issues } },
      outcome: "invalid",
      detail: issues.map((issue) => `${issue.field ?? "?"}: ${issue.message}`).join(" · "),
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
        outcome: "duplicate",
        leadDocumentId: existing.documentId,
        externalId: lead.externalId,
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
    outcome: "accepted",
    detail: warnings.join(" · ") || undefined,
    leadDocumentId: created.documentId,
    externalId: lead.externalId,
  };
}

/**
 * `GET /api/leads/external/<slug>/projects` — the projects a partner can name
 * in `project`, so it maps its own listings to our slugs without anyone
 * mailing a spreadsheet that goes stale. Same key and same checks as a
 * delivery; a limit of its own, so reading the list never eats the quota for
 * leads. Only what is already public on the site, and only homes, lots and
 * premises that are published.
 */
const PROJECT_LISTS_PER_MINUTE = 30;

export async function listProjectsForPartner(
  strapi: Core.Strapi,
  request: Omit<ExternalLeadRequest, "body">,
): Promise<ExternalLeadResponse> {
  const integration = (await strapi.documents(LEAD_INTEGRATION_UID).findFirst({
    filters: { slug: request.slug },
  })) as IntegrationDoc | null;

  const refusal = admit(strapi, integration, request);
  if (refusal || !integration) {
    const { status, body } = refusal ?? refuse(401, "Invalid or missing API key", "unauthorized");
    return { status, body };
  }
  if (!withinRate(`projects:${integration.documentId}`, PROJECT_LISTS_PER_MINUTE)) {
    return {
      status: 429,
      body: refuse(429, "Too many requests, slow down", "rate").body,
      retryAfter: 60,
    };
  }

  const projects = (await strapi.documents(PROJECT_UID).findMany({
    status: "published",
    fields: ["name", "slug", "productType", "stage"],
    populate: { city: { fields: ["name"] } },
    sort: "name:asc",
    limit: 500,
  })) as {
    name: string;
    slug: string;
    productType?: string | null;
    stage?: string | null;
    city?: { name?: string } | null;
  }[];

  return {
    status: 200,
    body: {
      data: projects.map((project) => ({
        slug: project.slug,
        name: project.name,
        city: project.city?.name ?? null,
        type: project.productType ?? "housing",
        stage: project.stage ?? null,
      })),
    },
  };
}

/* ---------------------------------------------------------------- admin */

const count = (strapi: Core.Strapi, uid: string, filters: Record<string, unknown>) =>
  strapi.documents(uid as typeof LEAD_UID).count({ filters });

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const CRM_STATUSES = ["sent", "duplicate", "pending", "failed", "unrouted", "skipped"] as const;
const REFUSALS: RequestOutcome[] = [
  "invalid",
  "unauthorized",
  "disabled",
  "origin",
  "ip",
  "rate",
  "cap",
];

export interface IntegrationSummary {
  name: string;
  slug: string;
  enabled: boolean;
  url: string;
  apiKey: string | null;
  /** The message to send the partner; null until the integration has a key. */
  instructions: string | null;
  /** The same contract as a prompt for the partner's coding assistant. */
  aiPrompt: string;
  lastLeadAt: string | null;
  leads: { today: number; week: number; month: number; total: number };
  /** Where its leads stand in the CRM. */
  crm: Record<string, number>;
  /** Deliveries of the last 7 days: the ones let in, and the refused by cause. */
  requests: { accepted: number; duplicate: number; refused: Record<string, number> };
}

/**
 * What the panel on the integration's edit view shows: the address and key to
 * hand over, and whether the partner is delivering — how many leads, where
 * they stand in Sinco, and how many of its requests are being turned away.
 */
export async function summarizeIntegration(
  strapi: Core.Strapi,
  documentId: string,
  baseUrl: string,
): Promise<IntegrationSummary | null> {
  const integration = (await strapi.documents(LEAD_INTEGRATION_UID).findOne({
    documentId,
  })) as (IntegrationDoc & { lastLeadAt?: string | null }) | null;
  if (!integration) return null;

  const mine = { integration: { documentId } };
  const leadsSince = (since?: string) =>
    count(strapi, LEAD_UID, { ...mine, ...(since ? { createdAt: { $gte: since } } : {}) });
  const requestsWith = (outcome: RequestOutcome) =>
    count(strapi, REQUEST_UID, { ...mine, outcome, receivedAt: { $gte: daysAgo(7) } });

  const [today, week, month, total, crmCounts, accepted, duplicate, refusedCounts] =
    await Promise.all([
      leadsSince(startOfToday()),
      leadsSince(daysAgo(7)),
      leadsSince(daysAgo(30)),
      leadsSince(),
      Promise.all(CRM_STATUSES.map((crmStatus) => count(strapi, LEAD_UID, { ...mine, crmStatus }))),
      requestsWith("accepted"),
      requestsWith("duplicate"),
      Promise.all(REFUSALS.map(requestsWith)),
    ]);

  const url = `${baseUrl.replace(/\/+$/, "")}/api/leads/external/${integration.slug}`;
  const nonZero = (keys: readonly string[], values: number[]) =>
    Object.fromEntries(keys.map((key, i) => [key, values[i] ?? 0]).filter(([, n]) => n !== 0));

  return {
    name: integration.name,
    slug: integration.slug,
    enabled: integration.enabled === true,
    url,
    apiKey: integration.apiKey ?? null,
    instructions: integration.apiKey
      ? buildPartnerInstructions({
          name: integration.name,
          url,
          apiKey: integration.apiKey,
          ratePerMinute: integration.ratePerMinute,
          dailyCap: integration.dailyCap,
        })
      : null,
    aiPrompt: buildPartnerPrompt({
      name: integration.name,
      url,
      apiKey: integration.apiKey ?? "<clave>",
      ratePerMinute: integration.ratePerMinute,
      dailyCap: integration.dailyCap,
    }),
    lastLeadAt: integration.lastLeadAt ?? null,
    leads: { today, week, month, total },
    crm: nonZero(CRM_STATUSES, crmCounts),
    requests: { accepted, duplicate, refused: nonZero(REFUSALS, refusedCounts) },
  };
}

/**
 * «Generar clave nueva»: saved empty, which is what makes the document
 * middleware issue one (`stampApiKey`). The old key stops working at once.
 */
export async function rotateApiKey(
  strapi: Core.Strapi,
  documentId: string,
): Promise<string | null> {
  const updated = (await strapi.documents(LEAD_INTEGRATION_UID).update({
    documentId,
    data: { apiKey: "" },
  })) as { apiKey?: string | null } | null;
  return updated?.apiKey ?? null;
}
