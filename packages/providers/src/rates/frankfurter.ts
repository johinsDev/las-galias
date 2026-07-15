const FRANKFURTER_ENDPOINT = "https://api.frankfurter.app/latest";

interface FrankfurterResponse {
  date: string;
  rates: { USD?: number };
}

/**
 * frankfurter.app exposes the ECB reference rates (no API key).
 * The ECB does not publish COP, so this provider only returns USD-per-EUR
 * for CompositeRateProvider to compute the COP/EUR cross-rate.
 */
export class FrankfurterProvider {
  readonly name = "frankfurter.app (ECB)";

  async getUsdPerEur(): Promise<{ rate: number; asOf: string }> {
    const res = await fetch(`${FRANKFURTER_ENDPOINT}?from=EUR&to=USD`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`frankfurter.app responded ${res.status}`);
    }
    const data = (await res.json()) as FrankfurterResponse;
    if (!data.rates.USD) {
      throw new Error("frankfurter.app did not return the USD rate");
    }
    return { rate: data.rates.USD, asOf: data.date };
  }
}
