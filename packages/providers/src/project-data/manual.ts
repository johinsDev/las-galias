import type { ExternalProjectData, ProjectDataProvider } from "./types";

/**
 * No-op provider: the CMS is the source of truth and editors type everything
 * in by hand (the "sync from Sinco" toggle is off).
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
