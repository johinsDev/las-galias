import { useState, type ComponentProps } from "react";
import { Field, Form, setInput, useForm } from "@formisch/react";

import type { LeadFormConfig } from "@lasgalias/schemas";
import { DATA_POLICY_SLUG, ForeignLeadSchema, LeadSchema } from "@lasgalias/schemas";
import { Button } from "@lasgalias/ui/components/button";
import { Input } from "@lasgalias/ui/components/input";
import { CountryCombobox } from "@lasgalias/ui/components/country-combobox";
import { PhoneField } from "@lasgalias/ui/components/phone-field";
import { Select } from "@lasgalias/ui/components/select";

interface LeadFormProps {
  projectDocumentId?: string;
  source: string;
  /**
   * Foreign-buyer mode: adds "País de residencia" and accepts any country's
   * number in E.164. The default form only accepts Colombian numbers, which
   * would reject this page's entire audience.
   */
  international?: boolean;
  submitLabel?: string;
  /**
   * Qualification block from the project-page design: income, city, severance,
   * savings and "is this your first home". Passing the options turns it on; the
   * consent checkbox comes with it, because that variant of the design draws
   * one and an advisor calling about a mortgage needs the record.
   */
  qualification?: LeadFormConfig | null;
  /** Shown read-only as "Proyecto de interés" when the form sits on a PDP. */
  projectName?: string;
  /** The qualification selects go two-up in the wide advice band, one-up in the sidebar. */
  columns?: 1 | 2;
}

const LABEL = "text-label text-ink-muted mb-1.5 block font-bold uppercase";
/** The design writes the qualification labels in sentence case, not caps. */
const SOFT_LABEL = "text-body-sm text-ink-muted mb-1.5 block";

function options(items?: { text: string }[]): string[] {
  return (items ?? []).map((item) => item.text).filter(Boolean);
}

const STRAPI_URL = import.meta.env.PUBLIC_STRAPI_URL ?? "http://localhost:1337";

/** Groups a Colombian mobile number as "300 123 4567" while typing. */
function formatCoPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

/**
 * Campaign attribution off the landing URL. The CRM files the lead under the
 * campaign that produced it, so this has to travel with the submission.
 */
function readUtm(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  if (typeof location === "undefined") return {};
  const params = new URLSearchParams(location.search);
  return {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
  };
}

/**
 * Lead form (expectation-stage PDPs and contact page). Submissions are stored
 * as `lead` entries in the CMS and pushed to the Sinco CRM from there.
 */
