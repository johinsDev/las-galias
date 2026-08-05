import type { Core } from "@strapi/strapi";

/**
 * Spanish labels for the admin, as code.
 *
 * The Content Manager keeps field labels in the core store, which means the
 * usual way to translate them — "Configure the view" in the UI — lives only in
 * that environment's database. Every new stage would come up in English again.
 * Declaring them here applies the same labels on every boot, everywhere.
 *
 * Only the label and the help text change; attribute names stay as they are,
 * because they are the API contract the website reads.
 */

type FieldLabels = Record<string, { label: string; description?: string }>;

const CONTENT_TYPES: Record<string, FieldLabels> = {
  "api::project.project": {
    name: { label: "Nombre" },
    slug: {
      label: "URL (slug)",
      description: "Se genera del nombre. Cambiarlo rompe el enlace publicado.",
    },
    stage: {
      label: "Etapa",
      description:
        "«expectation» publica con menos campos; «sale» exige precio, tipologías y galería.",
    },
    syncFromSinco: {
      label: "Sincronizar desde Sinco",
      description: "Si está apagado, Sinco nunca toca este proyecto, aunque tenga ID de Sinco.",
    },
    sincoProject: {
      label: "ID de Sinco",
      description: "A qué proyecto del ERP corresponde. Sin esto, sus leads no llegan al CRM.",
    },
    constructionStatus: {
      label: "Estado de obra",
      description: "Dato nuestro: Sinco no lo tiene.",
    },
    appliesSubsidy: { label: "Aplica subsidio" },
    lastUnits: { label: "Últimas unidades" },
    hasDiscount: { label: "Tiene descuento" },
    logo: { label: "Logo del proyecto" },
    description: { label: "Descripción" },
    priceFromCOP: {
      label: "Precio desde (COP)",
      description:
        "Lo que muestra el sitio. Sinco lo actualiza salvo que el precio esté congelado.",
    },
    priceLocked: {
      label: "Congelar precio",
      description: "Impide que una sincronización con Sinco cambie el precio de arriba.",
    },
    priceFromSincoCOP: {
      label: "Precio según Sinco (COP)",
      description: "Solo lectura: lo que dice el ERP, para poder comparar.",
    },
    city: { label: "Ciudad" },
    zone: { label: "Zona", description: "Segundo nivel: Bogotá · Norte · San Antonio." },
    neighborhood: { label: "Barrio", description: "Tercer nivel del rastro de ubicación." },
    macroproject: {
      label: "Macroproyecto",
      description: "Agrupación nuestra para puntos de interés. No es el macroproyecto de Sinco.",
    },
    amenities: { label: "Zonas comunes" },
    recommended: { label: "Proyectos similares", description: "Deben ser de la misma ciudad." },
    unitTypes: { label: "Tipologías" },
    gallery: { label: "Galería" },
    heroDesktop: { label: "Imagen principal (escritorio)" },
    heroMobile: { label: "Imagen principal (móvil)" },
    location: { label: "Ubicación" },
    video: { label: "Video" },
    tour360Url: { label: "Recorrido 360°", description: "URL para incrustar." },
    constructionProgress: { label: "Avance de obra", description: "Un video por mes." },
    specSheet: { label: "Ficha técnica" },
    financing: { label: "Financiación y fiducia" },
    salesRoom: { label: "Sala de ventas" },
    seo: { label: "SEO" },
  },
  "api::sinco-project.sinco-project": {
    label: { label: "Etiqueta" },
    name: { label: "Nombre en Sinco" },
    sincoId: { label: "ID del proyecto" },
    macroSincoId: {
      label: "ID del macroproyecto",
      description: "El CRM rechaza una visita sin este id.",
    },
    macroName: { label: "Macroproyecto en Sinco" },
    lastSyncedAt: { label: "Última sincronización" },
  },
  "api::lead.lead": {
    name: { label: "Nombre" },
    email: { label: "Correo" },
    phone: { label: "Celular" },
    residenceCountry: { label: "País de residencia" },
    message: { label: "Mensaje" },
    project: { label: "Proyecto" },
    source: { label: "Origen" },
    acceptsDataPolicy: { label: "Acepta política de datos" },
    acceptsEmail: { label: "Autoriza correo" },
    acceptsSms: { label: "Autoriza SMS" },
    acceptsWhatsApp: { label: "Autoriza WhatsApp" },
    acceptsCall: { label: "Autoriza llamada" },
    crmStatus: {
      label: "Estado en el CRM",
      description: "pendiente · enviado · duplicado · falló · omitido (sin proyecto).",
    },
    crmVisitId: { label: "ID de visita en Sinco" },
    crmAttempts: { label: "Intentos de envío" },
    crmLastError: { label: "Último error" },
  },
  "api::zone.zone": {
    name: { label: "Nombre" },
    slug: { label: "URL (slug)" },
    city: { label: "Ciudad" },
  },
  "api::faq.faq": {
    question: { label: "Pregunta" },
    answer: { label: "Respuesta" },
    audience: {
      label: "Dónde se muestra",
      description: "«exterior» solo en la landing de compra desde el exterior.",
    },
    order: { label: "Orden" },
  },
  "api::job-run.job-run": {
    task: { label: "Tarea" },
    status: { label: "Resultado" },
    message: { label: "Detalle" },
    durationMs: { label: "Duración (ms)" },
    ranAt: { label: "Cuándo corrió" },
  },
  "api::post.post": {
    title: { label: "Título" },
    slug: { label: "URL (slug)" },
    excerpt: { label: "Resumen" },
    category: { label: "Categoría" },
    publishedOn: { label: "Fecha editorial", description: "La que se muestra en la card." },
    cover: { label: "Portada" },
    content: { label: "Contenido" },
    seo: { label: "SEO" },
  },
};

