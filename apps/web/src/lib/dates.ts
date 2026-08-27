/**
 * Formats a Strapi `date` field (a plain `YYYY-MM-DD`, no time, no zone).
 *
 * NOT `new Date(value)`: that parses a date-only string as UTC midnight, and
 * rendering it in Colombia (UTC-5) lands on the previous evening — a document
 * saved as "27 de agosto" was published reading "26 de agosto". Building the
 * date from its own parts keeps it in local time, where it never shifts.
 */
export function formatCalendarDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
