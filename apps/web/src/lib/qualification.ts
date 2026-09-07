/**
 * The qualification answers travelling from the "Recibe una asesoría
 * personalizada" band to the lead form in the sidebar.
 *
 * A DOM event rather than shared state: the band and the form are separate
 * Astro islands, so they are separate React roots and cannot share a provider —
 * the same reason the typology simulator talks to the mobile price bar this way.
 */
export const QUALIFICATION_EVENT = "lg:qualification";

export interface QualificationDetail {
  incomeRange?: string;
  residenceCity?: string;
  severance?: string;
  savingsRange?: string;
  firstHome?: boolean;
}
