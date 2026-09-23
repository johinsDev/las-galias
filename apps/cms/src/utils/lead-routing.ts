/**
 * Which Sinco project a lead goes to, and what the advisor reads about it.
 *
 * Pure on purpose — no Strapi, no provider — so the decision can be tested
 * with `node --test` (see lead-routing.test.ts) without a database.
 *
 * Sinco's `POST /SalaVentas/Externo/Visitas` refuses a visit without a project
 * AND its macroproject. Leads from the project page carry one; the ones from
 * the listing, the lots, the locales and the foreign-buyer pages do not, so
 * they fall back to whatever «Configuración · CRM» names for their form, then
 * to the general default, and only then are left unrouted.
 */

interface SincoRef {
  sincoId?: string | number | null;
  macroSincoId?: string | number | null;
}

/** The single type `crm-config`, populated with its relations. */
export interface CrmRouting {
  defaultProject?: SincoRef | null;
  projectListado?: SincoRef | null;
  projectLotes?: SincoRef | null;
  projectLocales?: SincoRef | null;
  projectExterior?: SincoRef | null;
  projectWhatsapp?: SincoRef | null;
}

/** Forms that can arrive without a project, and the config field that routes them. */
const FORM_ROUTE_FIELD: Record<string, keyof CrmRouting> = {
  listado: "projectListado",
  lotes: "projectLotes",
  locales: "projectLocales",
  exterior: "projectExterior",
  whatsapp: "projectWhatsapp",
};

export interface RoutableLead {
  form?: string | null;
  project?: { sincoProject?: SincoRef | null } | null;
}

export interface SincoTarget {
  sincoId: string;
  macroSincoId: string;
  via: "project" | "form" | "default";
}

/** A catalog row only counts when it carries BOTH ids; Sinco rejects a visit without either. */
function usable(
  ref: SincoRef | null | undefined,
): { sincoId: string; macroSincoId: string } | null {
  if (!ref) return null;
  const sincoId = String(ref.sincoId ?? "").trim();
  const macroSincoId = String(ref.macroSincoId ?? "").trim();
  if (!sincoId || !macroSincoId) return null;
  return { sincoId, macroSincoId };
}

/**
 * The lead's own project first, then the default for its form, then the
 * general default. `null` means there is nowhere to send it — the caller marks
 * it `unrouted` instead of burning retries.
 */
export function resolveSincoTarget(
  lead: RoutableLead,
  config: CrmRouting | null | undefined,
): SincoTarget | null {
  const own = usable(lead.project?.sincoProject);
  if (own) return { ...own, via: "project" };

  const field = lead.form ? FORM_ROUTE_FIELD[lead.form] : undefined;
  const byForm = field ? usable(config?.[field]) : null;
  if (byForm) return { ...byForm, via: "form" };

  const general = usable(config?.defaultProject);
  if (general) return { ...general, via: "default" };

  return null;
}

/** True when the config could route at least one project-less lead. */
export function hasAnyDefault(config: CrmRouting | null | undefined): boolean {
  if (!config) return false;
  const fields: (keyof CrmRouting)[] = ["defaultProject", ...Object.values(FORM_ROUTE_FIELD)];
  return fields.some((field) => usable(config[field]) !== null);
}

export interface ObservacionInput {
  form?: string | null;
  message?: string | null;
  interestCity?: string | null;
  residenceCity?: string | null;
  residenceCountry?: string | null;
  incomeRange?: string | null;
  savingsRange?: string | null;
  severance?: string | null;
  budgetRange?: string | null;
  referralSource?: string | null;
  firstHome?: boolean | null;
  acceptsWhatsApp?: boolean | null;
  acceptsCall?: boolean | null;
}

const FORM_NAMES: Record<string, string> = {
  pdp: "ficha de proyecto",
  listado: "listado de proyectos",
  lotes: "lotes",
  locales: "locales",
  exterior: "compra desde el exterior",
  lanzamiento: "lanzamiento",
  whatsapp: "WhatsApp",
  manual: "manual",
};

const VIA_NAMES: Record<SincoTarget["via"], string> = {
  project: "proyecto de la ficha",
  form: "proyecto por defecto del formulario",
  default: "proyecto por defecto general",
};

/** Sinco keeps `observacion` as free text; past this it is noise, not context. */
const MAX_OBSERVACION = 600;

/**
 * The one field of the visit an advisor actually reads. Everything the site
 * knows and Sinco has no column for goes here: the form, the qualification
 * answers, and the two consents Sinco drops on the floor (WhatsApp and call —
 * see docs/sinco/discovery-pruebas.md). Empty answers are skipped so a bare
 * lead reads as one short line.
 */
export function buildObservacion(
  lead: ObservacionInput,
  target?: Pick<SincoTarget, "via"> | null,
): string | undefined {
  const yesNo = (value: boolean | null | undefined) => (value == null ? null : value ? "sí" : "no");

  const head = [
    lead.form ? `Formulario: ${FORM_NAMES[lead.form] ?? lead.form}` : null,
    target && target.via !== "project" ? `vía ${VIA_NAMES[target.via]}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const facts = [
    lead.interestCity && `Ciudad de interés: ${lead.interestCity}`,
    lead.residenceCity && `Reside en: ${lead.residenceCity}`,
    lead.residenceCountry && `País: ${lead.residenceCountry}`,
    lead.incomeRange && `Ingresos: ${lead.incomeRange}`,
    lead.savingsRange && `Ahorros: ${lead.savingsRange}`,
    lead.severance && `Cesantías: ${lead.severance}`,
    lead.budgetRange && `Presupuesto: ${lead.budgetRange}`,
    lead.referralSource && `Nos conoció por: ${lead.referralSource}`,
    yesNo(lead.firstHome) && `Primera vivienda: ${yesNo(lead.firstHome)}`,
    yesNo(lead.acceptsWhatsApp) && `Autoriza WhatsApp: ${yesNo(lead.acceptsWhatsApp)}`,
    yesNo(lead.acceptsCall) && `Autoriza llamada: ${yesNo(lead.acceptsCall)}`,
  ].filter((line): line is string => Boolean(line));

  const lines = [
    head ? `[${head}]` : null,
    facts.length > 0 ? facts.join(" · ") : null,
    lead.message?.trim() || null,
  ].filter((line): line is string => Boolean(line));

  if (lines.length === 0) return undefined;
  const text = lines.join("\n");
  return text.length > MAX_OBSERVACION ? `${text.slice(0, MAX_OBSERVACION - 1)}…` : text;
}
