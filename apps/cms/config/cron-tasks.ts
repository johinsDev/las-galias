import type { Core } from "@strapi/strapi";
import { createRateProvider } from "@lasgalias/providers";

const TASA_UID = "api::tasa-de-cambio.tasa-de-cambio";

export default {
  /**
   * Actualiza las tasas COP→USD/EUR una vez al día (6:00 am hora Colombia).
   * USD: TRM oficial (datos.gov.co). EUR: cross-rate con el ECB.
   */
  actualizarTasasDeCambio: {
    async task({ strapi }: { strapi: Core.Strapi }) {
      const provider = createRateProvider();
      try {
        const usd = await provider.getRate("USD");
        const eur = await provider.getRate("EUR");
        const data = {
          copPorUsd: usd.rate,
          copPorEur: eur.rate,
          fuenteUsd: usd.source,
          fuenteEur: eur.source,
          vigenciaDesde: usd.asOf,
          actualizadoEn: new Date().toISOString(),
        };

        const actual = await strapi.documents(TASA_UID).findFirst();
        if (actual) {
          await strapi.documents(TASA_UID).update({ documentId: actual.documentId, data });
        } else {
          await strapi.documents(TASA_UID).create({ data });
        }
        strapi.log.info(
          `Tasas actualizadas: USD=${usd.rate.toFixed(2)} EUR=${eur.rate.toFixed(2)} (${usd.asOf})`,
        );
      } catch (err) {
        strapi.log.error(`No se pudieron actualizar las tasas de cambio: ${String(err)}`);
      }
    },
    options: {
      rule: "0 0 6 * * *",
      tz: "America/Bogota",
    },
  },
};
