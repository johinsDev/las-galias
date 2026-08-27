/**
 * Creates the six legal documents /legales expects.
 *
 * Separate from `seed.cjs` on purpose: that one is a DEV seed full of invented
 * projects and placeholder images and refuses to run twice. These are real
 * production content — the site's footer links to them by slug — so this has to
 * be runnable against a real CMS, and idempotently: it skips any slug that
 * already exists rather than creating a second copy.
 *
 * Run with `bun run seed:legal` inside apps/cms.
 *
 * WARNING: only "Términos y condiciones" carries real text (transcribed from
 * the approved design). The other five ship with a holding notice and MUST be
 * replaced by the legal team before launch — publishing an empty privacy
 * policy is a compliance problem, not a formatting one.
 */
const path = require("node:path");

const appDir = path.resolve(__dirname, "..");
process.chdir(appDir);
require("dotenv").config({ path: ".env" });

const { createStrapi } = require("@strapi/strapi");

const UID = "api::legal-document.legal-document";

function p(text) {
  return { type: "paragraph", children: [{ type: "text", text }] };
}

function h(text) {
  return { type: "heading", level: 2, children: [{ type: "text", text }] };
}

/** Body for a document whose wording legal has not delivered yet. */
function pending(title) {
  return [
    h("Documento en actualización"),
    p(
      `El texto vigente de "${title}" está siendo revisado por nuestro equipo legal y se publicará en esta misma página.`,
    ),
    p(
      "Mientras tanto puedes solicitar una copia escribiendo a sala@lasgalias.com.co, indicando el documento que necesitas. Te la enviamos por correo.",
    ),
  ];
}

const TERMS = [
  h("1. Objeto"),
  p(
    'Los presentes Términos y Condiciones regulan el acceso y uso del sitio web de Las Galias Constructora S.A.S. (en adelante, "Galias"), incluyendo la consulta de proyectos inmobiliarios, el uso de simuladores financieros, la solicitud de asesoría comercial y el proceso de separación de inmuebles a través de nuestros canales digitales. Al acceder a este sitio, el usuario acepta quedar sujeto a estos términos en su totalidad. Si el usuario actúa en representación de un tercero, declara contar con las facultades necesarias para comprometerlo bajo estas condiciones.',
  ),
  h("2. Aceptación de términos"),
  p(
    "El acceso y navegación en este sitio web atribuye la condición de usuario e implica la aceptación plena de todas las cláusulas incluidas en este documento, así como de sus eventuales modificaciones. Si el usuario no está de acuerdo con alguna de las condiciones aquí establecidas, deberá abstenerse de utilizar el sitio y sus servicios asociados. El uso continuado del sitio tras la publicación de cambios constituye aceptación de dichos cambios.",
  ),
  h("3. Uso del sitio"),
  p(
    "El usuario se compromete a hacer un uso adecuado y lícito del sitio web, así como de los contenidos y servicios que se ofrecen, absteniéndose de utilizarlo para fines ilícitos, lesivos de derechos e intereses de terceros, o que puedan dañar, inutilizar o sobrecargar el sitio o impedir su normal funcionamiento. Queda prohibido el uso de mecanismos automatizados (bots, scrapers) para extraer información de precios, disponibilidad o inventario sin autorización expresa de Galias.",
  ),
  h("4. Proceso de compra"),
  p(
    "La información de proyectos, precios, áreas y disponibilidad publicada en este sitio tiene carácter informativo y está sujeta a cambios sin previo aviso, así como a la verificación final por parte de un asesor comercial. La separación de una unidad únicamente se formaliza mediante la firma de los documentos contractuales correspondientes y el pago de los valores pactados, no por la simple navegación o uso de los simuladores del sitio. Los resultados de las calculadoras financieras son estimaciones y no constituyen una oferta vinculante de crédito ni de financiación.",
  ),
  h("5. Propiedad intelectual"),
  p(
    "Todos los contenidos del sitio —incluyendo textos, imágenes, renders, logotipos, marcas, videos y el software que soporta el sitio— son propiedad de Galias o de terceros que han autorizado su uso, y están protegidos por las normas de propiedad intelectual e industrial vigentes en Colombia. Queda prohibida su reproducción, distribución o transformación sin autorización previa y expresa por escrito.",
  ),
  h("6. Limitación de responsabilidad"),
  p(
    "Galias no será responsable por daños o perjuicios derivados de la interrupción, suspensión o finalización del acceso al sitio web, ni por errores técnicos ajenos a su control razonable. Asimismo, no garantiza que la información publicada esté siempre libre de errores, si bien realiza esfuerzos razonables para mantenerla actualizada y precisa. En caso de discrepancia entre la información del sitio y los documentos contractuales oficiales, prevalecerán estos últimos.",
  ),
  h("7. Modificaciones"),
  p(
    "Galias se reserva el derecho de modificar, en cualquier momento y sin necesidad de previo aviso, la presentación, configuración y contenido del sitio web, así como estos Términos y Condiciones, con el fin de mantenerlos actualizados frente a cambios normativos, comerciales o técnicos. Recomendamos revisar periódicamente esta sección para estar al tanto de cualquier actualización.",
  ),
  h("8. Ley aplicable"),
  p(
    "Estos Términos y Condiciones se rigen por las leyes de la República de Colombia. Cualquier controversia derivada de su interpretación o cumplimiento será sometida a la jurisdicción de los jueces y tribunales competentes de Bogotá D.C., salvo que la normativa de protección al consumidor disponga un fuero distinto de carácter irrenunciable para el usuario.",
  ),
];

