import type { Core } from "@strapi/strapi";

import { EXPORTS, streamCsv } from "../../../utils/csv-export";

/**
 * `GET /exports/:collection` — the «Exportar CSV» button of the list views.
 *
 * Mounted on the ADMIN router from src/index.ts (there is deliberately no
 * routes file here: an api route is content-api and would never accept the
 * admin JWT). The query string is whatever the list view carries —
 * `filters`, `sort`, `_q` — passed straight to the document service, so the
 * file holds exactly the rows on screen. `documents.strictParams` turns an
 * unknown filter into a 400 instead of a silent full export.
 */
interface ExportContext {
  params: { collection?: string };
  query: Record<string, unknown>;
  status: number;
  body: unknown;
  set(headers: Record<string, string>): void;
  notFound(message: string): unknown;
  badRequest(message: string): unknown;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async csv(ctx: ExportContext) {
    const spec = ctx.params.collection ? EXPORTS[ctx.params.collection] : undefined;
    if (!spec) return ctx.notFound("No existe esa exportación");

    let stream;
    try {
      stream = await streamCsv(strapi, spec, {
        filters: ctx.query.filters,
        sort: ctx.query.sort,
        _q: ctx.query._q,
      });
    } catch (err) {
      // `documents.strictParams`: an unknown filter or sort field throws a
      // ValidationError before a single row is read.
      strapi.log.warn(`CSV export of ${spec.uid} refused: ${String(err)}`);
      return ctx.badRequest("Filtro u orden no válido");
    }

    const stamp = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Bogota" });
    ctx.status = 200;
    ctx.set({
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${spec.filename}-${stamp}.csv"`,
      "cache-control": "no-store",
    });
    ctx.body = stream;
  },
});
