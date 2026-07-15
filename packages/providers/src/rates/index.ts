export { CompositeRateProvider } from "./composite";
export { FrankfurterProvider } from "./frankfurter";
export { TrmColombiaProvider } from "./trm-colombia";
export type { QuoteCurrency, RateProvider, RateQuote } from "./types";

import { CompositeRateProvider } from "./composite";
import type { RateProvider } from "./types";

/** Factory mirroring createProjectDataProvider; only one strategy today. */
export function createRateProvider(): RateProvider {
  return new CompositeRateProvider();
}
