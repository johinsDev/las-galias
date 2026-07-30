import type { Core } from "@strapi/strapi";

import type { ExternalLead } from "@lasgalias/providers";
import { getLeadProvider } from "./providers";

export const LEAD_UID = "api::lead.lead";

/** Give up after this many pushes so a permanently broken lead stops retrying. */
const MAX_ATTEMPTS = 5;

interface LeadDoc {
  documentId: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  source?: string;
  acceptsDataPolicy?: boolean;
  acceptsEmail?: boolean;
  acceptsSms?: boolean;
  acceptsWhatsApp?: boolean;
  acceptsCall?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  crmAttempts?: number;
  project?: {
    sincoProject?: { sincoId?: string; macroSincoId?: string } | null;
  } | null;
}

function toExternalLead(doc: LeadDoc): ExternalLead {
  return {
    id: doc.documentId,
    fullName: doc.name,
    email: doc.email,
    phone: doc.phone,
    message: doc.message,
    // Both come from the same picked catalog entry, so they can never disagree.
    projectExternalId: doc.project?.sincoProject?.sincoId,
    macroExternalId: doc.project?.sincoProject?.macroSincoId,
    consents: {
      dataPolicy: doc.acceptsDataPolicy === true,
      email: doc.acceptsEmail,
      sms: doc.acceptsSms,
      whatsapp: doc.acceptsWhatsApp,
      call: doc.acceptsCall,
    },
    attribution: {
      source: doc.utmSource,
      medium: doc.utmMedium,
      campaign: doc.utmCampaign,
      reference: doc.source,
    },
  };
}

/**
 * Pushes one lead to the CRM and records the outcome on the document.
 *
 * Never throws: the lead is already safe in Strapi and the sales team can read
 * it there, so a CRM outage must not take the public form down with it. The
 * result lives in `crmStatus` (`sent` / `failed` / `skipped`) and failures are
 * picked up again by the retry cron.
 */
async function pushLeadToCrm(strapi: Core.Strapi, documentId: string): Promise<void> {
  const provider = getLeadProvider();
  const doc = (await strapi.documents(LEAD_UID).findOne({
    documentId,
    // The CRM needs the project id *and* its macroproject id; the catalog entry
    // carries both.
    populate: { project: { populate: ["sincoProject"] } },
  })) as LeadDoc | null;
  if (!doc) return;

  const attempts = (doc.crmAttempts ?? 0) + 1;

  try {
    const result = await provider.submit(toExternalLead(doc));
    // The manual provider is a no-op and returns nothing — that is "skipped",
    // not a successful push.
    const status = !result ? "skipped" : result.duplicate ? "duplicate" : "sent";
    await strapi.documents(LEAD_UID).update({
      documentId,
      data: {
        crmStatus: status,
        crmVisitId: result?.externalId,
        crmAttempts: attempts,
        crmLastError: undefined,
      },
    });
    if (result) {
      strapi.log.info(
        `Lead ${documentId} ${result.duplicate ? "matched an existing visit" : "pushed"} in ` +
          `"${provider.name}": ${result.externalId}`,
      );
    }
  } catch (err) {
    const message = String(err);
    await strapi.documents(LEAD_UID).update({
      documentId,
      data: { crmStatus: "failed", crmAttempts: attempts, crmLastError: message.slice(0, 1000) },
    });
    strapi.log.error(
      `Lead ${documentId} push to "${provider.name}" failed (attempt ${attempts}): ${message}`,
    );
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

/** Cron pass: retries everything the CRM has not taken yet. */
export async function retryPendingLeads(strapi: Core.Strapi): Promise<void> {
  const pending = (await strapi.documents(LEAD_UID).findMany({
    filters: {
      crmStatus: { $in: ["pending", "failed"] },
      crmAttempts: { $lt: MAX_ATTEMPTS },
    },
    limit: 50,
  })) as LeadDoc[];
  if (pending.length === 0) return;

  strapi.log.info(`Retrying ${pending.length} lead(s) pending in the CRM`);
  for (const lead of pending) {
    await pushLeadToCrm(strapi, lead.documentId);
  }
}
