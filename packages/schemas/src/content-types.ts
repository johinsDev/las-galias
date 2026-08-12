// Types for the public Strapi content as consumed by the frontend
// (REST API v5: documents expose `documentId`; media expose `url`).
// Keep aligned with apps/cms/src/api/<ct>/content-types/<ct>/schema.json.

export type Stage = "expectation" | "sale";

export type ConstructionStatus = "launch" | "presale" | "construction" | "immediate-delivery";

export interface Media {
  url: string;
  alternativeText?: string | null;
  width?: number | null;
  height?: number | null;
  mime?: string;
}

export interface Seo {
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: Media | null;
}

export interface Geo {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}

export interface City {
  documentId: string;
  name: string;
  slug: string;
  department?: string | null;
  image?: Media | null;
}

export interface PointOfInterest {
  documentId: string;
  name: string;
  category: "commerce" | "health" | "education" | "transport" | "recreation";
  distanceText?: string | null;
}

export interface Macroproject {
  documentId: string;
  name: string;
  slug: string;
  description?: unknown;
  city?: City | null;
  gallery?: Media[];
  location?: Geo | null;
  pointsOfInterest?: PointOfInterest[];
}

/**
 * Keys of the site's built-in line-icon set. They are drawn with
 * `currentColor`, which is what makes `Amenity["iconColor"]` work.
 */
export type AmenityIconKey =
  | "piscina"
  | "gimnasio"
  | "coworking"
  | "salon-social"
  | "zona-infantil"
  | "zona-bbq"
  | "zona-verde"
  | "senderos"
  | "zona-mascotas"
  | "cancha-deportiva"
  | "sauna-turco"
  | "jacuzzi"
  | "cine"
  | "sala-juegos"
  | "lavanderia"
  | "porteria"
  | "parqueadero"
  | "ascensor"
  | "terraza"
  | "bicicletero";

export interface Amenity {
  documentId: string;
  name: string;
  iconKey?: AmenityIconKey | null;
  /** Hex color the editor picked for the icon (#C8102E). */
  iconColor?: string | null;
  /** Editor-uploaded fallback, only when no `iconKey` is set. */
  icon?: Media | null;
  description?: string | null;
}

export interface UnitType {
  name: string;
  // All optional in the Strapi schema, and `priceCOP` is a `biginteger` —
  // which REST serialises as a STRING. Declaring these required was a lie that
  // Frente B (real areas and prices from Sinco) would have surfaced as a crash.
  /** Área construida (was `areaM2`). */
  builtAreaM2?: number | null;
  /** Área privada. Sinco only populates it on part of its catalog. */
  privateAreaM2?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  priceCOP?: number | string | null;
  floorPlan?: Media | null;
}

/** Project-level figures for the PDP spec grid; per-unit ones live in UnitType. */
interface SpecSheet {
  towers?: number | null;
  apartments?: number | null;
  elevatorsPerTower?: number | null;
  parking?: string | null;
  stratum?: number | null;
  deliveryYear?: number | null;
}

interface ConstructionProgress {
  label: string;
  date?: string | null;
  video: string;
}

interface Financing {
  annualRatePct?: number | null;
  termYears?: number | null;
  downPaymentPct?: number | null;
  builderInstallmentMonths?: number | null;
  trusteeName?: string | null;
  trustNumber?: string | null;
  clientPortalUrl?: string | null;
}

interface SalesRoom {
  schedule?: string | null;
  phone?: string | null;
  whatsappUrl?: string | null;
}

/** Not exported: only reachable through `Project["zone"]` today. */
interface Zone {
  documentId: string;
  name: string;
  slug: string;
}

export interface Project {
  documentId: string;
  name: string;
  slug: string;
  stage: Stage;
  /** Second and third level of the location trail: Bogotá · Norte · San Antonio. */
  zone?: Zone | null;
  neighborhood?: string | null;
  constructionStatus?: ConstructionStatus | null;
  appliesSubsidy?: boolean;
  lastUnits?: boolean;
  hasDiscount?: boolean;
  logo?: Media | null;
  description?: unknown;
  priceFromCOP?: number | null;
  city: City;
  macroproject?: Macroproject | null;
  amenities?: Amenity[];
  recommended?: Project[];
  unitTypes?: UnitType[];
  gallery?: Media[];
  heroDesktop?: Media | null;
  heroMobile?: Media | null;
  location?: Geo | null;
  video?: string | null;
  tour360Url?: string | null;
  constructionProgress?: ConstructionProgress[];
  specSheet?: SpecSheet | null;
  financing?: Financing | null;
  salesRoom?: SalesRoom | null;
  seo?: Seo | null;
}

export type PostCategory = "financiacion" | "guia-de-compra" | "mercado" | "decoracion";

export interface Post {
  documentId: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  category?: PostCategory | null;
  /** Pins the post to the big slot at the top of /blog. */
  featured?: boolean;
  author?: string | null;
  /** Editor override for the "5 min de lectura" line; estimated when empty. */
  readingMinutes?: number | null;
  /** Editorial date shown on the card; independent from Strapi's publishedAt. */
  publishedOn?: string | null;
  cover?: Media | null;
  content?: unknown;
  seo?: Seo | null;
  publishedAt?: string;
}

export interface Faq {
  documentId: string;
  question: string;
  answer: unknown;
  audience: "general" | "exterior";
  order?: number | null;
}

interface Step {
  title: string;
  body: string;
}

/** Repeatable one-line item. Replaces what used to be a `json` field. */
interface ListItem {
  text: string;
}

/** Single type behind /compra-desde-el-exterior. */
export interface ForeignBuyerPage {
  eyebrow?: string | null;
  heroTitle: string;
  heroSubtitle?: string | null;
  heroImage?: Media | null;
  heroCtaLabel?: string | null;
  trustBadges?: ListItem[] | null;
  stepsTitle?: string | null;
  steps?: Step[];
  priceDisclaimer?: string | null;
  formTitle?: string | null;
  formBody?: string | null;
  formBullets?: ListItem[] | null;
  seo?: Seo | null;
}

export interface HomeBanner {
  documentId: string;
  title?: string | null;
  desktopImage: Media;
  mobileImage: Media;
  link?: string | null;
  order?: number | null;
  active?: boolean;
}

export interface Redirect {
  documentId: string;
  from: string;
  to: string;
  permanent: boolean;
  enabled: boolean;
}

export interface CalculatorConfig {
  annualInterestRate: number;
  maxTermYears: number;
  maxFinancingPercent: number;
  /** Leasing habitacional finances more than a plain mortgage. */
  leasingFinancingPercent?: number | null;
  /** VIS homes take a higher LTV than the rest. */
  visFinancingPercent?: number | null;
  /** Debt ceiling the mortgage simulator warns above (percent of income). */
  maxIncomeRatioPercent?: number | null;
  /** Share of the disposable income recommended as an instalment. */
  paymentIncomeRatioPercent?: number | null;
}

/**
 * Only what the site needs to render the assistant. The rest of the config
 * (prompt, context, spend caps) stays private to the CMS — see the
 * `faq-bot/config` route.
 */
export interface FaqBotPublicConfig {
  enabled: boolean;
  suggestedQuestions: string[];
}

export interface ExchangeRate {
  copPerUsd: number;
  copPerEur: number;
  usdSource?: string | null;
  eurSource?: string | null;
  validFrom?: string | null;
  fetchedAt?: string | null;
}
