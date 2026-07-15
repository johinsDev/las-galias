import { useState } from "react";

import { convertFromCOP, formatMoney, type Currency } from "@/lib/currency";

interface CurrencySwitcherProps {
  copPerUsd: number;
  copPerEur: number;
}

const CURRENCIES: Currency[] = ["COP", "USD", "EUR"];

/**
 * Currency selector. Prices render statically in COP with data-price-cop;
 * switching currencies reformats them client-side with the rates baked at
 * build time (TRM + ECB via the CMS).
 */
export default function CurrencySwitcher({ copPerUsd, copPerEur }: CurrencySwitcherProps) {
  const [currency, setCurrency] = useState<Currency>("COP");

  const switchTo = (next: Currency) => {
    setCurrency(next);
    document.querySelectorAll<HTMLElement>("[data-price-cop]").forEach((el) => {
      const cop = Number(el.dataset.priceCop);
      if (!Number.isFinite(cop)) return;
      el.textContent = formatMoney(convertFromCOP(cop, next, { copPerUsd, copPerEur }), next);
    });
  };

  return (
    <div
      className="border-line inline-flex items-center gap-1 rounded-full border bg-white p-1"
      role="group"
      aria-label="Divisa de los precios"
    >
      {CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => switchTo(c)}
          aria-pressed={currency === c}
          className={`text-caption rounded-full px-3 py-1 font-semibold transition-colors ${
            currency === c ? "bg-verde-700 text-white" : "text-ink-muted hover:text-ink"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
