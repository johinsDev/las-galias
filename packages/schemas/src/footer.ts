/**
 * The footer's links, as the «Footer» single type stores them.
 *
 * The defaults live here because two things need the same list: the CMS
 * creates the single type with them on first boot, so an editor opens a form
 * that already shows what the site has, and the site falls back to them while
 * the CMS has no footer yet. The projects column is not here — it is the
 * published catalogue's cities, never a list someone maintains.
 */
export const FOOTER_SOCIAL_NETWORKS = [
  "instagram",
  "facebook",
  "youtube",
  "tiktok",
  "linkedin",
] as const;

export type FooterSocialNetwork = (typeof FOOTER_SOCIAL_NETWORKS)[number];

export interface FooterLink {
  label: string;
  /** A path on the site (`/nosotros`) or a full address. */
  url?: string | null;
  /** An uploaded document; when set it wins over `url`. */
  file?: { url: string } | null;
  newTab?: boolean | null;
}

interface FooterSocialLink {
  network: FooterSocialNetwork;
  url: string;
}

export interface Footer {
  description?: string | null;
  socialLinks?: FooterSocialLink[] | null;
  companyLinks?: FooterLink[] | null;
  documentLinks?: FooterLink[] | null;
  legalLinks?: FooterLink[] | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
}

/** The company's policy as it is published today, until the CMS holds its text. */
const PRIVACY_POLICY_URL = "https://galias.com.co/politica-privacidad/";

export const FOOTER_DEFAULTS = {
  description:
    "Constructora colombiana con más de 30 años de experiencia entregando vivienda de calidad.",
  socialLinks: [
    { network: "instagram", url: "https://www.instagram.com/lasgaliasc/" },
    { network: "facebook", url: "https://www.facebook.com/ConstructoralasGalias" },
    { network: "youtube", url: "https://www.youtube.com/channel/UC4NnF-NhRKba5kIdzSS680A" },
    { network: "tiktok", url: "https://www.tiktok.com/@lasgaliasc" },
    { network: "linkedin", url: "https://co.linkedin.com/company/galias" },
  ],
  companyLinks: [
    { label: "Nosotros", url: "/nosotros" },
    { label: "Blog", url: "/blog" },
    { label: "Servicio al cliente", url: "/servicio-al-cliente" },
  ],
  // The sales booklets are the PDFs galias.com.co links, copied into the site
  // (apps/web/public/documentos) so they do not depend on the old domain.
  documentLinks: [
    { label: "Tips para comprar", url: "/tips-para-comprar" },
    {
      label: "Cartilla explicativa de la venta en salarios mínimos",
      url: "/documentos/cartilla-explicativa-venta-en-salarios-minimos.pdf",
    },
    {
      label: "Cartilla informativa de la venta",
      url: "/documentos/cartilla-informativa-de-la-venta.pdf",
    },
    {
      label: "Políticas de devolución saldos de escrituración",
      url: "/documentos/politicas-de-devolucion-saldos-de-escrituracion.pdf",
    },
    { label: "Políticas de manejo de información y privacidad", url: PRIVACY_POLICY_URL },
  ],
  legalLinks: [
    { label: "Términos y condiciones", url: "/legales/terminos-y-condiciones" },
    { label: "Política de privacidad", url: PRIVACY_POLICY_URL },
    { label: "Todos los documentos", url: "/legales" },
  ],
  contactEmail: "sala@lasgalias.com.co",
  contactAddress: "Bogotá, Colombia",
} satisfies Footer;
