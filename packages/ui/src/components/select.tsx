"use client";

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
  "aria-label"?: string;
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
  "aria-label": ariaLabel,
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      items={items}
      value={value ?? ""}
      // Base UI entrega `null` al limpiar; aquí eso es «sin elegir».
      onValueChange={(next: string | null) => onValueChange?.(next ?? "")}
      name={name}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={
          triggerClassName ??
          cn(
            "border-input focus-visible:border-ink field-box text-body flex w-full min-w-0 items-center border bg-white transition-colors outline-none",
            chevron === "left" ? "flex-row-reverse justify-end gap-2 px-3.5" : "gap-2 px-3.5",
            invalid && "border-destructive",
          )
        }
      >
        {trigger ?? (
          <SelectPrimitive.Value className="min-w-0 flex-1 truncate text-left">
            {(selected: string) => (
              <span className={selected ? "text-ink" : "text-ink-faint"}>
                {items.find((item) => item.value === selected)?.label ?? placeholder}
              </span>
            )}
          </SelectPrimitive.Value>
        )}
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
          <SelectPrimitive.Popup
            className={cn(
              "border-line shadow-card-lg max-w-[var(--available-width)] overflow-hidden rounded-xl border bg-white",
              popupClassName ?? "w-[var(--anchor-width)]",
            )}
          >
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

export { Select };
