import { FrankfurterProvider } from "./frankfurter";
import { TrmColombiaProvider } from "./trm-colombia";
import type { QuoteCurrency, RateProvider, RateQuote } from "./types";

/**
 * Implementación por defecto del RateProvider:
 * - USD: TRM oficial (datos.gov.co).
 * - EUR: cross-rate — COP/EUR = TRM(COP/USD) × (USD por 1 EUR, del ECB).
 */
export class CompositeRateProvider implements RateProvider {
  readonly name = "trm+ecb";

  constructor(
    private readonly trm = new TrmColombiaProvider(),
    private readonly ecb = new FrankfurterProvider(),
  ) {}

  async getRate(quote: QuoteCurrency): Promise<RateQuote> {
    const usd = await this.trm.getUsdRate();
    if (quote === "USD") return usd;

    const eurUsd = await this.ecb.getUsdPerEur();
    return {
      base: "COP",
      quote: "EUR",
      rate: usd.rate * eurUsd.rate,
      source: `${this.trm.name} × ${this.ecb.name}`,
      asOf: usd.asOf,
    };
  }
}
