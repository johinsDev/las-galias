/**
 * Rellena por REST el contenido que falta en un CMS ya desplegado.
 *
 * Existe porque `seed.cjs` abre Strapi contra la base de datos local y eso no
 * sirve para una instancia remota. Este habla con su API, así que funciona
 * contra el CMS de producción desde cualquier parte.
 *
 *   node scripts/fill-content.cjs          # dice qué escribiría, sin escribir
 *   node scripts/fill-content.cjs --yes    # escribe
 *
 * Dos reglas que no se rompen:
 *
 *  1. NUNCA pisa algo que ya tenga valor. Solo llena huecos, campo por campo.
 *  2. Solo toca proyectos y artículos cuyo slug sea de los que crea `seed.cjs`.
 *     Un proyecto real se llamará distinto, así que este script no puede
 *     escribirle coordenadas inventadas ni por accidente.
 *
 * Lo que escribe queda en BORRADOR para los tipos con borrador/publicación
 * —la API REST de Strapi 5 no publica—, así que al terminar hay que entrar al
 * admin y darle a Publicar en lo que liste. Los que no tienen borrador
 * (`lead-form-config`) quedan en vivo al instante.
 *
 * No sube imágenes: al final avisa de qué campos de media siguen vacíos.
 */
const path = require("node:path");

const appDir = path.resolve(__dirname, "..");
process.chdir(appDir);
require("dotenv").config({ path: ".env" });

const APPLY = process.argv.includes("--yes");
const URL_BASE = (process.env.STRAPI_URL || "http://localhost:1337").replace(/\/$/, "");
const TOKEN = process.env.STRAPI_WRITE_TOKEN;

// La simulación solo lee, y lo que lee es público: el token hace falta para
// escribir. Así se puede ver el plan antes de ir a crear uno.
if (!TOKEN && APPLY) {
  console.error(
    [
      "Falta STRAPI_WRITE_TOKEN.",
      "",
      "El token del sitio es de solo lectura, así que hace falta uno con permiso",
      "de escritura. En el admin: Settings → API Tokens → Create new API Token,",
      "tipo «Full access», y luego:",
      "",
      `  STRAPI_URL=${URL_BASE} STRAPI_WRITE_TOKEN=<token> node scripts/fill-content.cjs`,
      "",
      "El token solo se ve una vez: si se pierde, se crea otro.",
    ].join("\n"),
  );
  process.exit(1);
}

const headers = {
  accept: "application/json",
  "content-type": "application/json",
  ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
};

const written = [];
const skipped = [];
const needsPublish = new Set();
const missingMedia = [];

async function api(pathname, init = {}) {
  const res = await fetch(`${URL_BASE}/api/${pathname}`, { headers, ...init });
  const body = await res.text();
  let json = null;
  try {
    json = JSON.parse(body);
  } catch {
    /* Strapi devuelve HTML en algunos errores; el texto crudo basta para el log. */
  }
  return { ok: res.ok, status: res.status, json, body };
}

/** Los campos de `patch` que el documento todavía no tiene. */
function gaps(current, patch) {
  const out = {};
  for (const [key, value] of Object.entries(patch)) {
    const has = current?.[key];
    const empty = has == null || has === "" || (Array.isArray(has) && has.length === 0);
    if (empty) out[key] = value;
  }
  return out;
}

async function fillSingle(name, patch, { draftAndPublish = true } = {}) {
  const read = await api(name);
  // Un single type sin entrada responde 404: es un hueco, no un error.
  const current = read.json?.data ?? null;
  const missing = gaps(current, patch);
  if (Object.keys(missing).length === 0) {
    skipped.push(`${name} (ya tiene todo)`);
    return;
  }
  written.push(`${name}: ${Object.keys(missing).join(", ")}`);
  if (draftAndPublish) needsPublish.add(name);
  if (!APPLY) return;

  const res = await api(name, { method: "PUT", body: JSON.stringify({ data: missing }) });
  if (!res.ok) console.error(`  ✗ ${name} → HTTP ${res.status} ${res.body.slice(0, 200)}`);
}

