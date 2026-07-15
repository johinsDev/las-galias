/**
 * Development seed: cities, macroproject + points of interest, amenities,
 * projects in both stages (with placeholder SVG images), home banners, posts
 * and the calculator/exchange-rate singles. Idempotent: exits early if the
 * seed marker (city "bogota") already exists.
 *
 * Run with `bun run seed` inside apps/cms (compiles TS to dist first).
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const appDir = path.resolve(__dirname, "..");
process.chdir(appDir);
require("dotenv").config({ path: ".env" });

const { createStrapi } = require("@strapi/strapi");

/* ── placeholder images ────────────────────────────────────────────────── */

const PALETTES = {
  forest: ["#1e5631", "#8fbf9f"],
  sand: ["#d9b45b", "#faf5e6"],
  dusk: ["#14351f", "#2e7d46"],
  clay: ["#a9714b", "#e8cdb5"],
  sky: ["#4a7ba6", "#cfe3f2"],
  stone: ["#5b6660", "#d4d4c8"],
};

function svgPlaceholder({ width, height, label, palette }) {
  const [from, to] = PALETTES[palette] ?? PALETTES.forest;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <text x="50%" y="50%" fill="rgba(255,255,255,0.85)" font-family="sans-serif" font-size="${Math.round(height / 12)}" font-weight="700" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;
}

/* ── helpers ───────────────────────────────────────────────────────────── */

function log(...args) {
  console.log("[SEED]", ...args);
}

