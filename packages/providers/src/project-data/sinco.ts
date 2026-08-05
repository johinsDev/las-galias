import { SincoClient } from "../sinco/client";
import { SincoRequestError, type SincoConfig } from "../sinco/types";
import type { ExternalProjectData, ExternalUnitType, ProjectDataProvider } from "./types";

/** `UnidadConAreas`, trimmed to the fields verified against the real instance. */
interface SincoUnit {
  id: number;
  idProyecto?: number;
  idTipoInmueble?: number | null;
  tipoInmueble?: string | null;
  esPrincipal?: boolean;
  valor?: number | null;
  estado?: string | null;
  areaPrivada?: number | null;
  areaConstruida?: number | null;
  areaTotal?: number | null;
  cantidadAlcobas?: number | null;
}

/** `TipoInmuebleInformacionBasica`. `rutaImagen` is always null here — see the discovery doc. */
interface SincoTypology {
  id: number;
  idProyecto?: number;
  nombre?: string | null;
  codigoAlterno?: string | null;
}

const AVAILABLE = "DISPONIBLE";

function isAvailable(unit: SincoUnit): boolean {
  return (unit.estado ?? "").trim().toUpperCase() === AVAILABLE;
}

/** Sinco reports built and private area separately; both reach the CMS. */
function builtAreaOf(unit: SincoUnit): number | undefined {
  const area = unit.areaConstruida ?? unit.areaTotal;
  return typeof area === "number" && area > 0 ? area : undefined;
}

function privateAreaOf(unit: SincoUnit): number | undefined {
  const area = unit.areaPrivada;
  return typeof area === "number" && area > 0 ? area : undefined;
}

function priceOf(unit: SincoUnit): number | undefined {
  return typeof unit.valor === "number" && unit.valor > 0 ? unit.valor : undefined;
}

/**
 * Provider for Sinco CBR (https://sincoerp.com).
 *
 * Deliberately narrow, because `docs/sinco/discovery-pruebas.md` bounds what the
 * ERP actually knows: **price, areas and availability, nothing else**. It does
 * NOT return `name` (in Sinco that is an operational code like "INACTIVO
 * CONJUNTO ...-BLOQUE13A"), nor `constructionStatus` (`etapa` labels towers, not
 * build progress), nor `bathrooms` (absent from the schema). `bedrooms` is only
 * populated on 222/565 projects, so it is passed through only when present and
 * the CMS still wins on merge.
 */
export class SincoProvider implements ProjectDataProvider {
  readonly name = "sinco";
  private readonly client: SincoClient;

  constructor(config: SincoConfig) {
    this.client = new SincoClient(config);
  }

  async getProjectById(externalId: string): Promise<ExternalProjectData | null> {
    const id = externalId.trim();
    if (!id) return null;

    const units = await this.listUnits(id);
    if (units === null) return null;

    // Only available units drive the public price: a sold-out unit's value is
    // history, and "precio desde" must be something a visitor can still buy.
    const available = units.filter(isAvailable);
    const prices = available.map(priceOf).filter((n): n is number => n !== undefined);
    const priceFromCOP = prices.length > 0 ? Math.min(...prices) : undefined;

    const unitTypes = await this.buildUnitTypes(id, available);

    return {
      externalId: id,
      ...(priceFromCOP !== undefined ? { priceFromCOP } : {}),
      ...(unitTypes.length > 0 ? { unitTypes } : {}),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * `null` means "this project does not exist / has no units" — Sinco answers
   * **409** for an empty project, which is expected, not a failure.
   */
  private async listUnits(idProyecto: string): Promise<SincoUnit[] | null> {
    try {
      const units = await this.client.get<SincoUnit[]>(`/Unidades/PorProyecto/${idProyecto}`);
      return Array.isArray(units) ? units : null;
    } catch (err) {
      if (err instanceof SincoRequestError && err.status === 409) return null;
      throw err;
    }
  }

  /**
   * One entry per typology, priced at its cheapest available unit. Typology
   * names come from `/TipoInmueble` ("TIPO A - 65.93 MT2"); when that call has
   * nothing to say we fall back to the unit's own `tipoInmueble` label, because
   * the merge downstream matches by NAME and an empty name matches nothing.
   */
  private async buildUnitTypes(
    idProyecto: string,
    units: SincoUnit[],
  ): Promise<ExternalUnitType[]> {
    if (units.length === 0) return [];

    const names = new Map<number, string>();
    try {
      const typologies = await this.client.get<SincoTypology[]>(
        `/TipoInmueble/IdProyecto/${idProyecto}`,
      );
      for (const t of typologies ?? []) {
        const name = (t.nombre ?? "").trim();
        if (name) names.set(t.id, name);
      }
    } catch (err) {
      // Typology names are a nicety; areas and prices are the point.
      if (!(err instanceof SincoRequestError && err.status === 409)) throw err;
    }

    const grouped = new Map<string, SincoUnit[]>();
    for (const unit of units) {
      const name =
        (unit.idTipoInmueble != null ? names.get(unit.idTipoInmueble) : undefined) ??
        (unit.tipoInmueble ?? "").trim();
      if (!name) continue;
      const bucket = grouped.get(name);
      if (bucket) bucket.push(unit);
      else grouped.set(name, [unit]);
    }

    const result: ExternalUnitType[] = [];
    for (const [name, bucket] of grouped) {
      const prices = bucket.map(priceOf).filter((n): n is number => n !== undefined);
      const builtAreas = bucket.map(builtAreaOf).filter((n): n is number => n !== undefined);
      const privateAreas = bucket.map(privateAreaOf).filter((n): n is number => n !== undefined);
      if (prices.length === 0 || builtAreas.length === 0) continue;

      // `cantidadAlcobas` is unreliable (222/565); only forward a value the
      // whole typology agrees on, so a stray row cannot rewrite good CMS data.
      const bedroomValues = new Set(
        bucket
          .map((u) => u.cantidadAlcobas)
          .filter((n): n is number => typeof n === "number" && n > 0),
      );
      const bedrooms = bedroomValues.size === 1 ? [...bedroomValues][0] : undefined;

      result.push({
        name,
        builtAreaM2: Math.min(...builtAreas),
        ...(privateAreas.length > 0 ? { privateAreaM2: Math.min(...privateAreas) } : {}),
        priceCOP: Math.min(...prices),
        ...(bedrooms !== undefined ? { bedrooms } : {}),
      });
    }

    return result.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  healthCheck(): Promise<boolean> {
    return this.client.healthCheck();
  }
}
