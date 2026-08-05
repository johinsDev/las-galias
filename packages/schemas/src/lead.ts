import * as v from "valibot";

/**
 * PDP lead (expectation-stage or traditional project).
 * `acceptsDataPolicy` must be an explicit `true` — Colombian Law 1581/2012
 * (habeas data). Validation messages are user-facing site copy → Spanish.
 */
export const LeadSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(2, "Ingresa tu nombre completo")),
  email: v.pipe(v.string(), v.trim(), v.email("Ingresa un correo válido")),
  phone: v.pipe(
    v.string(),
    v.trim(),
    // The field is displayed grouped ("300 123 4567"); strip whitespace before
    // validating and sending so Strapi stores a clean "3001234567".
    v.transform((s) => s.replace(/\s+/g, "")),
    v.regex(
      /^(\+57)?[3][0-9]{9}$|^(\+57)?[1-8][0-9]{6,7}$/,
      "Ingresa un teléfono colombiano válido",
    ),
  ),
  message: v.optional(v.pipe(v.string(), v.maxLength(1000))),
  projectDocumentId: v.optional(v.string()),
  source: v.optional(v.string()),
  acceptsDataPolicy: v.literal(true, "Debes aceptar la política de tratamiento de datos"),
  /**
   * Contact authorisation, separate from the data policy: the CRM stores one
   * flag per channel and an advisor may only write/call on the ones granted.
   * One checkbox in the UI, the three channels it enables here.
   */
  acceptsContact: v.optional(v.boolean(), false),
  // Campaign attribution read from the landing URL; never typed by the user.
  utmSource: v.optional(v.string()),
  utmMedium: v.optional(v.string()),
  utmCampaign: v.optional(v.string()),
});

export type Lead = v.InferOutput<typeof LeadSchema>;

/**
 * Lead from the "Colombianos en el exterior" landing.
 *
 * Same shape as `LeadSchema` except the phone, which must accept any country:
 * that page exists precisely for people who do NOT have a Colombian number, and
 * the strict rule above would reject its whole audience. Numbers are required
 * in E.164 (`+<country><number>`) so the country code is never ambiguous.
 *
 * `residenceCountry` matches the "País de residencia" field in the design. Sinco
 * publishes a `/Paises` catalog (239 entries) it could map to, but the
 * `POST /SalaVentas/Externo/Visitas` payload has no country field today — see
 * docs/sinco/discovery-pruebas.md. It is stored in Strapi regardless.
 *
 * OPEN QUESTION for Sinco: the CRM normalises `3009988771` into `573009988771`,
 * i.e. it prepends 57. What it does with an already-international number is
 * unverified — confirm before pointing this form at production.
 */
export const ForeignLeadSchema = v.object({
  ...LeadSchema.entries,
  phone: v.pipe(
    v.string(),
    v.trim(),
    v.transform((s) => s.replace(/[\s()-]/g, "")),
    v.regex(/^\+[1-9]\d{7,14}$/, "Incluye el indicativo del país, por ejemplo +1 305 555 0123"),
  ),
  residenceCountry: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(2, "Selecciona tu país de residencia"),
  ),
});

export type ForeignLead = v.InferOutput<typeof ForeignLeadSchema>;