const COMPONENTS: Record<string, FieldLabels> = {
  "project.unit-type": {
    name: {
      label: "Nombre",
      description: "Sinco empareja por este nombre. Cambiarlo rompe la sincronización.",
    },
    builtAreaM2: { label: "Área construida (m²)" },
    privateAreaM2: { label: "Área privada (m²)" },
    bedrooms: { label: "Habitaciones" },
    bathrooms: { label: "Baños", description: "Dato nuestro: Sinco no tiene baños." },
    priceCOP: { label: "Precio (COP)" },
    floorPlan: { label: "Plano" },
  },
  "project.spec-sheet": {
    towers: { label: "Torres" },
    apartments: { label: "Apartamentos" },
    elevatorsPerTower: { label: "Ascensores por torre" },
    parking: { label: "Parqueadero" },
    stratum: { label: "Estrato" },
    deliveryYear: { label: "Año de entrega" },
  },
  "project.financing": {
    annualRatePct: { label: "Tasa E.A. (%)" },
    termYears: { label: "Plazo (años)" },
    downPaymentPct: { label: "Cuota inicial (%)" },
    builderInstallmentMonths: { label: "Meses de cuota constructora" },
    trusteeName: { label: "Fiduciaria" },
    trustNumber: { label: "N° de fideicomiso" },
    clientPortalUrl: { label: "Portal de pagos" },
  },
  "project.construction-progress": {
    label: { label: "Mes", description: "Como se ve en la pestaña: «Mayo 2025»." },
    date: { label: "Fecha", description: "Solo ordena; lo que se muestra es el texto de arriba." },
    video: { label: "Video" },
  },
  "project.sales-room": {
    schedule: { label: "Horario" },
    phone: { label: "Teléfono" },
    whatsappUrl: { label: "Enlace de WhatsApp" },
  },
  "shared.geo": {
    lat: { label: "Latitud" },
    lng: { label: "Longitud" },
    address: { label: "Dirección" },
  },
  "shared.seo": {
    metaTitle: { label: "Título SEO" },
    metaDescription: { label: "Descripción SEO" },
    ogImage: { label: "Imagen para compartir" },
  },
  "page.step": { title: { label: "Título" }, body: { label: "Texto" } },
};

interface StoredConfig {
  metadatas?: Record<string, { edit?: Record<string, unknown>; list?: Record<string, unknown> }>;
  [key: string]: unknown;
}

/** Merges the labels into one stored configuration; returns true if it changed. */
async function applyTo(strapi: Core.Strapi, key: string, labels: FieldLabels): Promise<boolean> {
  const store = strapi.db.query("strapi::core-store");
  const row = (await store.findOne({ where: { key } })) as { id: number; value: string } | null;
  if (!row) return false;

  let config: StoredConfig;
  try {
    config = JSON.parse(row.value) as StoredConfig;
  } catch {
    return false;
  }
  if (!config.metadatas) return false;

  let changed = false;
  for (const [field, { label, description }] of Object.entries(labels)) {
    const meta = config.metadatas[field];
    if (!meta) continue;
    if (meta.edit && meta.edit.label !== label) {
      meta.edit.label = label;
      if (description !== undefined) meta.edit.description = description;
      changed = true;
    }
    if (meta.list && meta.list.label !== label) {
      meta.list.label = label;
      changed = true;
    }
  }

  if (changed)
    await store.update({ where: { id: row.id }, data: { value: JSON.stringify(config) } });
  return changed;
}

/**
 * Idempotent: only writes when a label actually differs, so a normal boot does
 * no database work. Never throws — a cosmetic label must not stop Strapi.
 */
export async function applySpanishAdminLabels(strapi: Core.Strapi): Promise<void> {
  try {
    let updated = 0;
    for (const [uid, labels] of Object.entries(CONTENT_TYPES)) {
      const key = `plugin_content_manager_configuration_content_types::${uid}`;
      if (await applyTo(strapi, key, labels)) updated += 1;
    }
    for (const [uid, labels] of Object.entries(COMPONENTS)) {
      const key = `plugin_content_manager_configuration_components::${uid}`;
      if (await applyTo(strapi, key, labels)) updated += 1;
    }
    if (updated > 0) strapi.log.info(`Admin labels in Spanish applied to ${updated} type(s)`);
  } catch (err) {
    strapi.log.warn(`Could not apply Spanish admin labels: ${String(err)}`);
  }
}
