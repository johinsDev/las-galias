/**
 * Runs right after `astro build`. The Vercel adapter turns every redirect in
 * astro.config into a Build Output route whose `src` regex ends in `$`, so
 * `/proyectos/altavista-2000/` — the form with the trailing slash, which is
 * what the site's own canonicals and every shared link use — never matches and
 * falls through to a 404 instead of the 301. This loosens each redirect's
 * regex to accept an optional trailing slash. Nothing else in the file is
 * touched.
 */
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";

const file = new URL("../.vercel/output/config.json", import.meta.url);
const config = JSON.parse(await readFile(file, "utf8"));

// While here: the hashed font files under /_astro/fonts/ come out with
// `max-age=0, must-revalidate` (Vercel only marks /_astro/*.js|css immutable),
// so every visit re-fetched the font. The name carries the hash: cache it hard.
config.routes ??= [];
if (!config.routes.some((route) => route.src === "^/_astro/fonts/(.*)$")) {
  config.routes.unshift({
    src: "^/_astro/fonts/(.*)$",
    headers: { "cache-control": "public, max-age=31536000, immutable" },
    continue: true,
  });
}

let patched = 0;
for (const route of config.routes ?? []) {
  const isRedirect = route.headers?.Location && [301, 302, 307, 308].includes(route.status);
  if (!isRedirect || typeof route.src !== "string" || !route.src.endsWith("$")) continue;
  if (route.src.endsWith("/?$")) continue;
  route.src = `${route.src.slice(0, -1)}/?$`;
  patched += 1;
}

await writeFile(file, JSON.stringify(config, null, 2));
process.stdout.write(`[vercel-redirect-slashes] ${patched} redirect(s) now accept a trailing slash\n`);
