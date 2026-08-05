import { useEffect, useState } from "react";

import { formatMoney } from "@/lib/currency";
import {
  quoteFor,
  TYPOLOGY_EVENT,
  type QuoteTerms,
  type TypologyChangeDetail,
} from "@/lib/mortgage";

interface StickyQuoteProps {
  /** Fallback price when no typology has been picked (project "precio desde"). */
  basePrice: number;
  baseLabel?: string;
  terms: QuoteTerms;
  trusteeName?: string | null;
  trustNumber?: string | null;
  clientPortalUrl?: string | null;
}

/**
 * The PDP sticky sidebar breakdown. Mirrors whatever typology the simulator has
 * selected — it listens for TYPOLOGY_EVENT instead of owning the state, so the
 * two panels can never show different numbers.
 */
export default function StickyQuote({
  basePrice,
  baseLabel,
  terms,
  trusteeName,
  trustNumber,
  clientPortalUrl,
}: StickyQuoteProps) {
  const [price, setPrice] = useState(basePrice);
  const [label, setLabel] = useState(baseLabel ?? null);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<TypologyChangeDetail>).detail;
      if (!detail || !Number.isFinite(detail.price)) return;
      setPrice(detail.price);
      setLabel(detail.name);
    };
    document.addEventListener(TYPOLOGY_EVENT, onChange);
    return () => document.removeEventListener(TYPOLOGY_EVENT, onChange);
  }, []);

  const quote = quoteFor(price, terms);

  return (
    <div className="border-line rounded-2xl border bg-white p-6">
      <p className="eyebrow">Precio {label ? `(${label})` : "desde"}</p>
      <p className="text-h4 text-ink font-extrabold">{formatMoney(quote.price, "COP")}</p>

      <dl className="border-line mt-4 space-y-2 border-t pt-4">
        <Row
          label={`CI ${terms.downPaymentPct}% en ${terms.builderInstallmentMonths}m`}
          value={formatMoney(quote.downPayment, "COP")}
        />
        <Row
          label="Cuota constructora/mes"
          value={`≈ ${formatMoney(quote.builderMonthly, "COP")}`}
        />
        <Row
          label={`A financiar (${100 - terms.downPaymentPct}%)`}
          value={formatMoney(quote.financed, "COP")}
        />
        <Row label="Tasa est." value={`${terms.annualRatePct}% EA`} />
      </dl>

      <div className="bg-ink mt-4 rounded-xl p-4 text-white">
        <p className="eyebrow !text-white/60">Cuota hipotecaria est.</p>
        <p className="text-h4 font-extrabold">
          {formatMoney(quote.monthlyPayment, "COP")}
          <span className="text-body-sm font-medium">/mes</span>
        </p>
      </div>

      {(trusteeName || trustNumber) && (
        <div className="bg-surface mt-4 rounded-xl p-4">
          <p className="eyebrow">Fiduciaria</p>
          {trusteeName && <p className="text-body-sm text-ink mt-1 font-semibold">{trusteeName}</p>}
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
          className="bg-surface text-body-sm text-ink hover:bg-surface-2 mt-3 block rounded-xl p-4 transition-colors"
        >
          <span className="text-caption text-ink-muted block">Portal de pagos</span>
          🔒 Zona clientes · Ver mis cuotas →
        </a>
      )}

      <a href="#lead" className="btn btn-primary mt-4 w-full">
        Quiero más información
      </a>
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
