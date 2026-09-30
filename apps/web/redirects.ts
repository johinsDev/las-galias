/**
 * Redirects managed from Strapi, resolved at build time and emitted by the
 * Vercel adapter as real HTTP redirects (301/302).
 * If the CMS is unreachable the build NEVER fails: it degrades to "no redirects".
 * Runs in the astro.config (node) context, hence process.env.
 */
interface RedirectRow {
  from: string;
  to: string;
  permanent: boolean;
}

type AstroRedirects = Record<string, { destination: string; status: 301 | 302 }>;

/**
 * Redirects owned by the CODE, not by an editor: they exist because a route was
 * renamed in this repo, so they must hold even when the CMS is unreachable —
 * `fetchRedirects` degrades to `{}` in silence, and these are the ones whose
 * absence would 404 links that are already in the wild.
 *
 * They also win over a CMS row with the same `from`: an editor cannot
 * accidentally point /calculadoras somewhere the code no longer serves.
 *
 * Note there is nothing here for the old `#cuota-inicial` style anchors. A
 * fragment never reaches the server, so no HTTP redirect can act on one; the
 * /simuladores index forwards those in the browser instead.
 */
const ROUTE_REDIRECTS: AstroRedirects = {
  "/calculadoras": { destination: "/simuladores", status: 301 },
  "/contacto": { destination: "/servicio-al-cliente", status: 301 },
  // The catalogue moved to /proyectos-de-vivienda (the keyword the client
  // wants ranked). The `[slug]` pattern makes Astro emit one 301 per project
  // page, so links shared before the rename keep landing on the right flat.
  "/proyectos": { destination: "/proyectos-de-vivienda", status: 301 },
  "/proyectos/[slug]": { destination: "/proyectos-de-vivienda/[slug]", status: 301 },
  // The macroproject catalogue was removed in Sept 2026 (it never had content
  // in production, but it sat in the header for months): send anyone who kept
  // the link to the projects. No `[slug]` rule: Astro requires a dynamic
  // destination for a dynamic source, and no macroproject page ever existed.
  "/macroproyectos": { destination: "/proyectos-de-vivienda", status: 301 },
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Strapi responded ${res.status}`);
  return (await res.json()) as T;
}

/**
 * An expectation project with `expectationRedirect` set does not render its
 * launch landing: its address 302s to that URL (a campaign page elsewhere,
 * say) until the editor clears the field or flips the stage. Temporary on
 * purpose — the landing comes back to the same address. The page itself is
 * skipped by `[slug].astro`, so the redirect never shadows a built file.
 *
 * On a CMS that predates the field the filter is a 400, which degrades to
 * "no such redirects" instead of failing the build.
 */
async function fetchExpectationRedirects(strapiUrl: string): Promise<AstroRedirects> {
  const url =
    `${strapiUrl}/api/projects?filters[stage][$eq]=expectation` +
    `&filters[expectationRedirect][$notNull]=true&pagination[pageSize]=200` +
    `&fields[0]=slug&fields[1]=expectationRedirect`;
  try {
    const body = await fetchJson<{ data?: { slug: string; expectationRedirect: string }[] }>(url);
    const redirects: AstroRedirects = {};
    for (const row of body.data ?? []) {
      const to = row.expectationRedirect?.trim();
      if (!row.slug || !to) continue;
      redirects[`/proyectos-de-vivienda/${row.slug}`] = { destination: to, status: 302 };
    }
    return redirects;
  } catch (err) {
    console.warn(`[redirects] expectation landings not redirected: ${String(err)}`);
    return {};
  }
}

export async function fetchRedirects(): Promise<AstroRedirects> {
  const strapiUrl = process.env.STRAPI_URL ?? "http://localhost:1337";
  const url =
    `${strapiUrl}/api/redirects` +
    `?filters[enabled][$eq]=true&pagination[pageSize]=200&fields[0]=from&fields[1]=to&fields[2]=permanent`;

  try {
    const body = await fetchJson<{ data?: RedirectRow[] }>(url);

    const redirects: AstroRedirects = {};
    for (const row of body.data ?? []) {
      if (!row.from || !row.to || row.from === row.to) continue;
      redirects[row.from] = {
        destination: row.to,
        status: row.permanent ? 301 : 302,
      };
    }
    const landings = await fetchExpectationRedirects(strapiUrl);
    console.log(
      `[redirects] ${Object.keys(redirects).length} redirects from the CMS, ${Object.keys(landings).length} expectation landings`,
    );
    return { ...redirects, ...landings, ...ROUTE_REDIRECTS };
  } catch (err) {
    console.warn(`[redirects] CMS unavailable, building with route redirects only: ${String(err)}`);
    return { ...ROUTE_REDIRECTS };
  }
}
