import { createProjectDataProvider, type ProjectDataProvider } from "@lasgalias/providers";

let instance: ProjectDataProvider | undefined;

/** Singleton del provider de datos de proyectos (strategy elegida por env). */
export function getProjectDataProvider(): ProjectDataProvider {
  if (!instance) {
    instance = createProjectDataProvider(process.env);
  }
  return instance;
}
