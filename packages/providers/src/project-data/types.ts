export type ConstructionStatus = "launch" | "presale" | "construction" | "immediate-delivery";

export interface ExternalUnitType {
  name: string;
  areaM2: number;
  bedrooms: number;
  bathrooms: number;
  priceCOP: number;
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
