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
      searchable: true,
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
      className="border-mist form-compact rounded-[16px] border-[1.43px] bg-white p-6 md:p-7"
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
      <div className="[&_.field-box_.text-ink-faint]:text-graphite grid gap-4 sm:grid-cols-2 [&_.field-box]:gap-[3px] [&_.field-box]:px-[9px]">
        {fields.map((field) => (
          <div key={field.key}>
            <label
              className="text-steel mb-1.5 block text-[11px] leading-[16.5px] font-semibold tracking-[0.44px] uppercase"
              htmlFor={`advice-${field.key}`}
            >
              {field.label}
            </label>
            <Select
              id={`advice-${field.key}`}
              chevron="left"
              searchable={field.searchable ?? false}
              searchPlaceholder="Busca tu ciudad…"
              emptyMessage="No encontramos esa ciudad."
              placeholder={field.placeholder}
              value={(values[field.key] as string | undefined) ?? ""}
              items={field.items.map((item) => ({ value: item, label: item }))}
              onValueChange={(next: string) => set(field.key, next || undefined)}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-6">
        <span className="text-graphite text-[13.5px] leading-[20.25px] font-semibold">
          ¿Es tu primera vivienda?
        </span>
        <span className="flex items-center gap-2.5">
          <span className="text-iron text-[13.5px]">No</span>
          <button
            type="button"
            role="switch"
            aria-checked={values.firstHome === true}
            aria-label="¿Es tu primera vivienda?"
            onClick={() => set("firstHome", values.firstHome !== true)}
            className="bg-mist aria-checked:bg-brand relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-out"
          >
            <span className="absolute top-[3px] left-[3px] size-[18px] rounded-full bg-white shadow transition-transform duration-200 ease-out in-aria-checked:translate-x-5" />
          </button>
          <span className="text-iron text-[13.5px]">Sí</span>
        </span>
      </div>

      <label className="text-iron mt-4 flex items-start gap-2.5 text-[13px] leading-[19.5px]">
        <input
          type="checkbox"
          name="advice-accepts"
          checked={accepted}
          onChange={(event) => setAccepted(event.currentTarget.checked)}
          className="check mt-0.5 size-4 shrink-0"
        />
        <span>
          Acepto los{" "}
          <a
            href="/legales"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand font-semibold"
          >
            términos y condiciones
          </a>{" "}
          y el{" "}
          <a
            href={`/legales/${DATA_POLICY_SLUG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand font-semibold"
          >
            tratamiento de datos personales
          </a>{" "}
          de Las Galias Constructora.
        </span>
      </label>

      {error && <p className="text-destructive text-caption mt-2">{error}</p>}

      {/* Ancho automático y alineado a la izquierda, como el Figma. */}
      <Button
        type="submit"
        size="lg"
        className="mt-4 h-[45.5px] px-7 text-[13px] leading-[19.5px] font-semibold"
      >
        Enviar solicitud
      </Button>
    </form>
  );
}