async function main() {
  const app = await createStrapi({ appDir, distDir: path.join(appDir, "dist") }).load();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "las-galias-seed-"));

  async function uploadSvg(name, opts) {
    const filepath = path.join(tmpDir, `${name}.svg`);
    fs.writeFileSync(filepath, svgPlaceholder(opts));
    const [file] = await app.plugin("upload").service("upload").upload({
      data: { fileInfo: { name, alternativeText: opts.label } },
      files: {
        filepath,
        originalFilename: `${name}.svg`,
        mimetype: "image/svg+xml",
        size: fs.statSync(filepath).size,
      },
    });
    return file;
  }

  async function createAndPublish(uid, data) {
    const doc = await app.documents(uid).create({ data });
    await app.documents(uid).publish({ documentId: doc.documentId });
    return doc;
  }

  try {
    const marker = await app
      .documents("api::city.city")
      .findFirst({ filters: { slug: "bogota" } });
    if (marker) {
      log("Seed data already present (city 'bogota' exists) — nothing to do.");
      return;
    }

    /* cities */
    const bogota = await createAndPublish("api::city.city", {
      name: "Bogotá",
      slug: "bogota",
      department: "Cundinamarca",
    });
    const medellin = await createAndPublish("api::city.city", {
      name: "Medellín",
      slug: "medellin",
      department: "Antioquia",
    });
    log("Cities: Bogotá, Medellín");

    /* amenities */
    const amenityNames = [
      "Piscina",
      "Gimnasio",
      "Zona BBQ",
      "Parque infantil",
      "Salón social",
      "Coworking",
    ];
    const amenities = [];
    for (const name of amenityNames) {
      amenities.push(
        await app.documents("api::amenity.amenity").create({ data: { name } }),
      );
    }
    log(`Amenities: ${amenityNames.join(", ")}`);

    /* macroproject + points of interest */
    const macroGallery = await uploadSvg("macro-ciudad-verde", {
      width: 1600,
      height: 1000,
      label: "Ciudad Verde Norte",
      palette: "dusk",
    });
    const macro = await createAndPublish("api::macroproject.macroproject", {
      name: "Ciudad Verde Norte",
      slug: "ciudad-verde-norte",
      city: bogota.documentId,
      gallery: [macroGallery.id],
      location: { lat: 4.7601, lng: -74.0465, address: "Autopista Norte km 21, Bogotá" },
      description: [
        {
          type: "paragraph",
          children: [
            {
              type: "text",
              text: "Un macroproyecto de 40 hectáreas con parques, comercio y colegios a la puerta de tu casa.",
            },
          ],
        },
      ],
    });
    const pois = [
      { name: "Centro Comercial Verde Plaza", category: "commerce", distanceText: "5 min" },
      { name: "Clínica del Norte", category: "health", distanceText: "10 min" },
      { name: "Colegio Nueva Granada Norte", category: "education", distanceText: "8 min" },
      { name: "Estación TransMilenio Terminal", category: "transport", distanceText: "12 min" },
      { name: "Parque Metropolitano", category: "recreation", distanceText: "3 min" },
    ];
    for (const poi of pois) {
      await app
        .documents("api::point-of-interest.point-of-interest")
        .create({ data: { ...poi, macroproject: macro.documentId } });
    }
    log(`Macroproject "Ciudad Verde Norte" + ${pois.length} points of interest`);

    /* projects */
    const projectSpecs = [
      {
        name: "Reserva de los Alisos",
        slug: "reserva-de-los-alisos",
        stage: "sale",
        constructionStatus: "construction",
        priceFromCOP: "320000000",
        city: bogota,
        macroproject: macro.documentId,
        palette: "forest",
        blurb:
          "Apartamentos de 2 y 3 alcobas rodeados de senderos ecológicos, a 5 minutos del parque metropolitano.",
      },
      {
        name: "Mirador del Parque",
        slug: "mirador-del-parque",
        stage: "sale",
        constructionStatus: "presale",
        priceFromCOP: "280000000",
        city: bogota,
        macroproject: macro.documentId,
        palette: "sky",
        blurb: "Torres de vivienda con vista al humedal y zonas comunes en el piso 12.",
      },
      {
        name: "Altos de la Sabana",
        slug: "altos-de-la-sabana",
        stage: "expectation",
        city: bogota,
        palette: "sand",
        blurb: "Muy pronto: un nuevo concepto de vivienda campestre urbana al norte de Bogotá.",
      },
      {
        name: "Balcones de Provenza",
        slug: "balcones-de-provenza",
        stage: "sale",
        constructionStatus: "immediate-delivery",
        priceFromCOP: "410000000",
        city: medellin,
        palette: "clay",
        blurb: "Entrega inmediata en el corazón de Provenza: balcones amplios y acabados premium.",
      },
      {
        name: "Sendero del Río",
        slug: "sendero-del-rio",
        stage: "expectation",
        city: medellin,
        palette: "stone",
        blurb: "Muy pronto: vive frente al río con el skyline de Medellín de fondo.",
      },
      {
        name: "Portal del Poblado",
        slug: "portal-del-poblado",
        stage: "sale",
        constructionStatus: "launch",
        priceFromCOP: "520000000",
        city: medellin,
        palette: "dusk",
        blurb: "Lanzamiento exclusivo: apartamentos de lujo con club house privado en El Poblado.",
      },
    ];

    const projects = {};
    for (const spec of projectSpecs) {
      const heroDesktop = await uploadSvg(`${spec.slug}-hero-desktop`, {
        width: 1600,
        height: 700,
        label: spec.name,
        palette: spec.palette,
      });
      const heroMobile = await uploadSvg(`${spec.slug}-hero-mobile`, {
        width: 800,
        height: 1000,
        label: spec.name,
        palette: spec.palette,
      });

      const isSale = spec.stage === "sale";
      const gallery = [];
      const unitTypes = [];
      if (isSale) {
        for (let i = 1; i <= 3; i++) {
          const img = await uploadSvg(`${spec.slug}-gallery-${i}`, {
            width: 1200,
            height: 800,
            label: `${spec.name} · ${i}`,
            palette: spec.palette,
          });
          gallery.push(img.id);
        }
        const base = Number(spec.priceFromCOP);
        unitTypes.push(
          { name: "Tipo A", areaM2: 58, bedrooms: 2, bathrooms: 2, priceCOP: String(base) },
          {
            name: "Tipo B",
            areaM2: 74,
            bedrooms: 3,
            bathrooms: 2,
            priceCOP: String(Math.round(base * 1.25)),
          },
          {
            name: "Tipo C",
            areaM2: 92,
            bedrooms: 3,
            bathrooms: 3,
            priceCOP: String(Math.round(base * 1.55)),
          },
        );
      }

      const doc = await createAndPublish("api::project.project", {
        name: spec.name,
        slug: spec.slug,
        stage: spec.stage,
        constructionStatus: spec.constructionStatus,
        priceFromCOP: spec.priceFromCOP,
        city: spec.city.documentId,
        macroproject: spec.macroproject,
        amenities: isSale ? amenities.slice(0, 4).map((a) => a.documentId) : [],
        unitTypes,
        gallery,
        heroDesktop: heroDesktop.id,
        heroMobile: heroMobile.id,
        description: [
          { type: "paragraph", children: [{ type: "text", text: spec.blurb }] },
        ],
        seo: { metaTitle: `${spec.name} — Las Galias`, metaDescription: spec.blurb },
      });
      projects[spec.slug] = doc;
      log(`Project "${spec.name}" (${spec.stage}) published`);
    }

    /* recommended (same city only — the middleware enforces it) */
    await app.documents("api::project.project").update({
      documentId: projects["reserva-de-los-alisos"].documentId,
      data: { recommended: [projects["mirador-del-parque"].documentId] },
    });
    await app.documents("api::project.project").update({
      documentId: projects["balcones-de-provenza"].documentId,
      data: { recommended: [projects["portal-del-poblado"].documentId] },
    });
    // Re-publish so the published version includes the relations.
    for (const slug of ["reserva-de-los-alisos", "balcones-de-provenza"]) {
      await app.documents("api::project.project").publish({ documentId: projects[slug].documentId });
    }
    log("Recommended projects linked (same city)");

    /* home banners */
    for (const [i, spec] of [
      { title: "Vive donde florece la ciudad", link: "/proyectos", palette: "forest" },
      { title: "Entrega inmediata en Medellín", link: "/proyectos/balcones-de-provenza", palette: "clay" },
    ].entries()) {
      const desktopImage = await uploadSvg(`banner-${i + 1}-desktop`, {
        width: 1920,
        height: 800,
        label: spec.title,
        palette: spec.palette,
      });
      const mobileImage = await uploadSvg(`banner-${i + 1}-mobile`, {
        width: 800,
        height: 1000,
        label: spec.title,
        palette: spec.palette,
      });
      await createAndPublish("api::home-banner.home-banner", {
        title: spec.title,
        link: spec.link,
        order: i,
        active: true,
        desktopImage: desktopImage.id,
        mobileImage: mobileImage.id,
      });
    }
    log("Home banners (desktop + mobile)");

    /* posts */
    const posts = [
      {
        title: "5 claves para comprar vivienda sobre planos",
        slug: "claves-comprar-vivienda-sobre-planos",
        excerpt: "Lo que debes revisar antes de firmar una promesa de compraventa.",
        palette: "sand",
      },
      {
        title: "Así avanza Ciudad Verde Norte",
        slug: "asi-avanza-ciudad-verde-norte",
        excerpt: "Un recorrido por las obras del macroproyecto más grande del norte de Bogotá.",
        palette: "dusk",
      },
    ];
    for (const spec of posts) {
      const cover = await uploadSvg(`post-${spec.slug}`, {
        width: 1280,
        height: 720,
        label: spec.title,
        palette: spec.palette,
      });
      await createAndPublish("api::post.post", {
        title: spec.title,
        slug: spec.slug,
        excerpt: spec.excerpt,
        cover: cover.id,
        content: [
          { type: "heading", level: 2, children: [{ type: "text", text: spec.title }] },
          { type: "paragraph", children: [{ type: "text", text: spec.excerpt }] },
          {
            type: "list",
            format: "unordered",
            children: [
              { type: "list-item", children: [{ type: "text", text: "Revisa la fiducia y la licencia de construcción." }] },
              { type: "list-item", children: [{ type: "text", text: "Compara la tasa de interés con la calculadora del proyecto." }] },
              { type: "list-item", children: [{ type: "text", text: "Visita la sala de ventas y el apartamento modelo." }] },
            ],
          },
        ],
      });
    }
    log("Blog posts");

    /* singles */
    await app.documents("api::calculator-config.calculator-config").create({
      data: { annualInterestRate: 12.5, maxTermYears: 20, maxFinancingPercent: 70 },
    });

    let rates = { copPerUsd: 4000, copPerEur: 4350, usdSource: "seed-fallback", eurSource: "seed-fallback", validFrom: new Date().toISOString() };
    try {
      const { createRateProvider } = require("@lasgalias/providers");
      const provider = createRateProvider();
      const usd = await provider.getRate("USD");
      const eur = await provider.getRate("EUR");
      rates = {
        copPerUsd: usd.rate,
        copPerEur: eur.rate,
        usdSource: usd.source,
        eurSource: eur.source,
        validFrom: usd.asOf,
      };
    } catch (err) {
      log(`Live rates unavailable (${String(err)}) — using fallback values`);
    }
    await app.documents("api::exchange-rate.exchange-rate").create({
      data: { ...rates, fetchedAt: new Date().toISOString() },
    });
    log(
      `Singles: calculator (12.5% EA) + exchange rate (USD=${Number(rates.copPerUsd).toFixed(0)}, EUR=${Number(rates.copPerEur).toFixed(0)})`,
    );

    log("Done ✅  Open http://localhost:1337/admin and http://localhost:4321");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    await app.destroy();
  }
}

main().catch((err) => {
  console.error("[SEED] failed:", err);
  process.exit(1);
});
