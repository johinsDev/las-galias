"use client";

import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Dialog } from "@base-ui/react/dialog";

export interface SearchableProject {
  slug: string;
  name: string;
  /** "Bogotá · Norte" — what tells two similarly named projects apart. */
  location: string;
}

interface ProjectSearchProps {
  projects: SearchableProject[];
}

/** Ignores accents and case, so "peñalisa" and "penalisa" find the same thing. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Command palette for the header's magnifier: type anything and jump to a
 * project.
 *
 * The button used to be a link to /proyectos, which meant "search" was really
 * "go to the list and filter there". This searches the whole catalogue in place,
 * opens with ⌘K / Ctrl+K, and navigating is a plain link so it works before this
 * island hydrates too.
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
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed top-[12vh] left-1/2 z-50 w-[min(92vw,34rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
          <Dialog.Title className="sr-only">Buscar proyectos</Dialog.Title>

          <Combobox.Root items={results} onValueChange={() => setOpen(false)}>
            <div className="flex items-center gap-3 border-b border-[var(--line)] px-4">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className="text-ink-faint shrink-0"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <Combobox.Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Busca por proyecto, ciudad o zona…"
                className="text-body text-ink placeholder:text-ink-faint h-14 w-full bg-transparent outline-none"
              />
              <kbd className="text-caption text-ink-faint border-line hidden rounded border px-1.5 py-0.5 sm:block">
                esc
              </kbd>
            </div>

            {results.length === 0 ? (
              <p className="text-body-sm text-ink-muted px-4 py-10 text-center">
                No encontramos proyectos para «{query}».
              </p>
            ) : (
              <Combobox.List className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
                {(project: SearchableProject) => (
                  <Combobox.Item
                    key={project.slug}
                    value={project}
                    className="data-highlighted:bg-surface flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 outline-none"
                    render={<a href={`/proyectos/${project.slug}`} />}
                  >
                    <span className="min-w-0">
                      <span className="text-body-sm text-ink block truncate font-semibold">
                        {project.name}
                      </span>
                      <span className="text-caption text-ink-muted block truncate">
                        {project.location}
                      </span>
                    </span>
                    <span className="text-ink-faint shrink-0" aria-hidden="true">
                      ↵
                    </span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            )}
          </Combobox.Root>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
