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
          className="no-scrollbar -mx-5 mt-3.5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0"
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
              className={`pdp-pill shrink-0 ${i === selected ? "pdp-pill-on" : ""}`}
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

      <div className="mt-4 grid gap-6 lg:grid-cols-[803fr_509fr]">
        <div>
          <div className="bg-blush border-mist flex aspect-[803/490] items-center justify-center overflow-hidden rounded-[14px] border-[0.71px] border-dashed">
            {current.floorPlanUrl ? (
              <img
                src={current.floorPlanUrl}
                alt={`Plano ${current.name}`}
                loading="lazy"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-steel flex flex-col items-center gap-2.5 px-4 text-center text-[13px] leading-[19.5px] font-semibold">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
                Plano {current.name}
                {current.builtAreaM2 != null ? ` · ${current.builtAreaM2.toFixed(2)} m²` : ""}
              </span>
            )}
          </div>
          {(current.builtAreaM2 != null || current.privateAreaM2 != null) && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-6">
                {current.builtAreaM2 != null && (
                  <Stat
                    label="Área construida desde*"
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
              <p className="text-steel mt-2.5 text-[13px] leading-5">
                *Puede variar en apartamentos atípicos según la unidad.
              </p>
            </>
          )}
        </div>

        <div className="bg-brand-subtle border-cloud self-start rounded-[14px] border-[0.71px] px-6 py-[33px]">
          <p className="text-steel text-[11px] leading-[17.6px] font-bold tracking-[0.66px] uppercase">
            Simulador · {current.name}
          </p>

          <div className="mt-2 rounded-[12px] bg-white px-3.5 py-3">
            <p className={LABEL}>Precio</p>
            <p className="text-graphite mt-1 text-lg leading-[27px] font-extrabold">
              {formatMoney(quote.price, "COP")}
            </p>
          </div>

          {/* Hairlines between the rows, as the design draws them. */}
          <dl className="mt-3.5">
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

          <div className="bg-graphite mt-3.5 rounded-[12px] px-4 py-3.5 text-white">
            <p className={`${LABEL} text-pewter`}>Cuota hipotecaria est.</p>
            <p className="text-[22px] leading-[33px] font-extrabold">
              {formatMoney(quote.monthlyPayment, "COP")}
              <span className="text-xs leading-[18px] font-medium">/mes</span>
            </p>
            <p className="text-steel mt-[3px] text-[11px] leading-[16.5px]">
              {terms.annualRatePct}% EA · {terms.termYears} años
            </p>
          </div>

          {(trusteeName || trustNumber) && (
            <div className="mt-3.5 rounded-[12px] bg-white px-3.5 py-3">
              <p className={LABEL}>Fiduciaria</p>
              {trusteeName && (
                <p className="text-graphite mt-1 text-[13px] leading-[19.5px] font-bold">
                  {trusteeName}
                </p>
              )}
              {trustNumber && (
                <p className="text-steel text-xs leading-[18px]">Fideicomiso N° {trustNumber}</p>
              )}
            </div>
          )}

          {clientPortalUrl && (
            <a
              href={clientPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand mt-3 inline-flex items-center gap-1.5 text-[12.5px] leading-[18.75px] font-semibold hover:underline"
            >
              <svg
                width="14"
                height="14"
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

          <a
            href="#lead"
            className="bg-brand hover:bg-brand-bright mt-3.5 flex h-[44.5px] w-full items-center justify-center rounded-full text-[13px] leading-[19.5px] font-semibold text-white transition-colors"
          >
            Quiero más información
          </a>
        </div>
      </div>
    </div>
  );
}

/** The 10.5px caps label every box in the simulator starts with. */
const LABEL = "text-steel text-[10.5px] leading-[15.75px] tracking-[0.42px] uppercase";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-blush border-cloud rounded-[12px] border-[0.71px] p-3.5">
      <p className={LABEL}>{label}</p>
      <p className="text-graphite mt-1.5 text-[15px] leading-[22.5px] font-bold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-cloud flex items-baseline justify-between gap-4 border-b-[0.71px] py-2 last:border-b-0">
      <dt className="text-iron text-[13px] leading-[19.5px]">{label}</dt>
      <dd className="text-graphite text-right text-[13px] leading-[19.5px] font-bold">{value}</dd>
    </div>
  );
}
