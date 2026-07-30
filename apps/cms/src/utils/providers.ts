import {
  createLeadProvider,
  createProjectDataProvider,
  type LeadProvider,
  type ProjectDataProvider,
} from "@lasgalias/providers";

let projectDataInstance: ProjectDataProvider | undefined;
let leadInstance: LeadProvider | undefined;

/** Singleton for the project-data provider (strategy picked via env). */
export function getProjectDataProvider(): ProjectDataProvider {
  projectDataInstance ??= createProjectDataProvider(process.env);
  return projectDataInstance;
}

/**
 * Singleton for the lead provider. Shared on purpose: the Sinco client caches
 * its ~24h token in memory, so one instance means one login per day instead of
 * one per lead.
 */
export function getLeadProvider(): LeadProvider {
  leadInstance ??= createLeadProvider(process.env);
  return leadInstance;
}
