/**
 * Reemplaza los proyectos del CMS por los reales de la hoja de Las Galias.
 *
 *   node scripts/load-projects.cjs          # dice qué haría, sin escribir
 *   node scripts/load-projects.cjs --yes    # borra y carga
 *   node scripts/load-projects.cjs --solo-brochures [--yes]
 *       # solo sube los brochures que falten, sin borrar nada: recargar todo
 *       # crea documentos nuevos y los leads ya recibidos perderían su proyecto
 *
 * La fuente es `data/proyectos.csv`: la hoja «carga_proyectos_galias.xlsx»
 * descargada tal cual (Archivo → Descargar → CSV). Para recargar, se vuelve a
 * descargar encima y se corre otra vez.
 *
 * Qué hace, en orden:
 *
 *  1. BORRA todos los proyectos, macroproyectos, zonas y zonas comunes, y las
 *     ciudades que no están en CITIES. No es un «rellenar huecos» como
 *     `fill-content.cjs`: lo editado a mano en esos tipos se pierde.
 *  2. Deja las ciudades en CITIES y el desplegable de ciudad del formulario.
 *  3. Crea zonas y zonas comunes a partir de las columnas de la hoja.
 *  4. Baja de la ficha de galias.com.co el logo, la galería y los planos, y
 *     el brochure, y los sube a la librería de medios.
 *  5. Crea cada proyecto amarrado a su macroproyecto de Sinco (SINCO_MACROS) y
 *     lo publica. El que no tiene imagen principal no pasa la validación de
 *     publicación, así que queda en borrador y se lista al final.
 *
 * Habla con la API REST, así que sirve contra cualquier CMS:
 *
 *   STRAPI_URL=https://… STRAPI_WRITE_TOKEN=<token full access> node scripts/load-projects.cjs --yes
 */
const fs = require("node:fs");
const path = require("node:path");

const appDir = path.resolve(__dirname, "..");
process.chdir(appDir);
require("dotenv").config({ path: ".env" });

const APPLY = process.argv.includes("--yes");
const ONLY_BROCHURES = process.argv.includes("--solo-brochures");
const URL_BASE = (process.env.STRAPI_URL || "http://localhost:1337").replace(/\/$/, "");
const TOKEN = process.env.STRAPI_WRITE_TOKEN;
const CSV = path.join(appDir, "data/proyectos.csv");
const CACHE = path.join(appDir, ".tmp/galias-media");

if (!TOKEN) {
  // A diferencia de fill-content, hasta la simulación lo necesita: el catálogo
  // de Sinco y los borradores no son públicos.
  console.error(
    [
      "Falta STRAPI_WRITE_TOKEN (un API token «Full access» del CMS de destino).",
      "",
      `  STRAPI_URL=${URL_BASE} STRAPI_WRITE_TOKEN=<token> node scripts/load-projects.cjs`,
    ].join("\n"),
  );
  process.exit(1);
}

/** Las ciudades que existen. Mosquera se vende como Bogotá (Sabana). */
const CITIES = [
  { name: "Bogotá", slug: "bogota", department: "Cundinamarca" },
  { name: "Manizales", slug: "manizales", department: "Caldas" },
  { name: "Pereira", slug: "pereira", department: "Risaralda" },
  { name: "Cali", slug: "cali", department: "Valle del Cauca" },
  { name: "Madrid", slug: "madrid", department: "Cundinamarca" },
];
const CITY_ALIASES = { mosquera: "bogota" };

/**
 * Proyecto de la hoja → macroproyectos de Sinco, según la exportación «proyectos
 * activos» de Las Galias. En Sinco un «proyecto» es una torre; el lead se amarra
 * a la primera torre activa del primer macro. Los que no están aquí no tienen
 * macro identificado y sus leads se quedan en Strapi hasta que Las Galias dé los
 * ids. Los macros tienen que estar en SINCO_ACTIVE_TOWERS
 * (`src/utils/sinco-catalog.ts`) o no hay torre que amarrar.
 */
