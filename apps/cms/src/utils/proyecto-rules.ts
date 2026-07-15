import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";

import { NotImplementedError } from "@lasgalias/providers";
import { getProjectDataProvider } from "./providers";
import { extractRelationIds } from "./relations";

export const PROYECTO_UID = "api::proyecto.proyecto";
const REDIRECCION_UID = "api::redireccion.redireccion";
const PROYECTOS_HOME = "/proyectos";

interface DocParams {
  documentId?: string;
  data?: Record<string, unknown>;
}

/**
 * Regla: al crear/actualizar con "datos desde Sinco" activo y un sincoId,
 * el provider externo gobierna nombre/precio/estado/tipologías (merge sobre
 * data antes de persistir). Si el provider falla no bloquea al editor: loguea
 * y deja el ingreso manual.
 */
export async function mergeDatosDesdeSinco(strapi: Core.Strapi, params: DocParams): Promise<void> {
  const data = params.data;
  if (!data || data.datosDesdeSinco !== true) return;
  const sincoId = typeof data.sincoId === "string" ? data.sincoId.trim() : "";
  if (!sincoId) return;

  const provider = getProjectDataProvider();
  try {
    const externo = await provider.getProjectById(sincoId);
    if (!externo) {
      strapi.log.warn(`Provider "${provider.name}" no encontró el proyecto externo ${sincoId}`);
      return;
    }
    if (externo.nombre !== undefined) data.nombre = externo.nombre;
    if (externo.precioDesdeCOP !== undefined) data.precioDesdeCOP = String(externo.precioDesdeCOP);
    if (externo.estadoObra !== undefined) data.estadoObra = externo.estadoObra;
    if (externo.tipologias !== undefined) {
      data.tipologias = externo.tipologias.map((t) => ({
        nombre: t.nombre,
        areaM2: t.areaM2,
        habitaciones: t.habitaciones,
        banos: t.banos,
        precioCOP: String(t.precioCOP),
      }));
    }
    strapi.log.info(`Datos del proyecto ${sincoId} traídos desde "${provider.name}"`);
  } catch (err) {
    if (err instanceof NotImplementedError) {
      strapi.log.warn(
        `Provider "${provider.name}" sin implementar aún — ingreso manual: ${err.message}`,
      );
      return;
    }
    strapi.log.error(`Error consultando el provider "${provider.name}": ${String(err)}`);
  }
}

/**
 * Regla: los proyectos recomendados de una PDP deben ser de la misma ciudad
 * que el proyecto que los recomienda.
 */
export async function validarRecomendadosMismaCiudad(
  strapi: Core.Strapi,
  params: DocParams,
): Promise<void> {
  const data = params.data;
  if (!data || data.recomendados === undefined) return;

  const recomendadosIds = extractRelationIds(data.recomendados);
  if (recomendadosIds.length === 0) return;

  // Ciudad del proyecto: del payload, o del documento existente si no cambió.
  let ciudadId: string | undefined = extractRelationIds(data.ciudad)[0];
  if (!ciudadId && params.documentId) {
    const actual = await strapi.documents(PROYECTO_UID).findOne({
      documentId: params.documentId,
      populate: ["ciudad"],
    });
    ciudadId = (actual?.ciudad as { documentId?: string } | undefined)?.documentId;
  }
  if (!ciudadId) return;

  for (const documentId of recomendadosIds) {
    if (params.documentId && documentId === params.documentId) {
      throw new errors.ValidationError("Un proyecto no puede recomendarse a sí mismo");
    }
    const recomendado = await strapi.documents(PROYECTO_UID).findOne({
      documentId,
      populate: ["ciudad"],
    });
    const ciudadRecomendado = (recomendado?.ciudad as { documentId?: string } | undefined)
      ?.documentId;
    if (ciudadRecomendado !== ciudadId) {
      throw new errors.ValidationError(
        `El proyecto recomendado "${recomendado?.nombre ?? documentId}" es de otra ciudad. ` +
          "Los recomendados deben ser de la misma ciudad del proyecto.",
      );
    }
  }
}

/**
 * Regla: required condicional por etapa al publicar. expectativa publica con
 * lo mínimo (nombre/slug/ciudad ya son required + un hero); venta exige la
 * ficha completa (precio, tipologías y galería).
 */
export async function validarCamposPorEtapa(strapi: Core.Strapi, params: DocParams): Promise<void> {
  if (!params.documentId) return;
  const doc = await strapi.documents(PROYECTO_UID).findOne({
    documentId: params.documentId,
    populate: ["ciudad", "tipologias", "galeria", "heroDesktop", "heroMobile"],
  });
  if (!doc) return;

  const faltantes: string[] = [];
  if (!doc.heroDesktop && !doc.heroMobile) faltantes.push("imagen hero (desktop o mobile)");

  if (doc.etapa === "venta") {
    if (!doc.precioDesdeCOP) faltantes.push("precio desde (COP)");
    if (!Array.isArray(doc.tipologias) || doc.tipologias.length === 0) faltantes.push("tipologías");
    if (!Array.isArray(doc.galeria) || doc.galeria.length === 0) faltantes.push("galería");
  }

  if (faltantes.length > 0) {
    throw new errors.ValidationError(
      `No se puede publicar en etapa "${doc.etapa}": falta ${faltantes.join(", ")}.`,
    );
  }
}

/**
 * Regla: al despublicar (o borrar) un proyecto, el sitio debe redireccionar
 * su PDP a la página principal de proyectos. Upsert por `from`.
 */
export async function crearRedireccionAutomatica(
  strapi: Core.Strapi,
  params: DocParams,
): Promise<void> {
  if (!params.documentId) return;
  const doc = await strapi.documents(PROYECTO_UID).findOne({ documentId: params.documentId });
  if (!doc?.slug) return;

  const from = `${PROYECTOS_HOME}/${doc.slug}`;
  const existente = await strapi.documents(REDIRECCION_UID).findFirst({
    filters: { from },
  });

  if (existente) {
    await strapi.documents(REDIRECCION_UID).update({
      documentId: existente.documentId,
      data: { to: PROYECTOS_HOME, habilitada: true, origen: "auto-unpublish" },
    });
  } else {
    await strapi.documents(REDIRECCION_UID).create({
      data: {
        from,
        to: PROYECTOS_HOME,
        permanente: false,
        habilitada: true,
        origen: "auto-unpublish",
      },
    });
  }
  strapi.log.info(`Redirección automática ${from} → ${PROYECTOS_HOME} activada`);
}

/** Al volver a publicar, la redirección automática de ese slug se apaga. */
export async function deshabilitarRedireccionAutomatica(
  strapi: Core.Strapi,
  params: DocParams,
): Promise<void> {
  if (!params.documentId) return;
  const doc = await strapi.documents(PROYECTO_UID).findOne({ documentId: params.documentId });
  if (!doc?.slug) return;

  const redireccion = await strapi.documents(REDIRECCION_UID).findFirst({
    filters: { from: `${PROYECTOS_HOME}/${doc.slug}`, origen: "auto-unpublish", habilitada: true },
  });
  if (redireccion) {
    await strapi.documents(REDIRECCION_UID).update({
      documentId: redireccion.documentId,
      data: { habilitada: false },
    });
    strapi.log.info(
      `Redirección automática de /proyectos/${doc.slug} deshabilitada (re-publicado)`,
    );
  }
}
