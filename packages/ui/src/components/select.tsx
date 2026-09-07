import * as React from "react";

import { cn } from "@lasgalias/ui/lib/utils";

/**
 * A native `<select>` wearing the design's field skin.
 *
 * Native on purpose: these are short, known lists, and the platform control
 * already gives keyboard support, type-ahead and — the part that matters most
 * here — the phone's own wheel picker. A JS listbox would be more markup for a
 * worse mobile experience. The only thing overridden is the chevron, because
 * `appearance-none` is what lets the field match the inputs beside it.
 */
function Select({
  className,
  children,
  placeholder,
  ...props
}: React.ComponentProps<"select"> & { placeholder?: string }) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "border-input focus-visible:border-ink field-box w-full min-w-0 appearance-none border bg-white pr-10 pl-3.5 text-base transition-colors outline-none",
          "aria-invalid:border-destructive",
          // An unchosen select shows its placeholder, so it has to read as
          // placeholder text and not as an answer the visitor already gave.
          props.value === "" || props.value == null ? "text-ink-faint" : "text-ink",
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
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
        className="text-ink-faint pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export { Select };
