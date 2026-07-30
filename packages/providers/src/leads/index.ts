import { sincoConfigFromEnv, type SincoEnv } from "../sinco/types";
import { ManualLeadProvider } from "./manual";
import { SincoLeadProvider } from "./sinco";
import type { LeadProvider } from "./types";

export interface LeadProviderEnv extends SincoEnv {
  LEAD_PROVIDER?: string;
  SINCO_LEAD_ORIGEN_INFORMACION?: string;
  SINCO_LEAD_MEDIO_PUBLICITARIO?: string;
}

function optionalInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}

/** Strategy-pattern factory, mirroring createProjectDataProvider. */
export function createLeadProvider(env: LeadProviderEnv): LeadProvider {
  switch (env.LEAD_PROVIDER) {
    case "sinco":
      return new SincoLeadProvider({
        ...sincoConfigFromEnv(env),
        origenInformacion: optionalInt(env.SINCO_LEAD_ORIGEN_INFORMACION),
        idMedioPublicitario: optionalInt(env.SINCO_LEAD_MEDIO_PUBLICITARIO),
      });
    case "manual":
    case undefined:
      return new ManualLeadProvider();
    default:
      throw new Error(`Unknown LEAD_PROVIDER: "${env.LEAD_PROVIDER}"`);
  }
}

export { ManualLeadProvider } from "./manual";
export { SincoLeadProvider, splitFullName, type SincoLeadConfig } from "./sinco";
export type {
  ExternalLead,
  LeadAttribution,
  LeadConsents,
  LeadProvider,
  LeadSubmitResult,
} from "./types";
