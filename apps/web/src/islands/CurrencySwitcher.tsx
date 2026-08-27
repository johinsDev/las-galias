import { useEffect, useState } from "react";

import { convertFromCOP, formatMoney, type Currency } from "@/lib/currency";

interface CurrencySwitcherProps {
  copPerUsd: number;
  copPerEur: number;
  /** Date the rate is valid from, for the tooltip. */
  asOf?: string | null;
  /** Who published it ("trm-datos.gov.co × frankfurter.app (ECB)"). */
  source?: string | null;
}

const CURRENCIES: Currency[] = ["COP", "USD", "EUR"];
const STORAGE_KEY = "lg:currency";

/**
 * Which currency to open in when the visitor has not chosen one.
 *
 * The brief asked for this to key off the visitor's IP. The site is 100%
 * static — the HTML is baked at build time, so there is no request and no IP to
 * read at render time. The browser's own timezone is the closest signal that
 * costs nothing: no edge function, no per-request invocation, no cache split.
 *
 * It is a guess, not a location: a Colombian travelling through Madrid opens in
 * EUR. That is why the manual choice always wins and is remembered.
 */
function detectCurrency(): Currency {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz.startsWith("Europe/")) return "EUR";
    if (tz === "America/Bogota") return "COP";
    // Everywhere else defaults to USD: this site sells to Colombians at home
    // and to Colombians abroad, and abroad the dollar is the shared yardstick.
    return tz ? "USD" : "COP";
  } catch {
    return "COP";
  }
}

function readStored(): Currency | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return CURRENCIES.includes(stored as Currency) ? (stored as Currency) : null;
  } catch {
    // Private mode / storage disabled. Not a reason to render nothing.
    return null;
  }
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
 * It lives in the site header rather than on the project page alone, so the
 * listings, the home and the cards convert too — `paintPrices` already rewrites
 * every tagged node in the document, so no page needs to know about it.
 *
 * The selection is kept in sessionStorage and re-applied on `astro:page-load`.
 * Base.astro mounts <ClientRouter />, so without that the island would remount
 * showing COP while the freshly swapped-in prices went unconverted — the
 * selector and the prices would disagree.
 */
export default function CurrencySwitcher({
  copPerUsd,
  copPerEur,
  asOf,
  source,
}: CurrencySwitcherProps) {
  const [currency, setCurrency] = useState<Currency>("COP");

  useEffect(() => {
    const rates = { copPerUsd, copPerEur };

    const apply = () => {
      const next = readStored() ?? detectCurrency();
      setCurrency(next);
      if (next !== "COP") paintPrices(next, rates);
    };

    apply();
    document.addEventListener("astro:page-load", apply);
    return () => document.removeEventListener("astro:page-load", apply);
  }, [copPerUsd, copPerEur]);

  const switchTo = (next: Currency) => {
    setCurrency(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage refused: the switch still works for this page view.
    }
    paintPrices(next, { copPerUsd, copPerEur });
  };

  // Where the number came from, on hover. Kept out of the layout because the
  // selector sits in a sticky header, where an extra line would move the page.
  const rateFor = (c: Currency) => (c === "USD" ? copPerUsd : copPerEur);
  const title =
    currency === "COP"
      ? "Precios en pesos colombianos"
      : [
          `1 ${currency} ≈ ${formatMoney(rateFor(currency), "COP")}`,
          source,
          asOf ? `vigente desde ${new Date(asOf).toLocaleDateString("es-CO")}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div
      className="border-line inline-flex items-center gap-1 rounded-full border bg-white p-1"
      role="group"
      aria-label="Divisa de los precios"
      title={title}
    >
      {CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => switchTo(c)}
          aria-pressed={currency === c}
          className={`text-caption rounded-full px-2.5 py-1 font-semibold transition-colors ${
            currency === c ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
