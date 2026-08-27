interface BlockChild {
  text?: string;
  children?: BlockChild[];
}

interface BlockNode {
  type: string;
  level?: number;
  children?: BlockChild[];
}

/** Flattens a block's inline children to plain text. Marks are dropped. */
export function textOf(children: BlockChild[] | undefined): string {
  if (!children) return "";
  return children.map((c) => c.text ?? textOf(c.children)).join("");
}

/**
 * Anchor id for a heading. Accent-stripped and punctuation-free so the URL of
 * "1. Objeto" is `#objeto` rather than a percent-encoded mess — these end up in
 * the address bar when somebody links to a clause of a legal document.
 */
function headingId(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      // Leading "1." / "1)" numbering carries no meaning in an anchor.
      .replace(/^\s*\d+\s*[.)]\s*/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "seccion"
  );
}

export interface Heading {
  id: string;
  text: string;
}

/**
 * The level-2 headings of a blocks field, in order — the table of contents the
 * legal pages render beside the text and track while scrolling.
 *
 * Duplicated titles get a numeric suffix: two clauses both called
 * "Vigencia" would otherwise share an anchor and the index would jump to the
 * first one from both entries.
 */
export function extractHeadings(content: unknown): Heading[] {
  const blocks: BlockNode[] = Array.isArray(content) ? (content as BlockNode[]) : [];
  const seen = new Map<string, number>();

  return blocks
    .filter((block) => block.type === "heading" && (block.level ?? 2) <= 2)
    .map((block) => {
      const text = textOf(block.children);
      const base = headingId(text);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      return { id: count === 0 ? base : `${base}-${count + 1}`, text };
    });
}
