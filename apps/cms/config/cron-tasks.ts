import type { Core } from "@strapi/strapi";
import { createRateProvider } from "@lasgalias/providers";

const RATE_UID = "api::exchange-rate.exchange-rate";

export default {
  /**
   * Refreshes the COP→USD/EUR rates once a day (6:00 am Colombia time).
   * USD: official TRM (datos.gov.co). EUR: cross-rate against the ECB.
   */
  refreshExchangeRates: {
    async task({ strapi }: { strapi: Core.Strapi }) {
      const provider = createRateProvider();
      try {
        const usd = await provider.getRate("USD");
        const eur = await provider.getRate("EUR");
        const data = {
          copPerUsd: usd.rate,
          copPerEur: eur.rate,
          usdSource: usd.source,
          eurSource: eur.source,
          validFrom: usd.asOf,
          fetchedAt: new Date().toISOString(),
        };

        const current = await strapi.documents(RATE_UID).findFirst();
        if (current) {
          await strapi.documents(RATE_UID).update({ documentId: current.documentId, data });
        } else {
          await strapi.documents(RATE_UID).create({ data });
        }
        strapi.log.info(
          `Exchange rates refreshed: USD=${usd.rate.toFixed(2)} EUR=${eur.rate.toFixed(2)} (${usd.asOf})`,
        );
      } catch (err) {
        strapi.log.error(`Exchange rate refresh failed: ${String(err)}`);
      }
    },
    options: {
      rule: "0 0 6 * * *",
      tz: "America/Bogota",
    },
  },
};
