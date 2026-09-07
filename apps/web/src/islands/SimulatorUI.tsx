import { useState, type ReactNode } from "react";

import { Select } from "@lasgalias/ui/components/select";

import { formatMoney } from "@/lib/currency";

/**
 * The shared skin of the three simulators: inputs on the left, a "Resultados"
 * panel on the right whose last row is the black instalment card. Keeping it in
 * one place is what stops the three from drifting apart visually.
 */

// Los mismos campos que el resto de formularios del sitio: 50px de alto, 10px
// de radio y el filete claro. Antes eran más bajos y con otro borde, y los tres
// simuladores se leían como una pieza de otra época.
const FIELD =
  "border-input field-box text-body text-ink w-full border bg-white px-3.5 outline-none transition-colors focus:border-ink";

const LABEL = "text-label text-ink-muted mb-1.5 block font-bold uppercase";

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label className={LABEL} htmlFor={htmlFor}>
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

/**
 * Un número con el formato del país mientras se escribe: miles con punto y
 * decimales con coma, «12,5» y no «12.5».
 *
 * Era un `<input type="number">`, que trae dos problemas: pinta sus flechitas
 * encima del sufijo —«meses» quedaba tapado por ellas— y en español obliga a
 * escribir el punto decimal, que no es el separador que usa nadie aquí.
 */
function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/** «1.234,5» → 1234.5, aceptando coma o punto como decimal. */
function parseNumber(text: string, decimals: number): number {
  const cleaned = text.replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}\b)/g, "");
  const normalised = cleaned.replace(",", ".");
  const parsed = Number(normalised);
  if (!Number.isFinite(parsed)) return 0;
  return decimals === 0 ? Math.trunc(parsed) : parsed;
}

export function NumberField({
  id,
  label,
  value,
  suffix,
  min,
  max,
  decimals = 0,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  min: number;
  max: number;
  /** Decimales que admite: el plazo ninguno, la tasa uno. */
  decimals?: number;
  onChange: (value: number) => void;
}) {
  // Mientras el campo tiene el foco se respeta lo que la persona escribe; al
  // salir se vuelve a formatear. Si no, borrar el último dígito reescribiría el
  // valor y el cursor saltaría al final en cada tecla.
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          className={FIELD}
          value={draft ?? formatNumber(value, decimals)}
          onFocus={(e) => setDraft(e.target.value)}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            setDraft(e.target.value);
            const next = parseNumber(e.target.value, decimals);
            onChange(Math.min(max, Math.max(min, next)));
          }}
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
      <div className="mt-1.5">
        {/* El del sistema de diseño y no el nativo: en macOS el nativo abre el
            menú gris del sistema en mitad de un formulario blanco. */}
        <Select id={id} value={value} items={options} onValueChange={onChange} />
      </div>
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
      <p className={LABEL}>{label}</p>
      <div className="seg-group" role="group" aria-label={label}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className="seg px-4"
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
