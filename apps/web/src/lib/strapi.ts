import type {
  CalculatorConfig,
  CustomerServicePage,
  ExchangeRate,
  Faq,
  FaqBotPublicConfig,
  ForeignBuyerPage,
  HomeBanner,
  HomePage,
  LeadFormConfig,
  LegalDocument,
  Macroproject,
  Post,
  PqrPage,
  Project,
} from "@lasgalias/schemas";

/**
 * Strapi REST client for BUILD TIME (SSG). Every function degrades to
 * empty/null when the CMS is unreachable: the site must always build.
 */
const STRAPI_URL: string = import.meta.env.STRAPI_URL ?? "http://localhost:1337";
const STRAPI_API_TOKEN: string | undefined = import.meta.env.STRAPI_API_TOKEN;

/**
 * Snapshot fallback — DEMO content: invented project names, invented prices,
 * placeholder images (`src/fixtures/cms-snapshot.json`).
 *
 * It is OPT-IN, and deliberately so. It used to be the default, which meant a
 * CMS that was merely unreachable produced a green build that published
 * invented prices to a commercial site, with nothing failing to say so. Now a
 * build either renders the real CMS or stops.
 *
 * Turn it on for local work without a CMS: `USE_CMS_SNAPSHOT=true bun run dev`.
 *
 * Re-record it with `SNAPSHOT_CMS=1 bun run build` pointed at a live CMS; the
 * recorder keys entries by the exact request the build makes, so it cannot
 * drift away from the populates above.
 */
const USE_SNAPSHOT: boolean = import.meta.env.USE_CMS_SNAPSHOT === "true";

/**
 * A production build must never QUIETLY ship demo data. In dev the fallback is
 * a convenience; in a build it is a defect, so it throws instead.
 *
 * Not when the snapshot was opted into: asking for demo data explicitly is a
 * decision, and a fixture recorded before today's content types will always
 * have gaps. The guard is for the accident, not for the choice.
 */
const FAIL_ON_DEMO: boolean = import.meta.env.PROD && !USE_SNAPSHOT;
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

/**
 * Network failures get two more tries; HTTP answers never do. A build fires
 * dozens of requests at a small instance, and now and then one connection
 * stalls until undici's 10 s connect timeout ("fetch failed") while the very
 * next one answers in 300 ms — without this, that one hiccup failed the whole
 * build. A status code is a real answer and goes straight to the caller.
 */
