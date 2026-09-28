import type { LegalDocument } from "@lasgalias/schemas";

/**
 * «Tips para comprar», the buyer's guide the SIC ruling obliges the company to
 * publish. It is a legal document like the cartillas, but it has to exist
 * from day one, so this is its text (the one on galias.com.co, tidied) in
 * Strapi's blocks shape. The moment an editor publishes a legal document with
 * the same slug in the CMS, that one wins and this copy is not used
 * (lib/strapi.ts, `getLegalDocuments`).
 */
export const TIPS_PARA_COMPRAR: LegalDocument = {
  documentId: "built-in-tips-para-comprar",
  title: "Tips para comprar",
  slug: "tips-para-comprar",
  order: 99,
  effectiveDate: "2026-09-28",
  body: [
    {
      type: "heading",
      level: 2,
      children: [
        {
          type: "text",
          text: "¿Qué es vivienda VIS o VIP?",
        },
      ],
    },
    {
      type: "heading",
      level: 3,
      children: [
        {
          type: "text",
          text: "Vivienda VIS",
        },
      ],
    },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          text: "Es perfecta para todos aquellos que quieran comprar su primera vivienda o hacer su primera inversión. Este tipo incrementa el tope máximo de precio, lo que la hace más rentable: máximo 135 SMMLV en ciudades que no superan el millón de habitantes y máximo 150 SMMLV en ciudades que superan el millón de habitantes.",
        },
      ],
    },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          text: "Este tope mantiene los beneficios como subsidios, cesantías y financiación con entidades bancarias. Comprar bajo esta modalidad es mucho más fácil, ya que cuentas con la figura de financiación de hasta el 20 % de cuota inicial y 80 % de financiación del valor total del inmueble, lo que amplía tu plazo de pago (dependiendo de la capacidad de pago del cliente).",
        },
      ],
    },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          text: "Si tienes claros tus pagos podrás contar con la tasa de interés perfecta y todo estará bajo control.",
        },
      ],
    },
    {
      type: "heading",
      level: 3,
      children: [
        {
          type: "text",
          text: "Vivienda VIP",
        },
      ],
    },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          text: "Son proyectos de vivienda para familias con menores recursos; este tope es el más económico del sector. Este tipo de proyectos no puede superar los 90 salarios mínimos mensuales legales vigentes.",
        },
      ],
    },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          text: "Este tipo de proyectos aplica a subsidios de cajas de compensación. También podrás incluir las cesantías obtenidas por estar vinculado a una empresa, lo que reduce aún más la deuda total de compra.",
        },
      ],
    },
    {
      type: "heading",
      level: 2,
      children: [
        {
          type: "text",
          text: "Proceso de compra",
        },
      ],
    },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          text: "Durante el proceso de compra pasarás por las siguientes etapas:",
        },
      ],
    },
    {
      type: "list",
      format: "unordered",
      children: [
        {
          type: "list-item",
          children: [
            {
              type: "text",
              text: "Separación del inmueble",
            },
          ],
        },
        {
          type: "list-item",
          children: [
            {
              type: "text",
              text: "Pago de la cuota inicial",
            },
          ],
        },
        {
          type: "list-item",
          children: [
            {
              type: "text",
              text: "Pago restante con crédito hipotecario",
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      level: 3,
      children: [
        {
          type: "text",
          text: "Separación del inmueble",
        },
      ],
    },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          text: "Corresponde al valor que se deposita para confirmar la negociación de un inmueble. Con este se realiza la apertura del encargo fiduciario, que velará por el uso adecuado de los recursos de tu cuota y te dará la seguridad de que tu dinero estará rindiendo y bajo custodia de una entidad regulada durante todo el proceso, hasta culminar el negocio.",
        },
      ],
    },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          text: "El valor de la separación corresponde a alrededor del 0,5 % del valor del inmueble, así que podrás separar tu inmueble fácilmente con el dinero que tengas ahorrado. Nuestros valores de separación están entre los $400.000 y los $800.000 pesos según el proyecto que escojas. Con este pago ya tendrías un apartamento reservado y con el respaldo de un encargo fiduciario.",
        },
      ],
    },
    {
      type: "heading",
      level: 3,
      children: [
        {
          type: "text",
          text: "Pago de la cuota inicial",
        },
      ],
    },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          text: "Es el porcentaje del valor del inmueble que pagas directamente a la constructora, en cuotas mensuales, durante el tiempo que dura la obra. Puedes calcular cuánto necesitas ahorrar cada mes con nuestro simulador de cuota inicial.",
        },
      ],
    },
    {
      type: "heading",
      level: 3,
      children: [
        {
          type: "text",
          text: "Pago restante con crédito hipotecario",
        },
      ],
    },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          text: "El saldo del valor del inmueble se paga a la entrega, con el desembolso del crédito hipotecario o del leasing habitacional que apruebe tu entidad financiera. Te acompañamos en la solicitud y en la aplicación de los subsidios a los que tengas derecho.",
        },
      ],
    },
    {
      type: "heading",
      level: 2,
      children: [
        {
          type: "text",
          text: "¿Por qué comprar en Las Galias?",
        },
      ],
    },
    {
      type: "list",
      format: "unordered",
      children: [
        {
          type: "list-item",
          children: [
            {
              type: "text",
              text: "Proyectos con la mejor ubicación",
            },
          ],
        },
        {
          type: "list-item",
          children: [
            {
              type: "text",
              text: "Más de 35 años construyendo",
            },
          ],
        },
        {
          type: "list-item",
          children: [
            {
              type: "text",
              text: "Te brindamos la mejor asesoría",
            },
          ],
        },
      ],
    },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          text: "Si compraste en salarios mínimos legales mensuales vigentes, mira la cartilla explicativa de la venta en salarios mínimos y la cartilla informativa de la venta para la actualización del plan de pagos.",
        },
      ],
    },
  ],
};
