import { useEffect, useRef, useState, type ReactNode } from "react";

interface FaqBotProps {
  suggestedQuestions: string[];
}

const STRAPI_URL = import.meta.env.PUBLIC_STRAPI_URL ?? "http://localhost:1337";
const MAX_CHARS = 400;

/**
 * The last answer survives leaving the page. The CTA under the answer is
 * "Hablar con un asesor", which navigates away — and coming back with the
 * browser's back button used to land on an empty box, as if nothing had been
 * asked. sessionStorage (not localStorage) because it should last the visit,
 * not reappear days later next to prices that may have changed.
 */
const STORAGE_KEY = "faq-bot:last";

type Status = "idle" | "asking" | "answered" | "error";

interface Saved {
  question: string;
  answer: string;
}

/** Paths the bot is told to mention; turned into real links when it does. */
const SEGMENT = /(\*\*[^*]+\*\*|\/(?:proyectos|calculadoras|blog|contacto)[\w/-]*)/g;

/**
 * The prompt asks for plain text, and the model mostly obeys — but it still
 * slips in `**negritas**` and writes project paths as text. Rather than fight
 * it with more prompt, the leak is rendered: bold becomes bold, and a path
 * becomes a link the visitor can actually follow.
 */
function render(text: string, streaming: boolean): ReactNode {
  // A half-written `**` mid-stream would flash as literal asterisks, so an
  // unclosed pair is hidden until its other half arrives.
  const safe =
    streaming && (text.match(/\*\*/g)?.length ?? 0) % 2 === 1
      ? text.slice(0, text.lastIndexOf("**"))
      : text;

  return safe.split(SEGMENT).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="text-ink font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("/")) {
      return (
        <a key={i} href={part} className="text-brand underline underline-offset-2">
          {part}
        </a>
      );
    }
    return part;
  });
}

/**
 * One question, one streamed answer. Deliberately not a chat: no history, no
 * turns — the visitor asks, reads, and either asks another or talks to a person.
 *
 * The answer arrives as SSE over a POST, so this reads the response body itself
 * rather than using EventSource (which is GET-only).
 */
export default function FaqBot({ suggestedQuestions }: FaqBotProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  // Lets a second question cancel the first instead of interleaving two streams.
  const abortRef = useRef<AbortController | null>(null);

  // Restored after hydration, never during render: the page is static HTML and
  // reading storage while rendering would make the server and client disagree.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Saved;
      if (!saved?.answer) return;
      setQuestion(saved.question);
      setAnswer(saved.answer);
      setStatus("answered");
    } catch {
      // Storage blocked or corrupt — the widget just starts empty.
    }
  }, []);

  function remember(saved: Saved): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Private mode / storage full: not remembering is fine, failing is not.
    }
  }

  async function ask(text: string) {
    const asked = text.trim();
    if (asked.length < 3 || status === "asking") return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setQuestion(asked);
    setAnswer("");
    setStatus("asking");

    try {
      const res = await fetch(`${STRAPI_URL}/api/faq-bot/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: asked }),
        signal: controller.signal,
      });

      // A cached answer and the rate-limit reply come back as plain JSON —
      // there is nothing to stream when the text already exists.
      if (!res.headers.get("content-type")?.includes("text/event-stream")) {
        const data = (await res.json()) as { answer?: string };
        setAnswer(data.answer ?? "");
        setStatus(res.ok ? "answered" : "error");
        if (res.ok && data.answer) remember({ question: asked, answer: data.answer });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("sin cuerpo");
      const decoder = new TextDecoder();
      let buffer = "";
      let failed = false;
      let full = "";

      // SSE frames are separated by a blank line and can be split across reads,
      // so the tail stays in the buffer until its terminator shows up.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const event = /^event: (.+)$/m.exec(frame)?.[1];
          const raw = /^data: (.+)$/m.exec(frame)?.[1];
          if (!raw) continue;
          const data = JSON.parse(raw) as string | { answer?: string };

          if (event === "delta" && typeof data === "string") {
            full += data;
            setAnswer((prev) => prev + data);
          } else if (event === "error" && typeof data === "object") {
            full = data.answer ?? "";
            setAnswer(full);
            failed = true;
          }
        }
      }
      setStatus(failed ? "error" : "answered");
      if (!failed && full) remember({ question: asked, answer: full });
    } catch (err) {
      // An aborted request is the visitor asking something else, not a failure.
      if (err instanceof DOMException && err.name === "AbortError") return;
      setAnswer("No pudimos responderte en este momento. Escríbenos y te ayudamos.");
      setStatus("error");
    }
  }

  const busy = status === "asking";
  // Chips stay after an answer so asking a second thing is one click, not a
  // retype. They only hide while an answer is being written.
  const chips = suggestedQuestions.filter((s) => s !== question);

  return (
    <div className="border-line mx-auto max-w-3xl rounded-2xl border bg-white p-5 sm:p-6">
      <p className="eyebrow">Pregúntale al asistente</p>
      <p className="text-body-sm text-ink-muted mt-1">
        Resuelve tu duda al instante con la información de nuestros proyectos.
      </p>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <label className="sr-only" htmlFor="faq-bot-input">
          Escribe tu pregunta
        </label>
        <input
          id="faq-bot-input"
          type="text"
          value={question}
          maxLength={MAX_CHARS}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="¿Cuánto necesito para la cuota inicial?"
          className="border-line-strong text-body-sm text-ink focus:border-ink h-11 w-full rounded-lg border px-3 transition-colors outline-none"
        />
        <button
          type="submit"
          disabled={busy || question.trim().length < 3}
          className="btn btn-primary shrink-0 disabled:opacity-50"
        >
          {busy ? "Pensando…" : "Preguntar"}
        </button>
      </form>

      {!busy && chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="chip hover:bg-surface transition-colors"
              onClick={() => void ask(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {(busy || answer) && (
        <div className="bg-surface mt-4 rounded-xl p-4" aria-live="polite">
          {answer ? (
            <p className="text-body-sm text-ink whitespace-pre-line">
              {render(answer, busy)}
              {busy && (
                <span
                  className="bg-ink ml-0.5 inline-block h-4 w-[2px] animate-pulse align-[-2px]"
                  aria-hidden="true"
                />
              )}
            </p>
          ) : (
            <p className="text-body-sm text-ink-muted">Buscando en nuestra información…</p>
          )}

          {status !== "asking" && (
            <div className="border-line mt-4 flex flex-wrap items-center gap-3 border-t pt-3">
              <p className="text-caption text-ink-faint flex-1">
                Respuesta generada con IA a partir de nuestra información publicada. Confirma
                precios y disponibilidad con un asesor.
              </p>
              <a href="/contacto" className="btn btn-outline px-4 py-2.5 text-sm">
                Hablar con un asesor
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
