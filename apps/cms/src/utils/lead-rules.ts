import type { Core } from "@strapi/strapi";

import type { ExternalLead } from "@lasgalias/providers";
import { recordJobRun } from "./job-log";
import {
  buildObservacion,
  hasAnyDefault,
  resolveSincoTarget,
  type CrmRouting,
  type SincoTarget,
} from "./lead-routing";
import { getLeadProvider } from "./providers";

export const LEAD_UID = "api::lead.lead";
export const CRM_CONFIG_UID = "api::crm-config.crm-config";

/** Give up after this many pushes so a permanently broken lead stops retrying. */
const MAX_ATTEMPTS = 5;

export type CrmStatus = "pending" | "sent" | "duplicate" | "failed" | "skipped" | "unrouted";

/**
 * The document service drops `undefined` keys, so clearing a text field takes
 * an explicit null — which its typings refuse. One cast, in one place.
 */
const CLEAR = null as unknown as undefined;

/** What the provider said before `unrouted` existed; the bootstrap reclassifies these. */
const LEGACY_UNROUTED_ERROR = "no usable Sinco project id";

interface CrmConfigDoc extends CrmRouting {
  alertEmail?: string | null;
}

interface LeadDoc {
  documentId: string;
  name: string;
  email?: string | null;
  phone: string;
  message?: string | null;
  form?: string | null;
  source?: string | null;
  acceptsDataPolicy?: boolean;
  acceptsEmail?: boolean;
  acceptsSms?: boolean;
  acceptsWhatsApp?: boolean;
  acceptsCall?: boolean;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  incomeRange?: string | null;
  residenceCity?: string | null;
  residenceCountry?: string | null;
  interestCity?: string | null;
  referralSource?: string | null;
  budgetRange?: string | null;
  savingsRange?: string | null;
  severance?: string | null;
  firstHome?: boolean | null;
  crmStatus?: CrmStatus;
  crmVisitId?: string | null;
  crmAttempts?: number;
  crmLastError?: string | null;
  project?: {
    name?: string;
    sincoProject?: { sincoId?: string; macroSincoId?: string } | null;
  } | null;
}

/** «Configuración · CRM», with the catalog rows it points at. `null` until someone saves it. */
async function loadCrmRouting(strapi: Core.Strapi): Promise<CrmConfigDoc | null> {
  // The relations the routing needs, so one `findFirst` carries them all.
  return (await strapi.documents(CRM_CONFIG_UID).findFirst({
    populate: [
      "defaultProject",
      "projectListado",
      "projectLotes",
      "projectLocales",
      "projectExterior",
      "projectWhatsapp",
    ],
  })) as CrmConfigDoc | null;
}

function toExternalLead(doc: LeadDoc, target: SincoTarget): ExternalLead {
  return {
    id: doc.documentId,
    fullName: doc.name,
    email: doc.email ?? "",
    phone: doc.phone,
    // Everything Sinco has no column for, so the advisor still sees it.
    message: buildObservacion(doc, target),
    // Both ids come from the same catalog row, so they can never disagree.
    projectExternalId: target.sincoId,
    macroExternalId: target.macroSincoId,
    consents: {
      dataPolicy: doc.acceptsDataPolicy === true,
      email: doc.acceptsEmail,
      sms: doc.acceptsSms,
      whatsapp: doc.acceptsWhatsApp,
      call: doc.acceptsCall,
    },
    attribution: {
      source: doc.utmSource ?? undefined,
      medium: doc.utmMedium ?? undefined,
      campaign: doc.utmCampaign ?? undefined,
      reference: doc.source ?? undefined,
    },
  };
}

async function loadLead(strapi: Core.Strapi, documentId: string): Promise<LeadDoc | null> {
  return (await strapi.documents(LEAD_UID).findOne({
    documentId,
    // The CRM needs the project id *and* its macroproject id; the catalog entry
    // carries both.
    populate: { project: { populate: ["sincoProject"] } },
  })) as LeadDoc | null;
}

/**
 * Pushes one lead to the CRM and records the outcome on the document.
 *
 * Never throws: the lead is already safe in Strapi and the sales team can read
 * it there, so a CRM outage must not take the public form down with it. The
 * result lives in `crmStatus` and failures are picked up again by the retry
 * cron.
 *
 * A lead with nowhere to go — no project of its own and nothing configured for
 * its form — is `unrouted`, not `failed`: it costs no attempt, and the cron
 * takes it up again the moment a default is configured.
 */
