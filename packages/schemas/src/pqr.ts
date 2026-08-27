import * as v from "valibot";

/**
 * The kinds of request /servicio-al-cliente accepts. The first four are the
 * PQRS of Colombian administrative law; `postventa` is Galias' own warranty
 * channel and is the only one that asks which unit the person bought.
 */
export const PQR_TYPES = ["peticion", "queja", "reclamo", "sugerencia", "postventa"] as const;

export type PqrType = (typeof PQR_TYPES)[number];

export const PQR_TYPE_LABELS: Record<PqrType, string> = {
  peticion: "Petición",
  queja: "Queja",
  reclamo: "Reclamo",
  sugerencia: "Sugerencia",
  postventa: "Solicitud de postventa",
};

/**
 * A PQR filed from the public site.
 *
 * Phone follows the same Colombian rule as `LeadSchema`: unlike the
 * foreign-buyer form, this channel serves people who already bought here.
 *
 * Nothing about the unit is required at this level — a `peticion` has no unit
 * to name. The form asks for tower/unit only when the type is `postventa`, and
 * that conditional requirement lives in the form rather than here so the same
 * schema can validate a request an advisor files on someone's behalf.
 *
 * Validation messages are user-facing site copy → Spanish.
 */
export const PqrSchema = v.object({
  type: v.picklist(PQR_TYPES, "Selecciona el tipo de solicitud"),
  name: v.pipe(v.string(), v.trim(), v.minLength(2, "Ingresa tu nombre completo")),
  email: v.pipe(v.string(), v.trim(), v.email("Ingresa un correo válido")),
  phone: v.pipe(
    v.string(),
    v.trim(),
    v.transform((s) => s.replace(/\s+/g, "")),
    v.regex(
      /^(\+57)?[3][0-9]{9}$|^(\+57)?[1-8][0-9]{6,7}$/,
      "Ingresa un teléfono colombiano válido",
    ),
  ),
  documentNumber: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(30))),
  subject: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(4, "Escribe un asunto"),
    v.maxLength(140, "El asunto es demasiado largo"),
  ),
  message: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(20, "Cuéntanos con algo más de detalle qué ocurrió"),
    v.maxLength(4000, "El mensaje es demasiado largo"),
  ),
  projectDocumentId: v.optional(v.string()),
  tower: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(60))),
  unit: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(60))),
  acceptsDataPolicy: v.literal(true, "Debes aceptar la política de tratamiento de datos"),
});

export type Pqr = v.InferOutput<typeof PqrSchema>;
