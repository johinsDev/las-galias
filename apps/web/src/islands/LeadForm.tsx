import { useState } from "react";
import { Field, Form, setInput, useForm } from "@formisch/react";

import { LeadSchema } from "@lasgalias/schemas";
import { Button } from "@lasgalias/ui/components/button";
import { Input } from "@lasgalias/ui/components/input";
import { Textarea } from "@lasgalias/ui/components/textarea";

interface LeadFormProps {
  projectDocumentId?: string;
  source: string;
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
 * Lead form (expectation-stage PDPs and contact page). Submissions are stored
 * as `lead` entries in the CMS for a later push.
 */
export default function LeadForm({ projectDocumentId, source }: LeadFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");

  const form = useForm({
    schema: LeadSchema,
    initialInput: { projectDocumentId, source },
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
      <Field of={form} path={["name"]}>
        {(field) => (
          <div>
            <label className="text-body-sm text-ink mb-1 block font-medium" htmlFor="lead-name">
              Nombre completo
            </label>
            <Input {...field.props} id="lead-name" value={field.input ?? ""} autoComplete="name" />
            {field.errors && (
              <p className="text-destructive text-caption mt-1">{field.errors[0]}</p>
            )}
          </div>
        )}
      </Field>

      <Field of={form} path={["email"]}>
        {(field) => (
          <div>
            <label className="text-body-sm text-ink mb-1 block font-medium" htmlFor="lead-email">
              Correo electrónico
            </label>
            <Input
              {...field.props}
              id="lead-email"
              type="email"
              value={field.input ?? ""}
              autoComplete="email"
            />
            {field.errors && (
              <p className="text-destructive text-caption mt-1">{field.errors[0]}</p>
            )}
          </div>
        )}
      </Field>

      <Field of={form} path={["phone"]}>
        {(field) => (
          <div>
            <label className="text-body-sm text-ink mb-1 block font-medium" htmlFor="lead-phone">
              Celular
            </label>
            <Input
              {...field.props}
              id="lead-phone"
              type="tel"
              inputMode="numeric"
              value={field.input ?? ""}
              autoComplete="tel"
              placeholder="300 123 4567"
              onChange={(e) =>
                setInput(form, { path: ["phone"], input: formatCoPhone(e.currentTarget.value) })
              }
            />
            {field.errors && (
              <p className="text-destructive text-caption mt-1">{field.errors[0]}</p>
            )}
          </div>
        )}
      </Field>

      <Field of={form} path={["message"]}>
        {(field) => (
          <div>
            <label className="text-body-sm text-ink mb-1 block font-medium" htmlFor="lead-message">
              Mensaje (opcional)
            </label>
            <Textarea {...field.props} id="lead-message" value={field.input ?? ""} rows={3} />
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
                Acepto la política de tratamiento de datos personales de Constructora Las Galias
                (Ley 1581 de 2012).
              </span>
            </label>
            {field.errors && (
              <p className="text-destructive text-caption mt-1">{field.errors[0]}</p>
            )}
          </div>
        )}
      </Field>

      <Button type="submit" size="lg" loading={status === "sending"} className="w-full">
        Quiero más información
      </Button>

      {status === "error" && (
        <p className="text-destructive text-body-sm text-center">
          No pudimos enviar tus datos. Inténtalo de nuevo en unos minutos.
        </p>
      )}
    </Form>
  );
}