async function pushLeadToCrm(
  strapi: Core.Strapi,
  documentId: string,
  routing?: CrmConfigDoc | null,
): Promise<CrmStatus | null> {
  const provider = getLeadProvider();
  const doc = await loadLead(strapi, documentId);
  if (!doc) return null;

  const config = routing === undefined ? await loadCrmRouting(strapi) : routing;
  const target = resolveSincoTarget(doc, config);

  if (!target) {
    const formName = doc.form ?? "manual";
    await strapi.documents(LEAD_UID).update({
      documentId,
      data: {
        crmStatus: "unrouted",
        crmLastError:
          `Sin proyecto de Sinco: el lead no tiene proyecto y no hay uno por defecto para el ` +
          `formulario «${formName}» ni uno general (Configuración · CRM).`,
      },
    });
    strapi.log.warn(`Lead ${documentId} (${formName}) has no Sinco project to go to`);
    if (doc.crmStatus !== "unrouted") scheduleAlert(strapi, doc, "unrouted", config);
    return "unrouted";
  }

  const attempts = (doc.crmAttempts ?? 0) + 1;

  try {
    const result = await provider.submit(toExternalLead(doc, target));
    // The manual provider is a no-op and returns nothing — that is "skipped",
    // not a successful push.
    const status: CrmStatus = !result ? "skipped" : result.duplicate ? "duplicate" : "sent";
    await strapi.documents(LEAD_UID).update({
      documentId,
      data: {
        crmStatus: status,
        crmVisitId: result?.externalId,
        crmAttempts: attempts,
        crmLastError: CLEAR,
      },
    });
    if (result) {
      strapi.log.info(
        `Lead ${documentId} ${result.duplicate ? "matched an existing visit" : "pushed"} in ` +
          `"${provider.name}" via ${target.via}: ${result.externalId}`,
      );
    }
    return status;
  } catch (err) {
    const message = String(err);
    await strapi.documents(LEAD_UID).update({
      documentId,
      data: { crmStatus: "failed", crmAttempts: attempts, crmLastError: message.slice(0, 1000) },
    });
    strapi.log.error(
      `Lead ${documentId} push to "${provider.name}" failed (attempt ${attempts}): ${message}`,
    );
    if (attempts >= MAX_ATTEMPTS) {
      scheduleAlert(strapi, { ...doc, crmLastError: message }, "failed", config);
    }
    return "failed";
  }
}

/**
 * Fire-and-forget push from the create middleware. Deliberately not awaited by
 * the caller: the HTTP response to the public form must not wait on the CRM.
 */
export function schedulePushLeadToCrm(strapi: Core.Strapi, documentId: string): void {
  void pushLeadToCrm(strapi, documentId).catch((err: unknown) => {
    strapi.log.error(`Unexpected error pushing lead ${documentId}: ${String(err)}`);
  });
}

/**
 * Cron pass: retries everything the CRM has not taken yet. Unrouted leads are
 * only included once something is configured to route them — otherwise they
 * would churn every fifteen minutes to the same answer.
 */
export async function retryPendingLeads(strapi: Core.Strapi): Promise<void> {
  const routing = await loadCrmRouting(strapi);
  const pending = (await strapi.documents(LEAD_UID).findMany({
    filters: {
      $or: [
        { crmStatus: { $in: ["pending", "failed"] }, crmAttempts: { $lt: MAX_ATTEMPTS } },
        ...(hasAnyDefault(routing) ? [{ crmStatus: "unrouted" as const }] : []),
      ],
    },
    limit: 50,
  })) as LeadDoc[];
  if (pending.length === 0) return;

  strapi.log.info(`Retrying ${pending.length} lead(s) pending in the CRM`);
  for (const lead of pending) {
    await pushLeadToCrm(strapi, lead.documentId, routing);
  }
}

/* ---------------------------------------------------------------- resend */

export interface ResendResult {
  refused?: true;
  crmStatus?: CrmStatus | null;
  crmVisitId?: string | null;
  crmLastError?: string | null;
}

/**
 * «Reenviar al CRM» for one lead: attempts back to zero and pushed right now.
 * A lead the CRM already took is refused unless forced — Sinco would only
 * answer "duplicate" again, and an editor clicking by reflex should not burn a
 * request on it.
 */