async function fillCollection(plural, slugs, patchFor, { draftAndPublish = true } = {}) {
  const query = new URLSearchParams({ "pagination[pageSize]": "100", status: "draft" });
  for (const key of Object.keys(patchFor({}))) query.append(`populate[${key}]`, "true");
  const read = await api(`${plural}?${query}`);
  const rows = read.json?.data ?? [];

  for (const row of rows) {
    if (!slugs.includes(row.slug)) continue;
    const patch = patchFor(row);
    const missing = gaps(row, patch);
    if (Object.keys(missing).length === 0) continue;
    written.push(`${plural}/${row.slug}: ${Object.keys(missing).join(", ")}`);
    if (draftAndPublish) needsPublish.add(plural);
    if (!APPLY) continue;

    const res = await api(`${plural}/${row.documentId}`, {
      method: "PUT",
      body: JSON.stringify({ data: missing }),
    });
    if (!res.ok) console.error(`  ✗ ${row.slug} → HTTP ${res.status} ${res.body.slice(0, 200)}`);
  }
}

const list = (...values) => values.map((text) => ({ text }));

/* ------------------------------------------------------------------ datos */

const HOME = {
  heroEyebrow: "Vivienda nueva · Colombia",
  heroTitle: "Tu hogar en la ciudad que amas",
  heroSubtitle:
    "Encuentra vivienda nueva en las mejores ciudades de Colombia.\nCuota inicial desde el 20%.",
  searchPlaceholder: "Busca por ciudad, zona o proyecto…",
  stepsEyebrow: "Paso a paso",
  stepsTitle: "Comprar es muy fácil",
  steps: [
    {
      title: "Elige tu proyecto",
      body: "Filtra por ciudad, precio y área. Agenda visita virtual o presencial sin costo.",
    },
    {
      title: "Aparta y financia",
      body: "Aparta con cuota inicial desde el 20%. Te asesoramos en crédito y subsidios VIS.",
    },
    {
      title: "Recibe tu hogar",
      body: "Entrega con estándares de alta calidad y acompañamiento postventa incluido.",
    },
  ],
  toolsEyebrow: "Herramientas",
  toolsTitle: "Planea tu compra",
  tools: [
    {
      title: "Simulador de crédito",
      body: "Calcula tu cuota mensual según precio, cuota inicial y plazo.",
      href: "/simuladores/credito-hipotecario",
      iconKey: "credit-card",
    },
    {
      title: "¿Aplica subsidio VIS?",
      body: "Verifica si accedes a subsidio Mi Casa Ya y cuánto te descuentan.",
      href: "/simuladores/capacidad-de-pago",
      iconKey: "subsidy",
    },
  ],
  stats: [
    { value: "+30.000", label: "Viviendas entregadas" },
    { value: "+30", label: "Proyectos activos" },
    { value: "#1", label: "En ventas VIS · Colombia" },
    { value: "30 años", label: "De trayectoria" },
  ],
  blogEyebrow: "Blog",
  blogTitle: "Aprende sobre vivienda",
  ctaTitle: "Agenda tu cita sin costo",
  ctaBody: "Un asesor te acompañará por todos los proyectos y opciones de financiación.",
  ctaLabel: "Agenda tu cita",
  ctaHref: "/servicio-al-cliente",
};

const EXTERIOR = {
  eyebrow: "Colombianos en el exterior",
  heroTitle: "Tu próxima inversión en Colombia, desde donde estés",
  heroSubtitle:
    "Asesoría personalizada, pagos 100% digitales y acompañamiento en cada paso, sin importar en qué país vivas hoy.",
  heroCtaLabel: "Déjanos tus datos",
  trustBadges: list("Broker autorizado", "Pagos por PSE"),
  stepsTitle: "Conoce el paso a paso",
  steps: [
    {
      title: "Selecciona el proyecto de tu interés",
      body: "Explora proyectos en Bogotá, Cali, Manizales y Pereira. Agenda una videollamada con un asesor especializado en compradores internacionales.",
    },
    {
      title: "Validamos tu financiación",
      body: "Revisamos tus recursos e ingresos en el exterior para confirmar tu capacidad de compra y las opciones de crédito disponibles.",
    },
    {
      title: "Realiza el pago de separación",
      body: "Pagas por PSE o, si tienes un apoderado en Colombia, a través de nuestros bancos aliados. Todo el proceso puede hacerse 100% en línea.",
    },
    {
      title: "Gestión de crédito de vivienda",
      body: "Te acompañamos en la gestión de tu crédito de vivienda.",
    },
    { title: "Firma digital segura", body: "Realiza la firma digital de tus documentos." },
    { title: "Pago de cuota inicial", body: "Realiza el pago de tu cuota inicial." },
  ],
  priceDisclaimer:
    "Precios en USD calculados con referencia a la TRM del día de la consulta. Imágenes ilustrativas; planos y áreas sujetos a modificación por requerimientos técnicos y/o de curaduría.",
  formTitle: "¿Listo para dar el primer paso?",
  formBody:
    "Déjanos tus datos y uno de nuestros asesores especializados en compradores internacionales te contactará en menos de 24 horas.",
  formBullets: list(
    "Sin costo · Sin compromiso",
    "Atención en español · Inglés",
    "Proceso 100% digital",
  ),
};