/** Order matches the chip order in the design and in @lasgalias/schemas. */
const DOCUMENTS = [
  { slug: "terminos-y-condiciones", title: "Términos y condiciones", body: TERMS },
  { slug: "politica-de-privacidad", title: "Política de privacidad" },
  {
    slug: "cartilla-explicativa-venta-en-salarios-minimos",
    title: "Cartilla explicativa de la venta en salarios mínimos",
  },
  { slug: "cartilla-informativa-de-la-venta", title: "Cartilla informativa de la venta" },
  {
    slug: "politicas-de-devolucion-saldos-de-escrituracion",
    title: "Políticas de devolución saldos de escrituración",
  },
  {
    slug: "politicas-de-manejo-de-informacion-y-privacidad",
    title: "Políticas de manejo de información y privacidad",
  },
];

function log(...args) {
  console.log("[SEED:LEGAL]", ...args);
}

async function main() {
  const app = await createStrapi({ appDir, distDir: path.join(appDir, "dist") }).load();
  const today = new Date().toISOString().slice(0, 10);
  let created = 0;

  try {
    for (const [index, spec] of DOCUMENTS.entries()) {
      const existing = await app.documents(UID).findFirst({
        filters: { slug: spec.slug },
        status: "draft",
      });
      if (existing) {
        log(`skip  ${spec.slug} (ya existe)`);
        continue;
      }

      const doc = await app.documents(UID).create({
        data: {
          title: spec.title,
          slug: spec.slug,
          order: index,
          effectiveDate: today,
          body: spec.body ?? pending(spec.title),
        },
      });
      await app.documents(UID).publish({ documentId: doc.documentId });
      created += 1;
      log(`crea  ${spec.slug}${spec.body ? "" : "  (texto pendiente de legal)"}`);
    }

    log(`Listo. ${created} documento(s) creado(s), ${DOCUMENTS.length - created} ya existían.`);
    if (created > 0) {
      log("RECUERDA: cinco de los seis llevan texto provisional. Legal debe reemplazarlo.");
    }
  } finally {
    await app.destroy();
  }
}

main().catch((err) => {
  console.error("[SEED:LEGAL] failed:", err);
  process.exit(1);
});