export default function LeadForm({
  projectDocumentId,
  source,
  international = false,
  submitLabel,
  qualification = null,
  projectName,
  columns = 1,
}: LeadFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");

  const form = useForm({
    schema: international ? ForeignLeadSchema : LeadSchema,
    // Colombia by default in both country fields: most people filling this in
    // are Colombian, so it is the answer that needs the fewest keystrokes.
    initialInput: {
      projectDocumentId,
      source,
      // Los dos consentimientos viajan en true sin casilla: el diseño deja el
      // formulario en cuatro campos y el CRM los exige de todas formas. El aviso
      // de la Ley 1581 queda bajo el botón, que es lo que sustituye a la casilla.
      // Con el bloque de calificación el diseño sí dibuja la casilla, así que
      // ahí el consentimiento lo da la persona y no puede venir marcado.
      ...(qualification ? {} : { acceptsDataPolicy: true }),
      acceptsContact: true,
      ...(international ? { residenceCountry: "Colombia", phone: "+57" } : {}),
      ...readUtm(),
    },
  });

  if (status === "ok") {
    return (
      <div className="bg-surface-2 text-ink rounded-xl p-6 text-center">
        <p className="text-h4 font-bold">¡Gracias por tu interés!</p>
        <p className="mt-1">Muy pronto un asesor se pondrá en contacto contigo.</p>
      </div>
    );
  }

  return (
    <Form
      of={form}
      onSubmit={async (output) => {
        setStatus("sending");
        try {
          const res = await fetch(`${STRAPI_URL}/api/leads`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              data: {
                name: output.name,
                email: output.email,
                phone: output.phone,
                message: output.message,
                source: output.source,
                acceptsDataPolicy: output.acceptsDataPolicy,
                incomeRange: output.incomeRange,
                residenceCity: output.residenceCity,
                severance: output.severance,
                savingsRange: output.savingsRange,
                firstHome: output.firstHome,
                // One checkbox in the UI; the CRM keeps a flag per channel.
                acceptsWhatsApp: output.acceptsContact,
                acceptsSms: output.acceptsContact,
                acceptsCall: output.acceptsContact,
                acceptsEmail: output.acceptsContact,
                utmSource: output.utmSource,
                utmMedium: output.utmMedium,
                utmCampaign: output.utmCampaign,
                ...("residenceCountry" in output
                  ? { residenceCountry: output.residenceCountry }
                  : {}),
                ...(output.projectDocumentId ? { project: output.projectDocumentId } : {}),
              },
            }),
          });
          setStatus(res.ok ? "ok" : "error");
        } catch {
          setStatus("error");
        }
      }}
      className="space-y-4"
    >
      {/* Four fields, two per row, in the design's reading order:
          nombre / país, then whatsapp / correo. */}
      <div className={international ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}>
        <Field of={form} path={["name"]}>
          {(field) => (
            <div>
              <label className={LABEL} htmlFor="lead-name">
                Nombre completo
              </label>
              <Input
                {...field.props}
                id="lead-name"
                value={field.input ?? ""}
                autoComplete="name"
                placeholder="Tu nombre"
              />
              {field.errors && (
                <p className="text-destructive text-caption mt-1">{field.errors[0]}</p>
              )}
            </div>
          )}
        </Field>

        {international && (
          <Field of={form} path={["residenceCountry"]}>
            {(field) => (
              <div>
                <label className={LABEL} htmlFor="lead-country">
                  País de residencia
                </label>
                <CountryCombobox
                  id="lead-country"
                  name={field.props.name}
                  value={field.input ?? ""}
                  // The combobox hands back a plain value, not a change event, so
                  // the form is told directly rather than through field.props.
                  onValueChange={(country: string) =>
                    setInput(form, { path: ["residenceCountry"], input: country })
                  }
                  invalid={Boolean(field.errors)}
                />
                {field.errors && (
                  <p className="text-destructive text-caption mt-1">{field.errors[0]}</p>
                )}
              </div>
            )}
          </Field>
        )}

        <Field of={form} path={["phone"]}>
          {(field) =>
            international ? (
              <div>
                <label className={LABEL} htmlFor="lead-phone">
                  WhatsApp
                </label>
                <PhoneField
                  id="lead-phone"
                  name={field.props.name}
                  value={field.input ?? ""}
                  onValueChange={(phone: string) =>
                    setInput(form, { path: ["phone"], input: phone })
                  }
                  invalid={Boolean(field.errors)}
                />
                {field.errors && (
                  <p className="text-destructive text-caption mt-1">{field.errors[0]}</p>
                )}
              </div>
            ) : (
              <div>
                <label className={LABEL} htmlFor="lead-phone">
                  WhatsApp / Celular
                </label>
                <Input
                  {...field.props}
                  id="lead-phone"
                  type="tel"
                  inputMode="tel"
                  value={field.input ?? ""}
                  autoComplete="tel"
                  placeholder="300 123 4567"
                  onChange={(e) =>
                    setInput(form, {
                      path: ["phone"],
                      input: formatCoPhone(e.currentTarget.value),
                    })
                  }
                />
                {field.errors && (
                  <p className="text-destructive text-caption mt-1">{field.errors[0]}</p>
                )}
              </div>
            )
          }
        </Field>

        <Field of={form} path={["email"]}>
          {(field) => (
            <div>
              <label className={LABEL} htmlFor="lead-email">
                Correo electrónico
              </label>
              <Input
                {...field.props}
                id="lead-email"
                type="email"
                value={field.input ?? ""}
                autoComplete="email"
                placeholder="correo@email.com"
              />
              {field.errors && (
                <p className="text-destructive text-caption mt-1">{field.errors[0]}</p>
              )}
            </div>
          )}
        </Field>
      </div>

      {qualification && (
        <div className="space-y-4">
          {projectName && (
            <div>
              <span className={SOFT_LABEL}>Proyecto de interés</span>
              {/* Read-only: the visitor got here from this project, and a select
                  that can be changed would send the lead to the wrong one. The
                  real value travels in `projectDocumentId`. */}
              <p className="border-input field-box text-ink flex items-center border bg-white px-3.5">
                {projectName}
              </p>
            </div>
          )}

          <div className={columns === 2 ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}>
            <QualificationSelect
              form={form}
              path="incomeRange"
              label="Rango de ingresos"
              placeholder="Selecciona un rango"
              items={options(qualification.incomeRanges)}
            />
            <QualificationSelect
              form={form}
              path="residenceCity"
              label="Ciudad de residencia"
              placeholder="Selecciona la ciudad"
              items={options(qualification.residenceCities)}
            />
            <QualificationSelect
              form={form}
              path="severance"
              label="Cesantías"
              placeholder="¿Tienes cesantías?"
              items={options(qualification.severanceOptions)}
            />
            <QualificationSelect
              form={form}
              path="savingsRange"
              label="Ahorros disponibles"
              placeholder="Selecciona un rango"
              items={options(qualification.savingsRanges)}
            />
          </div>

          <Field of={form} path={["firstHome"]}>
            {(field) => (
              <div className="flex items-center justify-between gap-4">
                <span className="text-body-sm text-ink font-bold">¿Es tu primera vivienda?</span>
                <span className="flex items-center gap-2">
                  <span className="text-body-sm text-ink-muted">No</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.input === true}
                    aria-label="¿Es tu primera vivienda?"
                    onClick={() =>
                      setInput(form, { path: ["firstHome"], input: field.input !== true })
                    }
                    className="bg-surface-2 aria-checked:bg-brand relative h-6 w-11 shrink-0 rounded-full transition-colors"
                  >
                    <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 in-aria-checked:translate-x-5" />
                  </button>
                  <span className="text-body-sm text-ink-muted">Sí</span>
                </span>
              </div>
            )}
          </Field>

          <Field of={form} path={["acceptsDataPolicy"]}>
            {(field) => (
              <div>
                <label className="text-body-sm text-ink-muted flex items-start gap-2.5">
                  <input
                    {...field.props}
                    type="checkbox"
                    checked={field.input === true}
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
                {field.errors && (
                  <p className="text-destructive text-caption mt-1">{field.errors[0]}</p>
                )}
              </div>
            )}
          </Field>
        </div>
      )}

      <Button type="submit" size="lg" loading={status === "sending"} className="w-full">
        {submitLabel ?? "Quiero más información"}
      </Button>

      {!qualification && (
        <p className="text-caption text-ink-muted text-center">
          Al enviar aceptas la{" "}
          <a
            href={`/legales/${DATA_POLICY_SLUG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            política de tratamiento de datos personales
          </a>
          .
        </p>
      )}

      {status === "error" && (
        <p className="text-destructive text-body-sm text-center">
          No pudimos enviar tus datos. Inténtalo de nuevo en unos minutos.
        </p>
      )}
    </Form>
  );
}

/**
 * One qualification select. Split out because the four of them are identical
 * apart from their label and their list, and inlining them made the form's
 * markup unreadable.
 */
function QualificationSelect({
  form,
  path,
  label,
  placeholder,
  items,
}: {
  // El store que devuelve `useForm`, tomado de donde ya está tipado.
  form: ComponentProps<typeof Field>["of"];
  path: "incomeRange" | "residenceCity" | "severance" | "savingsRange";
  label: string;
  placeholder: string;
  items: string[];
}) {
  // An empty list means the editor has not filled that option list in yet.
  // Drawing a select with nothing but a placeholder is worse than not drawing it.
  if (items.length === 0) return null;

  return (
    <Field of={form} path={[path]}>
      {(field) => (
        <div>
          <label className={SOFT_LABEL} htmlFor={`lead-${path}`}>
            {label}
          </label>
          <Select
            id={`lead-${path}`}
            name={field.props.name}
            value={(field.input as string | undefined) ?? ""}
            placeholder={placeholder}
            onChange={(event) =>
              setInput(form, { path: [path], input: event.currentTarget.value || undefined })
            }
          >
            {items.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>
      )}
    </Field>
  );
}
