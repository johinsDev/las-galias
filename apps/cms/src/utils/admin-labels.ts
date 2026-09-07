import type { Core } from "@strapi/strapi";

import { componentKey, contentTypeKey, type StoredConfig, updateStoredConfig } from "./admin-store";

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
    // Cabeceras de sección: no son campos, son los títulos plegables del
    // formulario. La descripción es lo que se lee bajo el título.
    sectionLocation: {
      label: "Ubicación",
      description:
        "Ciudad, zona y barrio son el rastro que se muestra; el mapa es lo que se pinta.",
    },
    sectionPricing: {
      label: "Precio y Sinco",
      description: "Lo que muestra el sitio y de dónde sale. Congelar impide que el ERP lo cambie.",
    },
    sectionContent: {
      label: "Contenido y medios",
      description: "Lo que se lee y se ve en la página del proyecto.",
    },
    sectionProduct: {
      label: "Ficha del producto",
      description: "Tipologías, zonas comunes, ficha técnica, financiación y sala de ventas.",
    },
    sectionRelated: {
      label: "Relacionados y SEO",
      description: "Qué se ofrece después de este proyecto y cómo se comparte la página.",
    },
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
    brochure: {
      label: "Brochure",
      description: "PDF descargable. Sale como pestaña propia en la galería.",
    },
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
    incomeRange: { label: "Rango de ingresos" },
    residenceCity: { label: "Ciudad de residencia" },
    severance: { label: "Cesantías" },
    savingsRange: { label: "Ahorros disponibles" },
    firstHome: {
      label: "¿Primera vivienda?",
      description: "Vacío significa que no lo respondió, que no es lo mismo que un no.",
    },
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
  "api::newsletter-subscriber.newsletter-subscriber": {
    email: { label: "Correo" },
    source: { label: "Origen", description: "El artículo desde el que se suscribió." },
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
  "api::city.city": {
    name: { label: "Nombre" },
    slug: { label: "URL (slug)" },
    department: { label: "Departamento" },
    image: { label: "Imagen" },
    projects: { label: "Proyectos" },
  },
  "api::macroproject.macroproject": {
    name: { label: "Nombre" },
    slug: { label: "URL (slug)" },
    description: { label: "Descripción" },
    city: { label: "Ciudad" },
    gallery: { label: "Galería" },
    location: { label: "Ubicación" },
    pointsOfInterest: { label: "Puntos de interés" },
  },
  "api::point-of-interest.point-of-interest": {
    name: { label: "Nombre" },
    category: { label: "Categoría" },
    distanceText: { label: "Distancia", description: "Texto libre: «5 min», «800 m»." },
    macroproject: { label: "Macroproyecto" },
  },
  "api::amenity.amenity": {
    name: { label: "Nombre" },
    iconKey: {
      label: "Ícono",
      description: "Ícono del sitio. Es el que se puede pintar del color de abajo.",
    },
    iconColor: {
      label: "Color del ícono",
      description: "Hexadecimal, por ejemplo #C8102E. Vacío usa el color por defecto del sitio.",
    },
    icon: {
      label: "Ícono propio (archivo)",
      description:
        "Solo se usa si arriba no elegiste ícono. Un SVG se puede pintar con el color; un PNG o JPG no.",
    },
    description: { label: "Descripción" },
    projects: { label: "Proyectos" },
  },
  "api::home-banner.home-banner": {
    title: { label: "Título" },
    desktopImage: { label: "Imagen (escritorio)" },
    mobileImage: { label: "Imagen (móvil)" },
    link: { label: "Enlace" },
    ctaLabel: {
      label: "Texto del botón",
      description: "El botón sobre la imagen. Vacío no pinta botón, solo la imagen enlazada.",
    },
    order: { label: "Orden" },
    active: { label: "Activo" },
  },
  "api::redirect.redirect": {
    from: { label: "Desde", description: "Ruta vieja, por ejemplo /proyectos/nombre-anterior." },
    to: { label: "Hacia" },
    permanent: { label: "Permanente (301)" },
    enabled: { label: "Activa" },
    source: { label: "Origen", description: "«auto-unpublish» la creó el sistema al despublicar." },
  },
  "api::calculator-config.calculator-config": {
    annualInterestRate: { label: "Tasa de interés E.A. (%)" },
    maxTermYears: { label: "Plazo máximo (años)" },
    maxFinancingPercent: { label: "Financiación máxima (%)" },
    leasingFinancingPercent: {
      label: "Financiación máxima leasing (%)",
      description: "El leasing habitacional suele financiar más que el crédito hipotecario.",
    },
    visFinancingPercent: {
      label: "Financiación máxima VIS (%)",
      description: "Con esto el simulador de capacidad estima «vivienda VIS desde ~$X».",
    },
    maxIncomeRatioPercent: {
      label: "Tope de endeudamiento (%)",
      description: "El simulador de crédito avisa cuando la cuota supera este % del ingreso.",
    },
    paymentIncomeRatioPercent: {
      label: "% del ingreso disponible para la cuota",
      description: "Regla general con la que el simulador recomienda la cuota máxima.",
    },
  },
  "api::lead-form-config.lead-form-config": {
    sectionOptions: {
      label: "Opciones de los desplegables",
      description:
        "Las comparten el formulario de la ficha de proyecto y la banda de asesoría. Cada línea es una opción y se guarda en el lead tal cual está escrita.",
    },
    incomeRanges: { label: "Rango de ingresos" },
    savingsRanges: { label: "Ahorros disponibles" },
    severanceOptions: {
      label: "Cesantías",
      description: "Normalmente «Sí», «No» y «No estoy seguro».",
    },
    residenceCities: { label: "Ciudad de residencia" },
    sectionAdvice: {
      label: "Banda «Recibe una asesoría personalizada»",
      description: "El texto que acompaña al formulario al pie de la ficha de proyecto.",
    },
    adviceEyebrow: { label: "Antetítulo" },
    adviceTitle: { label: "Título" },
    adviceBody: { label: "Texto" },
  },
  "api::faq-bot-config.faq-bot-config": {
    enabled: {
      label: "Asistente encendido",
      description: "Apagado, el sitio no muestra la caja de preguntas y el bot no responde.",
    },
    model: {
      label: "Modelo",
      description: "Haiku es el más barato; Sonnet y Opus responden mejor y cuestan más.",
    },
    maxAnswerTokens: {
      label: "Largo máximo de la respuesta",
      description: "En tokens. 400 ≈ dos párrafos cortos. Subirlo encarece cada pregunta.",
    },
    organizationContext: {
      label: "Contexto de la empresa",
      description: "Quiénes somos, cómo es el proceso de compra, el tono. El bot lo lee tal cual.",
    },
    promptExtra: {
      label: "Indicaciones adicionales",
      description:
        "Reglas extra para el bot. Las reglas de seguridad (no inventar precios) están en el código y no se pueden quitar desde aquí.",
    },
    fallbackMessage: {
      label: "Mensaje de reserva",
      description: "Lo que responde si está apagado, si se acabó el tope del día o si algo falla.",
    },
    suggestedQuestions: {
      label: "Preguntas sugeridas",
      description: "Aparecen como botones debajo de la caja de texto.",
    },
    dailyQuestionCap: {
      label: "Tope de preguntas por día",
      description:
        "Cuántas preguntas al día puede contestar el modelo entre TODOS los visitantes. Es el techo de la factura diaria. Las repetidas no cuentan: salen del caché.",
    },
    ratePerIpPerHour: {
      label: "Preguntas por visitante y hora",
      description: "Evita que una sola persona dispare el gasto.",
    },
  },
  "api::faq-bot-question.faq-bot-question": {
    question: { label: "Pregunta" },
    answer: { label: "Respuesta" },
    cacheKey: { label: "Clave de caché", description: "Solo lectura: agrupa preguntas iguales." },
    wasCached: {
      label: "Salió del caché",
      description: "Si está marcada, esta respuesta no costó nada.",
    },
    model: { label: "Modelo" },
    inputTokens: { label: "Tokens de entrada" },
    outputTokens: { label: "Tokens de salida" },
    cacheReadTokens: {
      label: "Tokens leídos de caché",
      description: "En cero significa que el caché del modelo no se está activando.",
    },
    askedAt: { label: "Cuándo se preguntó" },
  },
  "api::exchange-rate.exchange-rate": {
    copPerUsd: { label: "COP por USD" },
    copPerEur: { label: "COP por EUR" },
    usdSource: { label: "Fuente USD" },
    eurSource: { label: "Fuente EUR" },
    validFrom: { label: "Vigente desde" },
    fetchedAt: { label: "Consultada el" },
  },
  "api::home-page.home-page": {
    sectionHero: {
      label: "Portada",
      description:
        "La franja roja de arriba. El buscador manda a /proyectos; aquí solo se escribe lo que dice.",
    },
    heroEyebrow: { label: "Antetítulo" },
    heroTitle: { label: "Título principal" },
    heroSubtitle: { label: "Subtítulo", description: "Un salto de línea se respeta." },
    searchPlaceholder: { label: "Texto guía del buscador" },
    sectionSteps: {
      label: "Comprar es muy fácil",
      description: "Los tres pasos con foto. El número sale del orden, no se escribe.",
    },
    stepsEyebrow: { label: "Antetítulo" },
    stepsTitle: { label: "Título" },
    steps: { label: "Pasos" },
    sectionTools: {
      label: "Planea tu compra",
      description: "Los atajos a los simuladores.",
    },
    toolsEyebrow: { label: "Antetítulo" },
    toolsTitle: { label: "Título" },
    tools: { label: "Tarjetas" },
    sectionStats: {
      label: "Cifras",
      description: "La banda de indicadores. Si se deja vacía, la banda no se pinta.",
    },
    stats: { label: "Cifras" },
    sectionBlog: {
      label: "Blog",
      description:
        "Solo los títulos: los tres artículos salen del blog, siempre los más recientes.",
    },
    blogEyebrow: { label: "Antetítulo" },
    blogTitle: { label: "Título" },
    sectionCta: { label: "Cierre", description: "La última llamada a la acción de la página." },
    ctaTitle: { label: "Título" },
    ctaBody: { label: "Texto" },
    ctaLabel: { label: "Texto del botón" },
    ctaHref: { label: "Enlace del botón" },
    sectionSeo: { label: "SEO" },
    seo: { label: "SEO" },
  },
  "api::foreign-buyer-page.foreign-buyer-page": {
    eyebrow: { label: "Antetítulo" },
    heroTitle: { label: "Título principal" },
    heroSubtitle: { label: "Subtítulo" },
    heroImage: { label: "Imagen principal" },
    heroCtaLabel: { label: "Texto del botón" },
    trustBadges: { label: "Sellos de confianza" },
    stepsTitle: { label: "Título del paso a paso" },
    steps: { label: "Pasos" },
    priceDisclaimer: { label: "Aviso sobre los precios" },
    formTitle: { label: "Título del formulario" },
    formBody: { label: "Texto del formulario" },
    formBullets: { label: "Viñetas del formulario" },
    seo: { label: "SEO" },
  },
  "api::post.post": {
    title: { label: "Título" },
    slug: { label: "URL (slug)" },
    excerpt: { label: "Resumen" },
    category: { label: "Categoría", description: "También es el filtro del listado del blog." },
    featured: {
      label: "Artículo destacado",
      description: "Lo sube al bloque grande de /blog. Si hay varios, gana el más reciente.",
    },
    author: { label: "Autor", description: "Vacío firma como «equipo editorial Galias»." },
    authorRole: { label: "Cargo del autor", description: "e.g. «Equipo editorial»." },
    highlights: {
      label: "Cifras del artículo",
      description: "Se dibujan bajo el cuerpo: el editor de texto no puede alojarlas dentro.",
    },
    tags: { label: "Etiquetas", description: "Píldoras al pie. Son texto: no filtran nada." },
    readingMinutes: {
      label: "Minutos de lectura",
      description: "Vacío se calcula solo a partir del contenido.",
    },
    publishedOn: { label: "Fecha editorial", description: "La que se muestra en la card." },
    cover: { label: "Portada" },
    content: { label: "Contenido" },
    seo: { label: "SEO" },
  },
  "api::legal-document.legal-document": {
    sectionIdentity: {
      label: "Identificación",
      description: "Cómo aparece el documento en la lista de /legales.",
    },
    title: { label: "Título" },
    slug: {
      label: "URL",
      description: "Se publica en /legales/… Cambiarlo rompe los enlaces que ya circulan.",
    },
    order: { label: "Orden", description: "Menor primero. Define el orden de las pestañas." },
    sectionContent: { label: "Contenido" },
    effectiveDate: {
      label: "Última actualización",
      description: "La fecha que se muestra al inicio del documento.",
    },
    body: {
      label: "Texto del documento",
      description: "Los títulos de nivel 2 arman el índice lateral automáticamente.",
    },
    sectionSeo: { label: "SEO" },
    seo: { label: "SEO" },
  },
  "api::pqr.pqr": {
    sectionTicket: {
      label: "Radicación",
      description: "Lo asigna el sistema al recibir la solicitud.",
    },
    radicado: { label: "Radicado" },
    type: { label: "Tipo de solicitud" },
    status: { label: "Estado" },
    responseDueAt: {
      label: "Responder antes de",
      description: "15 días hábiles desde la radicación (Ley 1755 de 2015). No descuenta festivos.",
    },
    sectionRequester: { label: "Solicitante" },
    name: { label: "Nombre" },
    email: { label: "Correo" },
    phone: { label: "Teléfono" },
    documentNumber: { label: "Documento de identidad" },
    sectionRequest: { label: "Solicitud" },
    subject: { label: "Asunto" },
    message: { label: "Mensaje" },
    project: { label: "Proyecto" },
    tower: { label: "Torre o etapa" },
    unit: { label: "Apartamento o casa" },
    deliveredAt: { label: "Fecha de entrega" },
    attachments: { label: "Adjuntos" },
    acceptsDataPolicy: { label: "Aceptó la política de datos" },
    sectionInternal: { label: "Gestión interna" },
    notifiedAt: {
      label: "Notificado el",
      description: "Vacío significa que el correo de aviso no salió.",
    },
    internalNotes: { label: "Notas internas", description: "No se le muestran al solicitante." },
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
    email: { label: "Correo" },
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
  "page.list-item": { text: { label: "Texto" } },
  "page.illustrated-step": {
    title: { label: "Título" },
    body: { label: "Texto" },
    image: { label: "Foto" },
  },
  "page.tool-card": {
    title: { label: "Título" },
    body: { label: "Texto" },
    href: { label: "Enlace", description: "Por ejemplo /simuladores/credito-hipotecario." },
    iconKey: { label: "Icono" },
  },
  "page.stat": {
    value: { label: "Cifra", description: "Tal cual se lee: «+30.000», «#1», «30 años»." },
    label: { label: "Etiqueta" },
  },
};

/** Merges the labels into one stored configuration; returns true if it changed. */
function mergeLabels(config: StoredConfig, labels: FieldLabels): boolean {
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
      const key = contentTypeKey(uid);
      if (await updateStoredConfig(strapi, key, (config) => mergeLabels(config, labels)))
        updated += 1;
    }
    for (const [uid, labels] of Object.entries(COMPONENTS)) {
      const key = componentKey(uid);
      if (await updateStoredConfig(strapi, key, (config) => mergeLabels(config, labels)))
        updated += 1;
    }
    if (updated > 0) strapi.log.info(`Admin labels in Spanish applied to ${updated} type(s)`);
  } catch (err) {
    strapi.log.warn(`Could not apply Spanish admin labels: ${String(err)}`);
  }
}
