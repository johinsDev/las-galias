/**
 * What an editor sends a partner, in two wordings of the same contract: a
 * message for a person and a prompt for the partner's coding assistant. Both
 * carry the key, so either one is all the partner needs; the prompt recommends
 * an environment variable and says a hardcoded key works too.
 *
 * Built here and not in the admin component so the contract is worded in one
 * place and can be tested. It mirrors `ExternalLeadSchema` in
 * @lasgalias/schemas and the answers of utils/lead-integration.ts;
 * docs/leads-externos.md is the long version. Keep the three in step.
 */
interface PartnerContractInput {
  name: string;
  /** The full endpoint: `https://<cms>/api/leads/external/<slug>`. */
  url: string;
  ratePerMinute?: number | null;
  dailyCap?: number | null;
}

/** Field, type, whether it is required, and the rule it is validated with. */
const FIELDS: [name: string, type: string, required: boolean, rule: string][] = [
  ["name", "string", true, "Nombre completo. Entre 2 y 160 caracteres."],
  [
    "phone",
    "string",
    true,
    "Entre 7 y 15 dígitos, con o sin «+» e indicativo. Espacios, guiones, puntos y paréntesis se ignoran.",
  ],
  [
    "acceptsDataPolicy",
    "boolean",
    true,
    "Debe ser exactamente true: la persona aceptó la política de tratamiento de datos. Con false o sin el campo el lead se rechaza.",
  ],
  [
    "externalId",
    "string",
    false,
    "Su identificador del lead, hasta 120 caracteres. Recomendado: un reenvío con el mismo valor no crea otro lead.",
  ],
  ["email", "string", false, "Un correo válido."],
  ["message", "string", false, "Hasta 1000 caracteres."],
  [
    "project",
    "string",
    false,
    "El slug del proyecto, tal como lo devuelve el listado de proyectos (ver abajo). Si no existe, el lead se guarda igual, sin proyecto, y la respuesta trae un aviso en «warnings».",
  ],
  ["acceptsWhatsApp", "boolean", false, "La persona autorizó contacto por WhatsApp."],
  ["acceptsCall", "boolean", false, "La persona autorizó llamadas."],
  ["acceptsEmail", "boolean", false, "La persona autorizó correos."],
  ["acceptsSms", "boolean", false, "La persona autorizó SMS."],
  ["interestCity", "string", false, "Ciudad donde quiere comprar. Hasta 120 caracteres."],
  ["residenceCity", "string", false, "Ciudad donde vive. Hasta 120 caracteres."],
  ["budgetRange", "string", false, "Presupuesto, texto libre. Hasta 120 caracteres."],
  ["utmSource", "string", false, "Atribución de campaña. Hasta 120 caracteres."],
  ["utmMedium", "string", false, "Atribución de campaña. Hasta 120 caracteres."],
  ["utmCampaign", "string", false, "Atribución de campaña. Hasta 120 caracteres."],
];

const REQUEST_EXAMPLE = [
  "{",
  '  "externalId": "su-id-del-lead",',
  '  "name": "Ana María Pérez",',
  '  "phone": "+57 300 123 4567",',
  '  "email": "ana@example.com",',
  '  "message": "Quiere visitar la sala de ventas",',
  '  "project": "slug-del-proyecto",',
  '  "acceptsDataPolicy": true,',
  '  "acceptsWhatsApp": true,',
  '  "acceptsCall": true',
  "}",
];

