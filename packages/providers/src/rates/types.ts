export type QuoteCurrency = "USD" | "EUR";

export interface RateQuote {
  base: "COP";
  quote: QuoteCurrency;
  /** COP per 1 unit of the quote currency */
  rate: number;
  source: string;
  /** ISO date the rate is valid from */
  asOf: string;
}

/**
 * Source-agnostic exchange-rate contract. The default implementation composes
 * the official TRM (USD) with the ECB cross-rate (EUR), but it can be swapped
 * for a commercial API without touching consumers.
 */
export interface RateProvider {
  readonly name: string;
  getRate(quote: QuoteCurrency): Promise<RateQuote>;
}
