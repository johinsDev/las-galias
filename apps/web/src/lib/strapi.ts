import type {
  CalculatorConfig,
  ExchangeRate,
  Faq,
  ForeignBuyerPage,
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

/**
 * Snapshot fallback. While no CMS is deployed the build has nothing to render,
 * so it falls back to a recorded snapshot of a working CMS
 * (`src/fixtures/cms-snapshot.json`).
 *
 * WARNING: that snapshot is DEMO content — invented project names, invented
 * prices and placeholder images. It must not stay on once the real CMS is up.
 * Set `USE_CMS_SNAPSHOT=false` (or delete the fixture) to turn it off.
 *
 * Re-record it with `SNAPSHOT_CMS=1 bun run build` pointed at a live CMS; the
 * recorder keys entries by the exact request the build makes, so it cannot
 * drift away from the populates above.
 */
const USE_SNAPSHOT: boolean = import.meta.env.USE_CMS_SNAPSHOT !== "false";
const RECORDING: boolean = import.meta.env.SNAPSHOT_CMS === "1";
const SNAPSHOT_FILE = "src/fixtures/cms-snapshot.json";

type Query = Record<string, string>;
type Snapshot = Record<string, unknown>;

const recorded: Snapshot = {};

/**
 * Flipped the first time a request actually falls back to the snapshot. It is
 * what `mediaUrl` uses to decide where images live: with no CMS reachable there
 * is nothing serving /uploads, so they come from the copies bundled in
 * `public/uploads` instead. Set during the build, before any media is rendered.
 */
let usingSnapshot = false;

/** Stable key for one request: path plus its sorted query. */
function snapshotKey(path: string, query: Query): string {
  const params = new URLSearchParams(Object.entries(query).sort(([a], [b]) => a.localeCompare(b)));
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

async function readSnapshot(key: string): Promise<unknown | undefined> {
  if (!USE_SNAPSHOT) return undefined;
  try {
    const snapshot = (await import("@/fixtures/cms-snapshot.json")).default as Snapshot;
    const hit = snapshot[key];
    if (hit !== undefined) usingSnapshot = true;
    return hit;
  } catch {
    // No fixture committed — nothing to fall back to.
    return undefined;
  }
}

async function strapiFetch<T>(path: string, query: Query = {}): Promise<T | null> {
  const key = snapshotKey(path, query);
  const url = new URL(`/api/${path}`, STRAPI_URL);
  for (const [k, value] of Object.entries(query)) {
    url.searchParams.set(k, value);
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
      return ((await readSnapshot(key)) as T) ?? null;
    }
    const body = (await res.json()) as { data: T };

    if (RECORDING) {
      recorded[key] = body.data;
      const fs = await import("node:fs");
      fs.writeFileSync(SNAPSHOT_FILE, `${JSON.stringify(recorded, null, 2)}\n`);
    }
    return body.data;
  } catch (err) {
    const fallback = await readSnapshot(key);
    if (fallback !== undefined) {
      console.warn(`[strapi] ${path} unavailable — usando snapshot DEMO`);
      return fallback as T;
    }
    console.warn(`[strapi] ${path} unavailable: ${String(err)}`);
    return null;
  }
}

const PROJECT_CARD_POPULATE: Query = {
  "populate[city]": "true",
  "populate[heroDesktop]": "true",
  "populate[heroMobile]": "true",
  "populate[unitTypes]": "true",
  // Card chrome from the Figma card spec: project logo, the delivery year in
  // the footer, the WhatsApp CTA and the third level of the location trail.
  "populate[logo]": "true",
  "populate[specSheet]": "true",
  "populate[salesRoom]": "true",
  "populate[macroproject]": "true",
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
    // PDP blocks added with the new wireframe.
    "populate[logo]": "true",
    "populate[specSheet]": "true",
    "populate[financing]": "true",
    "populate[salesRoom]": "true",
    "populate[constructionProgress]": "true",
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

export async function getForeignBuyerPage(): Promise<ForeignBuyerPage | null> {
  return strapiFetch<ForeignBuyerPage>("foreign-buyer-page", {
    "populate[heroImage]": "true",
    "populate[steps]": "true",
    "populate[seo][populate][ogImage]": "true",
  });
}

export async function getFaqs(audience: "general" | "exterior"): Promise<Faq[]> {
  return (
    (await strapiFetch<Faq[]>("faqs", {
      "filters[audience][$eq]": audience,
      sort: "order:asc",
      "pagination[pageSize]": "100",
    })) ?? []
  );
}

/** Resolves relative media URLs (local dev provider) to absolute ones. */
export function mediaUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  // Snapshot mode: no CMS is serving /uploads, so use the copies bundled in
  // public/. Prefixing STRAPI_URL here would emit localhost links in prod.
  if (usingSnapshot) return url;
  return `${STRAPI_URL}${url}`;
}
