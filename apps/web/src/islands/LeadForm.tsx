import { useState } from "react";
import { Field, Form, useForm } from "@formisch/react";

import { LeadSchema } from "@lasgalias/schemas";
import { Button } from "@lasgalias/ui/components/button";
import { Input } from "@lasgalias/ui/components/input";
import { Textarea } from "@lasgalias/ui/components/textarea";

interface LeadFormProps {
  proyectoDocumentId?: string;
  origen: string;
}

const STRAPI_URL = import.meta.env.PUBLIC_STRAPI_URL ?? "http://localhost:1337";

/**
 * Formulario de leads (PDP de expectativa y contacto). Los envíos se guardan
 * como `lead` en el CMS para hacer push después.
 */
export default function LeadForm({ proyectoDocumentId, origen }: LeadFormProps) {
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");

  const form = useForm({
    schema: LeadSchema,
    initialInput: { proyectoDocumentId, origen },
  });

  if (estado === "ok") {
    return (
      <div className="bg-verde-100 text-verde-900 rounded-xl p-6 text-center">
        <p className="text-h4 font-bold">¡Gracias por tu interés!</p>
        <p className="mt-1">Muy pronto un asesor se pondrá en contacto contigo.</p>
      </div>
    );
  }

  return (
    <Form
      of={form}
      onSubmit={async (output) => {
        setEstado("enviando");
        try {
          const res = await fetch(`${STRAPI_URL}/api/leads`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              data: {
                nombre: output.nombre,
                email: output.email,
                telefono: output.telefono,
                mensaje: output.mensaje,
                origen: output.origen,
                aceptaTratamientoDatos: output.aceptaTratamientoDatos,
                ...(output.proyectoDocumentId ? { proyecto: output.proyectoDocumentId } : {}),
              },
            }),
          });
          setEstado(res.ok ? "ok" : "error");
        } catch {
          setEstado("error");
        }
      }}
      className="space-y-4"
    >
      <Field of={form} path={["nombre"]}>
        {(field) => (
          <div>
            <label className="text-body-sm text-ink mb-1 block font-medium" htmlFor="lead-nombre">
              Nombre completo
            </label>
            <Input
              {...field.props}
              id="lead-nombre"
              value={field.input ?? ""}
              autoComplete="name"
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

      <Field of={form} path={["telefono"]}>
        {(field) => (
          <div>
            <label className="text-body-sm text-ink mb-1 block font-medium" htmlFor="lead-telefono">
              Celular
            </label>
            <Input
              {...field.props}
              id="lead-telefono"
              type="tel"
              value={field.input ?? ""}
              autoComplete="tel"
              placeholder="3001234567"
            />
            {field.errors && (
              <p className="text-destructive text-caption mt-1">{field.errors[0]}</p>
            )}
          </div>
        )}
      </Field>

      <Field of={form} path={["mensaje"]}>
        {(field) => (
          <div>
            <label className="text-body-sm text-ink mb-1 block font-medium" htmlFor="lead-mensaje">
              Mensaje (opcional)
            </label>
            <Textarea {...field.props} id="lead-mensaje" value={field.input ?? ""} rows={3} />
          </div>
        )}
      </Field>

      <Field of={form} path={["aceptaTratamientoDatos"]}>
        {(field) => (
          <div>
            <label className="text-body-sm text-ink-muted flex items-start gap-2">
              <input
                {...field.props}
                type="checkbox"
                checked={field.input === true}
                className="accent-verde-700 mt-1"
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

      <Button type="submit" size="lg" loading={estado === "enviando"} className="w-full">
        Quiero más información
      </Button>

      {estado === "error" && (
        <p className="text-destructive text-body-sm text-center">
          No pudimos enviar tus datos. Inténtalo de nuevo en unos minutos.
        </p>
      )}
    </Form>
  );
}
