import { useEffect, useState } from "react";

import { formatMoney } from "@/lib/currency";
import {
  quoteFor,
  TYPOLOGY_EVENT,
  type QuoteTerms,
  type TypologyChangeDetail,
} from "@/lib/mortgage";

export interface TypologyOption {
  name: string;
  /** The schema has a single area per unit type, so that is what we show. */
  areaM2?: number | null;
  priceCOP: number;
  floorPlanUrl?: string | null;
}

interface TypologySimulatorProps {
  typologies: TypologyOption[];
  terms: QuoteTerms;
}

/**
 * "Planos por tipología + simulador": picking Tipo A/B/C swaps the floor plan
 * and recalculates the whole breakdown for that unit's price.
 *
 * It also broadcasts the selection on `document` so the sticky sidebar reflects
 * the same typology. A custom event rather than shared React state because the
 * two live in different Astro islands — separate React roots that cannot share
 * a provider.
 */
export default function TypologySimulator({ typologies, terms }: TypologySimulatorProps) {
  const [selected, setSelected] = useState(0);

  const current = typologies[selected];

  useEffect(() => {
    if (!current) return;
    const detail: TypologyChangeDetail = {
      index: selected,
      name: current.name,
      price: current.priceCOP,
    };
    document.dispatchEvent(new CustomEvent(TYPOLOGY_EVENT, { detail }));
  }, [selected, current]);

  if (!current) return null;

  const quote = quoteFor(current.priceCOP, terms);

  return (
    <div>
      {typologies.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipologías">
          {typologies.map((typology, i) => (
            <button
              key={typology.name}
              type="button"
              role="tab"
              aria-selected={i === selected}
              onClick={() => setSelected(i)}
              className={`chip transition-colors ${
                i === selected ? "!bg-ink !border-ink !text-white" : "hover:bg-surface"
              }`}
            >
              {typology.name}
              {typology.areaM2 ? ` · ${typology.areaM2} m²` : ""}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="border-line bg-surface flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border">
            {current.floorPlanUrl ? (
              <img
                src={current.floorPlanUrl}
                alt={`Plano ${current.name}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-caption text-ink-faint">Plano no disponible</span>
            )}
          </div>
          {current.areaM2 != null && (
            <div className="border-line mt-3 rounded-xl border p-3">
              <p className="eyebrow">Área</p>
              <p className="text-ink mt-1 font-bold">{current.areaM2} m²</p>
            </div>
          )}
        </div>

        <div className="bg-surface rounded-2xl p-5">
          <p className="text-body-sm text-ink font-semibold">Simulador · {current.name}</p>

          <div className="mt-4 rounded-xl bg-white p-4">
            <p className="eyebrow">Precio</p>
            <p className="text-h4 text-ink font-extrabold">{formatMoney(quote.price, "COP")}</p>
          </div>

          <dl className="mt-4 space-y-2">
            <Row
              label={`CI ${terms.downPaymentPct}%`}
              value={formatMoney(quote.downPayment, "COP")}
            />
            <Row
              label={`Cuota constructora (${terms.builderInstallmentMonths}m)`}
              value={`≈ ${formatMoney(quote.builderMonthly, "COP")}/mes`}
            />
            <Row
              label={`A financiar (${100 - terms.downPaymentPct}%)`}
              value={formatMoney(quote.financed, "COP")}
            />
          </dl>

          <div className="bg-ink mt-4 rounded-xl p-4 text-white">
            <p className="eyebrow !text-white/60">Cuota hipotecaria est.</p>
            <p className="text-h4 font-extrabold">
              {formatMoney(quote.monthlyPayment, "COP")}
              <span className="text-body-sm font-medium">/mes</span>
            </p>
            <p className="text-caption mt-1 text-white/60">
              {terms.annualRatePct}% EA · {terms.termYears} años
            </p>
          </div>

          <p className="text-caption text-ink-muted mt-3">
            Valores estimados; no constituyen una oferta comercial.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="text-body-sm text-ink font-medium">{value}</dd>
    </div>
  );
}
