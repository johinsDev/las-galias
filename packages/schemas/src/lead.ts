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
    v.regex(
      /^(\+57\s?)?[3][0-9]{9}$|^(\+57\s?)?[1-8][0-9]{6,7}$/,
      "Ingresa un teléfono colombiano válido",
    ),
  ),
  message: v.optional(v.pipe(v.string(), v.maxLength(1000))),
  projectDocumentId: v.optional(v.string()),
  source: v.optional(v.string()),
  acceptsDataPolicy: v.literal(true, "Debes aceptar la política de tratamiento de datos"),
});

export type Lead = v.InferOutput<typeof LeadSchema>;
