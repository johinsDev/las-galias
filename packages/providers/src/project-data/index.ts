import { sincoConfigFromEnv, type SincoEnv } from "../sinco/types";
import { ManualProvider } from "./manual";
import { SincoProvider } from "./sinco";
import type { ProjectDataProvider } from "./types";

export interface ProjectDataEnv extends SincoEnv {
  PROJECT_DATA_PROVIDER?: string;
}

/** Strategy-pattern factory: the implementation is chosen via env, not code. */
export function createProjectDataProvider(env: ProjectDataEnv): ProjectDataProvider {
  switch (env.PROJECT_DATA_PROVIDER) {
    case "sinco":
      return new SincoProvider(sincoConfigFromEnv(env));
    case "manual":
    case undefined:
      return new ManualProvider();
    default:
      throw new Error(`Unknown PROJECT_DATA_PROVIDER: "${env.PROJECT_DATA_PROVIDER}"`);
  }
}

export { ManualProvider } from "./manual";
export { NotImplementedError, SincoProvider } from "./sinco";
export type {
  ConstructionStatus,
  ExternalProjectData,
  ExternalUnitType,
  ProjectDataProvider,
} from "./types";
