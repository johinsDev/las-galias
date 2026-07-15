export { CompositeRateProvider } from "./composite";
export { FrankfurterProvider } from "./frankfurter";
export { TrmColombiaProvider } from "./trm-colombia";
export type { QuoteCurrency, RateProvider, RateQuote } from "./types";

import { CompositeRateProvider } from "./composite";
import type { RateProvider } from "./types";

/** Factory simétrica a createProjectDataProvider; hoy solo hay una estrategia. */
export function createRateProvider(): RateProvider {
  return new CompositeRateProvider();
}