export async function resendLeadToCrm(
  strapi: Core.Strapi,
  documentId: string,
  options: { force?: boolean } = {},
): Promise<ResendResult | null> {
  const doc = await loadLead(strapi, documentId);
  if (!doc) return null;
  if ((doc.crmStatus === "sent" || doc.crmStatus === "duplicate") && !options.force) {
    return { refused: true, crmStatus: doc.crmStatus, crmVisitId: doc.crmVisitId ?? null };
  }

  await strapi.documents(LEAD_UID).update({
    documentId,
    data: { crmStatus: "pending", crmAttempts: 0, crmLastError: CLEAR },
  });
  await pushLeadToCrm(strapi, documentId);

  const after = await loadLead(strapi, documentId);
  return {
    crmStatus: after?.crmStatus ?? null,
    crmVisitId: after?.crmVisitId ?? null,
    crmLastError: after?.crmLastError ?? null,
  };
}

export interface BulkResendResult {
  attempted: number;
  counts: Record<string, number>;
  /** Still matching after the pass: the button says "pulsa otra vez". */
  remaining: number;
}

/**
 * «Reenviar fallidos» / «Reenviar sin proyecto» from the list. Capped like the
 * cron: hundreds of sequential Sinco calls do not belong inside one HTTP
 * request. Logged to «Registro de tareas» so a click leaves the same trace as
 * a cron run.
 */
export async function resendLeadsByStatus(
  strapi: Core.Strapi,
  statuses: CrmStatus[],
  limit = 50,
): Promise<BulkResendResult> {
  const startedAt = Date.now();
  const routing = await loadCrmRouting(strapi);
  const leads = (await strapi.documents(LEAD_UID).findMany({
    filters: { crmStatus: { $in: statuses } },
    sort: "createdAt:asc",
    limit,
    fields: ["documentId"],
  })) as { documentId: string }[];

  const counts: Record<string, number> = {};
  for (const lead of leads) {
    await strapi.documents(LEAD_UID).update({
      documentId: lead.documentId,
      data: { crmStatus: "pending", crmAttempts: 0, crmLastError: CLEAR },
    });
    const status = (await pushLeadToCrm(strapi, lead.documentId, routing)) ?? "pending";
    counts[status] = (counts[status] ?? 0) + 1;
  }

  const remaining = await strapi
    .documents(LEAD_UID)
    .count({ filters: { crmStatus: { $in: statuses } } });

  const summary = Object.entries(counts)
    .map(([status, n]) => `${status}=${n}`)
    .join(" ");
  await recordJobRun(
    strapi,
    "Reenvío manual de leads",
    counts.failed || counts.unrouted ? "error" : "ok",
    `${leads.length} reenviado(s) (${statuses.join(", ")}): ${summary || "nada que reenviar"}; quedan ${remaining}`,
    Date.now() - startedAt,
  );

  return { attempted: leads.length, counts, remaining };
}

/**
 * Puts leads back in the cron's queue without pushing them: saving a project
 * or the CRM config must never wait on the ERP (the rule the whole CMS
 * follows), so recovery happens on the next cron pass — or on the list button.
 */
async function requeueLeads(
  strapi: Core.Strapi,
  filters: Record<string, unknown>,
  reason: string,
): Promise<number> {
  const leads = (await strapi.documents(LEAD_UID).findMany({
    filters,
    fields: ["documentId"],
    limit: -1,
  })) as { documentId: string }[];
  for (const lead of leads) {
    await strapi.documents(LEAD_UID).update({
      documentId: lead.documentId,
      data: { crmStatus: "pending", crmAttempts: 0, crmLastError: CLEAR },
    });
  }
  if (leads.length > 0) strapi.log.info(`Requeued ${leads.length} lead(s) for the CRM: ${reason}`);
  return leads.length;
}

/** Not awaited by anything that answers a request. */
function scheduleRequeue(
  strapi: Core.Strapi,
  filters: Record<string, unknown>,
  reason: string,
): void {
  void requeueLeads(strapi, filters, reason).catch((err: unknown) => {
    strapi.log.error(`Could not requeue leads (${reason}): ${String(err)}`);
  });
}

/** Failed/unrouted leads of one project: for when its Sinco entry is set or changed. */
export function requeueProjectLeads(strapi: Core.Strapi, projectDocumentId: string): void {
  scheduleRequeue(
    strapi,
    { project: { documentId: projectDocumentId }, crmStatus: { $in: ["failed", "unrouted"] } },
    `project ${projectDocumentId} changed its Sinco entry`,
  );
}

