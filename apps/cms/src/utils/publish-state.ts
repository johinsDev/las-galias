/**
 * Whether a document's draft carries edits its published version does not.
 *
 * Strapi 5 keeps the draft and the published row apart and stamps each with
 * its own `updatedAt`; the admin's "Modified" badge is exactly this comparison.
 * The nightly Sinco sync uses it to decide if it may publish the price it just
 * wrote: when an editor is mid-way through a draft, publishing would ship
 * their half-done text along with the price, so the sync leaves it to them.
 *
 * The one-second tolerance absorbs the clock skew between the two writes a
 * publish makes (draft first, then the published copy).
 */
export function hasUnpublishedChanges(
  draftUpdatedAt: string | Date | null | undefined,
  publishedUpdatedAt: string | Date | null | undefined,
): boolean {
  if (!publishedUpdatedAt) return false;
  if (!draftUpdatedAt) return false;
  const draft = new Date(draftUpdatedAt).getTime();
  const published = new Date(publishedUpdatedAt).getTime();
  if (!Number.isFinite(draft) || !Number.isFinite(published)) return false;
  return draft - published > 1000;
}
