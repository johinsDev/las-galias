import { useMemo, useState } from "react";

import { formatMoney } from "@/lib/currency";

interface MortgageCalculatorProps {
  priceFromCOP: number;
  /** Effective annual rate, in percent (e.g. 12.5). Only admins change it. */
  annualInterestRate: number;
  maxTermYears: number;
  maxFinancingPercent: number;
}

/**
 * Mortgage payment calculator. The interest rate comes from the
 * `calculator-config` single type (baked at build time; admin-only edits).
 */
export default function MortgageCalculator({
  priceFromCOP,
  annualInterestRate,
  maxTermYears,
  maxFinancingPercent,
}: MortgageCalculatorProps) {
  const [price, setPrice] = useState(priceFromCOP);
  const [downPaymentPct, setDownPaymentPct] = useState(100 - maxFinancingPercent);
  const [termYears, setTermYears] = useState(Math.min(20, maxTermYears));

  const { monthlyPayment, financedAmount } = useMemo(() => {
    const financed = price * (1 - downPaymentPct / 100);
    const monthlyRate = Math.pow(1 + annualInterestRate / 100, 1 / 12) - 1;
    const n = termYears * 12;
    const payment =
      monthlyRate === 0
        ? financed / n
        : (financed * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
    return { monthlyPayment: payment, financedAmount: financed };
  }, [price, downPaymentPct, termYears, annualInterestRate]);

  return (
    <div className="shadow-card rounded-xl bg-white p-6">
      <h3 className="text-h4 text-ink font-bold">Simula tu cuota</h3>
      <p className="text-caption text-ink-muted mt-1">
        Tasa de referencia: {annualInterestRate}% E.A. Valores estimados, no constituyen oferta.
      </p>

      <div className="mt-5 space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <label className="text-body-sm text-ink font-medium" htmlFor="calc-price">
              Valor del inmueble
            </label>
            <span className="text-body-sm text-verde-700 font-semibold">
              {formatMoney(price, "COP")}
            </span>
          </div>
          <input
            id="calc-price"
            type="range"
            min={priceFromCOP}
            max={priceFromCOP * 3}
            step={1_000_000}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="accent-verde-700 mt-2 w-full"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-body-sm text-ink font-medium" htmlFor="calc-down-payment">
              Cuota inicial
            </label>
            <span className="text-body-sm text-verde-700 font-semibold">{downPaymentPct}%</span>
          </div>
          <input
            id="calc-down-payment"
            type="range"
            min={100 - maxFinancingPercent}
            max={90}
            step={5}
            value={downPaymentPct}
            onChange={(e) => setDownPaymentPct(Number(e.target.value))}
            className="accent-verde-700 mt-2 w-full"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-body-sm text-ink font-medium" htmlFor="calc-term">
              Plazo
            </label>
            <span className="text-body-sm text-verde-700 font-semibold">{termYears} años</span>
          </div>
          <input
            id="calc-term"
            type="range"
            min={5}
            max={maxTermYears}
            step={1}
            value={termYears}
            onChange={(e) => setTermYears(Number(e.target.value))}
            className="accent-verde-700 mt-2 w-full"
          />
        </div>
      </div>

      <div className="bg-verde-100 mt-6 rounded-lg p-4 text-center">
        <p className="text-caption text-verde-900/70 uppercase">Cuota mensual estimada</p>
        <p className="text-h3 text-verde-900 font-extrabold">
          {formatMoney(monthlyPayment, "COP")}
        </p>
        <p className="text-caption text-verde-900/70 mt-1">
          Financiando {formatMoney(financedAmount, "COP")}
        </p>
      </div>
    </div>
  );
}
