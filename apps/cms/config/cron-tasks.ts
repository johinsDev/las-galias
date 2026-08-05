import type { Core } from "@strapi/strapi";
import { createRateProvider } from "@lasgalias/providers";

import { recordJobRun, runTracked } from "../src/utils/job-log";
import { retryPendingLeads } from "../src/utils/lead-rules";
import { syncAllProjectsFromSinco } from "../src/utils/project-rules";
import { syncSincoCatalog } from "../src/utils/sinco-catalog";

const RATE_UID = "api::exchange-rate.exchange-rate";

export default {
  /**
   * Refreshes the Sinco project picker (~110 calls, ~1.5 s). Runs at dawn so
   * editors always find new projects already listed, and Sinco is never called
   * while somebody is editing.
   */
  refreshSincoCatalog: {
    async task({ strapi }: { strapi: Core.Strapi }) {
      if (!process.env.SINCO_BASE_URL || !process.env.SINCO_PASSWORD) {
        await recordJobRun(strapi, "Catálogo de Sinco", "skipped", "Sin credenciales de Sinco");
        return;
      }
      await runTracked(strapi, "Catálogo de Sinco", () => syncSincoCatalog(strapi));
    },
    options: {
      rule: "0 30 5 * * *",
      tz: "America/Bogota",
    },
  },

  /**
   * Pulls price and areas for every project with "sync from Sinco" enabled.
   * Runs after refreshSincoCatalog so a project picked yesterday already has
   * its catalog entry, and well before office hours — this is the only place
   * that reads project data from the ERP in bulk.
   */
  syncProjectsFromSinco: {
    async task({ strapi }: { strapi: Core.Strapi }) {
      if (process.env.PROJECT_DATA_PROVIDER !== "sinco") {
        await recordJobRun(
          strapi,
          "Precios y áreas desde Sinco",
          "skipped",
          "PROJECT_DATA_PROVIDER no es sinco",
        );
        return;
      }
      await runTracked(strapi, "Precios y áreas desde Sinco", () =>
        syncAllProjectsFromSinco(strapi),
      );
    },
    options: {
      rule: "0 45 5 * * *",
      tz: "America/Bogota",
    },
  },

  /**
   * Second chance for leads the CRM did not take (Sinco down, token expired,
   * project without a `sincoId`). The lead itself is never at risk — it is
   * already stored in Strapi; this only retries the push.
   */
  retryCrmLeads: {
    async task({ strapi }: { strapi: Core.Strapi }) {
      await runTracked(strapi, "Reintento de leads", () => retryPendingLeads(strapi));
    },
    options: {
      rule: "0 */15 * * * *",
      tz: "America/Bogota",
    },
  },

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
