import { defineConfig, fontProviders } from "astro/config";
import partytown from "@astrojs/partytown";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

import { fetchRedirects } from "./redirects";
import { IMAGE_WIDTHS } from "./src/lib/image-sizes";

/**
 * Host of whatever CMS this build points at, so its uploads survive Vercel's
 * image-optimization allowlist. Derived from STRAPI_URL instead of hard-coded:
 * the CMS has already moved (S3 → CloudFront → Lightsail) and every move
 * silently broke every image until the list was updated by hand.
 */
const cmsHost = (() => {
  try {
    return new URL(process.env.STRAPI_URL ?? "").hostname || null;
  } catch {
    return null;
  }
})();

/**
 * Hosts the image optimizer may fetch from. Declared once and handed to BOTH
 * `image.remotePatterns` and the adapter's `imagesConfig`: with a custom
 * `imagesConfig` the adapter re-validates Astro's list through a check that
 * rejects every pattern with a protocol, so passing it there is the only way
 * these hosts reach `.vercel/output/config.json` — and without them the
 * optimizer refuses every S3 URL in production.
 */
const remotePatterns = [
  // Strapi uploads on S3 (any bucket/region of the active AWS account).
  { protocol: "https" as const, hostname: "**.amazonaws.com" },
  // Local Strapi in dev.
  { protocol: "http" as const, hostname: "localhost" },
  // Whatever CMS this build points at (self-hosted Strapi serving /uploads).
  ...(cmsHost ? [{ protocol: "https" as const, hostname: cmsHost }] : []),
];

// https://astro.build/config
export default defineConfig({
  site: "https://lasgalias.com",
  output: "static",
  // The adapter is used even though the site is 100% static: it emits the CMS
  // redirects as real 301s in .vercel/output/config.json (SEO) and enables the
  // Vercel image optimization CDN for astro:assets.
  adapter: vercel({
    imageService: true,
    // Explicit allow-list of widths (see src/lib/image-sizes.ts): the default
    // one starts at 640, so a 56px logo was rendered at 640 and every width off
    // the list leaked an `inputtedWidth` attribute into the HTML.
    imagesConfig: { sizes: [...IMAGE_WIDTHS], domains: [], remotePatterns },
  }),
  redirects: await fetchRedirects(),
  build: {
    // The one stylesheet is ~15 KB gzipped and render-blocking. Inlined, the
    // first paint no longer waits a round trip for it; the price is that much
    // more HTML per page, which is cheaper than the request on a phone.
    inlineStylesheets: "always",
  },
  integrations: [
    react(),
    {
      // Islands that hydrate on demand instead of on load. Astro inlines the
      // directive code into the page, so both files stay dependency-free.
      name: "lasgalias:directives",
      hooks: {
        "astro:config:setup": ({ addClientDirective }) => {
          addClientDirective({ name: "search", entrypoint: "./src/directives/search.ts" });
          addClientDirective({ name: "interact", entrypoint: "./src/directives/interact.ts" });
          addClientDirective({ name: "on", entrypoint: "./src/directives/on.ts" });
        },
      },
    },
    // Partytown solo cuando hay GTM que mover a un worker. Sin la variable no
    // había ningún script que aislar y aun así se inyectaba su cargador en cada
    // página, que pedía el sandbox de depuración y devolvía un 404 en consola
    // (lo veía Lighthouse en «Best Practices»).
    ...(process.env.PUBLIC_GTM_ID
      ? [partytown({ config: { forward: ["dataLayer.push", "gtag"] } })]
      : []),
  ],
  image: { remotePatterns },
  vite: {
    plugins: [tailwindcss()],
    // Pre-bundle the island deps so dev doesn't 504 mid re-optimization.
    // Only DIRECT deps of this app: with the isolated linker, deps that live
    // inside @lasgalias/ui are not resolvable (nor needed) from here.
    optimizeDeps: {
      include: ["@formisch/react", "valibot"],
    },
    // Avoid duplicate React copies across workspace packages.
    resolve: {
      dedupe: ["react", "react-dom"],
    },
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      // The design file's type is Public Sans, not Figtree — the eyebrow reads
      // "Public Sans / 700 / 12px / 1.2px tracking" in Figma's inspector.
      name: "Public Sans",
      cssVariable: "--font-public-sans",
      // One variable file instead of five static weights: five woff2 preloads
      // (74 KB) sat in front of the first paint on every page.
      weights: ["100 900"],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["ui-sans-serif", "system-ui", "sans-serif"],
    },
  ],
});
