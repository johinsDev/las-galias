import { useEffect, useState } from "react";

import { convertFromCOP, formatMoney, type Currency } from "@/lib/currency";

interface CurrencySwitcherProps {
  copPerUsd: number;
  copPerEur: number;
}

const CURRENCIES: Currency[] = ["COP", "USD", "EUR"];
const STORAGE_KEY = "lg:currency";

function readStored(): Currency {
  if (typeof sessionStorage === "undefined") return "COP";
  const stored = sessionStorage.getItem(STORAGE_KEY);
  return CURRENCIES.includes(stored as Currency) ? (stored as Currency) : "COP";
}

/** Rewrites every [data-price-cop] node on the page into `next`. */
function paintPrices(next: Currency, rates: { copPerUsd: number; copPerEur: number }) {
  document.querySelectorAll<HTMLElement>("[data-price-cop]").forEach((el) => {
    const cop = Number(el.dataset.priceCop);
    if (!Number.isFinite(cop)) return;
    el.textContent = formatMoney(convertFromCOP(cop, next, rates), next);
  });
}

/**
 * Currency selector. Prices render statically in COP carrying `data-price-cop`;
 * switching reformats them client-side with the rates baked at build time
 * (TRM + ECB via the CMS).
 *
 * The selection is kept in sessionStorage and re-applied on `astro:page-load`.
 * Base.astro mounts <ClientRouter />, so without that the island would remount
 * showing COP while the freshly swapped-in prices went unconverted — the
 * selector and the prices would disagree.
 */
export default function CurrencySwitcher({ copPerUsd, copPerEur }: CurrencySwitcherProps) {
  const [currency, setCurrency] = useState<Currency>("COP");

  useEffect(() => {
    const rates = { copPerUsd, copPerEur };

    const apply = () => {
      const next = readStored();
      setCurrency(next);
      if (next !== "COP") paintPrices(next, rates);
    };

    apply();
    document.addEventListener("astro:page-load", apply);
    return () => document.removeEventListener("astro:page-load", apply);
  }, [copPerUsd, copPerEur]);

  const switchTo = (next: Currency) => {
    setCurrency(next);
    sessionStorage.setItem(STORAGE_KEY, next);
    paintPrices(next, { copPerUsd, copPerEur });
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
            currency === c ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
