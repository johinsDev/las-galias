import { FrankfurterProvider } from "./frankfurter";
import { TrmColombiaProvider } from "./trm-colombia";
import type { QuoteCurrency, RateProvider, RateQuote } from "./types";

/**
 * Default RateProvider implementation:
 * - USD: official TRM (datos.gov.co).
 * - EUR: cross-rate — COP/EUR = TRM(COP/USD) × (USD per 1 EUR, from the ECB).
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
      // A cross-rate is only as current as its STALEST leg. Reporting the TRM's
      // date alone (as this did) claimed the EUR figure was from today even
      // when the ECB leg was Friday's — the two publish on different calendars,
      // so over a weekend or a Colombian holiday they routinely disagree.
      asOf: olderOf(usd.asOf, eurUsd.asOf),
    };
  }
}

/** The earlier of two ISO dates, compared as dates rather than as strings. */
function olderOf(a: string, b: string): string {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta)) return b;
  if (Number.isNaN(tb)) return a;
  return ta <= tb ? a : b;
}
