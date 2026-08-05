import { defineConfig, fontProviders } from "astro/config";
import partytown from "@astrojs/partytown";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

import { fetchRedirects } from "./redirects";

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

// https://astro.build/config
export default defineConfig({
  site: "https://lasgalias.com",
  output: "static",
  // The adapter is used even though the site is 100% static: it emits the CMS
  // redirects as real 301s in .vercel/output/config.json (SEO) and enables the
  // Vercel image optimization CDN for astro:assets.
  adapter: vercel({ imageService: true }),
  redirects: await fetchRedirects(),
  integrations: [
    react(),
    partytown({
      config: {
        forward: ["dataLayer.push", "gtag"],
      },
    }),
  ],
  image: {
    remotePatterns: [
      // Strapi uploads on S3 (any bucket/region of the active AWS account).
      { protocol: "https", hostname: "**.amazonaws.com" },
      // Local Strapi in dev.
      { protocol: "http", hostname: "localhost" },
      // Whatever CMS this build points at (self-hosted Strapi serving /uploads).
      ...(cmsHost ? [{ protocol: "https" as const, hostname: cmsHost }] : []),
    ],
  },
  vite: {
    plugins: [tailwindcss()],
    // Pre-bundle the island deps so dev doesn't 504 mid re-optimization.
    // Only DIRECT deps of this app: with the isolated linker, deps that live
    // inside @lasgalias/ui are not resolvable (nor needed) from here.
    optimizeDeps: {
      include: ["@formisch/react", "valibot", "motion"],
    },
    // Avoid duplicate React copies across workspace packages.
    resolve: {
      dedupe: ["react", "react-dom"],
    },
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Figtree",
      cssVariable: "--font-figtree",
      weights: [400, 500, 600, 700, 800],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["ui-sans-serif", "system-ui", "sans-serif"],
    },
  ],
});
