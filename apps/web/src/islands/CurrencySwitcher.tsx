import { useState } from "react";

import { convertFromCOP, formatMoney, type Currency } from "@/lib/currency";

interface CurrencySwitcherProps {
  copPorUsd: number;
  copPorEur: number;
}

const CURRENCIES: Currency[] = ["COP", "USD", "EUR"];

/**
 * Selector de divisa. Los precios se renderizan estáticos en COP con
 * data-price-cop; al cambiar de divisa se reformatean client-side con las
 * tasas embebidas en build (TRM + ECB vía el CMS).
 */
export default function CurrencySwitcher({ copPorUsd, copPorEur }: CurrencySwitcherProps) {
  const [currency, setCurrency] = useState<Currency>("COP");

  const cambiar = (next: Currency) => {
    setCurrency(next);
    document.querySelectorAll<HTMLElement>("[data-price-cop]").forEach((el) => {
      const cop = Number(el.dataset.priceCop);
      if (!Number.isFinite(cop)) return;
      el.textContent = formatMoney(convertFromCOP(cop, next, { copPorUsd, copPorEur }), next);
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
          onClick={() => cambiar(c)}
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
