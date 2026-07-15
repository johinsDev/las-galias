export type Currency = "COP" | "USD" | "EUR";

export function formatMoney(value: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === "COP" ? "es-CO" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Converts a COP price into the target currency using COP-per-unit rates. */
export function convertFromCOP(
  cop: number,
  currency: Currency,
  rates: { copPerUsd: number; copPerEur: number },
): number {
  if (currency === "USD") return cop / rates.copPerUsd;
  if (currency === "EUR") return cop / rates.copPerEur;
  return cop;
}
