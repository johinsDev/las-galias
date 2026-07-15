import { ManualProvider } from "./manual";
import { SincoProvider } from "./sinco";
import type { ProjectDataProvider } from "./types";

export interface ProjectDataEnv {
  PROJECT_DATA_PROVIDER?: string;
  SINCO_BASE_URL?: string;
  SINCO_API_KEY?: string;
}

/** Strategy-pattern factory: the implementation is chosen via env, not code. */
export function createProjectDataProvider(env: ProjectDataEnv): ProjectDataProvider {
  switch (env.PROJECT_DATA_PROVIDER) {
    case "sinco":
      return new SincoProvider({
        baseUrl: env.SINCO_BASE_URL ?? "",
        apiKey: env.SINCO_API_KEY ?? "",
      });
    case "manual":
    case undefined:
      return new ManualProvider();
    default:
      throw new Error(`Unknown PROJECT_DATA_PROVIDER: "${env.PROJECT_DATA_PROVIDER}"`);
  }
}

export { ManualProvider } from "./manual";
export { NotImplementedError, SincoProvider, type SincoConfig } from "./sinco";
export type {
  ConstructionStatus,
  ExternalProjectData,
  ExternalUnitType,
  ProjectDataProvider,
} from "./types";
