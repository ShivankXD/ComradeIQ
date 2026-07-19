import "server-only";

import { createHash } from "node:crypto";

import OpenAI from "openai";
import type { Response as OpenAIResponse, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

import type { MissionSource } from "./contracts";
import { asRuntimeError, RuntimeError } from "./errors";
import { hasOpenAIProvider, OPENAI_MODEL } from "./model";

export interface ProviderCallContext {
  requestId: string;
  sessionId: string;
  signal: AbortSignal;
  remainingMs: () => number;
  /** Durable run fence: detects cancellation/retry performed on another instance. */
  assertActive?: () => Promise<void>;
}

export function createOpenAIClient() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || !hasOpenAIProvider()) {
    throw new RuntimeError("provider_unconfigured", "Live AI is not configured. Add OPENAI_API_KEY on the server and restart the deployment.", { status: 503 });
  }
  return new OpenAI({ apiKey: key, maxRetries: 0, timeout: 25_000 });
}

function safetyIdentifier(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex").slice(0, 64);
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

function callSignal(parent: AbortSignal, timeoutMs: number) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  parent.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      parent.removeEventListener("abort", abort);
    },
  };
}

/** One bounded retry for transient provider faults, with cancellation propagated to every SDK call. */
export async function createProviderResponse(
  client: OpenAI,
  params: Omit<ResponseCreateParamsNonStreaming, "model" | "safety_identifier">,
  context: ProviderCallContext,
  model = OPENAI_MODEL,
): Promise<OpenAIResponse> {
  let lastError: RuntimeError | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await context.assertActive?.();
    if (context.signal.aborted) throw new RuntimeError("cancelled", "The mission was cancelled.", { status: 409 });
    const remaining = context.remainingMs();
    if (remaining <= 0) throw new RuntimeError("timed_out", "The mission exceeded its time limit.", { status: 504, retryable: true });
    const scoped = callSignal(context.signal, Math.min(25_000, remaining));
    try {
      const response = await client.responses.create({ ...params, model, safety_identifier: safetyIdentifier(context.sessionId) }, {
        maxRetries: 0,
        timeout: Math.min(25_000, remaining),
        signal: scoped.signal,
      });
      await context.assertActive?.();
      return response;
    } catch (error) {
      if (context.signal.aborted) throw new RuntimeError("cancelled", "The mission was cancelled.", { status: 409, cause: error });
      const safe = asRuntimeError(error);
      lastError = safe.code === "cancelled"
        ? new RuntimeError("timed_out", "The mission exceeded its time limit.", { status: 504, retryable: true, cause: error })
        : safe;
      if (!lastError.retryable || attempt === 1) throw lastError;
      await wait(250 * (attempt + 1), context.signal);
    } finally {
      scoped.dispose();
    }
  }
  throw lastError ?? new RuntimeError("provider_unavailable", "The AI provider is temporarily unavailable.", { status: 503, retryable: true });
}

/** Basic high-risk input gate. Ordinary brainstorming and professional content are left to normal model policy. */
export async function moderateMissionInput(client: OpenAI, text: string, context: ProviderCallContext) {
  if (["1", "true", "yes", "on"].includes(process.env.COMRADEIQ_DISABLE_MODERATION?.trim().toLowerCase() ?? "")) return;
  await context.assertActive?.();
  const scoped = callSignal(context.signal, Math.min(10_000, context.remainingMs()));
  try {
    const moderation = await client.moderations.create({ model: "omni-moderation-latest", input: text }, {
      maxRetries: 0,
      timeout: Math.min(10_000, context.remainingMs()),
      signal: scoped.signal,
    });
    await context.assertActive?.();
    const blocked = moderation.results.some((result) => {
      const categories = result.categories;
      return Boolean(categories["sexual/minors"] || categories["self-harm/instructions"] || categories["illicit/violent"]);
    });
    if (blocked) throw new RuntimeError("unsafe_request", "This mission cannot be processed safely.", { status: 400 });
  } catch (error) {
    if (error instanceof RuntimeError) throw error;
    throw asRuntimeError(error);
  } finally {
    scoped.dispose();
  }
}

export function sourcesFromResponse(response: OpenAIResponse): MissionSource[] {
  const found = new Map<string, MissionSource>();
  for (const item of response.output) {
    if (item.type !== "message") continue;
    for (const content of item.content) {
      if (content.type !== "output_text") continue;
      for (const annotation of content.annotations) {
        if (annotation.type === "url_citation" && annotation.url) {
          found.set(annotation.url, { title: annotation.title || annotation.url, url: annotation.url });
        }
      }
    }
  }
  return [...found.values()].slice(0, 12);
}
