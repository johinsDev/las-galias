import type { RateQuote } from "./types";

const TRM_ENDPOINT = "https://www.datos.gov.co/resource/32sa-8pi3.json";

interface TrmRow {
  valor: string;
  vigenciadesde: string;
}

/**
 * Official Colombian TRM (Superfinanciera via Socrata / datos.gov.co).
 * Public source, no API key.
 */
export class TrmColombiaProvider {
  readonly name = "trm-datos.gov.co";

  async getUsdRate(): Promise<RateQuote> {
    const url = `${TRM_ENDPOINT}?$order=vigenciadesde%20DESC&$limit=1`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`TRM datos.gov.co responded ${res.status}`);
    }
    const rows = (await res.json()) as TrmRow[];
    const row = rows[0];
    if (!row?.valor) {
      throw new Error("TRM datos.gov.co returned an empty response");
    }
    return {
      base: "COP",
      quote: "USD",
      rate: Number.parseFloat(row.valor),
      source: this.name,
      asOf: row.vigenciadesde,
    };
  }
}
