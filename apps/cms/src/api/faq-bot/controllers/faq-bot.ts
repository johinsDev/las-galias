import { PassThrough } from "node:stream";

import { anthropic } from "@ai-sdk/anthropic";
import type { Core } from "@strapi/strapi";
import { streamText } from "ai";

import {
  buildContext,
  contentChangedTime,
  DEFAULT_FALLBACK,
  getConfig,
  QUESTION_UID,
  systemPrompt,
} from "../../../utils/faq-bot-context";
import { cachedAnswer, cacheKeyFor, rateLimit, spentToday } from "../../../utils/faq-bot-limits";

/**
 * One question in, one streamed answer out. Deliberately NOT a chat: there is
 * no history, so the context never grows and every question costs the same.
 *
 * The answer is streamed as SSE. Strapi runs on Koa, which wants a Node stream
 * on ctx.body, while the AI SDK hands back an async iterable — so we pipe one
 * into the other through a PassThrough rather than returning a web Response.
 */

const MAX_QUESTION_CHARS = 400;

interface AskBody {
  question?: unknown;
}

/**
 * Strapi v5 exports no public type for the Koa context, so this declares just
 * the surface these two handlers touch rather than pulling in `any`.
 */
interface BotContext {
  request: { body?: unknown; ip?: string };
  req: { socket: { setTimeout(ms: number): void } };
  status: number;
  body: unknown;
  set(headers: Record<string, string>): void;
  send(payload: unknown): unknown;
  badRequest(message: string): unknown;
}

/** SSE frame. `event: done` lets the client tell "finished" from "connection died". */
function frame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export default {
  /** What the static site bakes in at build time to render the widget. */
  async publicConfig(ctx: BotContext) {
    const strapi = global.strapi as Core.Strapi;
    const config = await getConfig(strapi);
    return ctx.send({
      data: {
        enabled: config.enabled,
        suggestedQuestions: (config.suggestedQuestions ?? []).map((q) => q.text),
      },
    });
  },

  async ask(ctx: BotContext) {
    const strapi = global.strapi as Core.Strapi;
    const config = await getConfig(strapi);
    const fallback = config.fallbackMessage?.trim() || DEFAULT_FALLBACK;

    const { question } = (ctx.request.body ?? {}) as AskBody;
    if (typeof question !== "string" || question.trim().length < 3) {
      return ctx.badRequest("Escribe una pregunta.");
    }
    if (question.length > MAX_QUESTION_CHARS) {
      return ctx.badRequest(`La pregunta no puede pasar de ${MAX_QUESTION_CHARS} caracteres.`);
    }
    if (!config.enabled) {
      return ctx.send({ answer: fallback, wasCached: false, disabled: true });
    }

    const asked = question.trim();
    const ip = ctx.request.ip ?? "unknown";

    if (!rateLimit(ip, config.ratePerIpPerHour)) {
      ctx.status = 429;
      return ctx.send({ answer: "Vas muy rápido. Espera un momento e inténtalo de nuevo." });
    }

    // A repeat question is answered from the log at zero cost. This — not the
    // choice of model — is what keeps the bill small on a real FAQ.
    const cacheKey = cacheKeyFor(asked);
    const hit = await cachedAnswer(strapi, cacheKey, contentChangedTime());
    if (hit) {
      void log(strapi, { question: asked, answer: hit, cacheKey, wasCached: true });
      return ctx.send({ answer: hit, wasCached: true });
    }

    // The ceiling on a single day's bill. Cached answers never reach here.
    if (config.dailyQuestionCap > 0 && (await spentToday(strapi)) >= config.dailyQuestionCap) {
      strapi.log.warn("[faq-bot] tope diario alcanzado; respondiendo el mensaje de reserva");
      return ctx.send({ answer: fallback, wasCached: false, capped: true });
    }

    const context = await buildContext(strapi, config);

    const stream = new PassThrough();
    ctx.status = 200;
    ctx.set({
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Without this an nginx/ALB layer buffers the whole body and the answer
      // lands in one lump — the streaming would be real but invisible.
      "x-accel-buffering": "no",
    });
    // The response outlives the default socket timeout on a slow answer.
    ctx.req.socket.setTimeout(0);
    ctx.body = stream;

    void (async () => {
      let answer = "";
      try {
        const result = streamText({
          // Directo a Anthropic, sin pasar por el AI Gateway: este CMS corre en
          // AWS, así que el Gateway solo añadiría un salto de red en una
          // respuesta que se escribe en pantalla, y ataría la llave a una cuenta
          // de Vercel más. Cambiar entre modelos Claude sigue siendo un string.
          model: anthropic(config.model),
          maxOutputTokens: config.maxAnswerTokens,
          instructions: {
            role: "system",
            content: systemPrompt(context),
            // The context is byte-identical across visitors, so Anthropic can
            // serve it from its own cache instead of re-reading it every time.
            providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
          },
          prompt: asked,
        });

        for await (const chunk of result.textStream) {
          answer += chunk;
          stream.write(frame("delta", chunk));
        }

        const usage = await result.usage;
        stream.write(frame("done", { wasCached: false }));
        stream.end();

        await log(strapi, {
          question: asked,
          answer,
          cacheKey,
          wasCached: false,
          model: config.model,
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          // v7 moved this out of usage.cachedInputTokens. Zero here means the
          // prompt cache never engaged — worth watching on Haiku, which needs a
          // 4096-token prefix before it caches at all.
          cacheReadTokens: usage?.inputTokenDetails?.cacheReadTokens ?? 0,
        });
      } catch (err) {
        // El SDK envuelve el fallo real en AI_NoOutputGeneratedError, que no
        // dice nada útil: "sin saldo en la cuenta", "llave inválida" y "modelo
        // inexistente" se ven todos igual. La causa y el cuerpo de la respuesta
        // son lo que de verdad permite arreglarlo sin adivinar.
        const detail = [
          String(err),
          (err as { cause?: unknown })?.cause
            ? `causa: ${String((err as { cause?: unknown }).cause)}`
            : "",
          typeof (err as { responseBody?: unknown })?.responseBody === "string"
            ? `respuesta: ${((err as { responseBody?: string }).responseBody ?? "").slice(0, 300)}`
            : "",
        ]
          .filter(Boolean)
          .join(" — ");
        strapi.log.error(`[faq-bot] la respuesta falló: ${detail}`);
        // Mid-stream failure: the visitor already has half an answer, so send
        // the fallback as an error frame instead of leaving them hanging.
        stream.write(frame("error", { answer: fallback }));
        stream.end();
      }
    })();
  },
};

interface LogEntry {
  question: string;
  answer: string;
  cacheKey: string;
  wasCached: boolean;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
}

/** Never awaited in the request path, and never allowed to break a good answer. */
async function log(strapi: Core.Strapi, entry: LogEntry): Promise<void> {
  try {
    await strapi.documents(QUESTION_UID).create({
      data: { ...entry, askedAt: new Date().toISOString() },
    });
  } catch (err) {
    strapi.log.error(`[faq-bot] no se pudo registrar la pregunta: ${String(err)}`);
  }
}
