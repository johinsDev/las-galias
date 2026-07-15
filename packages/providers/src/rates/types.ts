export type QuoteCurrency = "USD" | "EUR";

export interface RateQuote {
  base: "COP";
  quote: QuoteCurrency;
  /** COP por 1 unidad de la divisa quote */
  rate: number;
  source: string;
  /** ISO date de vigencia de la tasa */
  asOf: string;
}

/**
 * Contrato agnóstico de tasas de cambio. La implementación por defecto compone
 * la TRM oficial (USD) con el cross-rate del ECB (EUR), pero se puede cambiar
 * por una API comercial sin tocar a los consumidores.
 */
export interface RateProvider {
  readonly name: string;
  getRate(quote: QuoteCurrency): Promise<RateQuote>;
}
