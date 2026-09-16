import { useState } from "react";

import { Input } from "@lasgalias/ui/components/input";
import { Select } from "@lasgalias/ui/components/select";

import PqrForm, { type PqrProjectOption } from "@/islands/PqrForm";

interface PqrGateProps {
  projects: PqrProjectOption[];
}

/** Una cédula colombiana: entre 6 y 10 dígitos, sin puntos. */
function cleanDocument(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

function Check() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Lock() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/**
 * La puerta de la página de PQR: cédula, negocio y luego el formulario.
 *
 * El diseño pide dos pasos antes de escribir nada, y hay una razón práctica: un
 * PQR sin documento ni negocio obliga a servicio al cliente a devolver el correo
 * preguntando quién es y por cuál inmueble.
 *
 * «Consultar» comprueba el FORMATO del documento; no consulta el CRM. Buscar la
 * cédula en Sinco desde una página pública diría, a quien la escriba, si esa
 * persona es cliente de la constructora — y eso es una decisión de negocio, no
 * de maquetación.
 */
export default function PqrGate({ projects }: PqrGateProps) {
  const [document, setDocument] = useState("");
  const [validated, setValidated] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const canValidate = document.length >= 6;

  if (open) {
    return <PqrForm projects={projects} documentNumber={document} lockedProjectId={projectId} />;
  }

  return (
    <form
      className="border-mist rounded-[20px] border-[1.43px] bg-white p-6 md:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (!validated) {
          if (!canValidate) {
            setError("Escribe tu número de cédula, sin puntos ni comas.");
            return;
          }
          setError(null);
          setValidated(true);
          return;
        }
        if (!projectId) {
          setError("Elige el negocio sobre el que escribes.");
          return;
        }
        setError(null);
        setOpen(true);
      }}
    >
      <p className="text-graphite flex items-center gap-2 text-base leading-[22.4px] font-extrabold">
        Radica tu PQR
        <span aria-hidden="true" className="text-steel text-sm font-normal">
          →
        </span>
      </p>

      <label
        className="text-steel mt-5 mb-1.5 block text-[10px] leading-[15px] font-bold tracking-[0.7px] uppercase"
        htmlFor="pqr-document"
      >
        Número de cédula
      </label>
      <Input
        id="pqr-document"
        inputMode="numeric"
        autoComplete="off"
        value={document}
        placeholder="Ej. 1012345678"
        className="border-mist placeholder:text-steel rounded-[12px]! border-[1.43px] px-3.5 text-sm [--field-height:45.8px]"
        onChange={(event) => {
          setDocument(cleanDocument(event.currentTarget.value));
          // Cambiar el documento invalida lo ya comprobado: si no, alguien
          // valida uno y envía otro.
          setValidated(false);
          setProjectId("");
        }}
      />

      {!validated && (
        /* Gris y no rojo: el Figma reserva el rojo para «Continuar», que es la
           acción que de verdad avanza. */
        <button
          type="submit"
          disabled={!canValidate}
          className="bg-graphite mt-4 flex h-[49px] w-full items-center justify-center rounded-full text-[15px] leading-[22.5px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Consultar
        </button>
      )}

      {/* La segunda mitad crece desde cero en vez de aparecer de golpe:
          `grid-template-rows` de 0fr a 1fr es lo único que anima una altura
          desconocida sin medirla con JS. */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
        style={{ gridTemplateRows: validated ? "1fr" : "0fr", opacity: validated ? 1 : 0 }}
        aria-hidden={!validated}
      >
        <div className="overflow-hidden">
          <p className="mt-6 inline-flex items-center gap-1.5 rounded-[6px] bg-[#eaf6ee] px-2.5 py-[7.5px] text-[13px] leading-none font-semibold text-[#217347]">
            <Check />
            Documento validado
          </p>

          <p className="text-graphite mt-4 text-[15px] leading-[18px] font-bold">
            Selecciona el negocio para tu solicitud
          </p>
          <div className="mt-3 [--field-height:38px] [&_.field-box]:rounded-[12px] [&_.field-box]:border-[1.42px] [&_.field-box]:border-[#e7eaed] [&_.field-box]:text-[13px]">
            <Select
              id="pqr-negocio"
              placeholder="Seleccionar negocio…"
              searchable={projects.length > 6}
              searchPlaceholder="Busca tu proyecto…"
              emptyMessage="No encontramos ese proyecto."
              value={projectId}
              items={projects.map((project) => ({
                value: project.documentId,
                label: project.name,
              }))}
              onValueChange={setProjectId}
            />
          </div>

          <button
            type="submit"
            className="bg-brand hover:bg-brand-bright mt-[18px] flex h-[49px] w-full items-center justify-center rounded-full text-[15px] leading-[22.5px] font-bold text-white transition-colors"
          >
            Continuar
          </button>
        </div>
      </div>

      {error && <p className="text-destructive text-caption mt-3">{error}</p>}

      <p className="text-steel mt-3.5 flex items-center justify-center gap-1.5 text-center text-[12.5px] leading-5">
        <Lock />
        Tus datos están protegidos · Respuesta en máx. 15 días hábiles
      </p>
    </form>
  );
}
