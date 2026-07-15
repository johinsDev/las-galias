import { ManualProvider } from "./manual";
import { SincoProvider } from "./sinco";
import type { ProjectDataProvider } from "./types";

export interface ProjectDataEnv {
  PROJECT_DATA_PROVIDER?: string;
  SINCO_BASE_URL?: string;
  SINCO_API_KEY?: string;
}

/** Factory del strategy pattern: la implementación se elige por env, no por código. */
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
      throw new Error(`PROJECT_DATA_PROVIDER desconocido: "${env.PROJECT_DATA_PROVIDER}"`);
  }
}

export { ManualProvider } from "./manual";
export { NotImplementedError, SincoProvider, type SincoConfig } from "./sinco";
export type {
  EstadoObra,
  ExternalProjectData,
  ExternalTipologia,
  ProjectDataProvider,
} from "./types";
