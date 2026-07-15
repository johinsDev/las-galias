export type Currency = "COP" | "USD" | "EUR";

export function formatMoney(value: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === "COP" ? "es-CO" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Convierte un precio en COP a la divisa destino usando tasas COP-por-unidad. */
export function convertFromCOP(
  cop: number,
  currency: Currency,
  rates: { copPorUsd: number; copPorEur: number },
): number {
  if (currency === "USD") return cop / rates.copPorUsd;
  if (currency === "EUR") return cop / rates.copPorEur;
  return cop;
}
