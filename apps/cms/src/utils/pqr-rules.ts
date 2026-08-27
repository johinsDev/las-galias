import type { Core } from "@strapi/strapi";

export const PQR_UID = "api::pqr.pqr";

/**
 * Business days Colombian law gives to answer a petition (Ley 1755 de 2015,
 * art. 14, general rule). Complaints about documents and consultations have
 * longer terms; this is the floor, shown in the admin so nobody has to count.
 */
const RESPONSE_BUSINESS_DAYS = 15;

/** Where the radicado numbering restarts: one sequence per calendar year. */
function yearOf(date: Date): number {
  return date.getFullYear();
}

/** Adds business days, skipping Saturdays and Sundays. Colombian holidays are
 * NOT subtracted — that would need a holiday calendar, and a date that is a
 * little early is a safe error for a legal deadline. */
function addBusinessDays(from: Date, days: number): Date {
  const out = new Date(from);
  let left = days;
  while (left > 0) {
    out.setDate(out.getDate() + 1);
    const day = out.getDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return out;
}

/**
 * Next radicado for the current year, as `PQR-2026-000123`.
 *
 * Counting existing rows rather than keeping a counter: this is a low-volume
 * table written only by a public form, and a counter would be one more piece of
 * state to migrate between environments. The `unique` constraint on the column
 * is the real guarantee — if two submissions ever raced onto the same number,
 * the second insert fails loudly instead of silently sharing a radicado.
 */
async function nextRadicado(strapi: Core.Strapi, now: Date): Promise<string> {
  const year = yearOf(now);
  const count = await strapi.documents(PQR_UID).count({
    filters: { radicado: { $startsWith: `PQR-${year}-` } },
  });
  return `PQR-${year}-${String(count + 1).padStart(6, "0")}`;
}

/**
 * Stamps a new PQR with its radicado and its legal response deadline.
 *
 * Runs BEFORE the write so the row is never briefly visible without a
 * radicado: the acknowledgement the site shows the citizen is that number, and
 * a PQR nobody can quote back is a PQR that cannot be followed up.
 *
 * An admin creating one by hand keeps whatever radicado they typed.
 */
export async function stampPqr(
  strapi: Core.Strapi,
  params: { data?: Record<string, unknown> },
): Promise<void> {
  const data = params.data;
  if (!data) return;

  const now = new Date();
  if (!data.radicado) {
    data.radicado = await nextRadicado(strapi, now);
  }
  if (!data.responseDueAt) {
    data.responseDueAt = addBusinessDays(now, RESPONSE_BUSINESS_DAYS).toISOString().slice(0, 10);
  }
}

const TYPE_LABELS: Record<string, string> = {
  peticion: "Petición",
  queja: "Queja",
  reclamo: "Reclamo",
  sugerencia: "Sugerencia",
  postventa: "Solicitud de postventa",
};

interface PqrDoc {
  documentId: string;
  radicado?: string;
  type?: string;
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  tower?: string;
  unit?: string;
  responseDueAt?: string;
}

/**
 * Emails the customer-service inbox that a PQR came in.
 *
 * Deliberately NOT awaited by the request: the citizen's radicado must not
 * depend on an SMTP server being up, exactly as leads do not wait on the CRM.
 * A failure is logged and leaves `notifiedAt` empty, which is what tells
 * somebody the notification never went out.
 */
export function scheduleNotifyPqr(strapi: Core.Strapi, documentId: string): void {
  void notifyPqr(strapi, documentId).catch((err) => {
    strapi.log.error(`PQR notification failed for ${documentId}: ${String(err)}`);
  });
}

async function notifyPqr(strapi: Core.Strapi, documentId: string): Promise<void> {
  const to = process.env.PQR_NOTIFY_EMAIL;
  if (!to) {
    strapi.log.warn("PQR_NOTIFY_EMAIL is not set — nobody was told about the new PQR");
    return;
  }

  const doc = (await strapi.documents(PQR_UID).findOne({ documentId })) as PqrDoc | null;
  if (!doc) return;

  const label = TYPE_LABELS[doc.type ?? ""] ?? "PQR";
  const unitLine =
    doc.tower || doc.unit ? `Unidad: ${doc.tower ?? ""} ${doc.unit ?? ""}`.trim() : null;

  const lines = [
    `${label} radicada: ${doc.radicado}`,
    "",
    `Asunto: ${doc.subject ?? ""}`,
    `Nombre: ${doc.name ?? ""}`,
    `Correo: ${doc.email ?? ""}`,
    `Teléfono: ${doc.phone ?? ""}`,
    unitLine,
    doc.responseDueAt ? `Responder antes de: ${doc.responseDueAt}` : null,
    "",
    doc.message ?? "",
  ].filter((line) => line !== null);

  await strapi
    .plugin("email")
    .service("email")
    .send({
      to,
      subject: `[${doc.radicado}] ${label} — ${doc.subject ?? "sin asunto"}`,
      text: lines.join("\n"),
    });

  await strapi.documents(PQR_UID).update({
    documentId,
    data: { notifiedAt: new Date().toISOString() },
  });
}
