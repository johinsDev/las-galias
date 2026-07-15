/**
 * Normaliza los distintos formatos con los que el document service recibe
 * relaciones en `data` (documentId suelto, array, { connect: [...] },
 * { set: [...] }) a una lista plana de documentIds.
 */
export function extractRelationIds(value: unknown): string[] {
  if (value == null) return [];

  const toId = (entry: unknown): string | null => {
    if (typeof entry === "string") return entry;
    if (typeof entry === "number") return String(entry);
    if (typeof entry === "object" && entry !== null) {
      const obj = entry as Record<string, unknown>;
      if (typeof obj.documentId === "string") return obj.documentId;
      if (typeof obj.id === "string" || typeof obj.id === "number") return String(obj.id);
    }
    return null;
  };

  if (Array.isArray(value)) {
    return value.map(toId).filter((id): id is string => id !== null);
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const buckets = [obj.connect, obj.set].filter(Array.isArray) as unknown[][];
    if (buckets.length > 0) {
      return buckets
        .flat()
        .map(toId)
        .filter((id): id is string => id !== null);
    }
  }

  const single = toId(value);
  return single ? [single] : [];
}
