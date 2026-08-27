import { useState } from "react";
import { Field, Form, setInput, useForm } from "@formisch/react";

import {
  DATA_POLICY_SLUG,
  PQR_TYPE_LABELS,
  PQR_TYPES,
  PqrSchema,
  type PqrType,
} from "@lasgalias/schemas";
import { Button } from "@lasgalias/ui/components/button";
import { Input } from "@lasgalias/ui/components/input";
import { Textarea } from "@lasgalias/ui/components/textarea";

export interface PqrProjectOption {
  documentId: string;
  name: string;
}

interface PqrFormProps {
  projects: PqrProjectOption[];
}

const STRAPI_URL = import.meta.env.PUBLIC_STRAPI_URL ?? "http://localhost:1337";

/** Groups a Colombian mobile number as "300 123 4567" while typing. */
function formatCoPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

const HELP: Record<PqrType, string> = {
  peticion: "Solicitas información o un documento.",
  queja: "Reportas la conducta de una persona o de un proceso.",
  reclamo: "Algo que compraste o contrataste no salió como se pactó.",
  sugerencia: "Una idea para que lo hagamos mejor.",
  postventa: "Un arreglo o una garantía sobre un inmueble ya entregado.",
};

const FIELD_LABEL = "text-body-sm text-ink mb-1 block font-medium";
const FIELD_ERROR = "text-destructive text-caption mt-1";

/**
 * PQR form (peticiones, quejas, reclamos, sugerencias and post-sale requests).
 *
 * Stored as a `pqr` entry in the CMS, which stamps a radicado and emails the
 * customer-service inbox. Unlike LeadForm this is NOT pushed to the Sinco CRM:
 * a complaint is not a sales lead, and filing it as one would put the person
 * into a commercial pipeline they never asked for.
 */
