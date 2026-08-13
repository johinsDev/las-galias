/**
 * Repone las imágenes cuyo archivo ya no existe en disco.
 *
 * Por qué hace falta: el servicio `cms` corrió durante un tiempo SIN volumen,
 * así que el proveedor local escribía los archivos dentro del contenedor y cada
 * despliegue —que reemplaza el contenedor— se los llevaba por delante. En la
 * base quedaron los registros de media, y en el sitio quedaron los cuadros
 * rotos. Los archivos originales no se pueden recuperar.
 *
 * Lo que hace es regenerar un SVG en la MISMA ruta (`uploads/<hash><ext>`) con
 * el mismo tamaño y la etiqueta que ya tenía el registro. Al no crear media
 * nueva, no hay que volver a enlazar nada: proyectos, banners y artículos
 * siguen apuntando a los mismos IDs y el sitio deja de verse roto en cuanto se
 * reconstruye.
 *
 * Es idempotente y NO toca los archivos que sí existen: un archivo presente es
 * una imagen real que alguien subió, y pisarla sería borrar trabajo.
 *
 * Uso (dentro de la instancia):
 *   docker compose exec cms node scripts/fix-missing-images.cjs
 * Añade `--dry-run` para solo listar lo que falta.
 */
const fs = require("node:fs");
const path = require("node:path");

const appDir = path.resolve(__dirname, "..");
process.chdir(appDir);
require("dotenv").config({ path: ".env" });

const { createStrapi } = require("@strapi/strapi");

const DRY_RUN = process.argv.includes("--dry-run");
const UPLOAD_DIR = path.join(appDir, "public", "uploads");

// Las mismas del seed, para que lo repuesto no desentone con lo que ya había.
const PALETTES = [
  ["#1e5631", "#8fbf9f"],
  ["#d9b45b", "#faf5e6"],
  ["#14351f", "#2e7d46"],
  ["#a9714b", "#e8cdb5"],
  ["#4a7ba6", "#cfe3f2"],
  ["#5b6660", "#d4d4c8"],
];

/** Misma imagen para el mismo nombre en cada corrida, y variedad entre nombres. */
function paletteFor(name) {
  let sum = 0;
  for (const char of name) sum += char.charCodeAt(0);
  return PALETTES[sum % PALETTES.length];
}

function svg({ width, height, label, palette }) {
  const [from, to] = palette;
  const size = Math.max(14, Math.round(height / 12));
  const text = String(label ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <text x="50%" y="50%" fill="rgba(255,255,255,0.85)" font-family="sans-serif" font-size="${size}" font-weight="700" text-anchor="middle" dominant-baseline="middle">${text}</text>
</svg>`;
}

async function main() {
  const app = await createStrapi({ appDir, distDir: path.join(appDir, "dist") }).load();

  try {
    const files = await app.db.query("plugin::upload.file").findMany({ limit: 5000 });
    let missing = 0;
    let repaired = 0;

    for (const file of files) {
      // Solo el proveedor local guarda rutas relativas; si algún día se pasa a
      // S3 las URL son absolutas y ahí no hay nada que reponer desde aquí.
      if (!file.url || !file.url.startsWith("/uploads/")) continue;

      const onDisk = path.join(UPLOAD_DIR, path.basename(file.url));
      if (fs.existsSync(onDisk)) continue;

      missing += 1;
      const label = file.alternativeText || file.name || "Las Galias";
      const body = svg({
        width: file.width || 1600,
        height: file.height || 900,
        label,
        palette: paletteFor(file.hash || file.name || ""),
      });

      console.log(`${DRY_RUN ? "falta" : "repuesta"}: ${file.url} (${label})`);
      if (DRY_RUN) continue;

      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      fs.writeFileSync(onDisk, body);
      // El tamaño se guarda en KB con un decimal, igual que lo escribe Strapi.
      await app.db.query("plugin::upload.file").update({
        where: { id: file.id },
        data: {
          mime: "image/svg+xml",
          ext: path.extname(onDisk),
          size: Math.round((Buffer.byteLength(body) / 1024) * 10) / 10,
          // Las miniaturas apuntaban a archivos que tampoco existen; un SVG no
          // las necesita y dejarlas colgadas volvería a romper las tarjetas.
          formats: null,
        },
      });
      repaired += 1;
    }

    console.log(
      `[imágenes] ${files.length} registros · ${missing} sin archivo · ${repaired} repuestas`,
    );
    if (missing > 0 && !DRY_RUN) {
      console.log("Publica cualquier contenido (o dispara el hook) para reconstruir el sitio.");
    }
  } finally {
    await app.destroy();
  }
}

main().catch((err) => {
  console.error("[imágenes] falló:", err);
  process.exit(1);
});
