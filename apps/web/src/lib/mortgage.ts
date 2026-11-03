import { downPaymentPlan, SUBSIDY_TIERS_SMMLV, subsidyInCOP } from "@/lib/simulators";

/** Per-project financing terms, falling back to the global calculator-config. */
export interface QuoteTerms {
  /** Down payment as a percentage of the price (e.g. 30). */
  downPaymentPct: number;
  /** Months to pay the down payment to the builder (e.g. 36). */
  builderInstallmentMonths: number;
  /** This year's minimum wage, which prices the Mi Casa Ya subsidy. */
  smmlvCOP: number;
}

export interface Quote {
  price: number;
  /** Down payment (cuota inicial). */
  downPayment: number;
  /** What the mortgage has to cover. */
  financed: number;
  /** The highest Mi Casa Ya subsidy, in pesos, and its tier in SMMLV. */
  subsidy: number;
  subsidyTier: number;
  /** Builder instalment with that subsidy taken off the down payment: the "desde". */
  monthlyWithSubsidy: number;
  /** The same instalment for a household with no subsidy. */
  monthlyWithoutSubsidy: number;
}

/**
 * The PDP breakdown, centred on the down payment (Nov 2026 revision): the
 * cuota inicial, what the credit covers and the builder instalment "desde",
 * i.e. with the top Mi Casa Ya tier off the down payment. It is the same
 * formula as the cuota inicial simulator (`downPaymentPlan`), so the PDP and
 * /simuladores can never disagree.
 */
export function quoteFor(price: number, terms: QuoteTerms): Quote {
  const subsidyTier = Math.max(...SUBSIDY_TIERS_SMMLV);
  const plan = (subsidy: number) =>
    downPaymentPlan({
      price,
      downPct: terms.downPaymentPct,
      subsidy,
      months: terms.builderInstallmentMonths,
      financingPct: 100 - terms.downPaymentPct,
    });
  const withSubsidy = plan(subsidyInCOP(subsidyTier, terms.smmlvCOP));

  return {
    price,
    downPayment: withSubsidy.downPayment,
    financed: withSubsidy.financed,
    subsidy: withSubsidy.subsidy,
    subsidyTier,
    monthlyWithSubsidy: withSubsidy.monthlySaving,
    monthlyWithoutSubsidy: plan(0).monthlySaving,
  };
}

/** Event the typology simulator broadcasts so the sticky sidebar can follow. */
export const TYPOLOGY_EVENT = "lg:typology-change";

export interface TypologyChangeDetail {
  index: number;
  name: string;
  price: number;
}
