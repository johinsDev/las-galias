import { PassThrough } from "node:stream";

import type { Core } from "@strapi/strapi";

import { LEAD_FORM_LABELS, PQR_TYPE_LABELS } from "@lasgalias/schemas";

/**
 * CSV of a submissions collection, with the same filters the list view shows.
 *
 * Written for Excel in es-CO first: `;` as separator (a `,` file opens as one
 * column there), a BOM so accents survive, dates in Bogotá time. Google Sheets
 * reads both. A cell that starts like a formula gets a leading apostrophe —
 * a visitor can type `=HYPERLINK(...)` in a message field.
 */

type Row = Record<string, unknown>;

interface Column {
  header: string;
  get: (row: Row) => unknown;
}

interface ExportSpec {
  uid: string;
  filename: string;
  populate?: string[];
  columns: Column[];
}

const BOGOTA = "America/Bogota";

function date(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  // "2026-09-23 14:05:31" — sortable and unambiguous, unlike a locale format.
  return parsed.toLocaleString("sv-SE", { timeZone: BOGOTA });
}

function yesNo(value: unknown): string {
  if (value === true) return "sí";
  if (value === false) return "no";
  return "";
}

function text(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function relationName(value: unknown): string {
  return value && typeof value === "object" ? text((value as { name?: unknown }).name) : "";
}

const CRM_STATUS_LABELS: Record<string, string> = {
  pending: "pendiente",
  sent: "enviado",
  duplicate: "duplicado",
  failed: "falló",
  skipped: "omitido",
  unrouted: "sin proyecto",
};

const PQR_STATUS_LABELS: Record<string, string> = {
  recibido: "recibido",
  "en-tramite": "en trámite",
  resuelto: "resuelto",
  cerrado: "cerrado",
};

export const EXPORTS: Record<string, ExportSpec> = {
  leads: {
    uid: "api::lead.lead",
    filename: "leads",
    populate: ["project"],
    columns: [
      { header: "Fecha", get: (r) => date(r.createdAt) },
      {
        header: "Formulario",
        get: (r) => LEAD_FORM_LABELS[r.form as keyof typeof LEAD_FORM_LABELS] ?? text(r.form),
      },
      { header: "Nombre", get: (r) => r.name },
      { header: "Celular", get: (r) => r.phone },
      { header: "Correo", get: (r) => r.email },
      { header: "Proyecto", get: (r) => relationName(r.project) },
      { header: "Origen", get: (r) => r.source },
      { header: "Mensaje", get: (r) => r.message },
      { header: "Ciudad de interés", get: (r) => r.interestCity },
      { header: "Ciudad de residencia", get: (r) => r.residenceCity },
      { header: "País de residencia", get: (r) => r.residenceCountry },
      { header: "Ingresos", get: (r) => r.incomeRange },
      { header: "Ahorros", get: (r) => r.savingsRange },
      { header: "Cesantías", get: (r) => r.severance },
      { header: "Primera vivienda", get: (r) => yesNo(r.firstHome) },
      { header: "Presupuesto", get: (r) => r.budgetRange },
      { header: "Cómo nos conoció", get: (r) => r.referralSource },
      { header: "Acepta política de datos", get: (r) => yesNo(r.acceptsDataPolicy) },
      { header: "Autoriza correo", get: (r) => yesNo(r.acceptsEmail) },
      { header: "Autoriza SMS", get: (r) => yesNo(r.acceptsSms) },
      { header: "Autoriza WhatsApp", get: (r) => yesNo(r.acceptsWhatsApp) },
      { header: "Autoriza llamada", get: (r) => yesNo(r.acceptsCall) },
      { header: "UTM source", get: (r) => r.utmSource },
      { header: "UTM medium", get: (r) => r.utmMedium },
      { header: "UTM campaign", get: (r) => r.utmCampaign },
      {
        header: "Estado CRM",
        get: (r) => CRM_STATUS_LABELS[text(r.crmStatus)] ?? text(r.crmStatus),
      },
      { header: "ID visita Sinco", get: (r) => r.crmVisitId },
      { header: "Intentos", get: (r) => r.crmAttempts },
      { header: "Último error", get: (r) => r.crmLastError },
      { header: "ID", get: (r) => r.documentId },
    ],
  },
  pqrs: {
    uid: "api::pqr.pqr",
    filename: "pqr",
    populate: ["project"],
    columns: [
      { header: "Fecha", get: (r) => date(r.createdAt) },
      { header: "Radicado", get: (r) => r.radicado },
      {
        header: "Tipo",
        get: (r) => PQR_TYPE_LABELS[r.type as keyof typeof PQR_TYPE_LABELS] ?? text(r.type),
      },
      { header: "Estado", get: (r) => PQR_STATUS_LABELS[text(r.status)] ?? text(r.status) },
      { header: "Responder antes de", get: (r) => r.responseDueAt },
      { header: "Nombre", get: (r) => r.name },
      { header: "Correo", get: (r) => r.email },
      { header: "Teléfono", get: (r) => r.phone },
      { header: "Documento", get: (r) => r.documentNumber },
      { header: "Proyecto", get: (r) => relationName(r.project) },
      { header: "Torre", get: (r) => r.tower },
      { header: "Unidad", get: (r) => r.unit },
      { header: "Fecha de entrega", get: (r) => r.deliveredAt },
      { header: "Asunto", get: (r) => r.subject },
      { header: "Mensaje", get: (r) => r.message },
      { header: "Notificado", get: (r) => date(r.notifiedAt) },
      { header: "Notas internas", get: (r) => r.internalNotes },
      { header: "ID", get: (r) => r.documentId },
    ],
  },
  "newsletter-subscribers": {
    uid: "api::newsletter-subscriber.newsletter-subscriber",
    filename: "boletin",
    columns: [
      { header: "Fecha", get: (r) => date(r.createdAt) },
      { header: "Correo", get: (r) => r.email },
      { header: "Origen", get: (r) => r.source },
      { header: "ID", get: (r) => r.documentId },
    ],
  },
  "faq-bot-questions": {
    uid: "api::faq-bot-question.faq-bot-question",
    filename: "preguntas-asistente",
    columns: [
      { header: "Fecha", get: (r) => date(r.askedAt ?? r.createdAt) },
      { header: "Pregunta", get: (r) => r.question },
      { header: "Respuesta", get: (r) => r.answer },
      { header: "Desde caché", get: (r) => yesNo(r.wasCached) },
      { header: "Modelo", get: (r) => r.model },
      { header: "ID", get: (r) => r.documentId },
    ],
  },
};

const SEPARATOR = ";";
const PAGE = 500;

/** One cell, quoted whenever it has to be, and never executable in a spreadsheet. */
function csvCell(value: unknown): string {
  let cell = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  if (/[";\n\r]/.test(cell)) cell = `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

function line(cells: unknown[]): string {
  return `${cells.map(csvCell).join(SEPARATOR)}\r\n`;
}

export interface ExportQuery {
  filters?: unknown;
  sort?: unknown;
  _q?: unknown;
}

async function fetchPage(
  strapi: Core.Strapi,
  spec: ExportSpec,
  query: ExportQuery,
  start: number,
): Promise<Row[]> {
  return (await strapi.documents(spec.uid as "api::lead.lead").findMany({
    ...(query.filters !== undefined ? { filters: query.filters } : {}),
    sort: query.sort ?? "createdAt:desc",
    ...(typeof query._q === "string" && query._q ? { _q: query._q } : {}),
    ...(spec.populate ? { populate: spec.populate } : {}),
    start,
    limit: PAGE,
  } as never)) as Row[];
}

/**
 * Streams the collection page by page so a big export never sits in memory
 * whole. The first page is fetched BEFORE the stream exists: a bad filter
 * throws here, while the controller can still answer 400. Anything that
 * fails after the headers went out can only end the stream and be logged.
 */
export async function streamCsv(
  strapi: Core.Strapi,
  spec: ExportSpec,
  query: ExportQuery,
): Promise<PassThrough> {
  const first = await fetchPage(strapi, spec, query, 0);
  const stream = new PassThrough();

  void (async () => {
    try {
      // The byte-order mark, so Excel reads the accents as UTF-8.
      stream.write(String.fromCharCode(0xfeff));
      stream.write(line(spec.columns.map((column) => column.header)));

      let rows = first;
      let start = 0;
      for (;;) {
        for (const row of rows) {
          stream.write(line(spec.columns.map((column) => column.get(row))));
        }
        if (rows.length < PAGE) break;
        start += PAGE;
        rows = await fetchPage(strapi, spec, query, start);
      }
      stream.end();
    } catch (err) {
      strapi.log.error(`CSV export of ${spec.uid} failed mid-stream: ${String(err)}`);
      stream.destroy(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return stream;
}