/** Everything waiting on a default: for when «Configuración · CRM» is saved. */
export function requeueUnroutedLeads(strapi: Core.Strapi): void {
  scheduleRequeue(
    strapi,
    {
      $or: [
        { crmStatus: "unrouted" },
        { crmStatus: "failed", crmLastError: { $contains: LEGACY_UNROUTED_ERROR } },
      ],
    },
    "CRM config saved",
  );
}

/**
 * One-off at boot, idempotent: leads that failed before `unrouted` existed
 * carry the provider's "no usable Sinco project id" — the same situation with
 * an honest name now, and zero attempts so a configured default picks them up.
 */
export async function reclassifyLegacyUnrouted(strapi: Core.Strapi): Promise<void> {
  try {
    const legacy = (await strapi.documents(LEAD_UID).findMany({
      filters: { crmStatus: "failed", crmLastError: { $contains: LEGACY_UNROUTED_ERROR } },
      fields: ["documentId"],
      limit: -1,
    })) as { documentId: string }[];
    for (const lead of legacy) {
      await strapi.documents(LEAD_UID).update({
        documentId: lead.documentId,
        data: { crmStatus: "unrouted", crmAttempts: 0 },
      });
    }
    if (legacy.length > 0) strapi.log.info(`Reclassified ${legacy.length} lead(s) as unrouted`);
  } catch (err) {
    strapi.log.warn(`Could not reclassify legacy unrouted leads: ${String(err)}`);
  }
}

/* ---------------------------------------------------------------- alerts */

/**
 * Tells someone a lead is stuck: it ended `unrouted`, or `failed` for the last
 * time. Only on those terminal transitions, so a flaky ERP does not mean five
 * emails per lead. Same rules as the PQR notification: no recipient or no
 * SMTP host means a warning in the log, never a pretend send.
 */
function scheduleAlert(
  strapi: Core.Strapi,
  doc: LeadDoc,
  kind: "unrouted" | "failed",
  config: CrmConfigDoc | null,
): void {
  void notifyCrmProblem(strapi, doc, kind, config).catch((err: unknown) => {
    strapi.log.error(`CRM alert for lead ${doc.documentId} failed: ${String(err)}`);
  });
}

async function notifyCrmProblem(
  strapi: Core.Strapi,
  doc: LeadDoc,
  kind: "unrouted" | "failed",
  config: CrmConfigDoc | null,
): Promise<void> {
  const to = config?.alertEmail || process.env.CRM_ALERT_EMAIL;
  if (!to) {
    strapi.log.warn(
      `No CRM alert recipient (Configuración · CRM or CRM_ALERT_EMAIL) — nobody was told lead ${doc.documentId} is ${kind}`,
    );
    return;
  }
  if (!process.env.SMTP_HOST) {
    strapi.log.warn(
      `SMTP_HOST is not set — the CRM alert for lead ${doc.documentId} was not delivered`,
    );
    return;
  }

  const base = process.env.PUBLIC_URL?.replace(/\/$/, "");
  const adminUrl = base
    ? `${base}/admin/content-manager/collection-types/${LEAD_UID}/${doc.documentId}`
    : null;
  const headline =
    kind === "unrouted"
      ? "Un lead del sitio no tiene proyecto de Sinco al que ir"
      : `Un lead del sitio no pudo enviarse a Sinco tras ${MAX_ATTEMPTS} intentos`;

  const lines = [
    headline,
    "",
    `Nombre: ${doc.name}`,
    `Celular: ${doc.phone}`,
    `Correo: ${doc.email ?? ""}`,
    `Formulario: ${doc.form ?? "manual"}`,
    doc.project?.name ? `Proyecto: ${doc.project.name}` : null,
    "",
    `Motivo: ${doc.crmLastError ?? ""}`,
    adminUrl ? `\nVerlo en el admin: ${adminUrl}` : null,
    kind === "unrouted"
      ? "\nConfigura un proyecto por defecto en «Configuración · CRM» y el lead se reenviará solo."
      : "\nCorrige la causa y usa «Reenviar al CRM» en la ficha del lead.",
  ].filter((line) => line !== null);

  await strapi
    .plugin("email")
    .service("email")
    .send({
      to,
      subject: `[CRM] ${kind === "unrouted" ? "Lead sin proyecto" : "Lead no enviado"}: ${doc.name}`,
      text: lines.join("\n"),
    });
}