export default function PqrForm({ projects }: PqrFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [radicado, setRadicado] = useState<string | null>(null);

  const form = useForm({
    schema: PqrSchema,
    initialInput: { type: "peticion" as PqrType },
  });

  if (status === "ok") {
    return (
      <div className="border-line rounded-2xl border bg-white p-8 text-center">
        <p className="text-h4 text-ink font-bold">Recibimos tu solicitud</p>
        {radicado && (
          <>
            <p className="text-ink-muted mt-3">Tu número de radicado es</p>
            <p className="text-h3 text-brand mt-1 font-extrabold tracking-tight">{radicado}</p>
          </>
        )}
        <p className="text-body-sm text-ink-muted mx-auto mt-4 max-w-md">
          Guárdalo: es el número con el que puedes hacerle seguimiento. Te responderemos dentro de
          los 15 días hábiles que fija la Ley 1755 de 2015, y por lo general mucho antes.
        </p>
      </div>
    );
  }

  return (
    <Form
      of={form}
      onSubmit={async (output) => {
        setStatus("sending");
        try {
          const res = await fetch(`${STRAPI_URL}/api/pqrs`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              data: {
                type: output.type,
                name: output.name,
                email: output.email,
                phone: output.phone,
                documentNumber: output.documentNumber,
                subject: output.subject,
                message: output.message,
                tower: output.tower,
                unit: output.unit,
                acceptsDataPolicy: output.acceptsDataPolicy,
                ...(output.projectDocumentId ? { project: output.projectDocumentId } : {}),
              },
            }),
          });
          if (!res.ok) {
            setStatus("error");
            return;
          }
          // The radicado is the receipt. It is stamped before the row is
          // written, so it always comes back on the create response.
          const body = (await res.json()) as { data?: { radicado?: string } };
          setRadicado(body.data?.radicado ?? null);
          setStatus("ok");
        } catch {
          setStatus("error");
        }
      }}
      className="space-y-5"
    >
      <Field of={form} path={["type"]}>
        {(field) => {
          const selected = (field.input ?? "peticion") as PqrType;
          return (
            <fieldset>
              <legend className={FIELD_LABEL}>¿Qué necesitas?</legend>
              <div className="flex flex-wrap gap-2">
                {PQR_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={selected === type}
                    onClick={() => setInput(form, { path: ["type"], input: type })}
                    className={`chip transition-colors ${
                      selected === type ? "bg-ink border-ink text-white" : "hover:bg-surface"
                    }`}
                  >
                    {PQR_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
              <p className="text-caption text-ink-muted mt-2">{HELP[selected]}</p>
              {field.errors && <p className={FIELD_ERROR}>{field.errors[0]}</p>}
            </fieldset>
          );
        }}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field of={form} path={["name"]}>
          {(field) => (
            <div>
              <label className={FIELD_LABEL} htmlFor="pqr-name">
                Nombre completo
              </label>
              <Input {...field.props} id="pqr-name" value={field.input ?? ""} autoComplete="name" />
              {field.errors && <p className={FIELD_ERROR}>{field.errors[0]}</p>}
            </div>
          )}
        </Field>

        <Field of={form} path={["documentNumber"]}>
          {(field) => (
            <div>
              <label className={FIELD_LABEL} htmlFor="pqr-document">
                Documento de identidad (opcional)
              </label>
              <Input
                {...field.props}
                id="pqr-document"
                value={field.input ?? ""}
                inputMode="numeric"
              />
              {field.errors && <p className={FIELD_ERROR}>{field.errors[0]}</p>}
            </div>
          )}
        </Field>

        <Field of={form} path={["email"]}>
          {(field) => (
            <div>
              <label className={FIELD_LABEL} htmlFor="pqr-email">
                Correo electrónico
              </label>
              <Input
                {...field.props}
                id="pqr-email"
                type="email"
                value={field.input ?? ""}
                autoComplete="email"
              />
              {field.errors && <p className={FIELD_ERROR}>{field.errors[0]}</p>}
            </div>
          )}
        </Field>

        <Field of={form} path={["phone"]}>
          {(field) => (
            <div>
              <label className={FIELD_LABEL} htmlFor="pqr-phone">
                Celular
              </label>
              <Input
                {...field.props}
                id="pqr-phone"
                type="tel"
                inputMode="tel"
                value={field.input ?? ""}
                autoComplete="tel"
                placeholder="300 123 4567"
                onChange={(e) =>
                  setInput(form, { path: ["phone"], input: formatCoPhone(e.currentTarget.value) })
                }
              />
              {field.errors && <p className={FIELD_ERROR}>{field.errors[0]}</p>}
            </div>
          )}
        </Field>
      </div>

      <Field of={form} path={["projectDocumentId"]}>
        {(field) => (
          <div>
            <label className={FIELD_LABEL} htmlFor="pqr-project">
              Proyecto (opcional)
            </label>
            <select
              {...field.props}
              id="pqr-project"
              value={field.input ?? ""}
              className="border-line focus-visible:ring-ring text-body-sm h-10 w-full rounded-lg border bg-white px-3 focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="">No aplica / no lo veo en la lista</option>
              {projects.map((project) => (
                <option key={project.documentId} value={project.documentId}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </Field>

      {/* Only post-sale requests are about a specific unit; asking a petition
          which tower it concerns would be noise. */}
      <Field of={form} path={["type"]}>
        {(typeField) =>
          typeField.input === "postventa" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field of={form} path={["tower"]}>
                {(field) => (
                  <div>
                    <label className={FIELD_LABEL} htmlFor="pqr-tower">
                      Torre o etapa
                    </label>
                    <Input {...field.props} id="pqr-tower" value={field.input ?? ""} />
                    {field.errors && <p className={FIELD_ERROR}>{field.errors[0]}</p>}
                  </div>
                )}
              </Field>
              <Field of={form} path={["unit"]}>
                {(field) => (
                  <div>
                    <label className={FIELD_LABEL} htmlFor="pqr-unit">
                      Apartamento o casa
                    </label>
                    <Input {...field.props} id="pqr-unit" value={field.input ?? ""} />
                    {field.errors && <p className={FIELD_ERROR}>{field.errors[0]}</p>}
                  </div>
                )}
              </Field>
            </div>
          ) : (
            // The render prop must return an element, so an empty fragment
            // rather than null when the request is not a post-sale one.
            <></>
          )
        }
      </Field>

      <Field of={form} path={["subject"]}>
        {(field) => (
          <div>
            <label className={FIELD_LABEL} htmlFor="pqr-subject">
              Asunto
            </label>
            <Input
              {...field.props}
              id="pqr-subject"
              value={field.input ?? ""}
              placeholder="En una línea, ¿de qué se trata?"
            />
            {field.errors && <p className={FIELD_ERROR}>{field.errors[0]}</p>}
          </div>
        )}
      </Field>

      <Field of={form} path={["message"]}>
        {(field) => (
          <div>
            <label className={FIELD_LABEL} htmlFor="pqr-message">
              Cuéntanos qué pasó
            </label>
            <Textarea {...field.props} id="pqr-message" value={field.input ?? ""} rows={6} />
            <p className="text-caption text-ink-muted mt-1">
              Entre más concreto seas (fechas, nombres, qué esperabas), más rápido podemos
              resolverlo.
            </p>
            {field.errors && <p className={FIELD_ERROR}>{field.errors[0]}</p>}
          </div>
        )}
      </Field>

      <Field of={form} path={["acceptsDataPolicy"]}>
        {(field) => (
          <div>
            <label className="text-body-sm text-ink-muted flex items-start gap-2">
              <input
                {...field.props}
                type="checkbox"
                checked={field.input === true}
                className="accent-ink mt-1"
              />
              <span>
                Acepto la{" "}
                <a
                  href={`/legales/${DATA_POLICY_SLUG}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand underline"
                >
                  política de tratamiento de datos personales
                </a>{" "}
                de Constructora Las Galias (Ley 1581 de 2012).
              </span>
            </label>
            {field.errors && <p className={FIELD_ERROR}>{field.errors[0]}</p>}
          </div>
        )}
      </Field>

      <Button type="submit" size="lg" loading={status === "sending"} className="w-full">
        Radicar solicitud
      </Button>

      {status === "error" && (
        <p className="text-destructive text-body-sm text-center">
          No pudimos radicar tu solicitud. Inténtalo de nuevo, o escríbenos a{" "}
          <a className="underline" href="mailto:sala@lasgalias.com.co">
            sala@lasgalias.com.co
          </a>
          .
        </p>
      )}
    </Form>
  );
}