const PQR = {
  heroTitle: "¿Tienes una petición, queja o reclamo?",
  heroSubtitle:
    "Radica tu PQR y nuestro equipo te dará respuesta dentro de los 15 días hábiles siguientes, conforme a la normatividad vigente de protección al consumidor.",
  faqTitle: "Resolvemos tus dudas",
};

const LEAD_FORM = {
  incomeRanges: list(
    "Menos de $2.000.000",
    "$2.000.000 – $4.000.000",
    "$4.000.000 – $8.000.000",
    "Más de $8.000.000",
  ),
  savingsRanges: list(
    "Menos de $10.000.000",
    "$10.000.000 – $30.000.000",
    "$30.000.000 – $60.000.000",
    "Más de $60.000.000",
  ),
  severanceOptions: list("Sí", "No", "No estoy seguro"),
  residenceCities: list(
    "Bogotá",
    "Cali",
    "Manizales",
    "Pereira",
    "Medellín",
    "Barranquilla",
    "Bucaramanga",
    "Otra ciudad",
    "Vivo fuera de Colombia",
  ),
  adviceEyebrow: "Asesoría personalizada",
  adviceTitle: "Recibe una asesoría personalizada",
  adviceBody:
    "Cuéntanos un poco sobre ti y un asesor de Galias te contactará con las mejores opciones para tu situación financiera.",
};

/** Los slugs que crea `seed.cjs`. Fuera de esta lista, el script no escribe. */
const DEMO_PROJECTS = [
  "reserva-de-los-alisos",
  "mirador-del-parque",
  "altos-de-la-sabana",
  "balcones-de-provenza",
  "sendero-del-rio",
  "portal-del-poblado",
];
const DEMO_POSTS = ["claves-comprar-vivienda-sobre-planos", "asi-avanza-ciudad-verde-norte"];

/** Coordenadas por ciudad, para que el mapa de la ficha caiga donde debe. */
const COORDS = {
  "reserva-de-los-alisos": { lat: 4.6812, lng: -74.0455, address: "Calle 93 N° 13 – 24, Bogotá" },
  "mirador-del-parque": { lat: 4.715, lng: -74.084, address: "Carrera 104 N° 152 – 30, Bogotá" },
  "altos-de-la-sabana": { lat: 4.7601, lng: -74.0465, address: "Autopista Norte km 21, Bogotá" },
  "balcones-de-provenza": { lat: 6.205, lng: -75.57, address: "Carrera 43A N° 5 – 15, Medellín" },
  "sendero-del-rio": { lat: 6.209, lng: -75.568, address: "Carrera 35 N° 8 – 24, Medellín" },
  "portal-del-poblado": { lat: 6.2086, lng: -75.5673, address: "Calle 10 N° 43 – 60, Medellín" },
};

const SALES_ROOM = {
  schedule: "Lun a Dom · 9:00 a.m. – 5:00 p.m.",
  phone: "300 000 0000",
  email: "sala@lasgalias.com.co",
  whatsappUrl: "https://wa.me/573000000000",
};

