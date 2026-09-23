/**
 * Shared math for the three simulators under /simuladores.
 *
 * Colombian lenders quote an EFFECTIVE annual rate (E.A.), so the monthly rate
 * is its twelfth root — dividing by 12 would understate every instalment.
 * Everything below is the French amortisation system (fixed instalment), which
 * is what the results panel says it is.
 */

function monthlyRateFromEA(annualRatePct: number): number {
  return Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
}

/** Fixed monthly instalment for `principal` over `termYears`. */
export function monthlyPayment(
  principal: number,
  annualRatePct: number,
  termYears: number,
): number {
  const i = monthlyRateFromEA(annualRatePct);
  const n = Math.max(1, Math.round(termYears * 12));
  if (principal <= 0) return 0;
  return i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
}

/** The inverse: the largest loan an instalment of `payment` can service. */
export function maxLoanFor(payment: number, annualRatePct: number, termYears: number): number {
  const i = monthlyRateFromEA(annualRatePct);
  const n = Math.max(1, Math.round(termYears * 12));
  if (payment <= 0) return 0;
  return i === 0 ? payment * n : (payment * (1 - Math.pow(1 + i, -n))) / i;
}

/** "~$180 millones" — the ballpark figure the affordability result ends on. */
export function approxMillions(value: number): string {
  return `~$${Math.max(0, Math.round(value / 1_000_000)).toLocaleString("es-CO")} millones`;
}

/** Percentage for display: never NaN when the denominator is still empty. */
export function percentOf(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

/* ------------------------------------------------------------ cuota inicial */

/**
 * Mi Casa Ya, in minimum wages: 30 SMMLV for the lowest-income households and
 * 20 SMMLV for the next bracket. `0` is "no subsidy". The peso value depends on
 * the year's minimum wage, which is a `calculator-config` knob and not a
 * constant here, because it changes every January.
 */
export const SUBSIDY_TIERS_SMMLV = [0, 20, 30] as const;

export function subsidyInCOP(tier: number, smmlvCOP: number): number {
  return Math.max(0, tier) * Math.max(0, smmlvCOP);
}

export interface DownPaymentInput {
  price: number;
  /** Down payment as a percentage of the price. */
  downPct: number;
  savings: number;
  /** Subsidy in pesos, already resolved from its tier. */
  subsidy: number;
  /** Months left to pay the down payment to the builder. */
  months: number;
  /** Share of the price the chosen credit product covers at most. */
  financingPct: number;
}

export interface DownPaymentPlan {
  downPayment: number;
  subsidy: number;
  /** What the mortgage or leasing has to cover. */
  financed: number;
  /** Down payment still unfunded after savings and subsidy. */
  pending: number;
  monthlySaving: number;
  /** What the chosen product forces you to put in yourself. */
  minDownPct: number;
}

/**
 * The subsidy goes to the builder as part of the down payment, so it comes off
 * what the household still has to save. When it is larger than the down
 * payment itself the rest lowers the loan instead — that is how a 30 SMMLV
 * subsidy lands on a cheap VIS home.
 */
export function downPaymentPlan(input: DownPaymentInput): DownPaymentPlan {
  const downPayment = input.price * (input.downPct / 100);
  const subsidy = Math.max(0, input.subsidy);
  const pending = Math.max(0, downPayment - input.savings - subsidy);
  const overflow = Math.max(0, subsidy - downPayment);

  return {
    downPayment,
    subsidy,
    financed: Math.max(0, input.price - downPayment - overflow),
    pending,
    monthlySaving: pending / Math.max(1, input.months),
    minDownPct: Math.max(0, 100 - input.financingPct),
  };
}
