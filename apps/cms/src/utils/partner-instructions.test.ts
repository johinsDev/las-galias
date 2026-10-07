import assert from "node:assert/strict";
import { test } from "node:test";

import { buildPartnerInstructions, buildPartnerPrompt } from "./partner-instructions.ts";

// Run with: node --test apps/cms/src/utils/partner-instructions.test.ts

test("the message carries the real address and key, ready to paste", () => {
  const text = buildPartnerInstructions({
    name: "Zonario",
    url: "https://cms.example/api/leads/external/zonario",
    apiKey: "lg_abc",
    ratePerMinute: 60,
    dailyCap: 0,
  });
  assert.match(text, /URL: {5}https:\/\/cms\.example\/api\/leads\/external\/zonario/);
  assert.match(text, /Authorization: Bearer lg_abc/);
  assert.match(text, /curl -X POST "https:\/\/cms\.example\/api\/leads\/external\/zonario"/);
  // A cap of 0 is "no cap", so it is not announced as a limit.
  assert.match(text, /Límites: 60 peticiones por minuto\. Por encima/);
  assert.match(text, /GET https:\/\/cms\.example\/api\/leads\/external\/zonario\/projects/);
  // The shapes of a success and of an error are spelled out.
  assert.match(text, /"duplicate": false/);
  assert.match(text, /"issues"/);
});

test("the prompt for the partner's AI is self-contained: contract, key and limits", () => {
  const prompt = buildPartnerPrompt({
    name: "Zonario",
    url: "https://cms.example/api/leads/external/zonario",
    apiKey: "lg_abc",
  });
  assert.match(prompt, /Authorization: Bearer lg_abc/);
  assert.match(
    prompt,
    /Listado de proyectos: {2}GET {2}https:\/\/cms\.example\/api\/leads\/external\/zonario\/projects/,
  );
  assert.match(prompt, /POST https:\/\/cms\.example\/api\/leads\/external\/zonario/);
  assert.match(prompt, /LAS_GALIAS_API_KEY/);
  assert.match(prompt, /acceptsDataPolicy \(boolean, obligatorio\)/);
  assert.match(prompt, /Retry-After/);
});
