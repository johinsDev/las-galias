import { getCalculatorConfig, getProjects } from "@/lib/strapi";

/**
 * The three simulators, as pages. Shared by the /simuladores index and by the
 * [slug] route so the chips, the cards and the routes cannot disagree about
 * which simulators exist or how they are named.
 *
 * Slugs are unaccented on purpose: they are public URLs, and `crédito` would
 * travel percent-encoded and break on copy/paste.
 */
export const SIMULATORS = [
  {
    slug: "cuota-inicial",
    short: "Cuota inicial",
    eyebrow: "Simulador · Cuota inicial",
    title: "Simulador de Cuota Inicial",
    body: "Calcula cuánto necesitas ahorrar para la cuota inicial de tu vivienda.",
    seoDescription:
      "Calcula cuánto necesitas ahorrar para la cuota inicial de tu vivienda, con crédito hipotecario o leasing habitacional.",
  },
  {
    slug: "credito-hipotecario",
    short: "Crédito hipotecario",
    eyebrow: "Simulador · Crédito hipotecario",
    title: "Simulador de Crédito Hipotecario",
    body: "Calcula tu cuota mensual estimada y verifica tu capacidad de endeudamiento.",
    seoDescription:
      "Calcula la cuota mensual estimada de tu crédito hipotecario y verifica tu capacidad de endeudamiento antes de hablar con un asesor.",
  },
  {
    slug: "capacidad-de-pago",
    short: "Capacidad de pago",
    eyebrow: "Simulador · Capacidad de pago",
    title: "Simulador de Capacidad de Pago",
    body: "Descubre cuál es la cuota máxima que puedes pagar cómodamente cada mes.",
    seoDescription:
      "Descubre cuál es la cuota máxima que puedes pagar cada mes y hasta qué valor de vivienda te alcanza.",
  },
] as const;

export interface SimulatorSettings {
  annualInterestRate: number;
  maxTermYears: number;
  maxFinancingPercent: number;
  leasingFinancingPercent: number;
  visFinancingPercent: number;
  maxIncomeRatioPercent: number;
  paymentIncomeRatioPercent: number;
  /** Cheapest project actually on sale, so the simulators open on a real figure. */
  startingPrice: number;
}

/**
 * Every knob lives in `calculator-config`, but the four simulator pages must
 * still build when the CMS is unreachable — hence the industry defaults.
 *
 * This used to be inline in the single /calculadoras page; with four pages it
 * would have been copied four times, and four copies of a default interest
 * rate is four places to forget.
 */
export async function getSimulatorSettings(): Promise<SimulatorSettings> {
  const [calculator, projects] = await Promise.all([getCalculatorConfig(), getProjects()]);

  const prices = projects
    .filter((p) => p.stage === "sale" && p.priceFromCOP)
    .map((p) => Number(p.priceFromCOP));

  return {
    annualInterestRate: calculator?.annualInterestRate ?? 13.95,
    maxTermYears: calculator?.maxTermYears ?? 20,
    maxFinancingPercent: calculator?.maxFinancingPercent ?? 70,
    leasingFinancingPercent: calculator?.leasingFinancingPercent ?? 80,
    visFinancingPercent: calculator?.visFinancingPercent ?? 80,
    maxIncomeRatioPercent: calculator?.maxIncomeRatioPercent ?? 40,
    paymentIncomeRatioPercent: calculator?.paymentIncomeRatioPercent ?? 30,
    startingPrice: prices.length > 0 ? Math.min(...prices) : 300_000_000,
  };
}
