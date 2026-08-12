/**
 * Shared math for the three simulators on /calculadoras.
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
