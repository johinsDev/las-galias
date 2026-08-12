import { useMemo, useState } from "react";

import { formatMoney } from "@/lib/currency";
import { approxMillions, maxLoanFor } from "@/lib/simulators";
import { MoneyField, Results, SimulatorLayout, ToggleField } from "./SimulatorUI";

interface Props {
  annualInterestRate: number;
  maxTermYears: number;
  maxFinancingPercent: number;
  visFinancingPercent: number;
  /** Share of the DISPOSABLE income recommended as an instalment (CMS). */
  paymentIncomeRatioPercent: number;
}

const HOUSING_TYPES = [
  { value: "vis", label: "VIS" },
  { value: "no-vis", label: "No VIS" },
];

/**
 * "Simulador de Capacidad de Pago": works backwards from what is left over each
 * month to the instalment — and therefore the home price — that fits it.
 */
export default function AffordabilitySimulator({
  annualInterestRate,
  maxTermYears,
  maxFinancingPercent,
  visFinancingPercent,
  paymentIncomeRatioPercent,
}: Props) {
  const [income, setIncome] = useState(8_000_000);
  const [expenses, setExpenses] = useState(3_500_000);
  const [housingType, setHousingType] = useState("vis");

  const isVis = housingType === "vis";

  const result = useMemo(() => {
    const disposable = Math.max(0, income - expenses);
    const maxPayment = disposable * (paymentIncomeRatioPercent / 100);
    const loan = maxLoanFor(maxPayment, annualInterestRate, maxTermYears);
    const financingPct = isVis ? visFinancingPercent : maxFinancingPercent;
    // From the loan back to a price: the rest is the down payment the buyer puts in.
    const price = financingPct > 0 ? loan / (financingPct / 100) : 0;
    return { disposable, maxPayment, price };
  }, [
    income,
    expenses,
    isVis,
    annualInterestRate,
    maxTermYears,
    maxFinancingPercent,
    visFinancingPercent,
    paymentIncomeRatioPercent,
  ]);

  return (
    <SimulatorLayout
      form={
        <>
          <MoneyField
            id="afford-income"
            label="Ingresos mensuales"
            value={income}
            onChange={setIncome}
          />
          <MoneyField
            id="afford-expenses"
            label="Gastos mensuales"
            value={expenses}
            onChange={setExpenses}
          />
          <ToggleField
            label="Tipo de vivienda"
            value={housingType}
            options={HOUSING_TYPES}
            onChange={setHousingType}
          />
        </>
      }
      results={
        <Results
          rows={[{ label: "Ingreso disponible", value: formatMoney(result.disposable, "COP") }]}
          highlight={{
            label: "Cuota máxima recomendada",
            value: formatMoney(result.maxPayment, "COP"),
            suffix: "/mes",
            sub: `${paymentIncomeRatioPercent}% del ingreso disponible · Tipo ${isVis ? "VIS" : "No VIS"}`,
          }}
          note={
            result.maxPayment > 0
              ? {
                  ok: true,
                  text: `Con esta cuota podrías acceder a vivienda ${
                    isVis ? "VIS" : "No VIS"
                  } desde ${approxMillions(result.price)}.`,
                }
              : {
                  ok: false,
                  text: "Con estos ingresos y gastos no queda margen para una cuota. Revisa las cifras.",
                }
          }
        />
      }
    />
  );
}