/** Every answer the endpoint gives, with the exact body. */
const RESPONSES = [
  "201 Created — lead recibido:",
  '  { "data": { "id": "tcohjsbvqsj90fybxmhekrhd", "crmStatus": "pending", "duplicate": false } }',
  '  Puede traer además "warnings": ["Unknown project \\"x\\": the lead was stored without one"].',
  "200 OK — ya existía un lead con ese externalId; no se creó otro:",
  '  { "data": { "id": "tcohjsbvqsj90fybxmhekrhd", "crmStatus": "sent", "duplicate": true } }',
  "400 Bad Request — datos inválidos; «issues» dice qué campo y por qué:",
  '  { "error": { "status": 400, "message": "Invalid lead", "issues": [ { "field": "phone", "message": "Invalid format: ..." } ] } }',
  "401 Unauthorized — clave ausente o incorrecta:",
  '  { "error": { "status": 401, "message": "Invalid or missing API key" } }',
  "403 Forbidden — integración pausada, o IP u origen no autorizados:",
  '  { "error": { "status": 403, "message": "This integration is switched off" } }',
  "429 Too Many Requests — límite alcanzado; trae la cabecera Retry-After (segundos):",
  '  { "error": { "status": 429, "message": "Too many requests, slow down" } }',
];

const NOTES = [
  "- «id» es el identificador del lead en Las Galias; guárdenlo para conciliar.",
  "- «crmStatus» es informativo (pending, sent, duplicate, failed, unrouted, skipped): el envío al CRM ocurre después de responder.",
  '- Los campos vacíos ("" o null) cuentan como no enviados; cualquier campo que no esté en la lista se ignora.',
  "- La llamada debe salir de un servidor, nunca de un navegador: la clave quedaría expuesta.",
];

/** The companion endpoint: the slugs `project` accepts. */
function projectsLines(input: PartnerContractInput): string[] {
  return [
    `GET ${input.url}/projects (misma cabecera Authorization)`,
    "Devuelve los proyectos publicados y el slug que va en «project»:",
    '  { "data": [ { "slug": "brezza", "name": "Brezza", "city": "Bogotá", "type": "housing", "stage": "sale" } ] }',
    "«type» es housing (vivienda), lot (lote) o local (local comercial). Consúltenlo una vez al día o al configurar, no en cada lead: máximo 30 consultas por minuto.",
  ];
}

/**
 * How a partner keeps its access: the brakes of «Integración de leads» said
 * as advice, so nobody finds them out by being cut off.
 */
function goodPractice(input: PartnerContractInput): string[] {
  const limits = limitsLine(input);
  return [
    ...(limits ? [`- ${limits} Por encima la API responde 429.`] : []),
    "- Ante un 429, esperen los segundos de la cabecera Retry-After antes de reintentar. No insistan en bucle.",
    "- No reintenten un 400, 401 o 403: el mismo envío fallará igual. Corrijan el dato o la configuración.",
    "- Envíen cada lead una sola vez y siempre con «externalId»; un reintento con el mismo id no duplica.",
    "- No envíen leads de prueba ni datos inventados a esta URL sin avisarnos: llegan al equipo comercial.",
    "- Llamen solo desde su servidor y, si pueden, desde IP fijas: podemos restringir el acceso a ellas.",
    "- Todas las peticiones quedan registradas. Un volumen anormal o muchas rechazadas seguidas pueden llevar a pausar la integración o cambiar la clave.",
  ];
}

function fieldLines(): string[] {
  return FIELDS.map(
    ([name, type, required, rule]) =>
      `- ${name} (${type}, ${required ? "obligatorio" : "opcional"}): ${rule}`,
  );
}

function limitsLine(input: PartnerContractInput): string | null {
  const limits = [
    input.ratePerMinute ? `${input.ratePerMinute} peticiones por minuto` : null,
    input.dailyCap ? `${input.dailyCap} leads por día` : null,
  ].filter(Boolean);
  return limits.length > 0 ? `Límites: ${limits.join(" y ")}.` : null;
}

