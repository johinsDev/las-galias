"use client";

import { useId, useState } from "react";
import * as v from "valibot";

import { DATA_POLICY_SLUG, LeadSchema } from "@lasgalias/schemas";
import { Input } from "@lasgalias/ui/components/input";
import { PhoneField } from "@lasgalias/ui/components/phone-field";
import { Select } from "@lasgalias/ui/components/select";

interface LaunchLeadFormProps {
  projectDocumentId: string;
  /** "Ciudad de interés" options — the same list the lead-form config keeps for residence. */
  cities: string[];
}

const STRAPI_URL = import.meta.env.PUBLIC_STRAPI_URL ?? "http://localhost:1337";
const LABEL = "text-label text-ink-muted mb-1.5 block font-bold uppercase";
const ERROR = "text-destructive text-caption mt-1";

/** Where people say they heard of a launch: the sales team's own list. */
const REFERRAL_SOURCES = [
  "Valla",
  "Revista",
  "Referido",
  "Ferias",
  "Página web",
  "Facebook / Instagram",
  "Mensaje SMS",
  "Correo electrónico",
];
const BUDGET_RANGES = ["Hasta $200M", "$200M – $350M", "$350M – $500M", "Más de $500M"];

const Schema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(2, "Ingresa tu nombre completo")),
  phone: LeadSchema.entries.phone,
  email: v.pipe(v.string(), v.trim(), v.email("Ingresa un correo válido")),
  interestCity: v.optional(v.string()),
  referralSource: v.optional(v.string()),
  budgetRange: v.optional(v.string()),
  acceptsDataPolicy: v.literal(true, "Debes aceptar la política de tratamiento de datos"),
});
type Values = v.InferInput<typeof Schema>;
type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = {
  name: "",
  phone: "+57",
  email: "",
  interestCity: undefined,
  referralSource: undefined,
  budgetRange: undefined,
  acceptsDataPolicy: false as unknown as true,
};

/**
 * «Registra tu interés»: the launch landing's form (Figma 3068:18965). Name,
 * WhatsApp, e-mail, city of interest, how they heard of us, a budget range and
 * the data-policy consent. Stored as a lead with `source: lanzamiento`; the
 * project relation is what tells the advisor which launch it is.
 */
export default function LaunchLeadForm({ projectDocumentId, cities }: LaunchLeadFormProps) {
  const uid = useId();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = v.safeParse(Schema, values);
    if (!result.success) {
      const next: Errors = {};
      for (const issue of result.issues) {
        const key = issue.path?.[0]?.key as keyof Values | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setStatus("sending");
    const params = new URLSearchParams(window.location.search);
    const lead = result.output;
    try {
      const res = await fetch(`${STRAPI_URL}/api/leads`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          data: {
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            interestCity: lead.interestCity,
            referralSource: lead.referralSource,
            budgetRange: lead.budgetRange,
            source: "lanzamiento",
            project: projectDocumentId,
            acceptsDataPolicy: true,
            // One consent in the design; the CRM keeps a flag per channel.
            acceptsWhatsApp: true,
            acceptsSms: true,
            acceptsCall: true,
            acceptsEmail: true,
            utmSource: params.get("utm_source") ?? undefined,
            utmMedium: params.get("utm_medium") ?? undefined,
            utmCampaign: params.get("utm_campaign") ?? undefined,
          },
        }),
      });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "ok") {
    return (
      <div className="bg-surface text-ink rounded-xl p-5 text-center" role="status">
        <p className="font-semibold">¡Listo! Ya registramos tu interés.</p>
        <p className="text-ink-muted text-body-sm mt-1">
          Un asesor te contacta en menos de 24 h con el precio de preventa.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label className={LABEL} htmlFor={`${uid}-name`}>
          Nombre completo
        </label>
        <Input
          id={`${uid}-name`}
          name="name"
          autoComplete="name"
          placeholder="Tu nombre completo"
          value={values.name}
          onChange={(e) => set("name", e.currentTarget.value)}
          aria-invalid={errors.name ? true : undefined}
        />
        {errors.name && <p className={ERROR}>{errors.name}</p>}
      </div>

      <div>
        <label className={LABEL} htmlFor={`${uid}-phone`}>
          WhatsApp
        </label>
        <PhoneField
          id={`${uid}-phone`}
          name="phone"
          value={values.phone}
          onValueChange={(phone) => set("phone", phone)}
          invalid={Boolean(errors.phone)}
        />
        {errors.phone && <p className={ERROR}>{errors.phone}</p>}
      </div>

      <div>
        <label className={LABEL} htmlFor={`${uid}-email`}>
          Correo electrónico
        </label>
        <Input
          id={`${uid}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="correo@email.com"
          value={values.email}
          onChange={(e) => set("email", e.currentTarget.value)}
          aria-invalid={errors.email ? true : undefined}
        />
        {errors.email && <p className={ERROR}>{errors.email}</p>}
      </div>

      {cities.length > 0 && (
        <div>
          <label className={LABEL} htmlFor={`${uid}-city`}>
            Ciudad de interés
          </label>
          <Select
            id={`${uid}-city`}
            name="interestCity"
            chevron="left"
            value={values.interestCity ?? ""}
            placeholder="Selecciona tu ciudad"
            items={cities.map((city) => ({ value: city, label: city }))}
            onValueChange={(next) => set("interestCity", next || undefined)}
          />
        </div>
      )}

      <div>
        <label className={LABEL} htmlFor={`${uid}-referral`}>
          ¿Cómo nos conociste?
        </label>
        <Select
          id={`${uid}-referral`}
          name="referralSource"
          chevron="left"
          value={values.referralSource ?? ""}
          placeholder="Selecciona una opción"
          items={REFERRAL_SOURCES.map((item) => ({ value: item, label: item }))}
          onValueChange={(next) => set("referralSource", next || undefined)}
        />
      </div>

      <fieldset>
        <legend className={LABEL}>Presupuesto aproximado</legend>
        <div className="space-y-2">
          {BUDGET_RANGES.map((range) => (
            <label key={range} className="text-body-sm text-ink flex items-center gap-2.5">
              <input
                type="radio"
                name={`${uid}-budget`}
                value={range}
                checked={values.budgetRange === range}
                onChange={() => set("budgetRange", range)}
                className="accent-brand size-4"
              />
              {range}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="text-body-sm text-ink-muted flex items-start gap-2.5">
          <input
            type="checkbox"
            name="acceptsDataPolicy"
            checked={values.acceptsDataPolicy === true}
            onChange={(e) => set("acceptsDataPolicy", e.currentTarget.checked as true)}
            className="check mt-0.5 size-4 shrink-0"
          />
          <span>
            Acepto la{" "}
            <a
              href={`/legales/${DATA_POLICY_SLUG}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand font-medium"
            >
              política de tratamiento de datos personales
            </a>
            .
          </span>
        </label>
        {errors.acceptsDataPolicy && <p className={ERROR}>{errors.acceptsDataPolicy}</p>}
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="btn btn-primary w-full py-3.5 text-base disabled:opacity-60"
      >
        {status === "sending" ? "Enviando…" : "Registrar mi interés"}
      </button>

      {status === "error" && (
        <p className="text-destructive text-caption text-center" role="alert">
          No pudimos guardar tus datos. Inténtalo de nuevo en un momento.
        </p>
      )}

      <p className="text-caption text-ink-muted text-center">
        🔒 Tus datos están protegidos · Sin spam
      </p>
    </form>
  );
}
