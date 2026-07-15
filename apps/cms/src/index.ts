import type { Core } from "@strapi/strapi";

import { scheduleDeploy } from "./utils/deploy-hook";
import {
  crearRedireccionAutomatica,
  deshabilitarRedireccionAutomatica,
  mergeDatosDesdeSinco,
  PROYECTO_UID,
  validarCamposPorEtapa,
  validarRecomendadosMismaCiudad,
} from "./utils/proyecto-rules";

/** Content types cuyo publish/unpublish debe reconstruir el sitio estático. */
const UIDS_PUBLICOS = new Set<string>([
  PROYECTO_UID,
  "api::entrada.entrada",
  "api::banner-home.banner-home",
  "api::macroproyecto.macroproyecto",
  "api::ciudad.ciudad",
  "api::zona-comun.zona-comun",
  "api::zona-de-interes.zona-de-interes",
  "api::redireccion.redireccion",
]);

const ACCIONES_QUE_DESPLIEGAN = new Set(["publish", "unpublish", "discardDraft", "delete"]);

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.documents.use(async (context, next) => {
      const { uid, action } = context;
      const params = context.params as {
        documentId?: string;
        data?: Record<string, unknown>;
      };

      if (uid === PROYECTO_UID) {
        if (action === "create" || action === "update") {
          await mergeDatosDesdeSinco(strapi, params);
          await validarRecomendadosMismaCiudad(strapi, params);
        }
        if (action === "publish") {
          await validarCamposPorEtapa(strapi, params);
        }
        if (action === "unpublish" || action === "delete") {
          // Antes de next(): en delete el documento aún existe y podemos leer el slug.
          await crearRedireccionAutomatica(strapi, params);
        }
      }

      const result = await next();

      if (uid === PROYECTO_UID && action === "publish") {
        await deshabilitarRedireccionAutomatica(strapi, params);
      }

      if (UIDS_PUBLICOS.has(uid) && ACCIONES_QUE_DESPLIEGAN.has(action)) {
        scheduleDeploy(strapi);
      }

      return result;
    });
  },

  /**
   * Permisos del rol Public como código: lectura del contenido del sitio y
   * SOLO create sobre leads. Idempotente — corre en cada arranque.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const publicRole = await strapi
      .query("plugin::users-permissions.role")
      .findOne({ where: { type: "public" } });
    if (!publicRole) return;

    const lecturas = [
      "api::proyecto.proyecto",
      "api::entrada.entrada",
      "api::ciudad.ciudad",
      "api::macroproyecto.macroproyecto",
      "api::zona-comun.zona-comun",
      "api::zona-de-interes.zona-de-interes",
      "api::banner-home.banner-home",
      "api::redireccion.redireccion",
    ].flatMap((uid) => [`${uid}.find`, `${uid}.findOne`]);
    const singles = [
      "api::configuracion-calculadora.configuracion-calculadora.find",
      "api::tasa-de-cambio.tasa-de-cambio.find",
    ];
    const acciones = [...lecturas, ...singles, "api::lead.lead.create"];

    for (const action of acciones) {
      const existente = await strapi
        .query("plugin::users-permissions.permission")
        .findOne({ where: { action, role: publicRole.id } });
      if (!existente) {
        await strapi
          .query("plugin::users-permissions.permission")
          .create({ data: { action, role: publicRole.id } });
        strapi.log.info(`Permiso público concedido: ${action}`);
      }
    }
  },
};