const SINCO_MACROS = {
  "ronda de verano": ["196"],
  "estacion fontibon": ["164"],
  "moratti ciudad hayuelos": ["221"],
  "sabantti ciudad hayuelos": ["195"],
  "terra castilla": ["193"],
  "molinos caracas": ["192"],
  "paseo de la rivera": ["170"],
  "brezza ciudadela belari": ["190"],
  "soffio ciudadela belari": ["205"],
  "altavista 2000": ["159"],
  "chipichape 6 35": ["202"],
  "alborada de cuba": ["206"],
  "altavista del parque": ["212"],
  "bosques de cuba": ["165"],
  "brisas de belmonte": ["204"],
  "reserva de llano grande": ["210"],
  "ciudad campestre": ["219"],
  "heliconias ciudad floral": ["220"],
  "foresta de la sultana": ["188", "213"],
  "mirador de los alcazares": ["215", "167"],
  "portal de los cambulos": ["144"],
  "parque central fontibon 2": ["160"],
};

/** La hoja copia los nombres de Sinco o del sitio viejo; así se ven en la web. */
const DISPLAY_NAMES = {
  "estacion fontibon": "Estación Fontibón",
  "vertice 115": "Vértice 115",
  "centrum tercer milenio": "Centrum Tercer Milenio",
  "chipichape 6 35": "Chipichape 6-35",
  "bosques de cuba": "Bosques de Cuba",
  "portal de los cambulos": "Portal de los Cámbulos",
  "brezza ciudadela belari": "Brezza Ciudadela Belari",
};

/**
 * Zonas comunes escritas de varias formas en la hoja → una sola. `null` las
 * descarta: son restos del copiado de la web («Leer más») y no zonas.
 */
const AMENITY_ALIASES = {
  ascesor: "Ascensor",
  biogimnasio: "Bio Gimnasio",
  "ciclo rutas": "Cicloruta",
  "terraza transitrable": "Terraza transitable",
  "terrazas transitables": "Terraza transitable",
  triciclodomo: "Triciclódromo",
  "zona pet": "Zona de mascotas",
  "zona picnic": "Zona de picnic",
  "senderos de trote": "Pista de trote",
  "leer mas": null,
  "leer menos": null,
};
const amenityName = (raw) => {
  const key = norm(raw);
  if (/^ano de entrega/.test(key)) return null;
  return key in AMENITY_ALIASES ? AMENITY_ALIASES[key] : raw;
};

/** Palabra de la hoja → ícono de zona común. La primera que aparezca gana. */
const AMENITY_ICONS = [
  [/piscina/, "piscina"],
  [/gimnasio|gym|trx/, "gimnasio"],
  [/cowork/, "coworking"],
  [/salon social|salon comunal|salon de eventos/, "salon-social"],
  [/infantil|nino|triciclo|juegos/, "zona-infantil"],
  [/bbq|asado/, "zona-bbq"],
  [/mascota|pet/, "zona-mascotas"],
  [/cancha|deport|multiple/, "cancha-deportiva"],
  [/sauna|turco/, "sauna-turco"],
  [/jacuzzi/, "jacuzzi"],
  [/cine|teatr/, "cine"],
  [/sala de juegos|billar/, "sala-juegos"],
  [/lavander/, "lavanderia"],
  [/porteria|vigilancia/, "porteria"],
  [/parqueadero|parqueo/, "parqueadero"],
  [/ascensor/, "ascensor"],
  [/terraza|mirador/, "terraza"],
  [/bici/, "bicicletero"],
  [/sendero|trote|caminata/, "senderos"],
  [/verde|jardin|parque|bosque/, "zona-verde"],
];

const headers = { accept: "application/json", authorization: `Bearer ${TOKEN}` };

async function api(pathname, init = {}) {
  const res = await fetch(`${URL_BASE}/api/${pathname}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.body && typeof init.body === "string" ? { "content-type": "application/json" } : {}),
    },
  });
  const body = await res.text();
  let json = null;
  try {
    json = JSON.parse(body);
  } catch {
    /* Strapi devuelve HTML en algunos errores; el texto crudo basta para el log. */
  }
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${pathname} → HTTP ${res.status} ${body.slice(0, 300)}`);
  return json;
}

/**
 * OJO: la API REST de Strapi 5 PUBLICA por defecto al crear y al editar, y lo
 * hace sin pasar por los middlewares de publicación (la validación por etapa no
 * corre). Por eso cada escritura dice su estado: `published` solo para lo que
 * cumple esa validación, `draft` para el resto.
 */
const send = (method, pathname, data) => api(pathname, { method, body: JSON.stringify({ data }) });

async function pages(plural, extra) {
  const rows = [];
  for (let page = 1; ; page++) {
    const json = await api(`${plural}?pagination[page]=${page}&pagination[pageSize]=100${extra}`);
    rows.push(...json.data);
    if (page >= (json.meta?.pagination?.pageCount ?? 1)) return rows;
  }
}

