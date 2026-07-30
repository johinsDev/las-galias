import type { SincoClient } from "./client";

/** One selectable project, with the macroproject it hangs off. */
export interface SincoCatalogEntry {
  sincoId: string;
  name: string;
  macroSincoId: string;
  macroName: string;
}

interface MacroExterno {
  id: number;
  nombre?: string | null;
}

interface ProyectoBasico {
  id: number;
  nombre?: string | null;
}

/**
 * `/Macroproyectos/Externo` instead of `/Macroproyectos/Basica`: same ids and
 * names, but Basica embeds every macroproject's logo as base64 (0.86 MB against
 * 10 KB).
 */
const MACROS = "/Macroproyectos/Externo";

/** Enough to be quick without hammering an ERP that also serves the sales rooms. */
const CONCURRENCY = 6;

/**
 * Builds the full project catalog: one call for the macroprojects plus one per
 * macroproject (there is no bulk endpoint). ~110 calls, ~1.5 s in total — cheap
 * enough to refresh on a schedule and never call at edit time.
 *
 * A macroproject that fails is skipped, not fatal: a partial catalog is more
 * useful than none, and the next refresh picks it up.
 */
export async function fetchProjectCatalog(client: SincoClient): Promise<SincoCatalogEntry[]> {
  const macros = await client.get<MacroExterno[]>(MACROS);
  if (!Array.isArray(macros)) return [];

  const queue = [...macros];
  const entries: SincoCatalogEntry[] = [];

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let macro = queue.shift(); macro; macro = queue.shift()) {
        let projects: ProyectoBasico[];
        try {
          projects = await client.get<ProyectoBasico[]>(`/Proyectos/${macro.id}`);
        } catch {
          continue;
        }
        if (!Array.isArray(projects)) continue;
        for (const project of projects) {
          const name = project.nombre?.trim();
          if (!name) continue;
          entries.push({
            sincoId: String(project.id),
            name,
            macroSincoId: String(macro.id),
            macroName: macro.nombre?.trim() ?? "",
          });
        }
      }
    }),
  );

  return entries.sort((a, b) => a.name.localeCompare(b.name, "es"));
}
