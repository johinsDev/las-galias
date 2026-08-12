import { useMemo, useState } from "react";

import { formatMoney } from "@/lib/currency";
import { MoneyField, NumberField, Results, SelectField, SimulatorLayout } from "./SimulatorUI";

interface Props {
  defaultPriceCOP: number;
  /** Max share of the price a plain mortgage covers (CMS). */
  maxFinancingPercent: number;
  /** Same for leasing habitacional, which usually covers more (CMS). */
  leasingFinancingPercent: number;
}

const CREDIT_TYPES = [
  { value: "hipotecario", label: "Crédito hipotecario" },
  { value: "leasing", label: "Leasing habitacional" },
];

/**
 * "Simulador de Cuota Inicial": how much has to be saved, and at what monthly
 * pace, to cover the down payment of a given home.
 */
export default function DownPaymentSimulator({
  defaultPriceCOP,
  maxFinancingPercent,
  leasingFinancingPercent,
}: Props) {
  const [price, setPrice] = useState(defaultPriceCOP);
  const [downPct, setDownPct] = useState(30);
  const [creditType, setCreditType] = useState("hipotecario");
  const [savings, setSavings] = useState(20_000_000);
  const [months, setMonths] = useState(36);

  const result = useMemo(() => {
    const downPayment = price * (downPct / 100);
    const pending = Math.max(0, downPayment - savings);
    const financingPct = creditType === "leasing" ? leasingFinancingPercent : maxFinancingPercent;

    return {
      downPayment,
      financed: Math.max(0, price - downPayment),
      pending,
      monthlySaving: pending / Math.max(1, months),
      /** What the chosen product forces you to put in yourself. */
      minDownPct: Math.max(0, 100 - financingPct),
    };
  }, [price, downPct, creditType, savings, months, maxFinancingPercent, leasingFinancingPercent]);

  const creditLabel = CREDIT_TYPES.find((c) => c.value === creditType)!.label.toLowerCase();
  const covered = result.pending === 0;

  return (
    <SimulatorLayout
      form={
        <>
          <MoneyField
            id="down-price"
            label="Precio del proyecto"
            value={price}
            onChange={setPrice}
          />
          <NumberField
            id="down-pct"
            label="% cuota inicial"
            value={downPct}
            suffix="%"
            min={5}
            max={90}
            step={1}
            onChange={setDownPct}
          />
          <SelectField
            id="down-credit"
            label="Tipo de crédito"
            value={creditType}
            options={CREDIT_TYPES}
            onChange={setCreditType}
          />
          <MoneyField
            id="down-savings"
            label="Ahorros para cuota inicial"
            value={savings}
            onChange={setSavings}
          />
          <NumberField
            id="down-months"
            label="Plazo cuota inicial (meses)"
            value={months}
            suffix="meses"
            min={1}
            max={72}
            onChange={setMonths}
          />
        </>
      }
      results={
        <Results
          rows={[
            { label: "Cuota inicial", value: formatMoney(result.downPayment, "COP") },
            { label: "Monto a financiar", value: formatMoney(result.financed, "COP") },
          ]}
          highlight={{
            label: covered ? "Ya tienes la cuota inicial" : "Ahorro mensual necesario",
            value: formatMoney(result.monthlySaving, "COP"),
            suffix: covered ? undefined : "/mes",
            sub: covered
              ? "Tus ahorros ya cubren la cuota inicial de este precio."
              : `Faltan ${formatMoney(result.pending, "COP")} en ${months} meses`,
          }}
          note={
            downPct >= result.minDownPct
              ? {
                  ok: true,
                  text: `Cumples la cuota inicial mínima (${result.minDownPct}%) para ${creditLabel}.`,
                }
              : {
                  ok: false,
                  text: `Con ${creditLabel} suele pedirse al menos ${result.minDownPct}% de cuota inicial.`,
                }
          }
        />
      }
    />
  );
}
