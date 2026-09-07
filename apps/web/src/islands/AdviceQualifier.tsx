import { useState } from "react";

import type { LeadFormConfig } from "@lasgalias/schemas";
import { DATA_POLICY_SLUG } from "@lasgalias/schemas";
import { Button } from "@lasgalias/ui/components/button";
import { Select } from "@lasgalias/ui/components/select";

import { QUALIFICATION_EVENT, type QualificationDetail } from "@/lib/qualification";

interface AdviceQualifierProps {
  config: LeadFormConfig;
}

function options(items?: { text: string }[]): string[] {
  return (items ?? []).map((item) => item.text).filter(Boolean);
}

/**
 * "Recibe una asesoría personalizada": the four qualification dropdowns, the
 * first-home toggle and the consent, exactly the fields the design draws.
 *
 * It deliberately has no name, phone or email — the design has none — so it
 * cannot create a lead by itself. Pressing "Enviar solicitud" hands the answers
 * to the form in the sidebar and scrolls there, so the visitor only has to add
 * how to be reached. A custom event rather than shared state because the two
 * live in different Astro islands, the same way the simulator talks to the
 * mobile price bar.
 */
export default function AdviceQualifier({ config }: AdviceQualifierProps) {
  const [values, setValues] = useState<QualificationDetail>({});
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof QualificationDetail, value: string | boolean | undefined) =>
    setValues((current) => ({ ...current, [key]: value }));

  const fields = [
    {
      key: "incomeRange" as const,
      label: "Rango de ingresos",
      placeholder: "Selecciona un rango",
      items: options(config.incomeRanges),
    },
    {
      key: "residenceCity" as const,
      label: "Ciudad de residencia",
      placeholder: "Selecciona la ciudad",
      items: options(config.residenceCities),
    },
    {
      key: "severance" as const,
      label: "Cesantías",
      placeholder: "¿Tienes cesantías?",
      items: options(config.severanceOptions),
    },
    {
      key: "savingsRange" as const,
      label: "Ahorros disponibles",
      placeholder: "Selecciona un rango",
      items: options(config.savingsRanges),
    },
  ].filter((field) => field.items.length > 0);

  return (
    <form
      className="border-line rounded-2xl border bg-white p-6 md:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        if (!accepted) {
          setError("Debes aceptar los términos para continuar");
          return;
        }
        setError(null);
        document.dispatchEvent(
          new CustomEvent<QualificationDetail>(QUALIFICATION_EVENT, { detail: values }),
        );
        document.getElementById("lead")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key}>
            <label
              className="text-label text-ink-muted mb-1.5 block font-bold uppercase"
              htmlFor={`advice-${field.key}`}
            >
              {field.label}
            </label>
            <Select
              id={`advice-${field.key}`}
              chevron="left"
              placeholder={field.placeholder}
              value={(values[field.key] as string | undefined) ?? ""}
              items={field.items.map((item) => ({ value: item, label: item }))}
              onValueChange={(next: string) => set(field.key, next || undefined)}
            />
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <span className="text-body-sm text-ink font-bold">¿Es tu primera vivienda?</span>
        <span className="flex items-center gap-2">
          <span className="text-body-sm text-ink-muted">No</span>
          <button
            type="button"
            role="switch"
            aria-checked={values.firstHome === true}
            aria-label="¿Es tu primera vivienda?"
            onClick={() => set("firstHome", values.firstHome !== true)}
            className="bg-surface-2 aria-checked:bg-brand relative h-6 w-11 shrink-0 rounded-full transition-colors"
          >
            <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 in-aria-checked:translate-x-5" />
          </button>
          <span className="text-body-sm text-ink-muted">Sí</span>
        </span>
      </div>

      <label className="text-body-sm text-ink-muted mt-4 flex items-start gap-2.5">
        <input
          type="checkbox"
          name="advice-accepts"
          checked={accepted}
          onChange={(event) => setAccepted(event.currentTarget.checked)}
          className="accent-brand mt-0.5 size-4 shrink-0"
        />
        <span>
          Acepto los{" "}
          <a
            href="/legales"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand font-medium"
          >
            términos y condiciones
          </a>{" "}
          y el{" "}
          <a
            href={`/legales/${DATA_POLICY_SLUG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand font-medium"
          >
            tratamiento de datos personales
          </a>{" "}
          de Las Galias Constructora.
        </span>
      </label>

      {error && <p className="text-destructive text-caption mt-2">{error}</p>}

      {/* Ancho automático y alineado a la izquierda, como el Figma. */}
      <Button type="submit" size="lg" className="mt-5">
        Enviar solicitud
      </Button>
    </form>
  );
}
