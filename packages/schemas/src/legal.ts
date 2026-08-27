/**
 * The legal documents the site publishes, in the order the design shows them
 * as chips.
 *
 * The list is here rather than derived from the CMS because three separate
 * things need to agree on it: the CMS seed that creates the entries, the
 * footer links (which cannot afford a CMS round-trip on every page), and the
 * `/legales` pages. A slug typo would otherwise 404 in silence.
 *
 * The CMS remains the source of truth for the BODY of each document — that is
 * what the legal team edits. This is only the identity of each one.
 */
export interface LegalDocumentRef {
  slug: string;
  title: string;
}

export const LEGAL_DOCUMENTS: readonly LegalDocumentRef[] = [
  { slug: "terminos-y-condiciones", title: "Términos y condiciones" },
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
] as const;

/** The document the data-policy checkbox on every form must link to. */
export const DATA_POLICY_SLUG = "politica-de-privacidad";
