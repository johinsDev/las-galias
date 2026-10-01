import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { hasUnpublishedChanges } from "./publish-state.ts";

// Run with: node --test apps/cms/src/utils/publish-state.test.ts

describe("hasUnpublishedChanges", () => {
  test("a draft edited after the last publish has pending changes", () => {
    assert.equal(
      hasUnpublishedChanges("2026-09-30T10:00:05.000Z", "2026-09-30T10:00:00.000Z"),
      true,
    );
  });

  test("a draft and a published copy written together are in step", () => {
    assert.equal(
      hasUnpublishedChanges("2026-09-30T10:00:00.800Z", "2026-09-30T10:00:00.000Z"),
      false,
    );
    assert.equal(
      hasUnpublishedChanges("2026-09-30T09:00:00.000Z", "2026-09-30T10:00:00.000Z"),
      false,
    );
  });

  test("never published, or no dates, means nothing to compare", () => {
    assert.equal(hasUnpublishedChanges("2026-09-30T10:00:05.000Z", null), false);
    assert.equal(hasUnpublishedChanges(null, "2026-09-30T10:00:00.000Z"), false);
    assert.equal(hasUnpublishedChanges("nope", "2026-09-30T10:00:00.000Z"), false);
  });
});
