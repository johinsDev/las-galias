import type { ReactNode } from "react";

import { formatMoney } from "@/lib/currency";

/**
 * The shared skin of the three simulators: inputs on the left, a "Resultados"
 * panel on the right whose last row is the black instalment card. Keeping it in
 * one place is what stops the three from drifting apart visually.
 */

const FIELD =
  "border-line-strong text-body-sm text-ink h-11 w-full rounded-lg border bg-white px-3 outline-none transition-colors focus:border-ink";

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label className="eyebrow block" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

/** Digits only, grouped as the visitor types: "$ 300.000.000". */
export function MoneyField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        className={`${FIELD} mt-1.5`}
        value={formatMoney(value, "COP")}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
      />
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  suffix,
  min,
  max,
  step = 1,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type="number"
          className={FIELD}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && (
          <span className="text-body-sm text-ink-faint pointer-events-none absolute inset-y-0 right-3 flex items-center">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className={`${FIELD} mt-1.5`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Two-state segmented control — the design's VIS / No VIS switch. */
export function ToggleField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <div
        className="border-line-strong mt-1.5 inline-flex rounded-lg border bg-white p-1"
        role="group"
        aria-label={label}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`text-body-sm rounded-md px-4 py-1.5 font-medium transition-colors ${
                active ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface ResultsProps {
  rows: { label: string; value: string }[];
  highlight: { label: string; value: string; suffix?: string; sub?: string };
  note: { ok: boolean; text: string };
}

export function Results({ rows, highlight, note }: ResultsProps) {
  return (
    <div className="bg-surface rounded-2xl p-5">
      <p className="text-body-sm text-ink font-semibold">Resultados</p>

      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl bg-white p-4">
            <p className="eyebrow">{row.label}</p>
            <p className="text-ink mt-1 text-lg font-bold">{row.value}</p>
          </div>
        ))}

        <div className="bg-ink rounded-xl p-4 text-white">
          <p className="text-label font-semibold text-white/55 uppercase">{highlight.label}</p>
          <p className="mt-1 text-2xl font-extrabold">
            {highlight.value}
            {highlight.suffix && (
              <span className="ml-1 text-sm font-medium text-white/60">{highlight.suffix}</span>
            )}
          </p>
          {highlight.sub && <p className="text-caption mt-1 text-white/55">{highlight.sub}</p>}
        </div>
      </div>

      <p
        className={`text-body-sm mt-3 rounded-xl px-4 py-3 ${
          note.ok ? "text-ink bg-white" : "bg-brand-subtle text-brand"
        }`}
      >
        <span aria-hidden="true">{note.ok ? "✓" : "!"}</span> {note.text}
      </p>
    </div>
  );
}

/** Form column + results column, stacked on mobile like the mobile artboard. */
export function SimulatorLayout({ form, results }: { form: ReactNode; results: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">{form}</div>
      {results}
    </div>
  );
}
