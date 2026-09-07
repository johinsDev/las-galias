"use client";

import { Combobox } from "@base-ui/react/combobox";
import { COMMON_COUNT, COUNTRIES, flagOf, type Country } from "@lasgalias/ui/lib/countries";
import { cn } from "@lasgalias/ui/lib/utils";

/* Inline rather than an icon package: nothing else in this design system pulls
   one in, and a shared package is the wrong place to add a second copy of React
   to the install tree. Paths are Lucide's, to match the rest of the site. */
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
    <svg {...icon} width={16} height={16} aria-hidden="true">
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}

function Cross() {
  return (
    <svg {...icon} aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function Check() {
  return (
    <svg {...icon} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

interface CountryComboboxProps {
  id?: string;
  name?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}

/**
 * Country picker with a search box.
 *
 * A plain <select> with ~85 options is a scroll hunt on a phone, and the free
 * text field it replaces let people type "usa", "U.S.A." and "Estados unidos"
 * for the same country — three different strings for the CRM to reconcile.
 * This stores the Spanish name, which is what the lead schema already expects.
 *
 * Matching is accent-insensitive on purpose: someone typing "peru" or "mexico"
 * on a keyboard without accents should still find Perú and México.
 */
export function CountryCombobox({
  id,
  name,
  value,
  onValueChange,
  placeholder = "Busca tu país…",
  invalid = false,
  className,
}: CountryComboboxProps) {
  const filter = (country: Country, query: string) => {
    if (!query) return true;
    const fold = (s: string) =>
      s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
    return fold(country.name).includes(fold(query));
  };

  return (
    <Combobox.Root
      items={COUNTRIES}
      itemToStringLabel={(country: Country) => country.name}
      filter={filter}
      value={COUNTRIES.find((country: Country) => country.name === value) ?? null}
      onValueChange={(country: Country | null) => onValueChange?.(country?.name ?? "")}
    >
      {/* What the form reads. The combobox itself is the control. */}
      <input type="hidden" name={name} value={value ?? ""} />

      <Combobox.InputGroup
        className={cn(
          "border-input focus-within:border-ink flex h-11 w-full items-center rounded-lg border bg-white pr-1 transition-colors",
          invalid && "border-destructive",
          className,
        )}
      >
        <Combobox.Input
          id={id}
          placeholder={placeholder}
          className="text-body-sm text-ink placeholder:text-ink-faint h-full w-full bg-transparent px-3 outline-none"
        />
        <Combobox.Clear
          aria-label="Borrar país"
          className="text-ink-faint hover:text-ink flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
        >
          <Cross />
        </Combobox.Clear>
        <Combobox.Trigger
          aria-label="Ver todos los países"
          className="text-ink-faint hover:text-ink flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
        >
          <ChevronsUpDown />
        </Combobox.Trigger>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} className="z-50 outline-none">
          <Combobox.Popup className="border-line shadow-card-lg w-[var(--anchor-width)] max-w-[var(--available-width)] overflow-hidden rounded-xl border bg-white">
            <Combobox.Empty>
              <p className="text-body-sm text-ink-muted px-3 py-6 text-center">
                No encontramos ese país.
              </p>
            </Combobox.Empty>

            <Combobox.List className="max-h-[min(16rem,var(--available-height))] overflow-y-auto p-1 data-empty:p-0">
              {(country: Country) => (
                <Combobox.Item
                  key={country.code}
                  value={country}
                  className={cn(
                    "text-body-sm text-ink flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 outline-none",
                    "data-highlighted:bg-surface data-selected:font-semibold",
                    // A hairline under the shortlist, so the common destinations
                    // read as a group and not as an arbitrary reordering.
                    COUNTRIES.indexOf(country) === COMMON_COUNT - 1 &&
                      "border-line mb-1 border-b pb-2.5",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true">{flagOf(country.code)}</span>
                    <span className="truncate">{country.name}</span>
                  </span>
                  <Combobox.ItemIndicator className="text-brand shrink-0">
                    <Check />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
