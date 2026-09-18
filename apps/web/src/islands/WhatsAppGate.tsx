"use client";

import { useEffect, useId, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import * as v from "valibot";

import { DATA_POLICY_SLUG, LeadSchema } from "@lasgalias/schemas";
import { Input } from "@lasgalias/ui/components/input";
import { PhoneField } from "@lasgalias/ui/components/phone-field";

/** What a card's WhatsApp button announces on `document`. */
export interface WhatsAppRequest {
  name: string;
  documentId: string;
  whatsappUrl: string;
  logoUrl?: string | null;
}

export const WHATSAPP_EVENT = "lg:open-whatsapp";

const STRAPI_URL = import.meta.env.PUBLIC_STRAPI_URL ?? "http://localhost:1337";
const LABEL = "text-label text-ink-muted mb-1.5 block font-bold uppercase";
const ERROR = "text-destructive text-caption mt-1";

const GateSchema = v.object({
  firstName: v.pipe(v.string(), v.trim(), v.minLength(2, "Ingresa tu nombre")),
  lastName: v.pipe(v.string(), v.trim(), v.minLength(2, "Ingresa tu apellido")),
  phone: LeadSchema.entries.phone,
  email: v.union([
    v.pipe(v.string(), v.trim(), v.length(0)),
    v.pipe(v.string(), v.trim(), v.email("Ingresa un correo válido")),
  ]),
});
type Values = v.InferInput<typeof GateSchema>;
type Errors = Partial<Record<keyof Values, string>>;

// "+57" up front: the picker opens on Colombia, as the lead form does.
const EMPTY: Values = { firstName: "", lastName: "", phone: "+57", email: "" };

/** The chat opens with the project already named, so the advisor knows. */
function chatUrl(url: string, project: string): string {
  try {
    const parsed = new URL(url);
    const isWhatsApp = /(^|\.)(wa\.me|whatsapp\.com)$/.test(parsed.hostname);
    if (isWhatsApp && !parsed.searchParams.has("text")) {
      parsed.searchParams.set("text", `Hola, me interesa el proyecto ${project}.`);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/** The event the directive parked on `<html>` while React was still loading. */
function pendingRequest(): WhatsAppRequest | null {
  const raw = document.documentElement.dataset.lgPendingEvent;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { type?: string; detail?: WhatsAppRequest | null };
    if (parsed.type !== WHATSAPP_EVENT) return null;
    delete document.documentElement.dataset.lgPendingEvent;
    return parsed.detail ?? null;
  } catch {
    return null;
  }
}

/**
 * «Antes de escribirte por WhatsApp»: the modal a card's WhatsApp button opens
 * (Figma 2280:5065). Name, surname and phone, an optional e-mail, then the
 * chat. The lead is posted with `keepalive` and the chat opens in the same
 * click, so a slow or failing CMS never stands between a visitor and the
 * advisor — the lead is the bonus, the conversation is the point.
 *
 * One instance per page, hydrated on demand (`client:on`): the buttons are
 * plain markup in every card and only announce which project they belong to.
 */
export default function WhatsAppGate() {
  const [request, setRequest] = useState<WhatsAppRequest | null>(null);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const uid = useId();

  useEffect(() => {
    const open = (next: WhatsAppRequest) => {
      setValues(EMPTY);
      setErrors({});
      setRequest(next);
    };
    const parked = pendingRequest();
    if (parked) open(parked);
    const onEvent = (event: Event) => open((event as CustomEvent<WhatsAppRequest>).detail);
    document.addEventListener(WHATSAPP_EVENT, onEvent);
    return () => document.removeEventListener(WHATSAPP_EVENT, onEvent);
  }, []);

  const set = (key: keyof Values) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!request) return;
    const result = v.safeParse(GateSchema, values);
    if (!result.success) {
      const next: Errors = {};
      for (const issue of result.issues) {
        const key = issue.path?.[0]?.key as keyof Values | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const lead = result.output;
    void fetch(`${STRAPI_URL}/api/leads`, {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: {
          name: `${lead.firstName} ${lead.lastName}`,
          phone: lead.phone,
          ...(lead.email ? { email: lead.email } : {}),
          source: "whatsapp",
          project: request.documentId,
          acceptsDataPolicy: true,
          acceptsWhatsApp: true,
          utmSource: params.get("utm_source") ?? undefined,
          utmMedium: params.get("utm_medium") ?? undefined,
          utmCampaign: params.get("utm_campaign") ?? undefined,
        },
      }),
    }).catch(() => {
      // The chat is already opening; a lost lead must not stop it.
    });

    window.open(chatUrl(request.whatsappUrl, request.name), "_blank", "noopener");
    setRequest(null);
  };

  return (
    <Dialog.Root open={request !== null} onOpenChange={(open) => !open && setRequest(null)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[92vh] w-[min(94vw,440px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] bg-white px-8 py-7 shadow-[0_28px_80px_rgba(0,0,0,0.22)]">
          {request && (
            <form onSubmit={submit} noValidate className="space-y-5">
              <div className="flex items-center gap-3">
                <span className="border-mist flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border bg-white p-1">
                  {request.logoUrl && (
                    <img
                      src={request.logoUrl}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </span>
                <span className="text-ink-muted min-w-0 flex-1 truncate text-sm">
                  {request.name}
                </span>
                <Dialog.Close
                  aria-label="Cerrar"
                  className="text-ink-muted hover:text-ink -mr-2 flex size-9 shrink-0 items-center justify-center rounded-full"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </Dialog.Close>
              </div>

              <div>
                <Dialog.Title className="text-ink text-[22px] leading-7 font-bold">
                  Antes de escribirte por WhatsApp
                </Dialog.Title>
                <Dialog.Description className="text-ink-muted text-body-sm mt-2">
                  Déjanos estos datos para que nuestro asesor te atienda mejor.
                </Dialog.Description>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL} htmlFor={`${uid}-first`}>
                    Nombre
                  </label>
                  <Input
                    id={`${uid}-first`}
                    name="firstName"
                    autoComplete="given-name"
                    placeholder="Tu nombre"
                    value={values.firstName}
                    onChange={(e) => set("firstName")(e.currentTarget.value)}
                    aria-invalid={errors.firstName ? true : undefined}
                  />
                  {errors.firstName && <p className={ERROR}>{errors.firstName}</p>}
                </div>
                <div>
                  <label className={LABEL} htmlFor={`${uid}-last`}>
                    Apellido
                  </label>
                  <Input
                    id={`${uid}-last`}
                    name="lastName"
                    autoComplete="family-name"
                    placeholder="Tu apellido"
                    value={values.lastName}
                    onChange={(e) => set("lastName")(e.currentTarget.value)}
                    aria-invalid={errors.lastName ? true : undefined}
                  />
                  {errors.lastName && <p className={ERROR}>{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className={LABEL} htmlFor={`${uid}-phone`}>
                  Teléfono
                </label>
                <PhoneField
                  id={`${uid}-phone`}
                  name="phone"
                  value={values.phone}
                  onValueChange={set("phone")}
                  invalid={Boolean(errors.phone)}
                />
                {errors.phone && <p className={ERROR}>{errors.phone}</p>}
              </div>

              <div>
                <label className={LABEL} htmlFor={`${uid}-email`}>
                  Correo electrónico (opcional)
                </label>
                <Input
                  id={`${uid}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="correo@email.com"
                  value={values.email}
                  onChange={(e) => set("email")(e.currentTarget.value)}
                  aria-invalid={errors.email ? true : undefined}
                />
                {errors.email && <p className={ERROR}>{errors.email}</p>}
              </div>

              <button type="submit" className="btn btn-primary w-full py-3.5 text-base">
                Continuar a WhatsApp
              </button>

              <p className="text-caption text-ink-muted">
                🔒 Tus datos solo se usan para contactarte sobre este proyecto. Al continuar aceptas
                la{" "}
                <a
                  href={`/legales/${DATA_POLICY_SLUG}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand font-medium"
                >
                  política de tratamiento de datos
                </a>
                .
              </p>
            </form>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
