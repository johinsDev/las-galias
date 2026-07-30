import { SincoClient } from "../sinco/client";
import { SincoRequestError, type SincoConfig } from "../sinco/types";
import { resolveOrigenInformacion } from "./origen";
import type { ExternalLead, LeadProvider, LeadSubmitResult } from "./types";

/**
 * ⚠️ The OpenAPI spec publishes this path with zero-width spaces (U+200B) after
 * "SalaVentas" and "Externo". Copied from Swagger it 404s — it is written by
 * hand here on purpose.
 */
const VISITAS_EXTERNAS = "/SalaVentas/Externo/Visitas";

/** `/SalaVentas/MediosPublicitarios` id 20, "SITIO WEB GALIAS". */
const DEFAULT_MEDIO_PUBLICITARIO = 20;

export interface SincoLeadConfig extends SincoConfig {
  /**
   * Forces a single `/SalaVentas/OrigenesInformacion` id for every lead. Left
   * unset, the origin follows the traffic source (Web / Google Ads / Meta Ads).
   */
  origenInformacion?: number;
  /** `/SalaVentas/MediosPublicitarios` id. Defaults to 20 ("SITIO WEB GALIAS"). */
  idMedioPublicitario?: number;
}

interface VisitaExterna {
  idVisitaExterna: string;
  idVisitanteExterno: string;
  idMacroProyecto: number;
  idProyecto: number;
  nombres: string;
  apellidos: string;
  correo: string;
  celular: string;
  origenInformacion: number;
  idMedioPublicitario: number;
  haAutorizadoManejoInformacion: boolean;
  haAutorizadoEnvioCorreo: boolean;
  haAutorizadoEnvioSMS: boolean;
  haAutorizadoEnvioWhatsApp: boolean;
  haAutorizadoLlamada: boolean;
  observacion?: string;
  campana?: string;
  medio?: string;
  fuente?: string;
  fuenteReg?: string;
}

/**
 * Sinco expects first and last names apart; the public form asks for one full
 * name. First word is the given name, the rest the family name — good enough
 * for a lead, and the advisor fixes it in the CRM if needed.
 */
export function splitFullName(fullName: string): { nombres: string; apellidos: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { nombres: parts[0] ?? "", apellidos: "" };
  return { nombres: parts[0]!, apellidos: parts.slice(1).join(" ") };
}

/**
 * The endpoint answers prose, not an id — "visitante creado:  853202, visita
 * creada id: 921258" on success and "El visitante id: 853203, tiene la visita
 * asociada id: 921259" on a duplicate. In both the visit id is the last number.
 */
function parseVisitId(message: string): string | null {
  const numbers = message.match(/\d+/g);
  return numbers?.at(-1) ?? null;
}

/** Duplicate external id: already in the CRM, so a retry is a success. */
function isDuplicate(err: SincoRequestError): boolean {
  return err.status === 409 && /visita\s+asociada/i.test(err.body);
}

/** Pushes site leads into the Sinco CRM as visitor + visit in a single call. */
export class SincoLeadProvider implements LeadProvider {
  readonly name = "sinco";
  private readonly client: SincoClient;

  constructor(private readonly config: SincoLeadConfig) {
    this.client = new SincoClient(config);
  }

  async submit(lead: ExternalLead): Promise<LeadSubmitResult | null> {
    if (!lead.consents.dataPolicy) {
      throw new Error(`Lead ${lead.id} has no habeas data consent; refusing to push it to the CRM`);
    }
    const idProyecto = Number(lead.projectExternalId);
    if (!Number.isInteger(idProyecto) || idProyecto <= 0) {
      throw new Error(
        `Lead ${lead.id} has no usable Sinco project id ("${lead.projectExternalId}")`,
      );
    }
    // The spec marks only `idProyecto` as required, but the endpoint answers
    // 409 "El macroproyecto no existe" without this one. Verified against the
    // test environment.
    const idMacroProyecto = Number(lead.macroExternalId);
    if (!Number.isInteger(idMacroProyecto) || idMacroProyecto <= 0) {
      throw new Error(
        `Lead ${lead.id} has no usable Sinco macroproject id ("${lead.macroExternalId}")`,
      );
    }

    const { nombres, apellidos } = splitFullName(lead.fullName);
    const body: VisitaExterna = {
      idVisitaExterna: lead.id,
      idVisitanteExterno: lead.id,
      idMacroProyecto,
      idProyecto,
      nombres,
      apellidos,
      correo: lead.email,
      celular: lead.phone,
      origenInformacion:
        this.config.origenInformacion ?? resolveOrigenInformacion(lead.attribution),
      idMedioPublicitario: this.config.idMedioPublicitario ?? DEFAULT_MEDIO_PUBLICITARIO,
      haAutorizadoManejoInformacion: true,
      haAutorizadoEnvioCorreo: lead.consents.email ?? false,
      haAutorizadoEnvioSMS: lead.consents.sms ?? false,
      haAutorizadoEnvioWhatsApp: lead.consents.whatsapp ?? false,
      haAutorizadoLlamada: lead.consents.call ?? false,
      observacion: lead.message,
      campana: lead.attribution?.campaign,
      medio: lead.attribution?.medium,
      fuente: lead.attribution?.source,
      fuenteReg: lead.attribution?.reference,
    };

    try {
      const message = await this.client.post<string>(VISITAS_EXTERNAS, body);
      const externalId = typeof message === "string" ? parseVisitId(message) : null;
      return externalId ? { externalId, duplicate: false } : null;
    } catch (err) {
      // The CRM matches visitors by email *or* phone, so this covers both our
      // own retries and a person who was already in the funnel. Either way the
      // lead is not lost — it hangs off the visit the CRM hands back.
      if (err instanceof SincoRequestError && isDuplicate(err)) {
        const externalId = parseVisitId(err.body);
        return externalId ? { externalId, duplicate: true } : null;
      }
      throw err;
    }
  }

  healthCheck(): Promise<boolean> {
    return this.client.healthCheck();
  }
}
