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

export interface Amenity {
  documentId: string;
  name: string;
  icon?: Media | null;
  description?: string | null;
}

export interface UnitType {
  name: string;
  areaM2: number;
  bedrooms: number;
  bathrooms: number;
  priceCOP: number;
  floorPlan?: Media | null;
}

export interface Project {
  documentId: string;
  name: string;
  slug: string;
  stage: Stage;
  constructionStatus?: ConstructionStatus | null;
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
  seo?: Seo | null;
}

export interface Post {
  documentId: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  cover?: Media | null;
  content?: unknown;
  seo?: Seo | null;
  publishedAt?: string;
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
}

export interface ExchangeRate {
  copPerUsd: number;
  copPerEur: number;
  usdSource?: string | null;
  eurSource?: string | null;
  validFrom?: string | null;
  fetchedAt?: string | null;
}
