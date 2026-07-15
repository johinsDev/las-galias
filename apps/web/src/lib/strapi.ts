import type {
  CalculatorConfig,
  ExchangeRate,
  HomeBanner,
  Macroproject,
  Post,
  Project,
} from "@lasgalias/schemas";

/**
 * Strapi REST client for BUILD TIME (SSG). Every function degrades to
 * empty/null when the CMS is unreachable: the site must always build.
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
      console.warn(`[strapi] ${path} responded ${res.status}`);
      return null;
    }
    const body = (await res.json()) as { data: T };
    return body.data;
  } catch (err) {
    console.warn(`[strapi] ${path} unavailable: ${String(err)}`);
    return null;
  }
}

const PROJECT_CARD_POPULATE: Query = {
  "populate[city]": "true",
  "populate[heroDesktop]": "true",
  "populate[heroMobile]": "true",
  "populate[unitTypes]": "true",
};

export async function getProjects(): Promise<Project[]> {
  return (
    (await strapiFetch<Project[]>("projects", {
      ...PROJECT_CARD_POPULATE,
      "pagination[pageSize]": "100",
      sort: "name:asc",
    })) ?? []
  );
}

export async function getProject(slug: string): Promise<Project | null> {
  const data = await strapiFetch<Project[]>("projects", {
    "filters[slug][$eq]": slug,
    "populate[city]": "true",
    "populate[gallery]": "true",
    "populate[heroDesktop]": "true",
    "populate[heroMobile]": "true",
    "populate[location]": "true",
    "populate[seo][populate][ogImage]": "true",
    "populate[unitTypes][populate][floorPlan]": "true",
    "populate[amenities][populate][icon]": "true",
    "populate[macroproject][populate][pointsOfInterest]": "true",
    "populate[recommended][populate][city]": "true",
  });
  return data?.[0] ?? null;
}

export async function getPosts(): Promise<Post[]> {
  return (
    (await strapiFetch<Post[]>("posts", {
      "populate[cover]": "true",
      "pagination[pageSize]": "100",
      sort: "publishedAt:desc",
    })) ?? []
  );
}

export async function getPost(slug: string): Promise<Post | null> {
  const data = await strapiFetch<Post[]>("posts", {
    "filters[slug][$eq]": slug,
    "populate[cover]": "true",
    "populate[seo][populate][ogImage]": "true",
  });
  return data?.[0] ?? null;
}

export async function getMacroprojects(): Promise<Macroproject[]> {
  return (
    (await strapiFetch<Macroproject[]>("macroprojects", {
      "populate[city]": "true",
      "populate[gallery]": "true",
      "populate[location]": "true",
      "populate[pointsOfInterest]": "true",
      "pagination[pageSize]": "100",
    })) ?? []
  );
}

export async function getHomeBanners(): Promise<HomeBanner[]> {
  return (
    (await strapiFetch<HomeBanner[]>("home-banners", {
      "filters[active][$eq]": "true",
      "populate[desktopImage]": "true",
      "populate[mobileImage]": "true",
      sort: "order:asc",
    })) ?? []
  );
}

export async function getExchangeRate(): Promise<ExchangeRate | null> {
  return strapiFetch<ExchangeRate>("exchange-rate");
}

export async function getCalculatorConfig(): Promise<CalculatorConfig | null> {
  return strapiFetch<CalculatorConfig>("calculator-config");
}

/** Resolves relative media URLs (local dev provider) to absolute ones. */
export function mediaUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${STRAPI_URL}${url}`;
}
