import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { renderMarkdown } from "./markdown.ts";

// Run with: node --test apps/web/src/lib/markdown.test.ts

describe("renderMarkdown", () => {
  test("drops the opening title and indexes the level-2 headings", () => {
    const { html, headings } = renderMarkdown(
      "# Cartilla\n\nIntro.\n\n## A. Estructuración\n\n### 1. Estimación\n\n#### SMMLV\n\n## Vigencia\n\n## Vigencia\n",
    );
    assert.ok(!html.includes("Cartilla"));
    assert.deepEqual(headings, [
      { id: "a-estructuracion", text: "A. Estructuración" },
      { id: "vigencia", text: "Vigencia" },
      { id: "vigencia-2", text: "Vigencia" },
    ]);
    assert.ok(html.includes('<h2 id="a-estructuracion">A. Estructuración</h2>'));
    assert.ok(html.includes("<h3>1. Estimación</h3>"));
    assert.ok(html.includes("<h4>SMMLV</h4>"));
  });

  test("keeps a level-1 heading that is not the opening title", () => {
    const { headings } = renderMarkdown("Intro.\n\n# Objeto\n");
    assert.deepEqual(headings, [{ id: "objeto", text: "Objeto" }]);
  });

  test("renders tables inside a scroll box, with their inline marks", () => {
    const { html } = renderMarkdown(
      "| Concepto | Valor |\n| --- | ---: |\n| **Cuota** | $561.800 (d*) |\n",
    );
    assert.ok(html.startsWith("<div data-table-scroll><table><thead><tr><th>Concepto</th>"));
    assert.ok(html.includes('<td style="text-align:right" data-short>$561.800 (d*)</td>'));
    assert.ok(html.includes("<td data-short><strong>Cuota</strong></td>"));
  });

  test("the index gets plain text, not entities or marks", () => {
    const { headings } = renderMarkdown("## B. ¿Cómo & *cuándo*?\n");
    assert.deepEqual(headings, [{ id: "b-como-cuando", text: "B. ¿Cómo & cuándo?" }]);
  });
});
