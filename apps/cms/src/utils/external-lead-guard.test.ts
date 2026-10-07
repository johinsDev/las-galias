import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  dropEmpty,
  ipAllowed,
  keyMatches,
  originAllowed,
  parseList,
  readApiKey,
  withinRate,
} from "./external-lead-guard.ts";

// Run with: node --test apps/cms/src/utils/external-lead-guard.test.ts

describe("readApiKey", () => {
  test("reads a bearer token", () => {
    assert.equal(readApiKey({ authorization: "Bearer lg_abc" }), "lg_abc");
  });

  test("falls back to X-Api-Key", () => {
    assert.equal(readApiKey({ authorization: "Basic xyz", apiKey: " lg_abc " }), "lg_abc");
  });

  test("no header is no key", () => {
    assert.equal(readApiKey({}), null);
  });
});

describe("keyMatches", () => {
  test("only the exact key passes", () => {
    assert.equal(keyMatches("lg_abc", "lg_abc"), true);
    assert.equal(keyMatches("lg_abd", "lg_abc"), false);
    assert.equal(keyMatches("lg_ab", "lg_abc"), false);
  });

  test("an integration without a key accepts nothing", () => {
    assert.equal(keyMatches("", ""), false);
    assert.equal(keyMatches(null, null), false);
    assert.equal(keyMatches("lg_abc", undefined), false);
  });
});

describe("originAllowed", () => {
  test("a server-to-server call carries no Origin and passes", () => {
    assert.equal(originAllowed(undefined, []), true);
  });

  test("a browser is refused unless its origin is listed", () => {
    assert.equal(originAllowed("https://evil.example", []), false);
    assert.equal(originAllowed("https://evil.example", ["https://zonario.com"]), false);
    assert.equal(originAllowed("https://Zonario.com/", ["https://zonario.com"]), true);
  });
});

describe("ipAllowed", () => {
  test("an empty list accepts any address", () => {
    assert.equal(ipAllowed("1.2.3.4", []), true);
  });

  test("a list only accepts its addresses, mapped IPv4 included", () => {
    assert.equal(ipAllowed("::ffff:1.2.3.4", ["1.2.3.4"]), true);
    assert.equal(ipAllowed("1.2.3.5", ["1.2.3.4"]), false);
    assert.equal(ipAllowed(undefined, ["1.2.3.4"]), false);
  });
});

describe("withinRate", () => {
  test("refuses past the limit and recovers when the window moves on", () => {
    const key = `test-${Math.random()}`;
    assert.equal(withinRate(key, 2, 60_000, 1_000), true);
    assert.equal(withinRate(key, 2, 60_000, 2_000), true);
    assert.equal(withinRate(key, 2, 60_000, 3_000), false);
    assert.equal(withinRate(key, 2, 60_000, 61_500), true);
  });
});

describe("parseList / dropEmpty", () => {
  test("one value per line, blanks ignored", () => {
    assert.deepEqual(parseList(" https://a.com \n\nhttps://b.com, https://c.com"), [
      "https://a.com",
      "https://b.com",
      "https://c.com",
    ]);
    assert.deepEqual(parseList(null), []);
  });

  test("empty strings and nulls are not answers", () => {
    assert.deepEqual(dropEmpty({ name: "Ana", email: "", message: null, acceptsCall: false }), {
      name: "Ana",
      acceptsCall: false,
    });
  });
});
