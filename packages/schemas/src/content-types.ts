// Tipos del contenido público de Strapi tal como lo consume el frontend
// (REST API v5: los documentos exponen `documentId`; las media, `url`).
// Mantener alineados con apps/cms/src/api/<ct>/content-types/<ct>/schema.json.

export type Etapa = "expectativa" | "venta";

export type EstadoObra = "lanzamiento" | "preventa" | "construccion" | "entrega-inmediata";

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
  direccion?: string | null;
}

export interface Ciudad {
  documentId: string;
  nombre: string;
  slug: string;
  departamento?: string | null;
  imagen?: Media | null;
}

export interface ZonaDeInteres {
  documentId: string;
  nombre: string;
  tipo: "comercio" | "salud" | "educacion" | "transporte" | "recreacion";
  distanciaTexto?: string | null;
}

export interface Macroproyecto {
  documentId: string;
  nombre: string;
  slug: string;
  descripcion?: unknown;
  ciudad?: Ciudad | null;
  galeria?: Media[];
  ubicacion?: Geo | null;
  zonasDeInteres?: ZonaDeInteres[];
}

export interface ZonaComun {
  documentId: string;
  nombre: string;
  icono?: Media | null;
  descripcion?: string | null;
}

export interface Tipologia {
  nombre: string;
  areaM2: number;
  habitaciones: number;
  banos: number;
  precioCOP: number;
  plano?: Media | null;
}

export interface Proyecto {
  documentId: string;
  nombre: string;
  slug: string;
  etapa: Etapa;
  estadoObra?: EstadoObra | null;
  descripcion?: unknown;
  precioDesdeCOP?: number | null;
  ciudad: Ciudad;
  macroproyecto?: Macroproyecto | null;
  zonasComunes?: ZonaComun[];
  recomendados?: Proyecto[];
  tipologias?: Tipologia[];
  galeria?: Media[];
  heroDesktop?: Media | null;
  heroMobile?: Media | null;
  ubicacion?: Geo | null;
  video?: string | null;
  seo?: Seo | null;
}

export interface Entrada {
  documentId: string;
  titulo: string;
  slug: string;
  extracto?: string | null;
  portada?: Media | null;
  contenido?: unknown;
  seo?: Seo | null;
  publishedAt?: string;
}

export interface BannerHome {
  documentId: string;
  titulo?: string | null;
  imagenDesktop: Media;
  imagenMobile: Media;
  enlace?: string | null;
  orden?: number | null;
  activo?: boolean;
}

export interface Redireccion {
  documentId: string;
  from: string;
  to: string;
  permanente: boolean;
  habilitada: boolean;
}

export interface ConfiguracionCalculadora {
  tasaInteresEA: number;
  plazoMaxAnios: number;
  porcentajeFinanciacionMax: number;
}

export interface TasaDeCambio {
  copPorUsd: number;
  copPorEur: number;
  fuenteUsd?: string | null;
  fuenteEur?: string | null;
  vigenciaDesde?: string | null;
  actualizadoEn?: string | null;
}
