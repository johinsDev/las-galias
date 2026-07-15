const FRANKFURTER_ENDPOINT = "https://api.frankfurter.app/latest";

interface FrankfurterResponse {
  date: string;
  rates: { USD?: number };
}

/**
 * frankfurter.app expone las tasas de referencia del ECB (sin API key).
 * El ECB no publica COP, así que este provider solo entrega USD-por-EUR
 * para que CompositeRateProvider calcule el cross-rate COP/EUR.
 */
export class FrankfurterProvider {
  readonly name = "frankfurter.app (ECB)";

  async getUsdPerEur(): Promise<{ rate: number; asOf: string }> {
    const res = await fetch(`${FRANKFURTER_ENDPOINT}?from=EUR&to=USD`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`frankfurter.app respondió ${res.status}`);
    }
    const data = (await res.json()) as FrankfurterResponse;
    if (!data.rates.USD) {
      throw new Error("frankfurter.app no devolvió la tasa USD");
    }
    return { rate: data.rates.USD, asOf: data.date };
  }
}
