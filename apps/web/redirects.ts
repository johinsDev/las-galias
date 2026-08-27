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
};

export async function fetchRedirects(): Promise<AstroRedirects> {
  const strapiUrl = process.env.STRAPI_URL ?? "http://localhost:1337";
  const url =
    `${strapiUrl}/api/redirects` +
    `?filters[enabled][$eq]=true&pagination[pageSize]=200&fields[0]=from&fields[1]=to&fields[2]=permanent`;

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Strapi responded ${res.status}`);
    const body = (await res.json()) as { data?: RedirectRow[] };

    const redirects: AstroRedirects = {};
    for (const row of body.data ?? []) {
      if (!row.from || !row.to || row.from === row.to) continue;
      redirects[row.from] = {
        destination: row.to,
        status: row.permanent ? 301 : 302,
      };
    }
    console.log(`[redirects] ${Object.keys(redirects).length} redirects from the CMS`);
    return { ...redirects, ...ROUTE_REDIRECTS };
  } catch (err) {
    console.warn(`[redirects] CMS unavailable, building with route redirects only: ${String(err)}`);
    return { ...ROUTE_REDIRECTS };
  }
}
