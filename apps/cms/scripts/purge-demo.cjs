/**
 * Borra el contenido de DEMO que dejó `seed.cjs`, para dejar el CMS limpio
 * antes de cargar los proyectos reales.
 *
 * Borra SOLO por slug/nombre exacto de lo que crea el seed: nunca toca algo que
 * un editor haya creado. Si un proyecto real se llama distinto (y se llamará),
 * este script no lo puede tocar ni por accidente.
 *
 *   node scripts/purge-demo.cjs            # muestra qué borraría, sin borrar
 *   node scripts/purge-demo.cjs --yes      # borra de verdad
 *
 * OJO: borrar un proyecto dispara el middleware que crea un `redirect`
 * automático hacia /proyectos. Después de correr esto, revisa «Redirecciones»
 * y borra las que apunten a slugs de demo.
 */
const path = require("node:path");

const appDir = path.resolve(__dirname, "..");
process.chdir(appDir);
require("dotenv").config({ path: ".env" });

const { createStrapi } = require("@strapi/strapi");

const APPLY = process.argv.includes("--yes");

/** Exactamente lo que crea seed.cjs. Nada más. */
const DEMO = {
  "api::project.project": {
    field: "slug",
    values: [
      "reserva-de-los-alisos",
      "mirador-del-parque",
      "altos-de-la-sabana",
      "balcones-de-provenza",
      "sendero-del-rio",
      "portal-del-poblado",
    ],
  },
  "api::post.post": {
    field: "slug",
    values: [
      "pasos-comprar-primera-vivienda",
      "subsidios-vivienda-vigentes",
      "claves-comprar-vivienda-sobre-planos",
      "asi-avanza-ciudad-verde-norte",
      "ideas-decorar-apartamentos-pequenos",
    ],
  },
  "api::macroproject.macroproject": { field: "slug", values: ["ciudad-verde-norte"] },
  "api::amenity.amenity": {
    field: "name",
    values: ["Piscina", "Gimnasio", "Zona BBQ", "Parque infantil", "Salón social", "Coworking"],
  },
  "api::city.city": { field: "slug", values: ["bogota", "medellin"] },
};

async function main() {
  const app = await createStrapi({ appDir, distDir: path.join(appDir, "dist") }).load();
  const found = [];

  try {
    // El orden importa: primero lo que referencia, después lo referenciado.
    // Borrar una ciudad con proyectos vivos colgando rompe esos proyectos.
    for (const [uid, { field, values }] of Object.entries(DEMO)) {
      for (const value of values) {
        const docs = await app.documents(uid).findMany({ filters: { [field]: value } });
        for (const doc of docs) {
          found.push({ uid, field, value, documentId: doc.documentId });
        }
      }
    }

    if (found.length === 0) {
      console.log("\nNo queda contenido de demo. El CMS está limpio.\n");
      return;
    }

    console.log(`\n${APPLY ? "BORRANDO" : "Se borraría"} ${found.length} documento(s):\n`);
    for (const item of found) {
      console.log(`  ${item.uid.replace("api::", "").split(".")[0].padEnd(14)} ${item.value}`);
    }

    if (!APPLY) {
      console.log("\nEsto fue un simulacro. Para borrar de verdad:");
      console.log("  node scripts/purge-demo.cjs --yes\n");
      return;
    }

    for (const item of found) {
      await app.documents(item.uid).delete({ documentId: item.documentId });
    }
    console.log("\nListo. Revisa «Redirecciones»: borrar proyectos crea redirecciones automáticas.\n");
  } finally {
    await app.destroy();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("Falló:", err.message);
    process.exit(1);
  },
);
