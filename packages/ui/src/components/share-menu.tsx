"use client";

import { useEffect, useState } from "react";
import { Popover } from "@base-ui/react/popover";

import { cn } from "@lasgalias/ui/lib/utils";

interface ShareMenuProps {
  /** Lo que se comparte junto al enlace. */
  title: string;
  /** Texto del disparador; el icono lo pone el componente. */
  label?: string;
  className?: string;
}

const icon = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function ShareIcon() {
  return (
    <svg {...icon} width={16} height={16} aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

/* Marcas: se dibujan rellenas porque un logo de contorno no se reconoce. */
function WhatsApp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.3 4.7 4.83-1.27A9.9 9.9 0 1 0 12.04 2Zm0 1.8a8.1 8.1 0 1 1-4.13 15.06l-.3-.18-2.87.75.77-2.8-.19-.3A8.1 8.1 0 0 1 12.04 3.8Zm4.66 10.2c-.25-.13-1.48-.73-1.71-.81-.23-.09-.4-.13-.56.12-.17.25-.65.81-.8.98-.14.16-.29.18-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.66-1.25-1.48-1.4-1.73-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.09-.16.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.42.06-.64.31-.22.25-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.17 1.7 2.6 4.12 3.64.58.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.48-.6 1.69-1.19.2-.58.2-1.08.15-1.18-.06-.11-.23-.17-.48-.29Z" />
    </svg>
  );
}

function XLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-7.1 8.1L23.2 22h-6.5l-5.1-6.7L5.7 22H2.6l7.6-8.7L1.2 2h6.7l4.6 6.1L18.9 2Zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20Z" />
    </svg>
  );
}

function Facebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function LinkedIn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.64h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.75V21h-4v-5.66c0-1.35-.02-3.09-1.94-3.09-1.94 0-2.24 1.47-2.24 2.99V21h-4V9Z" />
    </svg>
  );
}

function Mail() {
  return (
    <svg {...icon} aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function Link() {
  return (
    <svg {...icon} aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  );
}

function Check() {
  return (
    <svg {...icon} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Row({
  children,
  onClick,
  href,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    "text-body-sm text-ink hover:bg-surface flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

/**
 * Menú de compartir.
 *
 * Antes era un botón que abría la hoja del sistema y, si no había, copiaba el
 * enlace en silencio — dos comportamientos distintos según el navegador y
 * ninguno visible. Aquí siempre se ve lo mismo: WhatsApp, X, Facebook, LinkedIn,
 * correo y copiar. La hoja nativa se ofrece como una opción más, y solo donde
 * existe.
 *
 * El enlace se lee del navegador al abrir y no se recibe por props: el sitio es
 * estático y la URL con la que se construyó no siempre es la que el visitante
 * tiene delante (una campaña añade su `utm_`, por ejemplo).
 */
export function ShareMenu({ title, label = "Compartir", className }: ShareMenuProps) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
    setCanShare(typeof navigator !== "undefined" && Boolean(navigator.share));
  }, []);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // El portapapeles puede estar bloqueado; el resto de opciones siguen ahí.
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn("btn btn-outline gap-2 px-5 py-2.5 text-sm", className)}
        aria-label={`Compartir: ${title}`}
      >
        <ShareIcon />
        {label}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" className="z-50 outline-none">
          <Popover.Popup className="border-line shadow-card-lg w-60 rounded-2xl border bg-white p-2">
            <Popover.Title className="eyebrow text-ink-muted px-3 pt-1 pb-2">
              Compartir
            </Popover.Title>

            <Row href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}>
              <span className="text-[#25D366]">
                <WhatsApp />
              </span>
              WhatsApp
            </Row>
            <Row href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}>
              <span className="text-ink">
                <XLogo />
              </span>
              X
            </Row>
            <Row href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}>
              <span className="text-[#1877F2]">
                <Facebook />
              </span>
              Facebook
            </Row>
            <Row href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}>
              <span className="text-[#0A66C2]">
                <LinkedIn />
              </span>
              LinkedIn
            </Row>
            <Row href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}>
              <span className="text-ink-muted">
                <Mail />
              </span>
              Correo
            </Row>

            <div className="border-line my-1 border-t" />

            <Row onClick={copy}>
              <span className={copied ? "text-brand" : "text-ink-muted"}>
                {copied ? <Check /> : <Link />}
              </span>
              {copied ? "Enlace copiado" : "Copiar enlace"}
            </Row>

            {canShare && (
              <Row onClick={() => void navigator.share({ title, url }).catch(() => {})}>
                <span className="text-ink-muted">
                  <ShareIcon />
                </span>
                Más opciones…
              </Row>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
