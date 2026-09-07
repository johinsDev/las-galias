"use client";

import { Combobox } from "@base-ui/react/combobox";
import { useMemo } from "react";

import {
  COMMON_COUNT,
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

  const filter = (item: Country, query: string) => {
    if (!query) return true;
    const fold = (s: string) =>
      s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
    return fold(item.name).includes(fold(query)) || item.dial.includes(query.replace(/\s/g, ""));
  };

  return (
    <div
      className={cn(
        "border-input focus-within:border-ink field-box flex w-full items-stretch border bg-white transition-colors",
        invalid && "border-destructive",
      )}
    >
      <input type="hidden" name={name} value={value} />

      <Combobox.Root
        items={COUNTRIES}
        itemToStringLabel={(item: Country) => `${item.name} ${item.dial}`}
        filter={filter}
        value={country}
        onValueChange={(next: Country | null) => emit(next ?? country, national)}
      >
        <Combobox.Trigger
          aria-label={`Indicativo del país, ${country.name} ${country.dial}`}
          className="text-body-sm text-ink border-input hover:bg-surface flex shrink-0 items-center gap-1.5 rounded-l-[10px] border-r px-3 transition-colors"
        >
          <span aria-hidden="true">{flagOf(country.code)}</span>
          <span className="tabular-nums">{country.dial}</span>
          <span className="text-ink-faint">
            <ChevronsUpDown />
          </span>
        </Combobox.Trigger>

        <Combobox.Portal>
          <Combobox.Positioner sideOffset={6} align="start" className="z-50 outline-none">
            <Combobox.Popup className="border-line shadow-card-lg w-72 max-w-[var(--available-width)] overflow-hidden rounded-xl border bg-white">
              <div className="border-line border-b px-3">
                <Combobox.Input
                  placeholder="Busca tu país…"
                  className="text-body-sm text-ink placeholder:text-ink-faint h-11 w-full bg-transparent outline-none"
                />
              </div>

              <Combobox.Empty>
                <p className="text-body-sm text-ink-muted px-3 py-6 text-center">
                  No encontramos ese país.
                </p>
              </Combobox.Empty>

              <Combobox.List className="max-h-[min(16rem,var(--available-height))] overflow-y-auto p-1 data-empty:p-0">
                {(item: Country) => (
                  <Combobox.Item
                    key={item.code}
                    value={item}
                    className={cn(
                      "text-body-sm text-ink flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 outline-none",
                      "data-highlighted:bg-surface data-selected:font-semibold",
                      COUNTRIES.indexOf(item) === COMMON_COUNT - 1 &&
                        "border-line mb-1 border-b pb-2.5",
                    )}
                  >
                    <span aria-hidden="true">{flagOf(item.code)}</span>
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className="text-ink-faint shrink-0 tabular-nums">{item.dial}</span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>

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
