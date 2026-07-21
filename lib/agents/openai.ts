import "server-only";

import { createHash } from "node:crypto";

import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionContentPart,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions/completions";
import type {
  EasyInputMessage,
  Response as OpenAIResponse,
  ResponseCreateParamsNonStreaming,
  ResponseInputContent,
  ResponseInputItem,
} from "openai/resources/responses/responses";

import type { MissionSource } from "./contracts";
import { asRuntimeError, RuntimeError } from "./errors";
import { hasOpenAIProvider, OPENAI_BASE_URL, OPENAI_MODEL, openAIApiMode, type OpenAIApiMode, supportsHostedOpenAIFeatures } from "./model";

export interface ProviderCallContext {
  requestId: string;
  sessionId: string;
  signal: AbortSignal;
  remainingMs: () => number;
  /** Durable run fence: detects cancellation/retry performed on another instance. */
  assertActive?: () => Promise<void>;
}

export interface ProviderClient {
  sdk: OpenAI;
  mode: OpenAIApiMode;
}

/** Normalized result so callers never depend on a provider-specific SDK payload. */
export interface ProviderResponse {
  output_text: string;
  sources: MissionSource[];
}

export function createOpenAIClient(): ProviderClient {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || !hasOpenAIProvider()) {
    throw new RuntimeError("provider_unconfigured", "Live AI is not configured. Add OPENAI_API_KEY on the server and restart the deployment.", { status: 503 });
  }
  return {
    sdk: new OpenAI({ apiKey: key, baseURL: OPENAI_BASE_URL, maxRetries: 0, timeout: 25_000 }),
    mode: openAIApiMode(),
  };
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

function isEasyInputMessage(item: ResponseInputItem): item is EasyInputMessage {
  return typeof item === "object" && item !== null && "role" in item && "content" in item;
}

function chatContent(content: string | ResponseInputContent[]): string | ChatCompletionContentPart[] {
  if (typeof content === "string") return content;
  const mapped = content.map((part) => {
    if (part.type === "input_text") return { type: "text" as const, text: part.text };
    if (part.type === "input_image") {
      if (!part.image_url) {
        throw new RuntimeError("provider_rejected", "The image attachment could not be prepared for this provider.", { status: 400 });
      }
      const detail = ["auto", "low", "high"].includes(part.detail ?? "") ? part.detail as "auto" | "low" | "high" : undefined;
      return {
        type: "image_url" as const,
        image_url: {
          url: part.image_url,
          ...(detail ? { detail } : {}),
        },
      };
    }
    throw new RuntimeError("provider_rejected", "This Chat Completions provider does not support file attachment parts.", { status: 400 });
  });
  // Although OpenAI permits an array of text parts, several otherwise
  // compatible gateways handle a plain string more reliably. Preserve the
  // array only when it contains an image that actually needs multipart input.
  return mapped.every((part) => part.type === "text")
    ? mapped.map((part) => part.text).join("\n")
    : mapped;
}

function textOnlyChatContent(content: string | ChatCompletionContentPart[]) {
  if (typeof content === "string") return content;
  return content.map((part) => {
    if (part.type !== "text") {
      throw new RuntimeError("provider_rejected", "This Chat Completions provider supports image inputs only in user messages.", { status: 400 });
    }
    return part.text;
  }).join("\n");
}

function chatMessage(message: EasyInputMessage): ChatCompletionMessageParam {
  const content = chatContent(message.content);
  if (message.role === "user") return { role: "user", content };
  const text = textOnlyChatContent(content);
  switch (message.role) {
    case "assistant": return { role: "assistant", content: text };
    case "developer": return { role: "developer", content: text };
    case "system": return { role: "system", content: text };
  }
}

