import type { ExternalProjectData, ProjectDataProvider } from "./types";

export interface SincoConfig {
  baseUrl: string;
  apiKey: string;
}

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`${what} is not implemented yet: waiting on Sinco API documentation`);
    this.name = "NotImplementedError";
  }
}

/**
 * Provider for Sinco ERP (https://sincoerp.com).
 * TODO: implement once API docs/credentials are available.
 * The contract is already fixed — only the methods need filling in.
 */
export class SincoProvider implements ProjectDataProvider {
  readonly name = "sinco";

  constructor(private readonly config: SincoConfig) {}

  async getProjectById(externalId: string): Promise<ExternalProjectData | null> {
    // TODO: GET `${this.config.baseUrl}/projects/${externalId}` with this.config.apiKey
    // and map the response to ExternalProjectData.
    void externalId;
    throw new NotImplementedError("SincoProvider.getProjectById");
  }

  async healthCheck(): Promise<boolean> {
    if (!this.config.baseUrl || !this.config.apiKey) return false;
    // TODO: real ping against the Sinco API once it exists.
    return false;
  }
}
