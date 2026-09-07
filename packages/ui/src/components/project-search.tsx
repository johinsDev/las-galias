"use client";

import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Dialog } from "@base-ui/react/dialog";

import { cn } from "@lasgalias/ui/lib/utils";

export interface SearchableProject {
  slug: string;
  name: string;
  /** "Bogotá · Norte · San Antonio" — what tells two similar names apart. */
  location: string;
  /** Shown as the tag on the right of the row. */
  city?: string;
}

interface ProjectSearchProps {
  projects: SearchableProject[];
}

/**
 * Ignores accents and case, so "peñalisa" and "penalisa" find the same thing.
 *
 * `\p{M}` (combining marks) and not `\p{Diacritic}`: the latter also matches
 * standalone characters like the middle dot, so "Bogotá · Norte" folded to a
 * string two characters shorter than the original and the highlighter could no
 * longer line the match up with the text it was painting.
 */
function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Wraps every occurrence of the query in the label.
 *
 * Folding a character can change its length, so the search is done on the folded
 * string while an index map remembers which original character each folded one
 * came from. That is what lets a match typed as "medellin" be painted over the
 * real "Medellín" without the highlight drifting.
 */
function highlight(label: string, query: string) {
  const needle = fold(query.trim());
  if (!needle) return label;

  const chars = [...label];
  const origin: number[] = [];
  let haystack = "";
  chars.forEach((char, index) => {
    const folded = fold(char);
    for (let i = 0; i < folded.length; i += 1) origin.push(index);
    haystack += folded;
  });

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    const from = origin[at]!;
    const to = origin[at + needle.length - 1]! + 1;
    if (from > cursor) parts.push(chars.slice(cursor, from).join(""));
    parts.push(
      <mark key={at} className="text-brand bg-transparent font-bold">
        {chars.slice(from, to).join("")}
      </mark>,
    );
    cursor = to;
    at = haystack.indexOf(needle, at + needle.length);
  }
  if (cursor < chars.length) parts.push(chars.slice(cursor).join(""));
  return parts;
}

function Magnifier({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function Cross({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="border-line text-ink-muted inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-sans text-[11px]">
      {children}
    </kbd>
  );
}

/**
 * Command palette for the header's magnifier: type anything and jump to a
 * project.
 *
 * The button used to be a link to /proyectos, which meant "search" was really
 * "go to the list and filter there". This searches the whole catalogue in place,
 * opens with ⌘K / Ctrl+K, and navigating is a plain link so it works before this
 * island hydrates too.
 *
 * Laid out like a docs search — one wide panel, a bordered field on top, rows
 * separated by hairlines with the match painted in brand red and the city as a
 * tag on the right. Base UI has no "command" primitive; its Combobox is the one
 * that gives the list its keyboard behaviour, so that is what this is built on.
 */
export function ProjectSearch({ projects }: ProjectSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    // También lo abren los disparadores del encabezado, que son marcado suelto.
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("lg:open-search", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("lg:open-search", onOpen);
    };
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return projects;
    const needle = fold(query);
    return projects.filter(
      (project) => fold(project.name).includes(needle) || fold(project.location).includes(needle),
    );
  }, [projects, query]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed top-[10vh] left-1/2 z-50 flex max-h-[80vh] w-[min(94vw,44rem)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_28px_80px_rgba(0,0,0,0.22)]">
          <Dialog.Title className="sr-only">Buscar proyectos</Dialog.Title>

          <Combobox.Root
            items={results}
            onValueChange={(project: SearchableProject | null) => {
              setOpen(false);
              // Navegación explícita: Base UI se queda con el clic del enlace
              // para cerrar el panel, así que el href por sí solo no bastaba —
              // y con el teclado nunca hubo enlace que seguir.
              if (project) window.location.assign(`/proyectos/${project.slug}`);
            }}
          >
            <div className="flex items-center gap-2 p-3">
              <div className="border-line focus-within:border-ink flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border px-3.5 transition-colors">
                <Magnifier className="text-ink-faint shrink-0" />
                <Combobox.Input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  placeholder="Busca por proyecto, ciudad o zona…"
                  className="text-body text-ink placeholder:text-ink-faint h-full w-full bg-transparent outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Borrar búsqueda"
                    className="text-ink-faint hover:text-ink shrink-0 transition-colors"
                  >
                    <Cross />
                  </button>
                )}
              </div>
              <Dialog.Close
                aria-label="Cerrar búsqueda"
                className="border-line text-ink-muted hover:text-ink flex size-12 shrink-0 items-center justify-center rounded-xl border transition-colors"
              >
                <Cross size={18} />
              </Dialog.Close>
            </div>

            {/* Barra de contexto: qué se está buscando y cuántos hay. */}
            <div className="border-line text-caption text-ink-muted flex items-center justify-between gap-3 border-y px-4 py-2">
              <span className="text-ink font-bold tracking-wide uppercase">Proyectos</span>
              <span className="truncate">
                {query.trim()
                  ? `${results.length} resultado${results.length === 1 ? "" : "s"} para «${query.trim()}»`
                  : `${projects.length} proyectos publicados`}
              </span>
            </div>

            {results.length === 0 ? (
              <p className="text-body-sm text-ink-muted px-4 py-12 text-center">
                No encontramos proyectos para «{query.trim()}».
              </p>
            ) : (
              <Combobox.List className="min-h-0 flex-1 overflow-y-auto">
                {(project: SearchableProject) => (
                  <Combobox.Item
                    key={project.slug}
                    value={project}
                    className={cn(
                      "border-line data-highlighted:bg-brand-subtle flex cursor-pointer items-center justify-between gap-4 border-b px-4 py-3 outline-none last:border-b-0",
                    )}
                    render={<a href={`/proyectos/${project.slug}`} />}
                  >
                    <span className="min-w-0">
                      <span className="text-body-sm text-ink block truncate font-semibold">
                        {highlight(project.name, query)}
                      </span>
                      <span className="text-caption text-ink-muted block truncate">
                        {highlight(project.location, query)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      {project.city && (
                        <span className="text-caption text-ink-muted hidden sm:block">
                          {project.city}
                        </span>
                      )}
                      <span
                        className="text-ink-faint opacity-0 in-data-highlighted:opacity-100"
                        aria-hidden="true"
                      >
                        ↵
                      </span>
                    </span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            )}

            <div className="border-line text-caption text-ink-muted flex items-center gap-4 border-t px-4 py-2.5">
              <span className="flex items-center gap-1.5">
                <Key>↑</Key>
                <Key>↓</Key>
                para moverte
              </span>
              <span className="flex items-center gap-1.5">
                <Key>↵</Key>
                para abrir
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <Key>esc</Key>
                para cerrar
              </span>
            </div>
          </Combobox.Root>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
