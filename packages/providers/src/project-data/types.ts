export type EstadoObra = "lanzamiento" | "preventa" | "construccion" | "entrega-inmediata";

export interface ExternalTipologia {
  nombre: string;
  areaM2: number;
  habitaciones: number;
  banos: number;
  precioCOP: number;
}

export interface ExternalProjectData {
  externalId: string;
  nombre?: string;
  precioDesdeCOP?: number;
  estadoObra?: EstadoObra;
  tipologias?: ExternalTipologia[];
  /** ISO date de la última actualización en la fuente externa */
  actualizadoEn: string;
}

/**
 * Contrato agnóstico para traer datos de proyectos desde una fuente externa
 * (hoy Sinco ERP; mañana un Excel, otro admin con API, etc.).
 * Cambiar de fuente = nueva implementación + PROJECT_DATA_PROVIDER, nada más.
 */
export interface ProjectDataProvider {
  readonly name: string;
  getProjectById(externalId: string): Promise<ExternalProjectData | null>;
  listProjects?(): Promise<ExternalProjectData[]>;
  healthCheck(): Promise<boolean>;
}
