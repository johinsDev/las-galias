import * as v from "valibot";

/**
 * Lead de una PDP (proyecto en expectativa o tradicional).
 * `aceptaTratamientoDatos` debe ser `true` explícito — Ley 1581/2012 (habeas data).
 */
export const LeadSchema = v.object({
  nombre: v.pipe(v.string(), v.trim(), v.minLength(2, "Ingresa tu nombre completo")),
  email: v.pipe(v.string(), v.trim(), v.email("Ingresa un correo válido")),
  telefono: v.pipe(
    v.string(),
    v.trim(),
    v.regex(
      /^(\+57\s?)?[3][0-9]{9}$|^(\+57\s?)?[1-8][0-9]{6,7}$/,
      "Ingresa un teléfono colombiano válido",
    ),
  ),
  mensaje: v.optional(v.pipe(v.string(), v.maxLength(1000))),
  proyectoDocumentId: v.optional(v.string()),
  origen: v.optional(v.string()),
  aceptaTratamientoDatos: v.literal(true, "Debes aceptar la política de tratamiento de datos"),
});

export type Lead = v.InferOutput<typeof LeadSchema>;
