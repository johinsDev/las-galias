import type { ExternalProjectData, ProjectDataProvider } from "./types";

export interface SincoConfig {
  baseUrl: string;
  apiKey: string;
}

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`${what} aún no está implementado: falta la documentación del API de Sinco`);
    this.name = "NotImplementedError";
  }
}

/**
 * Provider para Sinco ERP (https://sincoerp.com).
 * TODO: implementar cuando haya documentación/credenciales del API.
 * El contrato ya está fijado — solo hay que rellenar los métodos.
 */
export class SincoProvider implements ProjectDataProvider {
  readonly name = "sinco";

  constructor(private readonly config: SincoConfig) {}

  async getProjectById(externalId: string): Promise<ExternalProjectData | null> {
    // TODO: GET `${this.config.baseUrl}/proyectos/${externalId}` con this.config.apiKey
    // y mapear la respuesta a ExternalProjectData.
    void externalId;
    throw new NotImplementedError("SincoProvider.getProjectById");
  }

  async healthCheck(): Promise<boolean> {
    if (!this.config.baseUrl || !this.config.apiKey) return false;
    // TODO: ping real al API de Sinco cuando exista.
    return false;
  }
}
