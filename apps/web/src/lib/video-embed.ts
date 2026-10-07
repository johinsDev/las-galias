// The CMS's video fields are free text, and what an editor pastes is whatever
// the browser's address bar had: a `watch?v=` link, a `youtu.be` short link,
// often without the scheme. None of those can go in an iframe — YouTube refuses
// to be framed outside `/embed/`, and a link without a scheme is a path on this
// site, so the player showed our own 404. This turns what was pasted into the
// address a player accepts.

const YOUTUBE_ID = /^[\w-]{11}$/;

/** `90`, `90s` or `1m30s` → seconds. */
function startSeconds(value: string | null): number {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!match) return 0;
  const [, h = "0", m = "0", s = "0"] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function youtubeEmbed(url: URL, host: string): string | null {
  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null | undefined;
  if (host === "youtu.be") id = parts[0];
  else if (parts[0] === "watch") id = url.searchParams.get("v");
  else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) id = parts[1];
  if (!id || !YOUTUBE_ID.test(id)) return null;

  const start = startSeconds(url.searchParams.get("t") ?? url.searchParams.get("start"));
  return `https://www.youtube.com/embed/${id}${start > 0 ? `?start=${start}` : ""}`;
}

function vimeoEmbed(url: URL): string | null {
  const parts = url.pathname.split("/").filter(Boolean);
  const at = parts.findIndex((part) => /^\d+$/.test(part));
  if (at === -1) return null;
  // An unlisted video carries its hash as the next segment, or as `?h=`.
  const hash = url.searchParams.get("h") ?? parts[at + 1];
  const query = hash && /^[\da-f]+$/i.test(hash) ? `?h=${hash}` : "";
  return `https://player.vimeo.com/video/${parts[at]}${query}`;
}

/**
 * The address to put in the player's iframe, or `null` when the text is not a
 * usable link — the caller then draws no video rather than a broken one.
 */
export function videoEmbedUrl(raw: string | null | undefined): string | null {
  const text = raw?.trim();
  if (!text) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text.replace(/^\/+/, "")}`);
  } catch {
    return null;
  }
  if (!url.hostname.includes(".")) return null;

  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
    return youtubeEmbed(url, host);
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") return vimeoEmbed(url);

  url.protocol = "https:";
  return url.toString();
}
