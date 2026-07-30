import { SincoClient } from "../sinco/client";
import type { SincoConfig } from "../sinco/types";
import type { ExternalProjectData, ProjectDataProvider } from "./types";

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`${what} is not implemented yet`);
    this.name = "NotImplementedError";
  }
}

/**
 * Provider for Sinco CBR (https://sincoerp.com).
 *
 * Reading project data takes 2–3 calls (`/Proyectos/{idMacro}`,
 * `/Unidades/PorProyecto/{id}`, `/TipoInmueble/IdProyecto/{id}`) plus a mapping
 * table for `etapa` → `constructionStatus`; still pending, see
 * `docs/sinco-integration.md`. The lead push (`SincoLeadProvider`) already runs
 * on this same client.
 */
export class SincoProvider implements ProjectDataProvider {
  readonly name = "sinco";
  private readonly client: SincoClient;

  constructor(config: SincoConfig) {
    this.client = new SincoClient(config);
  }

  async getProjectById(externalId: string): Promise<ExternalProjectData | null> {
    void externalId;
    throw new NotImplementedError("SincoProvider.getProjectById");
  }

  healthCheck(): Promise<boolean> {
    return this.client.healthCheck();
  }
}
