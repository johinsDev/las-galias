"use client";

import { useMemo } from "react";

import {
  COUNTRIES,
  flagOf,
  groupsFor,
  nationalMax,
  type Country,
} from "@lasgalias/ui/lib/countries";
import { Select } from "@lasgalias/ui/components/select";
import { cn } from "@lasgalias/ui/lib/utils";

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
        El indicativo usa el mismo desplegable del sistema de diseño que el
        resto del formulario, con un disparador propio: la bandera y el prefijo,
        que es lo único que cabe en esa caja. El buscador no hace falta —el país
        se elige arriba, en su campo con buscador— y el panel propio evita que en
        mitad del formulario se abra el menú gris del sistema operativo.
      */}
      <Select
        aria-label="Indicativo del país"
        value={country.code}
        onValueChange={(code: string) => {
          const next = COUNTRIES.find((c) => c.code === code);
          if (next) emit(next, national);
        }}
        items={COUNTRIES.map((item) => ({
          value: item.code,
          label: `${flagOf(item.code)}  ${item.name} ${item.dial}`,
        }))}
        searchable
        searchPlaceholder="Busca tu país…"
        emptyMessage="No encontramos ese país."
        popupClassName="w-72"
        triggerClassName="text-body-sm text-ink border-input hover:bg-surface flex shrink-0 items-center gap-1.5 rounded-l-[10px] border-r px-3 transition-colors outline-none"
        trigger={
          <>
            <span aria-hidden="true">{flagOf(country.code)}</span>
            <span className="tabular-nums">{country.dial}</span>
          </>
        }
      />

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