export function toChatCompletionRequest(
  params: Omit<ResponseCreateParamsNonStreaming, "model" | "safety_identifier">,
  model: string,
): ChatCompletionCreateParamsNonStreaming {
  if (params.tools?.length) {
    throw new RuntimeError("provider_rejected", "This Chat Completions provider does not expose ComradeIQ's hosted web-research tool.", { status: 400 });
  }

  const messages: ChatCompletionMessageParam[] = [];
  if (params.instructions?.trim()) messages.push({ role: "system", content: params.instructions });
  if (typeof params.input === "string") {
    messages.push({ role: "user", content: params.input });
  } else if (params.input) {
    for (const item of params.input) {
      if (!isEasyInputMessage(item)) {
        throw new RuntimeError("provider_rejected", "This Chat Completions provider received an unsupported mission input type.", { status: 400 });
      }
      messages.push(chatMessage(item));
    }
  } else {
    throw new RuntimeError("bad_request", "A mission requires input before it can be sent to the AI provider.", { status: 400 });
  }

  const format = params.text?.format;
  const useJsonObject = Boolean(OPENAI_BASE_URL) && format?.type === "json_schema";
  const responseFormat = useJsonObject
    ? { type: "json_object" as const }
    : format?.type === "json_schema"
      ? {
          type: "json_schema" as const,
          json_schema: {
            name: format.name,
            strict: format.strict,
            schema: format.schema,
          },
        }
      : undefined;

  return {
    model,
    messages,
    // Generic OpenAI-compatible gateways commonly document `max_tokens`.
    // Keep the request on that broadly supported field instead of the newer
    // OpenAI-only `max_completion_tokens` alias.
    max_tokens: params.max_output_tokens,
    ...(responseFormat ? { response_format: responseFormat } : {}),
  };
}

function sourcesFromOpenAIResponse(response: OpenAIResponse): MissionSource[] {
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

function normalizeChatCompletion(response: ChatCompletion): ProviderResponse {
  const choices = Array.isArray(response.choices) ? response.choices : [];
  const output_text = choices
    .map((choice) => typeof choice?.message?.content === "string" ? choice.message.content : "")
    .join("\n")
    .trim();
  if (!output_text) {
    throw new RuntimeError("provider_rejected", "The AI provider returned no usable text. Please retry.", {
      status: 502,
      retryable: true,
    });
  }
  // Generic Chat Completions has no trustworthy equivalent to Responses web-search provenance.
  return { output_text, sources: [] };
}

/** One bounded retry for transient provider faults, with cancellation propagated to every SDK call. */
export async function createProviderResponse(
  client: ProviderClient,
  params: Omit<ResponseCreateParamsNonStreaming, "model" | "safety_identifier">,
  context: ProviderCallContext,
  model = OPENAI_MODEL,
): Promise<ProviderResponse> {
  let lastError: RuntimeError | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await context.assertActive?.();
    if (context.signal.aborted) throw new RuntimeError("cancelled", "The mission was cancelled.", { status: 409 });
    const remaining = context.remainingMs();
    if (remaining <= 0) throw new RuntimeError("timed_out", "The mission exceeded its time limit.", { status: 504, retryable: true });
    const scoped = callSignal(context.signal, Math.min(25_000, remaining));
    try {
      let normalized: ProviderResponse;
      if (client.mode === "chat-completions") {
        normalized = normalizeChatCompletion(await client.sdk.chat.completions.create(toChatCompletionRequest(params, model), {
            maxRetries: 0,
            timeout: Math.min(25_000, remaining),
            signal: scoped.signal,
          }));
      } else {
        const response = await client.sdk.responses.create({ ...params, model, safety_identifier: safetyIdentifier(context.sessionId) }, {
            maxRetries: 0,
            timeout: Math.min(25_000, remaining),
            signal: scoped.signal,
          });
        normalized = { output_text: response.output_text, sources: sourcesFromOpenAIResponse(response) };
      }
      await context.assertActive?.();
      return normalized;
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
export async function moderateMissionInput(client: ProviderClient, text: string, context: ProviderCallContext) {
  if (!supportsHostedOpenAIFeatures() || ["1", "true", "yes", "on"].includes(process.env.COMRADEIQ_DISABLE_MODERATION?.trim().toLowerCase() ?? "")) return;
  await context.assertActive?.();
  const scoped = callSignal(context.signal, Math.min(10_000, context.remainingMs()));
  try {
    const moderation = await client.sdk.moderations.create({ model: "omni-moderation-latest", input: text }, {
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

export function sourcesFromResponse(response: ProviderResponse): MissionSource[] {
  return response.sources;
}
