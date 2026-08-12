import { readFile } from "node:fs/promises";

/**
 * Inlines an SVG uploaded to the CMS so it can be recolored from the CMS.
 *
 * An `<img src="icon.svg">` is an opaque document: CSS on the page cannot
 * reach inside it, so the color an editor picks would do nothing. Pasting the
 * markup into the page instead — with every hard-coded fill/stroke rewritten to
 * `currentColor` — makes the icon inherit the color of its container, which is
 * exactly what `amenity.iconColor` sets.
 *
 * Runs at BUILD time only (SSG), so the fetch cost is paid once per icon.
 */

/** Same icon reused across projects: fetch it once per build. */
const cache = new Map<string, string | null>();

/** Attributes that would let an uploaded file run script in our page. */
const DANGEROUS = /\s(on[a-z]+|xlink:href|href)\s*=\s*("[^"]*"|'[^']*')/gi;

function sanitize(markup: string): string | null {
  let svg = markup
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .trim();

  if (!svg.startsWith("<svg")) return null;
  svg = svg.replace(DANGEROUS, "");

  // Recolor: every explicit paint becomes currentColor. `none` is a shape
  // decision (outline icons rely on it), not a color, so it stays.
  svg = svg.replace(/(fill|stroke)\s*=\s*("|')(?!none)(?:[^"']*)\2/gi, '$1="currentColor"');
  svg = svg.replace(/(fill|stroke)\s*:\s*(?!none)[^;"']+/gi, "$1:currentColor");

  // Let the container size it: a hard-coded width/height would ignore our box.
  const [openTag] = svg.match(/<svg[^>]*>/i) ?? [];
  if (!openTag) return null;
  const sized = openTag
    .replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/<svg/i, '<svg width="100%" height="100%" aria-hidden="true" focusable="false"');
  return svg.replace(openTag, sized);
}

export async function inlineSvg(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const cached = cache.get(url);
  if (cached !== undefined) return cached;

  let result: string | null;
  try {
    // Absolute (S3 / a running CMS) vs. the copies bundled in public/ when the
    // build falls back to the snapshot — see `mediaUrl` in lib/strapi.ts.
    const raw = url.startsWith("http")
      ? await fetch(url, { signal: AbortSignal.timeout(10_000) }).then((r) =>
          r.ok ? r.text() : null,
        )
      : await readFile(`public${url}`, "utf8");
    result = raw ? sanitize(raw) : null;
  } catch {
    // A missing or unreachable icon must never fail the build; the caller
    // falls back to rendering the file as a plain <img>.
    result = null;
  }

  cache.set(url, result);
  return result;
}
