import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildObservacion, hasAnyDefault, resolveSincoTarget } from "./lead-routing.ts";

// Run with: node --test apps/cms/src/utils/lead-routing.test.ts

const catalog = (sincoId: string, macroSincoId: string) => ({ sincoId, macroSincoId });

describe("resolveSincoTarget", () => {
  test("the lead's own project wins over every default", () => {
    const target = resolveSincoTarget(
      { form: "listado", project: { sincoProject: catalog("10", "1") } },
      { projectListado: catalog("20", "2"), defaultProject: catalog("30", "3") },
    );
    assert.deepEqual(target, { sincoId: "10", macroSincoId: "1", via: "project" });
  });

  test("a project without a catalog entry falls to the form's default", () => {
    const target = resolveSincoTarget(
      { form: "lotes", project: { sincoProject: null } },
      { projectLotes: catalog("20", "2"), defaultProject: catalog("30", "3") },
    );
    assert.deepEqual(target, { sincoId: "20", macroSincoId: "2", via: "form" });
  });

  test("a form with no default of its own uses the general one", () => {
    const target = resolveSincoTarget(
      { form: "locales" },
      { projectLotes: catalog("20", "2"), defaultProject: catalog("30", "3") },
    );
    assert.deepEqual(target, { sincoId: "30", macroSincoId: "3", via: "default" });
  });

  test("an unknown or missing form still reaches the general default", () => {
    const config = { defaultProject: catalog("30", "3") };
    assert.equal(resolveSincoTarget({ form: "manual" }, config)?.via, "default");
    assert.equal(resolveSincoTarget({}, config)?.via, "default");
  });

  test("a catalog row missing either id is treated as absent", () => {
    const target = resolveSincoTarget(
      { form: "listado", project: { sincoProject: { sincoId: "10", macroSincoId: "" } } },
      { projectListado: { sincoId: " ", macroSincoId: "2" }, defaultProject: catalog("30", "3") },
    );
    assert.deepEqual(target, { sincoId: "30", macroSincoId: "3", via: "default" });
  });

  test("numeric ids from the catalog come out as strings", () => {
    const target = resolveSincoTarget({}, { defaultProject: { sincoId: 7, macroSincoId: 1 } });
    assert.deepEqual(target, { sincoId: "7", macroSincoId: "1", via: "default" });
  });

  test("nothing configured and no project means nowhere to send it", () => {
    assert.equal(resolveSincoTarget({ form: "exterior" }, null), null);
    assert.equal(resolveSincoTarget({ form: "exterior" }, {}), null);
  });
});

describe("hasAnyDefault", () => {
  test("is false for nothing, empty, or half-filled rows", () => {
    assert.equal(hasAnyDefault(null), false);
    assert.equal(hasAnyDefault({}), false);
    assert.equal(hasAnyDefault({ defaultProject: { sincoId: "1", macroSincoId: null } }), false);
  });

  test("is true as soon as one usable default exists", () => {
    assert.equal(hasAnyDefault({ projectWhatsapp: catalog("1", "1") }), true);
  });
});

describe("buildObservacion", () => {
  test("a bare lead is one short line naming the form", () => {
    assert.equal(buildObservacion({ form: "listado" }), "[Formulario: listado de proyectos]");
  });

  test("says how it was routed when it was not the lead's own project", () => {
    assert.equal(
      buildObservacion({ form: "lotes" }, { via: "form" }),
      "[Formulario: lotes · vía proyecto por defecto del formulario]",
    );
    assert.equal(
      buildObservacion({ form: "pdp" }, { via: "project" }),
      "[Formulario: ficha de proyecto]",
    );
  });

  test("lists the answers Sinco has no column for and skips the empty ones", () => {
    const text = buildObservacion({
      form: "pdp",
      incomeRange: "4 a 6 SMMLV",
      savingsRange: "",
      severance: null,
      firstHome: true,
      acceptsWhatsApp: false,
      message: "  Quiero visitar el sábado  ",
    });
    assert.equal(
      text,
      "[Formulario: ficha de proyecto]\n" +
        "Ingresos: 4 a 6 SMMLV · Primera vivienda: sí · Autoriza WhatsApp: no\n" +
        "Quiero visitar el sábado",
    );
  });

  test("returns nothing for a lead with nothing to say", () => {
    assert.equal(buildObservacion({}), undefined);
  });

  test("caps the text so a long message does not flood the CRM", () => {
    const text = buildObservacion({ message: "x".repeat(2000) });
    assert.equal(text?.length, 600);
    assert.ok(text?.endsWith("…"));
  });
});
