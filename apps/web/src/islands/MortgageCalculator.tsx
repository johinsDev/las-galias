import { useMemo, useState } from "react";

import { formatMoney } from "@/lib/currency";

interface MortgageCalculatorProps {
  precioDesdeCOP: number;
  /** Tasa efectiva anual, en porcentaje (ej. 12.5). Solo el admin la cambia. */
  tasaInteresEA: number;
  plazoMaxAnios: number;
  porcentajeFinanciacionMax: number;
}

/**
 * Calculadora de cuota hipotecaria. La tasa de interés viene del single type
 * `configuracion-calculadora` (embebida en build; solo administradores la editan).
 */
export default function MortgageCalculator({
  precioDesdeCOP,
  tasaInteresEA,
  plazoMaxAnios,
  porcentajeFinanciacionMax,
}: MortgageCalculatorProps) {
  const [precio, setPrecio] = useState(precioDesdeCOP);
  const [cuotaInicialPct, setCuotaInicialPct] = useState(100 - porcentajeFinanciacionMax);
  const [plazoAnios, setPlazoAnios] = useState(Math.min(20, plazoMaxAnios));

  const { cuotaMensual, montoFinanciado } = useMemo(() => {
    const financiado = precio * (1 - cuotaInicialPct / 100);
    const tasaMensual = Math.pow(1 + tasaInteresEA / 100, 1 / 12) - 1;
    const n = plazoAnios * 12;
    const cuota =
      tasaMensual === 0
        ? financiado / n
        : (financiado * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -n));
    return { cuotaMensual: cuota, montoFinanciado: financiado };
  }, [precio, cuotaInicialPct, plazoAnios, tasaInteresEA]);

  return (
    <div className="shadow-card rounded-xl bg-white p-6">
      <h3 className="text-h4 text-ink font-bold">Simula tu cuota</h3>
      <p className="text-caption text-ink-muted mt-1">
        Tasa de referencia: {tasaInteresEA}% E.A. Valores estimados, no constituyen oferta.
      </p>

      <div className="mt-5 space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <label className="text-body-sm text-ink font-medium" htmlFor="calc-precio">
              Valor del inmueble
            </label>
            <span className="text-body-sm text-verde-700 font-semibold">
              {formatMoney(precio, "COP")}
            </span>
          </div>
          <input
            id="calc-precio"
            type="range"
            min={precioDesdeCOP}
            max={precioDesdeCOP * 3}
            step={1_000_000}
            value={precio}
            onChange={(e) => setPrecio(Number(e.target.value))}
            className="accent-verde-700 mt-2 w-full"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-body-sm text-ink font-medium" htmlFor="calc-cuota-inicial">
              Cuota inicial
            </label>
            <span className="text-body-sm text-verde-700 font-semibold">{cuotaInicialPct}%</span>
          </div>
          <input
            id="calc-cuota-inicial"
            type="range"
            min={100 - porcentajeFinanciacionMax}
            max={90}
            step={5}
            value={cuotaInicialPct}
            onChange={(e) => setCuotaInicialPct(Number(e.target.value))}
            className="accent-verde-700 mt-2 w-full"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-body-sm text-ink font-medium" htmlFor="calc-plazo">
              Plazo
            </label>
            <span className="text-body-sm text-verde-700 font-semibold">{plazoAnios} años</span>
          </div>
          <input
            id="calc-plazo"
            type="range"
            min={5}
            max={plazoMaxAnios}
            step={1}
            value={plazoAnios}
            onChange={(e) => setPlazoAnios(Number(e.target.value))}
            className="accent-verde-700 mt-2 w-full"
          />
        </div>
      </div>

      <div className="bg-verde-100 mt-6 rounded-lg p-4 text-center">
        <p className="text-caption text-verde-900/70 uppercase">Cuota mensual estimada</p>
        <p className="text-h3 text-verde-900 font-extrabold">{formatMoney(cuotaMensual, "COP")}</p>
        <p className="text-caption text-verde-900/70 mt-1">
          Financiando {formatMoney(montoFinanciado, "COP")}
        </p>
      </div>
    </div>
  );
}
