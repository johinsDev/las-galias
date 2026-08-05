export type ConstructionStatus = "launch" | "presale" | "construction" | "immediate-delivery";

export interface ExternalUnitType {
  name: string;
  /** Área construida — Sinco's `areaConstruida`. */
  builtAreaM2?: number;
  /** Área privada — Sinco's `areaPrivada`. Reported separately by the ERP. */
  privateAreaM2?: number;
  priceCOP: number;
  /**
   * Optional on purpose: Sinco has no bathroom count at all, and its
   * `cantidadAlcobas` is only filled on ~40% of projects — the CMS stays the
   * source of truth for both.
   */
  bedrooms?: number;
  bathrooms?: number;
}

export interface ExternalProjectData {
  externalId: string;
  name?: string;
  priceFromCOP?: number;
  constructionStatus?: ConstructionStatus;
  unitTypes?: ExternalUnitType[];
  /** ISO date of the last update in the external source */
  updatedAt: string;
}

/**
 * Source-agnostic contract to pull project data from an external system
 * (Sinco ERP today; a spreadsheet or another admin API tomorrow).
 * Switching sources = a new implementation + PROJECT_DATA_PROVIDER, nothing else.
 */
export interface ProjectDataProvider {
  readonly name: string;
  getProjectById(externalId: string): Promise<ExternalProjectData | null>;
  listProjects?(): Promise<ExternalProjectData[]>;
  healthCheck(): Promise<boolean>;
}
