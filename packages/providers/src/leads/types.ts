/** Contact channels the person explicitly authorised (Law 1581/2012). */
export interface LeadConsents {
  /** Habeas data — without this the lead must not leave the CMS. */
  dataPolicy: boolean;
  email?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
  call?: boolean;
}

/** Campaign attribution, filled from the UTM params on the landing URL. */
export interface LeadAttribution {
  source?: string;
  medium?: string;
  campaign?: string;
  /** Free-form origin ("pdp:altavista", "contacto"), our own `source` field. */
  reference?: string;
}

export interface ExternalLead {
  /**
   * Our id for this submission (the Strapi `documentId`). Sent to the CRM as
   * its own external id so retries update instead of duplicating.
   */
  id: string;
  fullName: string;
  email: string;
  phone: string;
  message?: string;
  /** Project id in the external system (`sincoId` on our `project`). */
  projectExternalId?: string;
  /**
   * Parent macroproject id in the external system (`sincoId` on our
   * `macroproject`). Sinco rejects the visit without it.
   */
  macroExternalId?: string;
  consents: LeadConsents;
  attribution?: LeadAttribution;
}

export interface LeadSubmitResult {
  /** The CRM's id for the visit this lead ended up on. */
  externalId: string;
  /**
   * The CRM already knew this person and kept its existing visit instead of
   * opening a new one. The lead is in the funnel, but as a repeat contact —
   * worth surfacing rather than reporting as a fresh push.
   */
  duplicate: boolean;
}

/**
 * Source-agnostic contract to push a lead into a CRM (Sinco CBR today).
 * Mirrors `ProjectDataProvider`: swapping CRMs is a new implementation plus
 * `LEAD_PROVIDER`, nothing else.
 */
export interface LeadProvider {
  readonly name: string;
  /** Null when the provider does not push anywhere (the manual strategy). */
  submit(lead: ExternalLead): Promise<LeadSubmitResult | null>;
  healthCheck(): Promise<boolean>;
}
