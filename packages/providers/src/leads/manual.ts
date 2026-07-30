import type { ExternalLead, LeadProvider, LeadSubmitResult } from "./types";

/**
 * No-op provider: leads stay in the CMS and the sales team reads them there.
 * The default, so a missing CRM configuration can never lose a submission.
 */
export class ManualLeadProvider implements LeadProvider {
  readonly name = "manual";

  async submit(_lead: ExternalLead): Promise<LeadSubmitResult | null> {
    return null;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