async function fetchWithRetry(url: URL, headers: Record<string, string>): Promise<Response> {
  const attempts = 3;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
    } catch (err) {
      if (attempt >= attempts) throw err;
      console.warn(`[strapi] ${url.pathname} falló (${String(err)}); reintento ${attempt}`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
}

/** Stable key for one request: path plus its sorted query. */
function snapshotKey(path: string, query: Query): string {
  const params = new URLSearchParams(Object.entries(query).sort(([a], [b]) => a.localeCompare(b)));
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

/**
 * Marks the build-stopping error as ours. `strapiFetch` wraps everything in a
 * try/catch, so without this the refusal thrown for a 401 is caught by its own
 * handler and re-wrapped as a transport failure — printing the whole message
 * nested inside itself.
 */
class CmsRefusedError extends Error {}

/** Stops the build rather than let empty or demo content reach a published page. */
function refuseDemoData(path: string, reason: string): never {
  throw new CmsRefusedError(
    [
      `[strapi] El CMS no entregó "${path}" (${reason}) y el build se detuvo.`,
      "",
      "Seguir habría publicado páginas VACÍAS —o, con el snapshot encendido,",
      "proyectos y precios INVENTADOS—. Antes pasaba en silencio; ahora falla.",
      "",
      "Qué hacer:",
      `  · Revisa que el CMS esté arriba y que STRAPI_URL apunte a él (${STRAPI_URL}).`,
      "  · Si es 401/403, STRAPI_API_TOKEN no sirve contra ESE CMS: los tokens no",
      "    viajan entre instancias (`strapi transfer` no copia las tablas de admin),",
      "    así que hay que crear uno nuevo en su panel y actualizar la variable.",
      "  · Si de verdad quieres compilar con datos de demo, dilo explícitamente:",
      "    USE_CMS_SNAPSHOT=true bun run build",
    ].join("\n"),
  );
}

async function readSnapshot(key: string): Promise<unknown | undefined> {
  if (!USE_SNAPSHOT) return undefined;
  try {
    const snapshot = (await import("@/fixtures/cms-snapshot.json")).default as Snapshot;
    const hit = snapshot[key];
    if (hit !== undefined) {
      // Opting in is allowed — it is how you work without a CMS — but a BUILD
      // that does it is publishing invented prices, so it says so unmissably
      // instead of hiding in a one-line warning nobody reads.
      if (FAIL_ON_DEMO && !usingSnapshot) {
        console.warn(
          "\n" +
            "!!!! ESTE BUILD ESTÁ USANDO CONTENIDO DEMO !!!!\n" +
            "Proyectos y precios INVENTADOS. Lo pediste con USE_CMS_SNAPSHOT=true.\n" +
            "Si esto es un despliegue real, cancélalo y arregla el CMS.\n",
        );
      }
      usingSnapshot = true;
    }
    return hit;
  } catch {
    // No fixture committed — nothing to fall back to.
    return undefined;
  }
}

async function strapiFetch<T>(
  path: string,
  query: Query = {},
  /**
   * Ask anonymously. Strapi evaluates an API token's OWN permissions instead of
   * the public role's, so a token scoped to content types gets 403 on a custom
   * route that is public — and the caller then silently degrades. That is what
   * hid the assistant on the live site: the endpoint answered 200 to a browser
   * and 403 to the build.
   */
  anonymous = false,
): Promise<T | null> {
  const key = snapshotKey(path, query);
  const url = new URL(`/api/${path}`, STRAPI_URL);
  for (const [k, value] of Object.entries(query)) {
    url.searchParams.set(k, value);
  }

  try {
    const res = await fetchWithRetry(url, {
      accept: "application/json",
      ...(STRAPI_API_TOKEN && !anonymous ? { authorization: `Bearer ${STRAPI_API_TOKEN}` } : {}),
    });
    if (!res.ok) {
      console.warn(`[strapi] ${path} responded ${res.status}`);
      const fallback = await readSnapshot(key);
      if (fallback !== undefined) return fallback as T;
      // A 404 is the ONE status that means "there is legitimately nothing here"
      // — a single type an editor has not filled in yet. Every other status
      // means the build asked for content and did not get it, which publishes
      // an empty page just as surely as an unreachable CMS does. So the rule is
      // inverted: 404 degrades, anything else stops the build.
      //
      // It already shipped once. After migrating the CMS to another host, the
      // token from the old instance answered 401 to every call (`strapi
      // transfer` does not copy the admin tables that hold it) and the site
      // published with no projects and no blog, with the build green.
      if (res.status !== 404 && FAIL_ON_DEMO) {
        refuseDemoData(path, `HTTP ${res.status}`);
      }
      return null;
    }
    const body = (await res.json()) as { data: T };

    if (RECORDING) {
      recorded[key] = body.data;
      const fs = await import("node:fs");
      fs.writeFileSync(SNAPSHOT_FILE, `${JSON.stringify(recorded, null, 2)}\n`);
    }
    return body.data;
  } catch (err) {
    if (err instanceof CmsRefusedError) throw err;
    const fallback = await readSnapshot(key);
    if (fallback !== undefined) {
      console.warn(`[strapi] ${path} unavailable — usando snapshot DEMO`);
      return fallback as T;
    }
    // The CMS could not be reached at all. In a build that is fatal: the page
    // would publish empty or, with the snapshot on, invented content.
    if (FAIL_ON_DEMO) refuseDemoData(path, String(err));
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
  "populate[zone]": "true",
  // The approved card is a small carousel, not a single photo. The hero is
  // still slide one; these are the rest.
  "populate[gallery]": "true",
};

/**
 * Memoizado: el encabezado pide el catálogo en todas las páginas para la paleta
 * de búsqueda, y sin esto el build repetiría la misma consulta una vez por
 * página construida.
 */
let projectsPromise: Promise<Project[]> | null = null;

async function getAllProjects(): Promise<Project[]> {
  projectsPromise ??= strapiFetch<Project[]>("projects", {
    ...PROJECT_CARD_POPULATE,
    "pagination[pageSize]": "100",
    sort: "name:asc",
  }).then((projects) => projects ?? []);
  return projectsPromise;
}

/**
 * The homes: every caller that says "projects" — catalogue, home, search,
 * footer, PDP routes — means these. Lots are split off here rather than with
 * a `filters[productType]` on the request, so a CMS that has not deployed the
 * field yet still answers (Strapi rejects filters on unknown attributes) and
 * simply has no lots.
 */
export async function getProjects(): Promise<Project[]> {
  return (await getAllProjects()).filter((p) => !PAGELESS.has(p.productType ?? "housing"));
}

/** Product types that list on a page of their own and have no project page. */
const PAGELESS = new Set(["lot", "local"]);

/** The lots (/lotes): same card, no page of their own. */
export async function getLots(): Promise<Project[]> {
  return (await getAllProjects()).filter((p) => p.productType === "lot");
}

/** The commercial premises (/locales): same arrangement as the lots. */
export async function getLocales(): Promise<Project[]> {
  return (await getAllProjects()).filter((p) => p.productType === "local");
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
    "populate[zone]": "true",
    "populate[recommended][populate][city]": "true",
    // The recommended cards are the same ProjectCard as the listing: without
    // their images they render the "Sin imagen disponible" placeholder.
    "populate[recommended][populate][heroDesktop]": "true",
    "populate[recommended][populate][heroMobile]": "true",
    "populate[recommended][populate][gallery]": "true",
    // PDP blocks added with the new wireframe.
    "populate[logo]": "true",
    "populate[specSheet]": "true",
    "populate[financing]": "true",
    "populate[salesRoom]": "true",
    "populate[constructionProgress]": "true",
    "populate[brochure]": "true",
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
    "populate[highlights]": "true",
    "populate[tags]": "true",
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

/**
 * Every published legal document, ordered the way the chips show them.
 *
 * Memoised like the rates: /legales/[slug] renders one page per document and
 * each of them needs the full list to draw the chip bar, so without this the
 * CMS would be asked once per document for the same rows.
 */
let legalDocumentsPromise: Promise<LegalDocument[]> | null = null;

export async function getLegalDocuments(): Promise<LegalDocument[]> {
  legalDocumentsPromise ??= strapiFetch<LegalDocument[]>("legal-documents", {
    sort: "order:asc",
    "populate[seo][populate][ogImage]": "true",
  }).then((docs) => docs ?? []);
  return legalDocumentsPromise;
}

/**
 * Memoised for the whole build. The currency selector lives in the layout now,
 * so every page needs the rates; without this a 200-page build would ask the
 * CMS for the same single type 200 times. Rates cannot change mid-build — a new
 * rate arrives through a redeploy, not through a page.
 */
let exchangeRatePromise: Promise<ExchangeRate | null> | null = null;

export async function getExchangeRate(): Promise<ExchangeRate | null> {
  exchangeRatePromise ??= strapiFetch<ExchangeRate>("exchange-rate");
  return exchangeRatePromise;
}

export async function getCalculatorConfig(): Promise<CalculatorConfig | null> {
  return strapiFetch<CalculatorConfig>("calculator-config");
}

/**
 * The home's copy. Memoised because `/` is one page but the layout asks for it
 * once per build anyway, and a second fetch would be pure latency.
 */
let homePagePromise: Promise<HomePage | null> | null = null;

export async function getHomePage(): Promise<HomePage | null> {
  homePagePromise ??= strapiFetch<HomePage>("home-page", {
    "populate[steps][populate][image]": "true",
    "populate[tools]": "true",
    "populate[stats]": "true",
    "populate[seo][populate][ogImage]": "true",
  });
  return homePagePromise;
}

/**
 * Las opciones de los desplegables de calificación. Memoizado porque lo pide
 * cada ficha de proyecto y hay una por proyecto: sin esto el build repetiría la
 * misma consulta tantas veces como proyectos publicados haya.
 */
let leadFormConfigPromise: Promise<LeadFormConfig | null> | null = null;

export async function getLeadFormConfig(): Promise<LeadFormConfig | null> {
  leadFormConfigPromise ??= strapiFetch<LeadFormConfig>("lead-form-config", {
    "populate[incomeRanges]": "true",
    "populate[savingsRanges]": "true",
    "populate[severanceOptions]": "true",
    "populate[residenceCities]": "true",
  });
  return leadFormConfigPromise;
}

export async function getPqrPage(): Promise<PqrPage | null> {
  return strapiFetch<PqrPage>("pqr-page", {
    "populate[heroImage]": "true",
    "populate[seo][populate][ogImage]": "true",
  });
}

/**
 * /servicio-al-cliente. A CMS that does not have the type yet answers 404, which
 * degrades to the design's copy instead of stopping the build.
 */
export async function getCustomerServicePage(): Promise<CustomerServicePage | null> {
  return strapiFetch<CustomerServicePage>("customer-service-page", {
    "populate[heroImage]": "true",
    "populate[offices]": "true",
    "populate[seo][populate][ogImage]": "true",
  });
}

/**
 * The company's WhatsApp as the customer-service page states it: the explicit
 * URL, or one built from the number (a Colombian mobile gets its `57`).
 */
export function customerWhatsappUrl(page: CustomerServicePage | null): string | null {
  if (page?.whatsappUrl) return page.whatsappUrl;
  if (!page?.whatsappNumber) return null;
  return `https://wa.me/${page.whatsappNumber.replace(/\D/g, "").replace(/^(?=3)/, "57")}`;
}

let companyWhatsapp: Promise<string | null> | undefined;

/**
 * The WhatsApp a project card falls back to when its sales room has none —
 * in practice all of them, since the sheet the projects are loaded from has
 * no per-project number. Fetched once per build, however many cards ask.
 */
export function getCompanyWhatsappUrl(): Promise<string | null> {
  companyWhatsapp ??= getCustomerServicePage().then(customerWhatsappUrl);
  return companyWhatsapp;
}

export async function getForeignBuyerPage(): Promise<ForeignBuyerPage | null> {
  return strapiFetch<ForeignBuyerPage>("foreign-buyer-page", {
    "populate[heroImage]": "true",
    "populate[steps]": "true",
    "populate[seo][populate][ogImage]": "true",
  });
}

/**
 * Whether to render the AI assistant, and the example chips. Kept to these two
 * fields on purpose — the prompt and the spend caps are not public.
 */
export async function getFaqBotConfig(): Promise<FaqBotPublicConfig> {
  const data = await strapiFetch<FaqBotPublicConfig>("faq-bot/config", {}, true);
  return data ?? { enabled: false, suggestedQuestions: [] };
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
