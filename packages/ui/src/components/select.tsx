"use client";

import { useRef, useState } from "react";

import { Select as SelectPrimitive } from "@base-ui/react/select";

import { cn } from "@lasgalias/ui/lib/utils";

export interface SelectItem {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  name?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  items: SelectItem[];
  /** El Figma pone el chevron a la izquierda en la banda de asesoría. */
  chevron?: "left" | "right";
  invalid?: boolean;
  /** Contenido propio del disparador, para el indicativo del teléfono. */
  trigger?: React.ReactNode;
  triggerClassName?: string;
  /** Ancho del panel; por defecto el del disparador. */
  popupClassName?: string;
  /** Añade un buscador dentro del panel. Para listas largas: ciudades, países, proyectos. */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  "aria-label"?: string;
}

/** Ignora tildes y mayúsculas: quien escribe «bogota» busca Bogotá. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Desplegable del sistema de diseño: shadcn sobre Base UI, igual que el resto de
 * los campos.
 *
 * Era un `<select>` nativo, y funcionaba, pero abría el menú del sistema
 * operativo —gris oscuro en macOS— en mitad de un formulario blanco con
 * esquinas de 10px. El panel propio hereda la tipografía, el radio y el rojo de
 * marca, y el teclado y el lector de pantalla los sigue poniendo Base UI.
 */
function Select({
  id,
  name,
  value,
  onValueChange,
  placeholder,
  items,
  chevron = "right",
  invalid = false,
  trigger,
  triggerClassName,
  popupClassName,
  searchable = false,
  searchPlaceholder = "Busca…",
  emptyMessage = "Sin resultados.",
  "aria-label": ariaLabel,
}: SelectProps) {
  const triggerClass =
    triggerClassName ??
    cn(
      "border-input focus-visible:border-ink field-box text-body flex w-full min-w-0 items-center border bg-white transition-colors outline-none",
      chevron === "left" ? "flex-row-reverse justify-end gap-2 px-3.5" : "gap-2 px-3.5",
      invalid && "border-destructive",
    );
  const popupClass = cn(
    "border-line shadow-card-lg max-w-[var(--available-width)] overflow-hidden rounded-xl border bg-white",
    popupClassName ?? "w-[var(--anchor-width)]",
  );
  const selected = items.find((item) => item.value === value) ?? null;

  const label = trigger ?? (
    <span
      className={cn("min-w-0 flex-1 truncate text-left", selected ? "text-ink" : "text-ink-faint")}
    >
      {selected?.label ?? placeholder}
    </span>
  );

  if (searchable) {
    return (
      <SearchableSelect
        id={id}
        name={name}
        value={value}
        onValueChange={onValueChange}
        items={items}
        label={label}
        triggerClass={triggerClass}
        popupClass={popupClass}
        ariaLabel={ariaLabel}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
      />
    );
  }

  return (
    <SelectPrimitive.Root
      items={items}
      value={value ?? ""}
      // Base UI entrega `null` al limpiar; aquí eso es «sin elegir».
      onValueChange={(next: string | null) => onValueChange?.(next ?? "")}
      name={name}
    >
      <SelectPrimitive.Trigger id={id} aria-label={ariaLabel} className={triggerClass}>
        {label}
        <SelectPrimitive.Icon className="text-ink-faint shrink-0">
          <ChevronDown />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          sideOffset={6}
          alignItemWithTrigger={false}
          className="z-50 outline-none"
        >
          <SelectPrimitive.Popup className={popupClass}>
            <SelectPrimitive.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto p-1">
              {items.map((item) => (
                <SelectPrimitive.Item
                  key={item.value}
                  value={item.value}
                  className={cn(
                    "text-body-sm text-ink flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 outline-none",
                    "data-highlighted:bg-surface data-selected:font-semibold",
                  )}
                >
                  <SelectPrimitive.ItemText className="min-w-0 flex-1">
                    {item.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="text-brand shrink-0">
                    <Check />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/**
 * El desplegable con buscador.
 *
 * Construido sobre el MISMO Select de Base UI que la variante sin buscador, y
 * no sobre su Combobox: con el buscador dentro del panel, el combobox no abría
 * al hacer clic —con el teclado sí—, porque espera que su input exista para
 * darle el foco. Aquí el panel es un Select normal y el filtrado lo hace este
 * componente, que es la parte fácil.
 *
 * El input se traga sus propias teclas: si no, el Select las interpretaría como
 * su búsqueda por letra inicial y saltaría de opción mientras se escribe.
 */
function SearchableSelect({
  id,
  name,
  value,
  onValueChange,
  items,
  label,
  triggerClass,
  popupClass,
  ariaLabel,
  searchPlaceholder,
  emptyMessage,
}: {
  id?: string;
  name?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  items: SelectItem[];
  label: React.ReactNode;
  triggerClass: string;
  popupClass: string;
  ariaLabel?: string;
  searchPlaceholder: string;
  emptyMessage: string;
}) {
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);

  const needle = fold(query.trim());
  const filtered = needle ? items.filter((item) => fold(item.label).includes(needle)) : items;

  return (
    <SelectPrimitive.Root
      items={filtered}
      value={value ?? ""}
      name={name}
      onValueChange={(next: string | null) => onValueChange?.(next ?? "")}
      onOpenChange={(open: boolean) => {
        // Cada apertura empieza en limpio, y el foco va al buscador: es lo que
        // la persona viene a usar.
        setQuery("");
        if (open) setTimeout(() => search.current?.focus(), 0);
      }}
    >
      <SelectPrimitive.Trigger id={id} aria-label={ariaLabel} className={triggerClass}>
        {label}
        <SelectPrimitive.Icon className="text-ink-faint shrink-0">
          <ChevronDown />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          sideOffset={6}
          alignItemWithTrigger={false}
          className="z-50 outline-none"
        >
          <SelectPrimitive.Popup className={popupClass}>
            <div className="border-line border-b px-3">
              <input
                ref={search}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                placeholder={searchPlaceholder}
                className="text-body-sm text-ink placeholder:text-ink-faint h-11 w-full bg-transparent outline-none"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="text-body-sm text-ink-muted px-3 py-6 text-center">{emptyMessage}</p>
            ) : (
              <SelectPrimitive.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto p-1">
                {filtered.map((item) => (
                  <SelectPrimitive.Item
                    key={item.value}
                    value={item.value}
                    className="text-body-sm text-ink data-highlighted:bg-surface flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 outline-none data-selected:font-semibold"
                  >
                    <SelectPrimitive.ItemText className="min-w-0 truncate">
                      {item.label}
                    </SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator className="text-brand shrink-0">
                      <Check />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.List>
            )}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { Select };
