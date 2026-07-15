import { createProjectDataProvider, type ProjectDataProvider } from "@lasgalias/providers";

let instance: ProjectDataProvider | undefined;

/** Singleton for the project-data provider (strategy picked via env). */
export function getProjectDataProvider(): ProjectDataProvider {
  if (!instance) {
    instance = createProjectDataProvider(process.env);
  }
  return instance;
}
