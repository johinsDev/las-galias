/** Per-project financing terms, falling back to the global calculator-config. */
export interface QuoteTerms {
  /** Effective annual rate, in percent (e.g. 13.95). */
  annualRatePct: number;
  termYears: number;
  /** Down payment as a percentage of the price (e.g. 30). */
  downPaymentPct: number;
  /** Months to pay the down payment to the builder (e.g. 36). */
  builderInstallmentMonths: number;
}

export interface Quote {
  price: number;
  /** Down payment (cuota inicial). */
  downPayment: number;
  /** Down payment split across the builder instalment months. */
  builderMonthly: number;
  /** What the mortgage has to cover. */
  financed: number;
  /** Estimated monthly mortgage payment. */
  monthlyPayment: number;
}

/**
 * The PDP breakdown: cuota inicial, cuota constructora and the estimated
 * mortgage payment for one price. Shared by the typology simulator and the
 * sticky sidebar so the two can never disagree.
 *
 * The rate is effective annual (E.A., how Colombian lenders quote it), so the
 * monthly rate is its twelfth root — not a division by 12.
 */
export function quoteFor(price: number, terms: QuoteTerms): Quote {
  const downPayment = price * (terms.downPaymentPct / 100);
  const financed = price - downPayment;

  const months = Math.max(1, terms.builderInstallmentMonths);
  const builderMonthly = downPayment / months;

  const monthlyRate = Math.pow(1 + terms.annualRatePct / 100, 1 / 12) - 1;
  const n = Math.max(1, terms.termYears * 12);
  const monthlyPayment =
    monthlyRate === 0
      ? financed / n
      : (financed * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));

  return { price, downPayment, builderMonthly, financed, monthlyPayment };
}

/** Event the typology simulator broadcasts so the sticky sidebar can follow. */
export const TYPOLOGY_EVENT = "lg:typology-change";

export interface TypologyChangeDetail {
  index: number;
  name: string;
  price: number;
}
