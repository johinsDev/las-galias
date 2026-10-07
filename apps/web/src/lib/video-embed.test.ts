import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { videoEmbedUrl } from "./video-embed.ts";

// Run with: node --test apps/web/src/lib/video-embed.test.ts

describe("videoEmbedUrl", () => {
  test("turns a YouTube watch link into the embed address", () => {
    assert.equal(
      videoEmbedUrl("https://www.youtube.com/watch?v=XRcrufoL02o"),
      "https://www.youtube.com/embed/XRcrufoL02o",
    );
  });

  test("accepts a link pasted without the scheme and drops the tracking parameters", () => {
    assert.equal(
      videoEmbedUrl(
        "youtube.com/watch?v=XRcrufoL02o&source_ve_path=OTY3MTQ&embeds_referring_euri=https%3A%2F%2Fgalias.com.co%2F",
      ),
      "https://www.youtube.com/embed/XRcrufoL02o",
    );
  });

  test("understands the other YouTube shapes", () => {
    for (const url of [
      "https://youtu.be/XRcrufoL02o?si=abc",
      "https://m.youtube.com/watch?v=XRcrufoL02o",
      "https://www.youtube.com/shorts/XRcrufoL02o",
      "https://www.youtube.com/live/XRcrufoL02o",
      "https://www.youtube.com/embed/XRcrufoL02o",
      "https://www.youtube-nocookie.com/embed/XRcrufoL02o",
      "  www.youtube.com/watch?v=XRcrufoL02o  ",
    ]) {
      assert.equal(videoEmbedUrl(url), "https://www.youtube.com/embed/XRcrufoL02o", url);
    }
  });

  test("keeps the start time", () => {
    assert.equal(
      videoEmbedUrl("https://youtu.be/XRcrufoL02o?t=90"),
      "https://www.youtube.com/embed/XRcrufoL02o?start=90",
    );
    assert.equal(
      videoEmbedUrl("https://www.youtube.com/watch?v=XRcrufoL02o&t=1m30s"),
      "https://www.youtube.com/embed/XRcrufoL02o?start=90",
    );
  });

  test("turns a Vimeo link into the player address", () => {
    assert.equal(
      videoEmbedUrl("https://vimeo.com/123456789"),
      "https://player.vimeo.com/video/123456789",
    );
    assert.equal(
      videoEmbedUrl("vimeo.com/123456789/abcdef0123"),
      "https://player.vimeo.com/video/123456789?h=abcdef0123",
    );
    assert.equal(
      videoEmbedUrl("https://player.vimeo.com/video/123456789?h=abcdef0123"),
      "https://player.vimeo.com/video/123456789?h=abcdef0123",
    );
  });

  test("leaves any other address alone, with a scheme", () => {
    assert.equal(
      videoEmbedUrl("https://cdn.example.com/player/42?x=1"),
      "https://cdn.example.com/player/42?x=1",
    );
    assert.equal(videoEmbedUrl("cdn.example.com/player/42"), "https://cdn.example.com/player/42");
  });

  test("returns null when there is nothing to embed", () => {
    assert.equal(videoEmbedUrl(""), null);
    assert.equal(videoEmbedUrl("   "), null);
    assert.equal(videoEmbedUrl(null), null);
    assert.equal(videoEmbedUrl("https://www.youtube.com/"), null);
    assert.equal(videoEmbedUrl("avance de obra"), null);
  });
});
