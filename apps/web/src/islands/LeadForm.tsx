import { useEffect, useState, type ComponentProps } from "react";
import { Field, Form, setInput, useForm } from "@formisch/react";

import type { LeadFormConfig } from "@lasgalias/schemas";
import { DATA_POLICY_SLUG, ForeignLeadSchema, LeadSchema } from "@lasgalias/schemas";
import { Button } from "@lasgalias/ui/components/button";
import { Input } from "@lasgalias/ui/components/input";
import { CountryCombobox } from "@lasgalias/ui/components/country-combobox";
import { PhoneField } from "@lasgalias/ui/components/phone-field";
import { Select } from "@lasgalias/ui/components/select";

import { QUALIFICATION_EVENT, type QualificationDetail } from "@/lib/qualification";

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
  /**
   * Catálogo para el desplegable "Proyecto de interés". Arranca en
   * `projectDocumentId` —la ficha en la que está el formulario— pero se puede
   * cambiar: alguien puede llegar por un proyecto y preguntar por otro.
   */
  projects?: { documentId: string; name: string }[];
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
  projects,
  columns = 1,
}: LeadFormProps) {
  /**
   * La ficha de proyecto monta este formulario dos veces —barra lateral y banda
   * de asesoría— y sin un prefijo los dos comparten los `id` y, peor, el `name`
   * de la casilla: `getElementsByName` encontraba dos y la librería la trataba
   * como un grupo de casillas, guardando un array en vez de `true`. Resultado:
   * no había forma de aceptar los términos.
   */
  const uid = source.replace(/[^a-z0-9]+/gi, "-");

  // El Figma dibuja la banda ancha con etiquetas en mayúsculas y el chevron a la
  // izquierda, y la barra lateral en caja baja con el chevron a la derecha.
  const labelClass = columns === 2 ? LABEL : SOFT_LABEL;
  const chevronSide = columns === 2 ? "left" : "right";
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
      phone: "+57",
      ...(international ? { residenceCountry: "Colombia" } : {}),
      ...readUtm(),
    },
  });

  /**
   * Lo que la banda de asesoría recogió abajo. Ese bloque no tiene nombre ni
   * teléfono —el diseño no los dibuja— así que su botón trae aquí las respuestas
   * y la persona solo añade cómo contactarla.
   */
  useEffect(() => {
    if (!qualification) return;
    const onFilled = (event: Event) => {
      const detail = (event as CustomEvent<QualificationDetail>).detail;
      if (!detail) return;
      for (const [key, value] of Object.entries(detail)) {
        if (value === undefined) continue;
        setInput(form, { path: [key as "incomeRange"], input: value as string });
      }
    };
    document.addEventListener(QUALIFICATION_EVENT, onFilled);
    return () => document.removeEventListener(QUALIFICATION_EVENT, onFilled);
  }, [form, qualification]);

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
              <label className={LABEL} htmlFor={`${uid}-name`}>
                Nombre completo
              </label>
              <Input
                {...field.props}
                id={`${uid}-name`}
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
                <label className={LABEL} htmlFor={`${uid}-country`}>
                  País de residencia
                </label>
                <CountryCombobox
                  id={`${uid}-country`}
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
          {(field) => (
            <div>
              <label className={LABEL} htmlFor={`${uid}-phone`}>
                {international ? "WhatsApp" : "WhatsApp / Celular"}
              </label>
              <PhoneField
                id={`${uid}-phone`}
                name={field.props.name}
                value={field.input ?? ""}
                onValueChange={(phone: string) => setInput(form, { path: ["phone"], input: phone })}
                invalid={Boolean(field.errors)}
              />
              {field.errors && (
                <p className="text-destructive text-caption mt-1">{field.errors[0]}</p>
              )}
            </div>
          )}
        </Field>

        <Field of={form} path={["email"]}>
          {(field) => (
            <div>
              <label className={LABEL} htmlFor={`${uid}-email`}>
                Correo electrónico
              </label>
              <Input
                {...field.props}
                id={`${uid}-email`}
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
          {projects && projects.length > 0 && (
            <Field of={form} path={["projectDocumentId"]}>
              {(field) => (
                <div>
                  <label className={labelClass} htmlFor={`${uid}-project`}>
                    Proyecto de interés
                  </label>
                  <Select
                    id={`${uid}-project`}
                    name={field.props.name}
                    chevron={chevronSide}
                    value={(field.input as string | undefined) ?? ""}
                    searchable
                    searchPlaceholder="Busca un proyecto…"
                    emptyMessage="No encontramos ese proyecto."
                    items={projects.map((item) => ({
                      value: item.documentId,
                      label: item.name,
                    }))}
                    onValueChange={(next: string) =>
                      setInput(form, {
                        path: ["projectDocumentId"],
                        input: next || undefined,
                      })
                    }
                  />
                </div>
              )}
            </Field>
          )}

          <div className={columns === 2 ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}>
            <QualificationSelect
              form={form}
              labelClass={labelClass}
              chevron={chevronSide}
              uid={uid}
              path="incomeRange"
              label="Rango de ingresos"
              placeholder="Selecciona un rango"
              items={options(qualification.incomeRanges)}
            />
            <QualificationSelect
              form={form}
              labelClass={labelClass}
              chevron={chevronSide}
              uid={uid}
              path="residenceCity"
              label="Ciudad de residencia"
              placeholder="Selecciona la ciudad"
              searchable
              searchPlaceholder="Busca tu ciudad…"
              emptyMessage="No encontramos esa ciudad."
              items={options(qualification.residenceCities)}
            />
            <QualificationSelect
              form={form}
              labelClass={labelClass}
              chevron={chevronSide}
              uid={uid}
              path="severance"
              label="Cesantías"
              placeholder="¿Tienes cesantías?"
              items={options(qualification.severanceOptions)}
            />
            <QualificationSelect
              form={form}
              labelClass={labelClass}
              chevron={chevronSide}
              uid={uid}
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
                    name={`${uid}-${field.props.name}`}
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

      <Button type="submit" size="lg" loading={status === "sending"} className="btn-field w-full">
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
  labelClass,
  chevron,
  uid,
  searchable = false,
  searchPlaceholder,
  emptyMessage,
}: {
  // El store que devuelve `useForm`, tomado de donde ya está tipado.
  form: ComponentProps<typeof Field>["of"];
  path: "incomeRange" | "residenceCity" | "severance" | "savingsRange";
  label: string;
  placeholder: string;
  items: string[];
  labelClass: string;
  chevron: "left" | "right";
  uid: string;
  /** Solo las listas largas lo necesitan; con tres opciones estorba. */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
}) {
  // An empty list means the editor has not filled that option list in yet.
  // Drawing a select with nothing but a placeholder is worse than not drawing it.
  if (items.length === 0) return null;

  return (
    <Field of={form} path={[path]}>
      {(field) => (
        <div>
          <label className={labelClass} htmlFor={`${uid}-${path}`}>
            {label}
          </label>
          <Select
            id={`${uid}-${path}`}
            name={field.props.name}
            chevron={chevron}
            searchable={searchable}
            searchPlaceholder={searchPlaceholder}
            emptyMessage={emptyMessage}
            value={(field.input as string | undefined) ?? ""}
            placeholder={placeholder}
            items={items.map((item) => ({ value: item, label: item }))}
            onValueChange={(next: string) =>
              setInput(form, { path: [path], input: next || undefined })
            }
          />
        </div>
      )}
    </Field>
  );
}