/** The message for a person, key included. */
export function buildPartnerInstructions(input: PartnerContractInput & { apiKey: string }): string {
  return [
    `Integración de leads · ${input.name} → Constructora Las Galias`,
    "",
    "Cada lead se envía con una petición POST desde su servidor:",
    "",
    `URL:     ${input.url}`,
    "Método:  POST",
    `Listado de proyectos (para saber qué slug enviar): GET ${input.url}/projects`,
    "Cabeceras:",
    `  Authorization: Bearer ${input.apiKey}`,
    "  Content-Type: application/json",
    "",
    "Cuerpo (JSON):",
    ...REQUEST_EXAMPLE,
    "",
    "Campos y validaciones:",
    ...fieldLines(),
    "",
    "Respuestas:",
    ...RESPONSES,
    "",
    "Listado de proyectos:",
    ...projectsLines(input),
    "",
    "A tener en cuenta:",
    ...NOTES,
    "",
    "Buenas prácticas (para que el acceso no se pause):",
    ...goodPractice(input),
    "",
    "Ejemplo:",
    `curl -X POST "${input.url}" \\`,
    `  -H "Authorization: Bearer ${input.apiKey}" \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '{"externalId":"prueba-1","name":"Lead de prueba","phone":"3001234567","acceptsDataPolicy":true}'`,
    "",
    "La clave es secreta: guárdenla como una contraseña y avísennos si se expone para cambiarla.",
  ].join("\n");
}

/**
 * The same contract as a prompt the partner pastes into its coding assistant.
 */
export function buildPartnerPrompt(input: PartnerContractInput & { apiKey: string }): string {
  return [
    `Necesito integrar el envío de leads de ${input.name} a la API de Constructora Las Galias. Implementa la integración en nuestro backend siguiendo este contrato al pie de la letra.`,
    "",
    "## Endpoints",
    `Enviar un lead:        POST ${input.url}`,
    `Listado de proyectos:  GET  ${input.url}/projects`,
    "",
    "## Envío de un lead",
    `POST ${input.url}`,
    "Cabeceras:",
    `  Authorization: Bearer ${input.apiKey}`,
    "  Content-Type: application/json",
    "Esa es la clave real. Recomendado: guárdala en la variable de entorno LAS_GALIAS_API_KEY y léela de ahí; si el proyecto no maneja variables de entorno puedes dejarla en una constante del backend. Lo que no puede pasar es que llegue al navegador o a un repositorio público: la llamada sale siempre de nuestro servidor.",
    "",
    "## Cuerpo de la petición (JSON)",
    ...REQUEST_EXAMPLE,
    "",
    "## Campos y validaciones",
    "Valida esto antes de enviar; la API rechaza con 400 lo que no lo cumpla.",
    ...fieldLines(),
    "",
    "## Respuestas",
    ...RESPONSES,
    "",
    "## Listado de proyectos",
    ...projectsLines(input),
    "Úsalo para mapear nuestros proyectos a su slug y guarda el resultado en caché.",
    "",
    "## Límites y buenas prácticas (incumplirlas puede hacer que nos pausen el acceso)",
    ...goodPractice(input),
    "",
    "## Reglas de la integración",
    ...NOTES,
    "- Envía siempre «externalId» con nuestro id del lead: así un reintento nunca duplica.",
    "- Trata 201 y 200 como éxito y guarda «data.id» junto a nuestro lead.",
    "- 400: no reintentes; registra «error.issues» para corregir el dato.",
    "- 401 y 403: no reintentes; registra el error y alerta, es un problema de configuración.",
    "- 429: reintenta después de los segundos de la cabecera Retry-After.",
    "- Error de red o 5xx: reintenta con espera exponencial (por ejemplo 1 min, 5 min, 30 min) y el mismo «externalId».",
    "- Nunca envíes un lead sin que la persona haya aceptado la política de tratamiento de datos.",
    "",
    "## Qué necesito de ti",
    "1. Una función que reciba nuestro lead, lo convierta a este cuerpo y lo valide.",
    "2. El cliente HTTP con el manejo de respuestas y los reintentos descritos.",
    "3. Tipos para la petición y para las respuestas de éxito y de error.",
    "4. Una función que consulte el listado de proyectos y lo deje en caché.",
    "5. Pruebas para: éxito (201), duplicado (200), validación (400), clave inválida (401) y límite (429).",
  ].join("\n");
}
