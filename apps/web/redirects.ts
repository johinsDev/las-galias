/**
 * Redirecciones gestionadas desde Strapi, resueltas en build-time y emitidas
 * por el adapter de Vercel como redirects HTTP reales (301/302).
 * Si el CMS no responde, el build NUNCA se cae: degrada a "sin redirecciones".
 * Corre en el contexto de astro.config (node), por eso usa process.env.
 */
interface RedireccionRow {
  from: string;
  to: string;
  permanente: boolean;
}

type AstroRedirects = Record<string, { destination: string; status: 301 | 302 }>;

export async function fetchRedirects(): Promise<AstroRedirects> {
  const strapiUrl = process.env.STRAPI_URL ?? "http://localhost:1337";
  const url =
    `${strapiUrl}/api/redirecciones` +
    `?filters[habilitada][$eq]=true&pagination[pageSize]=200&fields[0]=from&fields[1]=to&fields[2]=permanente`;

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Strapi respondió ${res.status}`);
    const body = (await res.json()) as { data?: RedireccionRow[] };

    const redirects: AstroRedirects = {};
    for (const row of body.data ?? []) {
      if (!row.from || !row.to || row.from === row.to) continue;
      redirects[row.from] = {
        destination: row.to,
        status: row.permanente ? 301 : 302,
      };
    }
    console.log(`[redirects] ${Object.keys(redirects).length} redirecciones desde el CMS`);
    return redirects;
  } catch (err) {
    console.warn(`[redirects] CMS no disponible, build sin redirecciones: ${String(err)}`);
    return {};
  }
}