/**
 * Todas las filas de un tipo: borradores y publicadas, una por documento. Se
 * piden las dos porque una base con datos viejos puede tener documentos que
 * solo existen publicados.
 */
async function all(plural, { draftAndPublish = true } = {}) {
  if (!draftAndPublish) return pages(plural, "");
  const byId = new Map();
  for (const row of [...(await pages(plural, "&status=draft")), ...(await pages(plural, ""))]) {
    if (!byId.has(row.documentId)) byId.set(row.documentId, row);
  }
  return [...byId.values()];
}

/* ------------------------------------------------------------------ hoja */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const slugify = (s) => norm(s).replace(/ /g, "-");
const clean = (s) => String(s ?? "").trim() || null;
/** «46,12» → 46.12. */
const decimal = (s) => {
  const n = Number.parseFloat(String(s ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
/** «$234.878.000» → 234878000. */
const money = (s) => {
  const digits = String(s ?? "").replace(/\D/g, "");
  return digits ? Number(digits) : null;
};
const int = (s) => {
  const m = String(s ?? "").match(/\d+/);
  return m ? Number(m[0]) : null;
};
/** Coordenada con coma decimal; sin tocar el signo. */
const coord = (s) => {
  const n = Number.parseFloat(String(s ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const splitList = (s) =>
  String(s ?? "")
    .split(/[,;\n]/)
    .map((x) => x.trim().replace(/\.$/, ""))
    .filter(Boolean);

function readSheet() {
  const [head, ...body] = parseCsv(fs.readFileSync(CSV, "utf8"));
  const col = (name) => {
    const i = head.findIndex((h) => norm(h).startsWith(norm(name)));
    if (i < 0) throw new Error(`La hoja no tiene la columna «${name}»`);
    return i;
  };
  const C = {
    city: col("Ciudad"),
    name: col("Nombre"),
    description: col("Descripcion"),
    locality: col("Localidad"),
    neighborhood: col("Barrio"),
    zone: col("Zona"),
    lat: col("Lat"),
    lng: col("Lng"),
    apartments: col("N° apartamentos"),
    towers: col("N° torres"),
    delivery: col("Fecha aprox"),
    price: col("Precio desde"),
    built: col("Área construida"),
    privateArea: col("Área privada"),
    bedrooms: col("Habitaciones"),
    bathrooms: col("Baños"),
    amenities: col("Zonas comunes"),
    features: col("Otras caracter"),
    tour: col("Recorrido 3D"),
    video: col("Presentación online"),
    brochure: col("Brochure"),
    address: col("Dirección proyecto"),
    schedule: col("Horario"),
    email: col("Correo"),
    url: col("URL galias"),
  };

  return (
    body
      .filter((r) => clean(r[C.name]) && clean(r[C.city]))
      // La última fila de la hoja es una nota de fuente, no un proyecto.
      .filter((r) => !/^fuente/i.test(r[C.city]))
      .map((r) => {
        const rawCity = norm(r[C.city]);
        const citySlug = CITY_ALIASES[rawCity] ?? slugify(r[C.city]);
        const barrio = clean(r[C.neighborhood]);
        const localidad = clean(r[C.locality]);
        const name = clean(r[C.name]).replace(/\s+/g, " ");
        return {
          name: DISPLAY_NAMES[norm(name)] ?? name,
          citySlug,
          // Mosquera no es ciudad del sitio: se nombra en el barrio.
          neighborhood:
            [barrio, localidad, CITY_ALIASES[rawCity] ? clean(r[C.city]) : null]
              .filter(Boolean)
              .join(", ") || null,
          zone: clean(r[C.zone]),
          description: clean(r[C.description]),
          lat: coord(r[C.lat]),
          lng: coord(r[C.lng]),
          address: clean(r[C.address]),
          apartments: int(r[C.apartments]),
          towers: int(r[C.towers]),
          deliveryYear: int(r[C.delivery]),
          price: money(r[C.price]),
          built: decimal(r[C.built]),
          privateArea: decimal(r[C.privateArea]),
          bedrooms: int(r[C.bedrooms]),
          bathrooms: int(r[C.bathrooms]),
          amenities: [...splitList(r[C.amenities]), ...splitList(r[C.features])]
            .map(amenityName)
            .filter(Boolean),
          tour: clean(r[C.tour]),
          video: clean(r[C.video]),
          // www.galias.com.co no resuelve; el mismo archivo está sin «www».
          brochure: clean(r[C.brochure])?.replace("://www.galias.com.co/", "://galias.com.co/") ?? null,
          schedule: clean(r[C.schedule]),
          email: clean(r[C.email]),
          url: clean(r[C.url]),
          macros: SINCO_MACROS[norm(name)] ?? [],
        };
      })
  );
}

/* ---------------------------------------------------------- galias.com.co */

/**
 * La ficha de galias.com.co (WordPress + Elementor): `og:image` es el logo, el
 * primer carrusel es la galería y el segundo, los planos. Los «Sin-titulo-N»
 * que salen en todas las fichas son de la plantilla y quedan fuera, porque solo
 * se leen imágenes dentro de un carrusel.
 */
async function scrapeListing(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const html = await res.text();
  const logo = html.match(/property="og:image" content="([^"]+)"/)?.[1] ?? null;
  const carousels = html
    .split('data-widget_type="image-carousel.default"')
    .slice(1)
    .map((chunk) => {
      const own = chunk.split("data-widget_type=")[0];
      // Las fichas nuevas escriben «galias.com.co//wp-content»: se normaliza.
      const urls = [...own.matchAll(/<img[^>]+src="https:\/\/galias\.com\.co\/+(wp-content\/uploads\/[^"]+)"/g)].map(
        (m) => `https://galias.com.co/${m[1]}`,
      );
      return [...new Set(urls)];
    })
    .filter((urls) => urls.length > 0);
  return { logo: logo?.replace(/\.co\/+/, ".co/") ?? null, gallery: carousels[0] ?? [], plans: carousels[1] ?? [] };
}

async function download(url) {
  fs.mkdirSync(CACHE, { recursive: true });
  const name = decodeURIComponent(new URL(url).pathname.split("/").pop());
  const file = path.join(CACHE, name);
  if (!fs.existsSync(file)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo bajar ${url}: HTTP ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return { file, name };
}

const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };
const uploaded = new Map();
/** El tope del plugin de upload para documentos (`config/plugins.ts`). */
const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES) || 30 * 1024 * 1024;
const tooBig = [];

/** Sube un archivo de galias.com.co una sola vez; devuelve su id de media. */
async function media(url, alt) {
  if (!url) return null;
  if (uploaded.has(url)) return uploaded.get(url);
  try {
    const { file, name } = await download(url);
    const size = fs.statSync(file).size;
    if (size > MAX_BYTES) {
      tooBig.push(`${alt} (${(size / 1024 / 1024).toFixed(1)} MB)`);
      uploaded.set(url, null);
      return null;
    }
    // El nombre lleva el proyecto delante: los de galias se repiten («1-4.jpg»).
    const stored = `${slugify(alt)}-${name}`;
    const existing = await api(`upload/files?filters[name][$eq]=${encodeURIComponent(stored)}`);
    let id = existing?.[0]?.id;
    if (!id) {
      const ext = name.split(".").pop().toLowerCase();
      const form = new FormData();
      form.append("files", new Blob([fs.readFileSync(file)], { type: MIME[ext] ?? "application/octet-stream" }), stored);
      form.append("fileInfo", JSON.stringify({ name: stored, alternativeText: alt }));
      const res = await api("upload", { method: "POST", body: form });
      id = res[0].id;
    }
    uploaded.set(url, id);
    return id;
  } catch (err) {
    console.warn(`  ! ${alt}: ${err.message}`);
    return null;
  }
}

/* ------------------------------------------------------------------ carga */

const paragraphs = (text) =>
  String(text ?? "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ type: "paragraph", children: [{ type: "text", text: p }] }));

function iconFor(name) {
  const key = norm(name);
  return AMENITY_ICONS.find(([re]) => re.test(key))?.[1] ?? null;
}

async function wipe() {
  for (const plural of ["projects", "macroprojects", "zones", "amenities"]) {
    const rows = await all(plural, { draftAndPublish: plural !== "amenities" });
    console.log(`  borrar ${rows.length} ${plural}`);
    if (!APPLY) continue;
    for (const row of rows) await api(`${plural}/${row.documentId}`, { method: "DELETE" });
  }
  const keep = new Set(CITIES.map((c) => c.slug));
  for (const city of await all("cities")) {
    if (keep.has(city.slug)) continue;
    console.log(`  borrar ciudad ${city.name}`);
    if (APPLY) await api(`cities/${city.documentId}`, { method: "DELETE" });
  }
}

async function upsertCities() {
  const current = await all("cities");
  const ids = {};
  for (const city of CITIES) {
    const found = current.find((c) => c.slug === city.slug);
    console.log(`  ciudad ${city.name}${found ? " (ya existe)" : ""}`);
    if (!APPLY) {
      ids[city.slug] = found?.documentId ?? `(nueva ${city.slug})`;
      continue;
    }
    const saved = found
      ? await send("PUT", `cities/${found.documentId}?status=published`, city)
      : await send("POST", "cities?status=published", city);
    ids[city.slug] = saved.data.documentId;
  }

  const residenceCities = CITIES.map((c) => ({ text: c.name }));
  console.log(`  desplegable de ciudad: ${CITIES.map((c) => c.name).join(", ")}`);
  if (APPLY) await send("PUT", "lead-form-config", { residenceCities });
  return ids;
}

/**
 * Borrar un proyecto deja una redirección automática de su slug a /proyectos,
 * y el middleware solo la apaga en la acción «publish», que la API REST no
 * dispara. Sin esto, recargar dejaría cada ficha nueva tapada por su propia
 * redirección.
 */
async function enableSlug(slug) {
  const from = encodeURIComponent(`/proyectos/${slug}`);
  const json = await api(
    `redirects?filters[from][$eq]=${from}&filters[source][$eq]=auto-unpublish&filters[enabled][$eq]=true`,
  );
  for (const redirect of json.data) {
    await send("PUT", `redirects/${redirect.documentId}`, { enabled: false });
  }
}

async function sincoTowers() {
  const rows = await all("sinco-projects", { draftAndPublish: false });
  const byMacro = new Map();
  for (const row of rows.sort((a, b) => Number(a.sincoId) - Number(b.sincoId))) {
    if (/inactiv/i.test(row.name) || byMacro.has(row.macroSincoId)) continue;
    byMacro.set(row.macroSincoId, row.documentId);
  }
  return byMacro;
}

async function loadBrochures(sheet) {
  for (const p of sheet) {
    if (!p.brochure) continue;
    const slug = slugify(p.name);
    const json = await api(`projects?status=draft&filters[slug][$eq]=${slug}&populate[brochure]=true`);
    const project = json.data[0];
    if (!project) {
      console.log(`  ${p.name}: no está en el CMS`);
      continue;
    }
    if (project.brochure) continue;
    const published = await api(`projects?filters[slug][$eq]=${slug}&fields[0]=slug`);
    const status = published.data.length > 0 ? "published" : "draft";
    console.log(`  ${p.name}: subir brochure (${status})`);
    if (!APPLY) continue;
    const brochure = await media(p.brochure, `${p.name} brochure`);
    if (brochure) await send("PUT", `projects/${project.documentId}?status=${status}`, { brochure });
  }
  if (tooBig.length) console.log(`\nSin subir, pasan de ${MAX_BYTES / 1024 / 1024} MB: ${tooBig.join(", ")}`);
}

async function main() {
  if (!fs.existsSync(CSV)) {
    console.error(`No existe ${path.relative(appDir, CSV)}: descarga la hoja como CSV ahí.`);
    process.exit(1);
  }
  const sheet = readSheet();
  const unknownCity = sheet.filter((p) => !CITIES.some((c) => c.slug === p.citySlug));
  if (unknownCity.length) {
    throw new Error(`Ciudad fuera de la lista: ${unknownCity.map((p) => `${p.name} (${p.citySlug})`).join(", ")}`);
  }

  console.log(`${APPLY ? "CARGANDO" : "SIMULACIÓN"} contra ${URL_BASE} — ${sheet.length} proyectos\n`);
  if (ONLY_BROCHURES) return loadBrochures(sheet);
  console.log("1. Borrado");
  await wipe();
  console.log("2. Ciudades");
  const cityIds = await upsertCities();

  console.log("3. Zonas y zonas comunes");
  const zoneIds = {};
  for (const key of new Set(sheet.filter((p) => p.zone).map((p) => `${p.citySlug}|${p.zone}`))) {
    const [citySlug, name] = key.split("|");
    console.log(`  zona ${name} (${citySlug})`);
    if (!APPLY) continue;
    const saved = await send("POST", "zones?status=published", {
      name,
      slug: `${citySlug}-${slugify(name)}`,
      city: cityIds[citySlug],
    });
    zoneIds[key] = saved.data.documentId;
  }
  const amenityIds = {};
  const amenityNames = new Map();
  for (const name of sheet.flatMap((p) => p.amenities)) {
    if (!amenityNames.has(norm(name))) amenityNames.set(norm(name), name);
  }
  console.log(`  ${amenityNames.size} zonas comunes`);
  if (APPLY) {
    for (const [key, name] of amenityNames) {
      const saved = await send("POST", "amenities", { name, iconKey: iconFor(name) });
      amenityIds[key] = saved.data.documentId;
    }
  }

  console.log("4-5. Proyectos");
  const towers = await sincoTowers();
  const created = [];
  const drafts = [];
  const noSinco = [];
  for (const p of sheet) {
    const listing = p.url ? await scrapeListing(p.url) : null;
    const tower = p.macros.map((m) => towers.get(m)).find(Boolean) ?? null;
    if (!tower) noSinco.push(p.name);
    const images = listing?.gallery.length ?? 0;
    console.log(
      `  ${p.name} · ${p.citySlug} · ${images} fotos · ${listing?.plans.length ?? 0} planos · ` +
        `${tower ? "Sinco ok" : "sin Sinco"}${listing ? "" : " · SIN FICHA"}`,
    );
    if (!APPLY) {
      if (images === 0) drafts.push(p.name);
      continue;
    }

    const gallery = [];
    for (const url of listing?.gallery ?? []) {
      const id = await media(url, p.name);
      if (id) gallery.push(id);
    }
    const plan = await media(listing?.plans[0], `${p.name} planta`);
    const data = {
      name: p.name,
      slug: slugify(p.name),
      stage: "sale",
      city: cityIds[p.citySlug],
      zone: p.zone ? zoneIds[`${p.citySlug}|${p.zone}`] : null,
      neighborhood: p.neighborhood,
      description: paragraphs(p.description),
      priceFromCOP: p.price,
      logo: await media(listing?.logo, `${p.name} logo`),
      gallery,
      heroDesktop: gallery[0] ?? null,
      heroMobile: gallery[0] ?? null,
      brochure: await media(p.brochure, `${p.name} brochure`),
      video: p.video,
      tour360Url: p.tour,
      amenities: [...new Set(p.amenities.map((a) => amenityIds[norm(a)]))].filter(Boolean),
      sincoProject: tower,
      unitTypes: [
        {
          name: "Apartamento tipo",
          builtAreaM2: p.built,
          privateAreaM2: p.privateArea,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          priceCOP: p.price,
          floorPlan: plan,
        },
      ],
      specSheet: { towers: p.towers, apartments: p.apartments, deliveryYear: p.deliveryYear },
      location: p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng, address: p.address } : null,
      salesRoom: p.schedule || p.email ? { schedule: p.schedule, email: p.email } : null,
    };

    // Sin foto no pasa la validación de publicación: se crea en borrador.
    const publish = gallery.length > 0;
    const saved = await send("POST", `projects?status=${publish ? "published" : "draft"}`, data);
    created.push({ documentId: saved.data.documentId, citySlug: p.citySlug, publish });
    if (publish) await enableSlug(data.slug);
    if (!publish) drafts.push(p.name);
  }

  if (APPLY) {
    console.log("6. Recomendados (misma ciudad)");
    for (const project of created) {
      const recommended = created
        .filter((o) => o !== project && o.citySlug === project.citySlug && o.publish)
        .slice(0, 3)
        .map((o) => o.documentId);
      if (recommended.length === 0) continue;
      await send(
        "PUT",
        `projects/${project.documentId}?status=${project.publish ? "published" : "draft"}`,
        { recommended },
      );
    }
  }

  console.log("");
  if (drafts.length) console.log(`En borrador (sin fotos): ${drafts.join(", ")}`);
  if (tooBig.length) {
    console.log(`Sin subir, pasan de ${MAX_BYTES / 1024 / 1024} MB: ${tooBig.join(", ")}`);
  }
  if (noSinco.length) console.log(`Sin proyecto de Sinco (sus leads no llegan al CRM): ${noSinco.join(", ")}`);
  if (APPLY) {
    // Los borrados sí disparan el deploy hook, pero con debounce: ese build
    // pudo salir con la carga a medias, y las publicaciones por REST no lo
    // vuelven a disparar.
    console.log("\nListo. Relanza el deploy de producción en Vercel para que el sitio lo tome.");
  } else console.log("\nNada escrito. Repite con --yes para cargar.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
