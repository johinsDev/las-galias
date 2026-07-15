import type {
  BannerHome,
  ConfiguracionCalculadora,
  Entrada,
  Macroproyecto,
  Proyecto,
  TasaDeCambio,
} from "@lasgalias/schemas";

/**
 * Cliente REST de Strapi para BUILD TIME (SSG). Todas las funciones degradan a
 * vacío/null si el CMS no responde: el sitio siempre debe poder construirse.
 */
const STRAPI_URL: string = import.meta.env.STRAPI_URL ?? "http://localhost:1337";
const STRAPI_API_TOKEN: string | undefined = import.meta.env.STRAPI_API_TOKEN;

type Query = Record<string, string>;

async function strapiFetch<T>(path: string, query: Query = {}): Promise<T | null> {
  const url = new URL(`/api/${path}`, STRAPI_URL);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        ...(STRAPI_API_TOKEN ? { authorization: `Bearer ${STRAPI_API_TOKEN}` } : {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn(`[strapi] ${path} respondió ${res.status}`);
      return null;
    }
    const body = (await res.json()) as { data: T };
    return body.data;
  } catch (err) {
    console.warn(`[strapi] ${path} no disponible: ${String(err)}`);
    return null;
  }
}

const POPULATE_PROYECTO_CARD: Query = {
  "populate[ciudad]": "true",
  "populate[heroDesktop]": "true",
  "populate[heroMobile]": "true",
};

export async function getProyectos(): Promise<Proyecto[]> {
  return (
    (await strapiFetch<Proyecto[]>("proyectos", {
      ...POPULATE_PROYECTO_CARD,
      "pagination[pageSize]": "100",
      sort: "nombre:asc",
    })) ?? []
  );
}

export async function getProyecto(slug: string): Promise<Proyecto | null> {
  const data = await strapiFetch<Proyecto[]>("proyectos", {
    "filters[slug][$eq]": slug,
    "populate[ciudad]": "true",
    "populate[galeria]": "true",
    "populate[heroDesktop]": "true",
    "populate[heroMobile]": "true",
    "populate[ubicacion]": "true",
    "populate[seo][populate][ogImage]": "true",
    "populate[tipologias][populate][plano]": "true",
    "populate[zonasComunes][populate][icono]": "true",
    "populate[macroproyecto][populate][zonasDeInteres]": "true",
    "populate[recomendados][populate][ciudad]": "true",
  });
  return data?.[0] ?? null;
}

export async function getEntradas(): Promise<Entrada[]> {
  return (
    (await strapiFetch<Entrada[]>("entradas", {
      "populate[portada]": "true",
      "pagination[pageSize]": "100",
      sort: "publishedAt:desc",
    })) ?? []
  );
}

export async function getEntrada(slug: string): Promise<Entrada | null> {
  const data = await strapiFetch<Entrada[]>("entradas", {
    "filters[slug][$eq]": slug,
    "populate[portada]": "true",
    "populate[seo][populate][ogImage]": "true",
  });
  return data?.[0] ?? null;
}

export async function getMacroproyectos(): Promise<Macroproyecto[]> {
  return (
    (await strapiFetch<Macroproyecto[]>("macroproyectos", {
      "populate[ciudad]": "true",
      "populate[galeria]": "true",
      "populate[ubicacion]": "true",
      "populate[zonasDeInteres]": "true",
      "pagination[pageSize]": "100",
    })) ?? []
  );
}

export async function getBannersHome(): Promise<BannerHome[]> {
  const banners =
    (await strapiFetch<BannerHome[]>("banners-home", {
      "filters[activo][$eq]": "true",
      "populate[imagenDesktop]": "true",
      "populate[imagenMobile]": "true",
      sort: "orden:asc",
    })) ?? [];
  return banners;
}

export async function getTasaDeCambio(): Promise<TasaDeCambio | null> {
  return strapiFetch<TasaDeCambio>("tasa-de-cambio");
}

export async function getConfiguracionCalculadora(): Promise<ConfiguracionCalculadora | null> {
  return strapiFetch<ConfiguracionCalculadora>("configuracion-calculadora");
}

/** Resuelve URLs de media relativas (provider local en dev) a absolutas. */
export function mediaUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${STRAPI_URL}${url}`;
}
