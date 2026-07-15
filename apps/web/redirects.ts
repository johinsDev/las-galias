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
    return redirects;
  } catch (err) {
    console.warn(`[redirects] CMS unavailable, building without redirects: ${String(err)}`);
    return {};
  }
}
