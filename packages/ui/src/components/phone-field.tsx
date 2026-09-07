"use client";

import { useMemo } from "react";

import {
  COUNTRIES,
  flagOf,
  groupsFor,
  nationalMax,
  type Country,
} from "@lasgalias/ui/lib/countries";
import { cn } from "@lasgalias/ui/lib/utils";

const icon = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function ChevronsUpDown() {
  return (
    <svg {...icon} width={14} height={14} aria-hidden="true">
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}

/**
 * Groups the national number the way its own country writes it — Colombia's ten
 * digits read 300 123 4567, not 300 123 456 7. Where the length is unknown it
 * falls back to threes, which is legible everywhere.
 */
function group(digits: string, country: Country): string {
  const pattern = groupsFor(country.nsn ?? digits.length);
  if (pattern.length === 0) return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();

  const parts: string[] = [];
  let rest = digits;
  for (const size of pattern) {
    if (!rest) break;
    parts.push(rest.slice(0, size));
    rest = rest.slice(size);
  }
  if (rest) parts.push(rest);
  return parts.join(" ");
}

/** Splits an E.164 string back into the country it belongs to and the rest. */
function split(value: string): { country: Country; national: string } {
  const digits = value.replace(/[^\d+]/g, "");
  // Longest dial code first, so +1 does not swallow +1-something.
  const match = [...COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => digits.startsWith(c.dial));
  const country = match ?? COUNTRIES.find((c) => c.code === "US")!;
  return { country, national: digits.slice(match ? match.dial.length : 0).replace(/\D/g, "") };
}

interface PhoneFieldProps {
  id?: string;
  name?: string;
  /** E.164, e.g. "+13055550123". */
  value?: string;
  onValueChange?: (value: string) => void;
  invalid?: boolean;
  placeholder?: string;
}

/**
 * Phone entry split in two: the calling code is picked from a searchable list,
 * the rest is typed.
 *
 * The lead schema wants E.164 (`+<country><number>`) so the CRM never has to
 * guess where a number is from — and a free text field could not deliver that:
 * people typed local formats, and the CRM prepends 57 to anything that looks
 * Colombian. Here the code is always explicit and the value is always digits.
 */
export function PhoneField({
  id,
  name,
  value = "",
  onValueChange,
  invalid = false,
  placeholder,
}: PhoneFieldProps) {
  const { country, national } = useMemo(() => split(value), [value]);

  const emit = (next: Country, digits: string) =>
    onValueChange?.(`${next.dial}${digits.slice(0, nationalMax(next))}`);

  return (
    <div
      className={cn(
        "border-input focus-within:border-ink field-box flex w-full items-stretch border bg-white transition-colors",
        invalid && "border-destructive",
      )}
    >
      <input type="hidden" name={name} value={value} />

      {/*
        El indicativo usa el mismo select nativo que el resto del formulario. Era
        un combobox con buscador, pero aquí la búsqueda no aportaba —el país ya
        se elige arriba, en su propio campo con buscador— y en el móvil el
        selector del sistema gana a cualquier lista propia.
      */}
      <label className="relative flex shrink-0 items-center">
        <span className="sr-only">Indicativo del país</span>
        <span
          aria-hidden="true"
          className="text-body-sm text-ink border-input pointer-events-none flex h-full items-center gap-1.5 border-r pr-2.5 pl-3"
        >
          <span>{flagOf(country.code)}</span>
          <span className="tabular-nums">{country.dial}</span>
          <span className="text-ink-faint">
            <ChevronsUpDown />
          </span>
        </span>
        <select
          value={country.code}
          onChange={(event) => {
            const next = COUNTRIES.find((c) => c.code === event.target.value);
            if (next) emit(next, national);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {COUNTRIES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name} ({item.dial})
            </option>
          ))}
        </select>
      </label>

      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        // Zeros grouped the way that country writes them, so the field shows
        // the shape it expects instead of one market's example number.
        placeholder={placeholder ?? group("0".repeat(nationalMax(country)), country)}
        value={group(national, country)}
        onChange={(e) => emit(country, e.target.value.replace(/\D/g, ""))}
        className="text-body-sm text-ink placeholder:text-ink-faint w-full min-w-0 bg-transparent px-2.5 outline-none"
      />
    </div>
  );
}
