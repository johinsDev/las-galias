import { useMemo, useState } from "react";

import { formatMoney } from "@/lib/currency";
import { downPaymentPlan, SUBSIDY_TIERS_SMMLV, subsidyInCOP } from "@/lib/simulators";
import {
  ChoiceField,
  MoneyField,
  NumberField,
  Results,
  SelectField,
  SimulatorLayout,
} from "./SimulatorUI";

interface Props {
  defaultPriceCOP: number;
  /** Max share of the price a plain mortgage covers (CMS). */
  maxFinancingPercent: number;
  /** Same for leasing habitacional, which usually covers more (CMS). */
  leasingFinancingPercent: number;
  /** This year's minimum wage, so the subsidy tiers can be shown in pesos (CMS). */
  smmlvCOP: number;
}

const CREDIT_TYPES = [
  { value: "hipotecario", label: "Crédito hipotecario" },
  { value: "leasing", label: "Leasing habitacional" },
];

/**
 * "Simulador de Cuota Inicial": how much has to be saved, and at what monthly
 * pace, to cover the down payment of a given home — with the Mi Casa Ya
 * subsidy taken off first when the household qualifies for one.
 */
export default function DownPaymentSimulator({
  defaultPriceCOP,
  maxFinancingPercent,
  leasingFinancingPercent,
  smmlvCOP,
}: Props) {
  const [price, setPrice] = useState(defaultPriceCOP);
  const [downPct, setDownPct] = useState(30);
  const [creditType, setCreditType] = useState("hipotecario");
  const [savings, setSavings] = useState(20_000_000);
  const [subsidyTier, setSubsidyTier] = useState("0");
  const [months, setMonths] = useState(36);

  // «20 SMMLV» on its own says nothing; each tier carries this year's pesos.
  const subsidyOptions = useMemo(
    () =>
      SUBSIDY_TIERS_SMMLV.map((tier) =>
        tier === 0
          ? { value: "0", label: "No aplico", hint: "Sin subsidio" }
          : {
              value: String(tier),
              label: `${tier} SMMLV`,
              hint: formatMoney(subsidyInCOP(tier, smmlvCOP), "COP"),
            },
      ),
    [smmlvCOP],
  );

  const result = useMemo(
    () =>
      downPaymentPlan({
        price,
        downPct,
        savings,
        subsidy: subsidyInCOP(Number(subsidyTier), smmlvCOP),
        months,
        financingPct: creditType === "leasing" ? leasingFinancingPercent : maxFinancingPercent,
      }),
    [
      price,
      downPct,
      savings,
      subsidyTier,
      smmlvCOP,
      months,
      creditType,
      leasingFinancingPercent,
      maxFinancingPercent,
    ],
  );

  const creditLabel = CREDIT_TYPES.find((c) => c.value === creditType)!.label.toLowerCase();
  const covered = result.pending === 0;
  const withSubsidy = result.subsidy > 0;

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
          <ChoiceField
            label="¿Aplicas a subsidio de vivienda?"
            badge="Nuevo"
            value={subsidyTier}
            options={subsidyOptions}
            onChange={setSubsidyTier}
            help={
              <>
                El subsidio se resta de la cuota inicial, así que baja el ahorro mensual.{" "}
                <strong className="text-ink font-semibold">30 SMMLV</strong> si el hogar gana menos
                de 2 salarios mínimos; <strong className="text-ink font-semibold">20 SMMLV</strong>{" "}
                entre 2 y 4. Aplica solo a vivienda nueva VIS.{" "}
                <a
                  href="/simuladores#subsidio"
                  className="text-brand font-semibold hover:underline"
                >
                  Ver subsidios →
                </a>
              </>
            }
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
            ...(withSubsidy
              ? [
                  {
                    label: "Subsidio de vivienda",
                    value: `− ${formatMoney(result.subsidy, "COP")}`,
                  },
                ]
              : []),
            { label: "Monto a financiar", value: formatMoney(result.financed, "COP") },
          ]}
          highlight={{
            label: covered ? "Ya tienes la cuota inicial" : "Ahorro mensual necesario",
            value: formatMoney(result.monthlySaving, "COP"),
            suffix: covered ? undefined : "/mes",
            sub: covered
              ? withSubsidy
                ? "Tus ahorros y el subsidio ya cubren la cuota inicial de este precio."
                : "Tus ahorros ya cubren la cuota inicial de este precio."
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
