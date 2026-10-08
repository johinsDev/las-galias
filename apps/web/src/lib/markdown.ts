import { Marked, type Tokens } from "marked";

import { createHeadingIds, type Heading } from "./blocks.ts";

/**
 * Markdown → HTML for the legal documents whose text is pasted as markdown
 * (`legal-document.bodyMarkdown`). Strapi's blocks editor has no tables and
 * keeps nothing of a pasted document, and the cartillas are mostly tables.
 *
 * Runs at build time only. The HTML carries no classes: `Markdown.astro`
 * styles it by tag. Raw HTML in the source is passed through — the only
 * authors are the CMS editors, and a `<br>` is the one way to break a line
 * inside a table cell.
 */
export interface RenderedMarkdown {
  html: string;
  /** The level-2 headings, with the ids the HTML carries — the side index. */
  headings: Heading[];
}

/** Longest cell, in source characters, that is kept on one line. */
const SHORT_CELL = 24;

export function renderMarkdown(source: string): RenderedMarkdown {
  const nextId = createHeadingIds();
  const headings: Heading[] = [];

  const marked = new Marked({
    gfm: true,
    renderer: {
      // Same levels as Blocks.astro: 1 and 2 are clauses (and index entries),
      // 3 a sub-clause; a markdown document also uses 4 for the terms it defines.
      heading({ tokens, depth }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens);
        if (depth <= 2) {
          const text = this.parser.parseInline(tokens, this.parser.textRenderer);
          const id = nextId(decodeEntities(text));
          headings.push({ id, text: decodeEntities(text) });
          return `<h2 id="${id}">${inner}</h2>\n`;
        }
        return depth === 3 ? `<h3>${inner}</h3>\n` : `<h4>${inner}</h4>\n`;
      },
      // A six-column table does not fit a phone: it scrolls inside its own
      // box instead of widening the page.
      table(token: Tokens.Table) {
        const row = (cells: Tokens.TableCell[], tag: "th" | "td") =>
          `<tr>${cells
            .map((cell) => {
              const align = cell.align ? ` style="text-align:${cell.align}"` : "";
              // A figure ("$1.123.600 (a)") must not break in two; a sentence
              // must, or six columns never fit. Length is the tell.
              const short = tag === "td" && cell.text.length <= SHORT_CELL ? " data-short" : "";
              return `<${tag}${align}${short}>${this.parser.parseInline(cell.tokens)}</${tag}>`;
            })
            .join("")}</tr>`;
        const head = `<thead>${row(token.header, "th")}</thead>`;
        const body = `<tbody>${token.rows.map((cells) => row(cells, "td")).join("")}</tbody>`;
        return `<div data-table-scroll><table>${head}${body}</table></div>\n`;
      },
    },
  });

  const tokens = marked.lexer(source);
  // A converted document opens with its own title as `# …`; the page already
  // prints the title, so that first heading would repeat it.
  const first = tokens.findIndex((token) => token.type !== "space");
  if (first !== -1) {
    const token = tokens[first];
    if (token?.type === "heading" && token.depth === 1) tokens.splice(first, 1);
  }

  return { html: marked.parser(tokens), headings };
}

/** The text renderer escapes; the index prints the heading as plain text. */
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}
