/**
 * Reconocimiento del API Sinco CBR/CRM — solo lecturas.
 *
 * Autentica, recorre los endpoints que nos interesan y vuelca lo que devuelve
 * la instancia real. Sirve para responder, sin depender de Sinco, qué
 * macroproyectos/proyectos existen, qué valores toman los catálogos y qué
 * campos vienen realmente poblados (el spec declara muchos más de los que la
 * instancia llena).
 *
 *   set -a && source .sinco.env && set +a
 *   bun run scripts/sinco-discover.ts [ruta-del-volcado.json]
 *
 * Variables: SINCO_BASE_URL, SINCO_USER, SINCO_PASSWORD y, solo si el login
 * responde 300 (varias BD), SINCO_ID_ORIGEN / SINCO_ID_EMPRESA / SINCO_ID_SUCURSAL.
 * Nunca imprime credenciales ni tokens.
 */

const baseUrl = (process.env.SINCO_BASE_URL ?? "").replace(/\/+$/, "");
const usuario = process.env.SINCO_USER ?? "";
const clave = process.env.SINCO_PASSWORD ?? "";
const idSucursal = process.env.SINCO_ID_SUCURSAL ?? "1";

if (!baseUrl || !usuario || !clave) {
  console.error("Faltan SINCO_BASE_URL, SINCO_USER o SINCO_PASSWORD en el entorno.");
  process.exit(1);
}

const authBase = `${baseUrl}/V3/API`;
const apiBase = `${baseUrl}/V3/CBRClientes/API`;

interface Empresa {
  IdOrigen: number;
  IdEmpresa: number;
  Nombre?: string;
  Estado?: boolean;
}

/** Login. HTTP 200 → el token ya sirve. HTTP 300 → hay varias BD, hay que elegir. */
async function authenticate(): Promise<string> {
  const res = await fetch(`${authBase}/Auth/Usuario`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ NomUsuario: usuario, ClaveUsuario: clave }),
  });
  const body = (await res.json()) as { access_token?: string; data?: { bdIngreso?: number[] } };
  const token = body.access_token;
  if (!token) throw new Error(`Login sin access_token (HTTP ${res.status})`);

  if (res.status !== 300) {
    console.log(`  login HTTP ${res.status} — una sola BD, token directo`);
    return token;
  }

  console.log(`  login HTTP 300 — BDs disponibles: ${body.data?.bdIngreso?.join(", ")}`);
  const empresasRes = await fetch(`${authBase}/Cliente/Empresas`, {
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
  });
  const empresas = (await empresasRes.json()) as Empresa[];
  console.log(
    `  empresas: ${empresas.map((e) => `${e.Nombre ?? "?"} (origen ${e.IdOrigen}/empresa ${e.IdEmpresa})`).join(" · ")}`,
  );

  const idOrigen = process.env.SINCO_ID_ORIGEN ?? String(empresas[0]?.IdOrigen ?? "");
  const idEmpresa = process.env.SINCO_ID_EMPRESA ?? String(empresas[0]?.IdEmpresa ?? "");
  if (!idOrigen || !idEmpresa) throw new Error("No se pudo determinar idOrigen/idEmpresa");
  if (empresas.length > 1 && !process.env.SINCO_ID_EMPRESA) {
    console.log(`  ⚠ varias empresas y sin SINCO_ID_EMPRESA — usando la primera`);
  }

  const sesionRes = await fetch(
    `${authBase}/Auth/Sesion/IniciarMovil/${idOrigen}/Empresa/${idEmpresa}/Sucursal/${idSucursal}`,
    { headers: { accept: "application/json", authorization: `Bearer ${token}` } },
  );
  const sesion = (await sesionRes.json()) as { access_token?: string };
  if (!sesion.access_token) throw new Error(`IniciarMovil sin token (HTTP ${sesionRes.status})`);
  console.log(`  sesión iniciada en origen ${idOrigen} / empresa ${idEmpresa}`);
  return sesion.access_token;
}

interface Probe {
  path: string;
  status: number;
  count: number | null;
  keys: string[];
  data: unknown;
  error?: string;
}

const results: Probe[] = [];

async function probe(token: string, path: string): Promise<unknown> {
  try {
    const res = await fetch(`${apiBase}${path}`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* algunos endpoints responden text/plain */
    }
    const count = Array.isArray(data) ? data.length : null;
    const sample = Array.isArray(data) ? data[0] : data;
    const keys = sample && typeof sample === "object" ? Object.keys(sample) : [];
    results.push({ path, status: res.status, count, keys, data });
    const shape = count === null ? "objeto" : `${count} ítems`;
    console.log(`  ${res.status === 200 ? "✓" : "✗"} ${res.status} ${path} → ${shape}`);
    return res.status === 200 ? data : null;
  } catch (err) {
    results.push({ path, status: 0, count: null, keys: [], data: null, error: String(err) });
    console.log(`  ✗ ERR ${path} → ${String(err)}`);
    return null;
  }
}

function idsOf(rows: unknown, field: string): (string | number)[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => (r as Record<string, unknown>)?.[field])
    .filter((v): v is string | number => typeof v === "string" || typeof v === "number");
}

console.log(`\nAmbiente: ${baseUrl}\n`);
console.log("→ Autenticación");
const token = await authenticate();

console.log("\n→ Macroproyectos");
const macros = await probe(token, "/Macroproyectos/Basica");
await probe(token, "/Macroproyectos/Externo");

console.log("\n→ Proyectos por macroproyecto");
const macroIds = idsOf(macros, "id").length ? idsOf(macros, "id") : idsOf(macros, "Id");
const proyectoIds: (string | number)[] = [];
for (const idMacro of macroIds.slice(0, 5)) {
  const proyectos = await probe(token, `/Proyectos/${idMacro}`);
  const ids = idsOf(proyectos, "id").length ? idsOf(proyectos, "id") : idsOf(proyectos, "Id");
  proyectoIds.push(...ids);
}

console.log("\n→ Unidades y tipologías (primeros 3 proyectos)");
for (const idProyecto of proyectoIds.slice(0, 3)) {
  await probe(token, `/Unidades/PorProyecto/${idProyecto}`);
  await probe(token, `/TipoInmueble/IdProyecto/${idProyecto}`);
}

console.log("\n→ Catálogos de sala de ventas");
for (const path of [
  "/SalaVentas/OrigenesInformacion",
  "/SalaVentas/MediosPublicitarios",
  "/SalaVentas/TiposLeads/Visitas",
  "/SalaVentas/Vendedores",
  "/TiposIdentificacion",
  "/Paises",
]) {
  await probe(token, path);
}

const dumpPath = process.argv[2] ?? "sinco-discovery.json";
await Bun.write(dumpPath, JSON.stringify({ baseUrl, results }, null, 2));

const ok = results.filter((r) => r.status === 200).length;
console.log(`\n${ok}/${results.length} endpoints OK. Volcado completo → ${dumpPath}\n`);
