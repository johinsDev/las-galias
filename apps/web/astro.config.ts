import { defineConfig, fontProviders } from "astro/config";
import partytown from "@astrojs/partytown";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

import { fetchRedirects } from "./redirects";

// https://astro.build/config
export default defineConfig({
  site: "https://lasgalias.com",
  output: "static",
  // El adapter se usa aunque el sitio sea 100% estático: emite las redirecciones
  // del CMS como 301 reales en .vercel/output/config.json (SEO) y habilita la
  // CDN de imágenes de Vercel para astro:assets.
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
      // Uploads de Strapi en S3 (cualquier bucket/región de la cuenta activa).
      { protocol: "https", hostname: "**.amazonaws.com" },
      // Strapi local en dev.
      { protocol: "http", hostname: "localhost" },
    ],
  },
  vite: {
    plugins: [tailwindcss()],
    // Vite no pre-escanea deps de packages linkeados del workspace; sin esto
    // las descubre en el primer load y 504ea re-optimizando (solo dev).
    optimizeDeps: {
      include: [
        "@base-ui/react/button",
        "@base-ui/react/input",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
        "@formisch/react",
        "valibot",
        "motion",
      ],
    },
    // Evita copias duplicadas de React entre packages del workspace.
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
