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
  builtAreaM2?: number | null;
  privateAreaM2?: number | null;
  priceCOP: number;
  floorPlanUrl?: string | null;
}

interface TypologySimulatorProps {
  typologies: TypologyOption[];
  terms: QuoteTerms;
  trusteeName?: string | null;
  trustNumber?: string | null;
  clientPortalUrl?: string | null;
}

/**
 * "Planos por tipología": picking Tipo A/B/C swaps the floor plan and
 * recalculates the whole breakdown for that unit's price.
 *
 * The breakdown used to be drawn twice — here and again in a sidebar card — the
 * duplication design comment #115 flagged. It now lives only here, beside the
 * plan it belongs to, and the sidebar keeps the form.
 *
 * It broadcasts the selection on `document` so the mobile price bar tracks the
 * same typology. A custom event rather than shared React state because the two
 * live in different Astro islands — separate roots that cannot share a provider.
 */
export default function TypologySimulator({
  typologies,
  terms,
  trusteeName,
  trustNumber,
  clientPortalUrl,
}: TypologySimulatorProps) {
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
        <div
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0"
          role="tablist"
          aria-label="Tipologías"
        >
          {typologies.map((typology, i) => (
            <button
              key={typology.name}
              type="button"
              role="tab"
              aria-selected={i === selected}
              onClick={() => setSelected(i)}
              className={`pill shrink-0 ${i === selected ? "pill-on" : "pill-off"}`}
            >
              {typology.name}
              {/* The area only fits beside the name on a wide screen; the phone
                  design shows "Tipo A" on its own. */}
              {typology.builtAreaM2 != null && (
                <span className="hidden md:inline">
                  &nbsp;· {typology.builtAreaM2.toFixed(2)} m²
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="border-line bg-surface flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-dashed">
            {current.floorPlanUrl ? (
              <img
                src={current.floorPlanUrl}
                alt={`Plano ${current.name}`}
                loading="lazy"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-body-sm text-ink-faint px-4 text-center">
                Plano {current.name}
                {current.builtAreaM2 != null ? ` · ${current.builtAreaM2.toFixed(2)} m²` : ""}
              </span>
            )}
          </div>
          {(current.builtAreaM2 != null || current.privateAreaM2 != null) && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {current.builtAreaM2 != null && (
                  <Stat
                    label="Á. construida desde*"
                    value={`${current.builtAreaM2.toFixed(2)} m²`}
                  />
                )}
                {current.privateAreaM2 != null && (
                  <Stat
                    label="Área privada desde*"
                    value={`${current.privateAreaM2.toFixed(2)} m²`}
                  />
                )}
              </div>
              <p className="text-caption text-ink-faint mt-3">
                *Puede variar en apartamentos atípicos según la unidad.
              </p>
            </>
          )}
        </div>

        <div className="bg-surface rounded-2xl p-5">
          <p className="text-label text-ink-muted font-bold uppercase">
            Simulador · {current.name}
          </p>

          <div className="mt-4 rounded-xl bg-white p-4">
            <p className="text-label text-ink-muted font-bold uppercase">Precio</p>
            <p className="text-ink mt-1 text-2xl font-extrabold">
              {formatMoney(quote.price, "COP")}
            </p>
          </div>

          {/* Hairlines between the rows, as the phone design draws them. */}
          <dl className="mt-4">
            <Row
              label={`CI ${terms.downPaymentPct}% en ${terms.builderInstallmentMonths}m`}
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

          <div className="bg-ink mt-4 rounded-xl p-5 text-white">
            <p className="text-label font-bold text-white/60 uppercase">Cuota hipotecaria est.</p>
            <p className="mt-1 text-2xl font-extrabold">
              {formatMoney(quote.monthlyPayment, "COP")}
              <span className="text-body-sm font-medium">/mes</span>
            </p>
            <p className="text-caption mt-1 text-white/60">
              {terms.annualRatePct}% EA · {terms.termYears} años
            </p>
          </div>

          {(trusteeName || trustNumber) && (
            <div className="mt-4 rounded-xl bg-white p-4">
              <p className="text-label text-ink-muted font-bold uppercase">Fiduciaria</p>
              {trusteeName && <p className="text-body-sm text-ink mt-1 font-bold">{trusteeName}</p>}
              {trustNumber && (
                <p className="text-caption text-ink-muted">Fideicomiso N° {trustNumber}</p>
              )}
            </div>
          )}

          {clientPortalUrl && (
            <a
              href={clientPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand text-body-sm mt-4 inline-flex items-center gap-2 font-medium hover:underline"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="4" width="14" height="16" rx="2" />
                <path d="M20 9v10a2 2 0 0 1-2 2" />
              </svg>
              Portal de pagos · Zona clientes →
            </a>
          )}

          <a href="#lead" className="btn btn-primary mt-5 w-full">
            Quiero más información
          </a>

          <p className="text-caption text-ink-faint mt-3 text-center">
            Valores estimados; no constituyen una oferta comercial.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface rounded-xl p-4">
      <p className="text-label text-ink-muted font-bold uppercase">{label}</p>
      <p className="text-ink mt-1 font-bold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line flex items-baseline justify-between gap-4 border-b py-3 last:border-b-0">
      <dt className="text-body-sm text-ink-muted">{label}</dt>
      <dd className="text-body-sm text-ink font-bold">{value}</dd>
    </div>
  );
}
