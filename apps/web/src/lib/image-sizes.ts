/**
 * Every width the Vercel image optimizer is allowed to render, in pixels.
 *
 * The adapter snaps any other `width` to the nearest one of these and, through
 * a bug of its own, leaks the original as an `inputtedWidth="…"` attribute on
 * the `<img>`. So the rule is: a `width` or `widths` entry that reaches the
 * optimizer is one of these, and `CmsImage` enforces it. The small ones are for
 * logos and icons; 420/750/828/1080 are what phones at 2x–3x actually pick.
 */
export const IMAGE_WIDTHS = [
  64, 96, 128, 256, 384, 420, 640, 750, 828, 1080, 1200, 1600, 1920, 2048,
] as const;

/** Nearest allowed width, so the `width` attribute and the file agree. */
export function fitWidth(width: number): number {
  return IMAGE_WIDTHS.reduce((best, candidate) =>
    Math.abs(candidate - width) < Math.abs(best - width) ? candidate : best,
  );
}
