import { useMemo, useState } from "react";

import { formatMoney } from "@/lib/currency";
import { monthlyPayment, percentOf } from "@/lib/simulators";
import { MoneyField, NumberField, Results, SelectField, SimulatorLayout } from "./SimulatorUI";

interface Props {
  defaultPriceCOP: number;
  /** Reference rate and ceilings, all from `calculator-config`. */
  annualInterestRate: number;
  maxTermYears: number;
  maxFinancingPercent: number;
  maxIncomeRatioPercent: number;
}

/**
 * "Simulador de Crédito Hipotecario": the monthly instalment, plus the share of
 * the household income it eats — the figure that actually decides whether a
 * bank approves the loan.
 */
export default function MortgageSimulator({
  defaultPriceCOP,
  annualInterestRate,
  maxTermYears,
  maxFinancingPercent,
  maxIncomeRatioPercent,
}: Props) {
  const [price, setPrice] = useState(defaultPriceCOP);
  const [financingPct, setFinancingPct] = useState(Math.min(70, maxFinancingPercent));
  const [termYears, setTermYears] = useState(Math.min(15, maxTermYears));
  const [ratePct, setRatePct] = useState(annualInterestRate);
  const [income, setIncome] = useState(8_000_000);

  // Only the tranches the CMS ceiling allows, so the form can never offer a
  // percentage the company does not actually finance.
  const financingOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let pct = 40; pct <= maxFinancingPercent; pct += 5) {
      options.push({
        value: String(pct),
        label: `${pct}% · ${formatMoney(price * (pct / 100), "COP")}`,
      });
    }
    return options;
  }, [maxFinancingPercent, price]);

  const result = useMemo(() => {
    const loan = price * (financingPct / 100);
    const payment = monthlyPayment(loan, ratePct, termYears);
    return { loan, payment, incomeRatio: percentOf(payment, income) };
  }, [price, financingPct, ratePct, termYears, income]);

  const withinLimit = result.incomeRatio <= maxIncomeRatioPercent;

  return (
    <SimulatorLayout
      form={
        <>
          <MoneyField
            id="mortgage-price"
            label="Precio del proyecto"
            value={price}
            onChange={setPrice}
          />
          <SelectField
            id="mortgage-financing"
            label="¿Cuánto necesitas que te presten?"
            value={String(financingPct)}
            options={financingOptions}
            onChange={(value) => setFinancingPct(Number(value))}
          />
          <NumberField
            id="mortgage-term"
            label="Plazo"
            value={termYears}
            suffix="años"
            min={5}
            max={maxTermYears}
            onChange={setTermYears}
          />
          <NumberField
            id="mortgage-rate"
            label="Tasa de interés"
            value={ratePct}
            suffix="% E.A."
            min={1}
            max={40}
            step={0.05}
            onChange={setRatePct}
          />
          <MoneyField
            id="mortgage-income"
            label="Ingresos familiares mensuales"
            value={income}
            onChange={setIncome}
          />
        </>
      }
      results={
        <Results
          rows={[
            { label: "Monto a financiar", value: formatMoney(result.loan, "COP") },
            { label: "% ingresos comprometidos", value: `${result.incomeRatio}% de tus ingresos` },
          ]}
          highlight={{
            label: "Cuota mensual estimada",
            value: formatMoney(result.payment, "COP"),
            suffix: "/mes",
            sub: `${ratePct}% E.A. · ${termYears} años · Sistema francés`,
          }}
          note={
            withinLimit
              ? {
                  ok: true,
                  text: `Dentro del límite recomendado (máx. ${maxIncomeRatioPercent}% de ingresos).`,
                }
              : {
                  ok: false,
                  text: `Supera el límite recomendado (máx. ${maxIncomeRatioPercent}% de ingresos). Baja el monto o amplía el plazo.`,
                }
          }
        />
      }
    />
  );
}
