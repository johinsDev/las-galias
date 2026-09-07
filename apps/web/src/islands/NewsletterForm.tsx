import { useState } from "react";

const STRAPI_URL = import.meta.env.PUBLIC_STRAPI_URL ?? "http://localhost:1337";

interface NewsletterFormProps {
  /** Dónde se suscribió, para saber qué artículo convierte. */
  source: string;
}

/**
 * "Newsletter Galias": un correo y nada más.
 *
 * Escribe en su propia colección y no en `lead`: un lead sin nombre ni teléfono
 * no le sirve a un asesor, y aparecería en su bandeja como un contacto a medias.
 */
export default function NewsletterForm({ source }: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");

  if (status === "ok") {
    return (
      <p className="text-body-sm mt-4 text-white/80">
        ¡Listo! Te escribiremos cuando publiquemos algo que valga la pena.
      </p>
    );
  }

  return (
    <form
      className="mt-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setStatus("sending");
        try {
          const res = await fetch(`${STRAPI_URL}/api/newsletter-subscribers`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ data: { email, source } }),
          });
          setStatus(res.ok ? "ok" : "error");
        } catch {
          setStatus("error");
        }
      }}
    >
      <label className="sr-only" htmlFor="newsletter-email">
        Correo electrónico
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.currentTarget.value)}
        placeholder="correo@email.com"
        className="field-box w-full border border-white/15 bg-white/10 px-3.5 text-base text-white outline-none placeholder:text-white/40 focus:border-white/40"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="btn btn-primary btn-field mt-3 w-full disabled:opacity-70"
      >
        {status === "sending" ? "Enviando…" : "Suscribirme gratis"}
      </button>
      {status === "error" && (
        <p className="text-caption mt-2 text-white/70">
          No pudimos suscribirte. Inténtalo de nuevo en unos minutos.
        </p>
      )}
    </form>
  );
}