const PROGRESS = [
  { label: "Mayo 2025", date: "2025-05-01", video: "https://www.youtube.com/embed/aqz-KE-bpKQ" },
  { label: "Febrero 2025", date: "2025-02-01", video: "https://www.youtube.com/embed/aqz-KE-bpKQ" },
];

/** Tema de cada pregunta, por lo que dice. Sin coincidencia, la primera pestaña. */
function topicFor(question = "") {
  const q = question.toLowerCase();
  if (/entrega|garant|postventa|acabado|incluye/.test(q)) return "posventa";
  if (/escritur|document|tr[aá]mite|notar/.test(q)) return "tramites";
  if (/separ|firma|promesa|pago|cuota inicial/.test(q)) return "durante-la-compra";
  return "antes-de-comprar";
}

/* ----------------------------------------------------------------- ejecución */

async function main() {
  console.log(`CMS: ${URL_BASE}`);
  console.log(APPLY ? "Modo: ESCRIBIENDO\n" : "Modo: simulación (usa --yes para escribir)\n");

  await fillSingle("home-page", HOME);
  await fillSingle("foreign-buyer-page", EXTERIOR);
  await fillSingle("pqr-page", PQR);
  await fillSingle("lead-form-config", LEAD_FORM, { draftAndPublish: false });

  await fillCollection("projects", DEMO_PROJECTS, (row) => ({
    location: COORDS[row.slug] ?? null,
    salesRoom: SALES_ROOM,
    constructionProgress: row.stage === "sale" ? PROGRESS : [],
    financing: {
      annualRatePct: 13.95,
      termYears: 15,
      downPaymentPct: 30,
      builderInstallmentMonths: 36,
      trusteeName: "Fiduciaria Bogotá S.A.",
      trustNumber: "FID-2024-8821",
      clientPortalUrl: "https://zonaclientes.lasgalias.com.co",
    },
  }));

  await fillCollection("posts", DEMO_POSTS, () => ({
    author: "Equipo Galias",
    authorRole: "Equipo editorial",
    tags: list("Vivienda nueva", "Guía de compra", "Financiación"),
    highlights: [
      { value: "30 SMMLV", label: "Subsidio máximo VIS" },
      { value: "150 SMMLV", label: "Precio máximo del inmueble" },
      { value: "+3M", label: "Familias beneficiadas desde 2020" },
    ],
  }));

  // Las preguntas frecuentes no tienen slug: se recorren por documentId.
  const faqs = await api("faqs?pagination[pageSize]=100&status=draft");
  for (const faq of faqs.json?.data ?? []) {
    if (faq.topic) continue;
    const topic = topicFor(faq.question);
    written.push(`faqs/${faq.question.slice(0, 40)}…: topic=${topic}`);
    needsPublish.add("faqs");
    if (!APPLY) continue;
    const res = await api(`faqs/${faq.documentId}`, {
      method: "PUT",
      body: JSON.stringify({ data: { topic } }),
    });
    if (!res.ok) console.error(`  ✗ faq ${faq.documentId} → HTTP ${res.status}`);
  }

  // Las imágenes hay que subirlas a mano: el script no inventa fotos.
  const heroes = await api("foreign-buyer-page?populate[heroImage]=true");
  if (!heroes.json?.data?.heroImage) missingMedia.push("Página · Compra desde el exterior → Imagen del hero");
  const pqr = await api("pqr-page?populate[heroImage]=true");
  if (!pqr.json?.data?.heroImage) missingMedia.push("Página · PQR → Foto de portada");

  console.log(written.length ? "Huecos que llena:" : "No hay huecos que llenar.");
  for (const line of written) console.log(`  · ${line}`);
  if (skipped.length) {
    console.log("\nYa estaban completos:");
    for (const line of skipped) console.log(`  · ${line}`);
  }
  if (needsPublish.size) {
    console.log(
      `\n${APPLY ? "Escrito en BORRADOR" : "Se escribiría en BORRADOR"}. La API REST de Strapi 5 no publica, así que hay que`,
    );
    console.log("entrar al admin y darle a Publicar en:");
    for (const name of needsPublish) console.log(`  · ${name}`);
  }
  if (missingMedia.length) {
    console.log("\nImágenes que hay que subir a mano (el script no inventa fotos):");
    for (const line of missingMedia) console.log(`  · ${line}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
