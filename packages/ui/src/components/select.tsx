"use client";

import { useRef, useState } from "react";

import { Select as SelectPrimitive } from "@base-ui/react/select";

import { cn } from "@lasgalias/ui/lib/utils";

export interface SelectItem {
  value: string;
  label: string;
}

/** Opciones agrupadas bajo un título; sin título, el grupo se pinta sin cabecera. */
export interface SelectGroup {
  label?: string;
  items: SelectItem[];
}

interface SelectProps {
  id?: string;
  name?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** Lista plana o por grupos, con su título encima de cada uno. */
  items: SelectItem[] | SelectGroup[];
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

function toGroups(items: SelectItem[] | SelectGroup[]): SelectGroup[] {
  return items.length > 0 && "items" in items[0]!
    ? (items as SelectGroup[])
    : [{ items: items as SelectItem[] }];
}

const ITEM_CLASS =
  "text-body-sm text-ink data-highlighted:bg-surface flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 outline-none data-selected:font-semibold";
const GROUP_LABEL_CLASS = "text-label text-ink-faint px-3 pt-3 pb-1 font-semibold uppercase";

/**
 * Las opciones, con o sin grupos. `visible` decide cuáles se ven sin
 * desmontar ninguna (ver `SearchableSelect`); un grupo sin opciones visibles
 * se oculta entero, cabecera incluida.
 */
function Options({
  groups,
  visible = () => true,
}: {
  groups: SelectGroup[];
  visible?: (item: SelectItem) => boolean;
}) {
  return groups.map((group, index) => {
    const options = group.items.map((item) => (
      <SelectPrimitive.Item
        key={item.value}
        value={item.value}
        hidden={!visible(item)}
        className={ITEM_CLASS}
      >
        <SelectPrimitive.ItemText className="min-w-0 truncate">
          {item.label}
        </SelectPrimitive.ItemText>
        <SelectPrimitive.ItemIndicator className="text-brand shrink-0">
          <Check />
        </SelectPrimitive.ItemIndicator>
      </SelectPrimitive.Item>
    ));
    const hidden = !group.items.some(visible);
    if (!group.label) {
      return (
        <div key={index} hidden={hidden}>
          {options}
        </div>
      );
    }
    return (
      <SelectPrimitive.Group key={group.label} hidden={hidden}>
        <SelectPrimitive.GroupLabel className={GROUP_LABEL_CLASS}>
          {group.label}
        </SelectPrimitive.GroupLabel>
        {options}
      </SelectPrimitive.Group>
    );
  });
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
  const groups = toGroups(items);
  const flat = groups.flatMap((group) => group.items);
  const selected = flat.find((item) => item.value === value) ?? null;

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
        groups={groups}
        items={flat}
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
      items={flat}
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
              <Options groups={groups} />
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
 * El filtro OCULTA las opciones que no coinciden, no las desmonta. Desmontarlas
 * le robaba el foco al buscador: el Select sabe la opción elegida por su
 * posición en la lista, al filtrar esa posición cambiaba (Colombia pasaba de la
 * 1 a la 0, por ejemplo) y Base UI, al ver cambiar el índice elegido con el
 * panel abierto, vuelve a enfocar esa opción como si acabara de abrirse. Por
 * eso el foco saltaba justo cuando la búsqueda seguía incluyendo el país
 * elegido. Con todas montadas los índices no se mueven, y la navegación con
 * flechas ya se salta las ocultas.
 *
 * El input se traga sus propias teclas: si no, el Select las interpretaría como
 * su búsqueda por letra inicial y saltaría de opción mientras se escribe. Salvo
 * las flechas, que bajan a la lista, y Escape y Tab, que siguen cerrando.
 */
function SearchableSelect({
  id,
  name,
  value,
  onValueChange,
  groups,
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
  groups: SelectGroup[];
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
  const list = useRef<HTMLDivElement>(null);

  const needle = fold(query.trim());
  const visible = (item: SelectItem) => !needle || fold(item.label).includes(needle);
  const empty = !items.some(visible);

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" || event.key === "Tab") return;
    event.stopPropagation();
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    // Al primer (o último) resultado visible. Al enfocarlo, Base UI lo toma
    // como la opción activa y las flechas siguen desde ahí.
    event.preventDefault();
    const options = list.current?.querySelectorAll<HTMLElement>('[role="option"]:not([hidden])');
    const target = event.key === "ArrowDown" ? options?.[0] : options?.[options.length - 1];
    target?.focus();
  };

  const onListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Escribir con una opción enfocada vuelve al buscador, y la letra cae ahí
    // en vez de disparar la búsqueda por inicial del Select.
    if (event.key.length !== 1 || event.key === " ") return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    event.stopPropagation();
    search.current?.focus();
  };

  return (
    <SelectPrimitive.Root
      items={items}
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
                onKeyDown={onSearchKeyDown}
                placeholder={searchPlaceholder}
                className="text-body-sm text-ink placeholder:text-ink-faint h-11 w-full bg-transparent outline-none"
              />
            </div>

            {empty && (
              <p className="text-body-sm text-ink-muted px-3 py-6 text-center">{emptyMessage}</p>
            )}
            <SelectPrimitive.List
              ref={list}
              hidden={empty}
              onKeyDown={onListKeyDown}
              className="max-h-[min(18rem,var(--available-height))] overflow-y-auto p-1"
            >
              <Options groups={groups} visible={visible} />
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { Select };
