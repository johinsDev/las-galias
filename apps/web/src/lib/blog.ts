import type { Post, PostCategory } from "@lasgalias/schemas";

/** Display order of the blog filters, and the label for each category. */
export const POST_CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: "financiacion", label: "Financiación" },
  { value: "guia-de-compra", label: "Guía de compra" },
  { value: "mercado", label: "Mercado" },
  { value: "decoracion", label: "Decoración" },
];

export function categoryLabel(category: PostCategory | null | undefined): string | null {
  if (!category) return null;
  return POST_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * "2 jun 2025" — the editorial date, falling back to Strapi's own.
 *
 * Read in UTC on purpose: `publishedOn` is a Strapi `date` (no time), which
 * `new Date()` parses as UTC midnight. Formatting that in Bogotá time (UTC-5)
 * lands on the previous evening, so every editorial date would render a day
 * early.
 */
export function formatPostDate(post: Post): string | null {
  const raw = post.publishedOn ?? post.publishedAt;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Sortable timestamp: the editorial date wins over Strapi's publishedAt. */
function postTime(post: Post): number {
  const raw = post.publishedOn ?? post.publishedAt;
  return raw ? new Date(raw).getTime() : 0;
}

/** Newest first, by the date the reader actually sees on the card. */
export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => postTime(b) - postTime(a));
}

interface BlockChild {
  text?: string;
  children?: BlockChild[];
}

function textOf(children: BlockChild[] | undefined): string {
  if (!children) return "";
  return children.map((c) => c.text ?? textOf(c.children)).join("");
}

/**
 * "5 min de lectura". An editor override wins; otherwise it is estimated at
 * ~200 words per minute over the rich-text body, so the line is never missing.
 */
export function readingMinutes(post: Post): number {
  if (post.readingMinutes && post.readingMinutes > 0) return post.readingMinutes;
  const blocks = Array.isArray(post.content) ? (post.content as { children?: BlockChild[] }[]) : [];
  const words = blocks
    .map((block) => textOf(block.children))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function authorOf(post: Post): string {
  return post.author?.trim() || "equipo editorial Galias";
}

/**
 * The big slot at the top of /blog: whatever an editor pinned, else the most
 * recent post. `posts` must already be sorted.
 */
export function featuredPost(posts: Post[]): Post | null {
  return posts.find((p) => p.featured) ?? posts[0] ?? null;
}

/** Same category first, then the newest — never the article you are reading. */
export function relatedPosts(post: Post, all: Post[], limit = 3): Post[] {
  const others = all.filter((p) => p.slug !== post.slug);
  const sameCategory = others.filter((p) => post.category && p.category === post.category);
  return [...sameCategory, ...others.filter((p) => !sameCategory.includes(p))].slice(0, limit);
}

interface SidebarCta {
  title: string;
  body: string;
  label: string;
  href: string;
}

/**
 * The sidebar CTA follows the article's category, as the wireframe notes:
 * financiación → subsidios, guía de compra → agenda una cita.
 */
const CTAS: Record<PostCategory, SidebarCta> = {
  financiacion: {
    title: "¿Aplicas a subsidio VIS?",
    body: "Verifica en 2 minutos si tu proyecto y tu perfil califican.",
    label: "Verificar ahora",
    href: "/calculadoras#capacidad-de-pago",
  },
  "guia-de-compra": {
    title: "¿Listo para dar el primer paso?",
    body: "Agenda una cita sin costo con un asesor y resuelve tus dudas.",
    label: "Agendar cita",
    href: "/contacto",
  },
  mercado: {
    title: "Mira los proyectos disponibles",
    body: "Vivienda nueva en Bogotá, Cali, Manizales y Pereira.",
    label: "Ver proyectos",
    href: "/proyectos",
  },
  decoracion: {
    title: "Encuentra tu próximo hogar",
    body: "Explora las tipologías y los planos de cada proyecto.",
    label: "Ver proyectos",
    href: "/proyectos",
  },
};

const DEFAULT_CTA: SidebarCta = {
  title: "¿Hablamos?",
  body: "Un asesor te acompaña en todo el proceso, sin costo ni compromiso.",
  label: "Déjanos tus datos",
  href: "/contacto",
};

export function sidebarCta(category: PostCategory | null | undefined): SidebarCta {
  return category ? (CTAS[category] ?? DEFAULT_CTA) : DEFAULT_CTA;
}
