import type { ExternalProjectData, ProjectDataProvider } from "./types";

/**
 * Provider no-op: el CMS es la fuente de verdad y los editores ingresan
 * todo manualmente (el toggle "datos desde Sinco" apagado).
 */
export class ManualProvider implements ProjectDataProvider {
  readonly name = "manual";

  async getProjectById(_externalId: string): Promise<ExternalProjectData | null> {
    return null;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
