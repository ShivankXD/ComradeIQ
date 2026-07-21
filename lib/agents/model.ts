import "server-only";

const DEFAULT_OPENAI_MODEL = "gpt-5.6-terra";

export type OpenAIApiMode = "responses" | "chat-completions";

function envBoolean(name: string, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function envInteger(name: string, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function getRawApiKey() {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.GROQ_KEY ||
    process.env.AI_API_KEY ||
    process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
    process.env.NEXT_PUBLIC_GROQ_API_KEY
  )?.trim() || "";
}

export function isGroqKey() {
  const key = getRawApiKey();
  return Boolean(process.env.GROQ_API_KEY?.trim() || process.env.GROQ_KEY?.trim()) || key.startsWith("gsk_");
}

export function getOpenAIModel() {
  return (
    process.env.OPENAI_MODEL?.trim() ||
    (isGroqKey() ? "llama-3.3-70b-versatile" : DEFAULT_OPENAI_MODEL)
  );
}

export function getOpenAIVisionModel() {
  return process.env.OPENAI_VISION_MODEL?.trim();
}

export function getOpenAIBaseUrl() {
  return (
    process.env.OPENAI_BASE_URL?.trim() ||
    (isGroqKey() ? "https://api.groq.com/openai/v1" : undefined)
  );
}

export function openAIApiMode(): OpenAIApiMode {
  if (isGroqKey() || getOpenAIBaseUrl()) return "chat-completions";
  return process.env.OPENAI_API_MODE?.trim().toLowerCase() === "chat-completions"
    ? "chat-completions"
    : "responses";
}

/** Hosted web search and OpenAI moderation have no generic Chat Completions equivalent. */
export function supportsHostedOpenAIFeatures() {
  return openAIApiMode() === "responses" && !getOpenAIBaseUrl();
}

export interface RuntimeConfiguration {
  provider: "openai" | "unconfigured";
  model?: string;
  visionModel?: string;
  apiMode: OpenAIApiMode;
  webResearchEnabled: boolean;
  moderationEnabled: boolean;
  realtime: "ably" | "sse";
  missionPersistence: "vercel-blob-private" | "local-filesystem" | "memory";
  artifactStorage: "vercel-blob-private" | "local-filesystem" | "memory";
  durableStorageConfigured: boolean;
  coordination: "instance-local-fenced";
  deploymentReady: boolean;
  limits: {
    maxMissionSeconds: number;
    maxConcurrentMissions: number;
    maxMissionsPerMinute: number;
    maxAttachments: number;
    maxAttachmentBytes: number;
  };
}

export function hasOpenAIProvider() {
  return Boolean(getRawApiKey());
}

export function hasRealtimeTransport() {
  return Boolean(process.env.ABLY_API_KEY?.trim());
}

export function hasPrivateBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim() || (process.env.VERCEL_OIDC_TOKEN?.trim() && process.env.BLOB_STORE_ID?.trim()));
}

export function usesLocalFilesystemStorage() {
  return process.env.NODE_ENV === "development" && !hasPrivateBlobStorage();
}

export function runtimeLimits() {
  return {
    maxMissionSeconds: envInteger("COMRADEIQ_MISSION_TIMEOUT_SECONDS", 55, 10, 300),
    maxConcurrentMissions: envInteger("COMRADEIQ_MAX_CONCURRENT_MISSIONS", 3, 1, 20),
    maxMissionsPerMinute: envInteger("COMRADEIQ_MAX_MISSIONS_PER_MINUTE", 6, 1, 60),
    maxAttachments: envInteger("COMRADEIQ_MAX_ATTACHMENTS", 3, 0, 5),
    maxAttachmentBytes: envInteger("COMRADEIQ_MAX_ATTACHMENT_BYTES", 4 * 1024 * 1024, 64 * 1024, 8 * 1024 * 1024),
  };
}

/** Safe health/config state; it intentionally never reports a credential or validates a key by calling a model. */
export function getRuntimeConfiguration(): RuntimeConfiguration {
  const durableStorageConfigured = hasPrivateBlobStorage();
  const localFilesystemStorage = usesLocalFilesystemStorage();
  const providerAvailable = hasOpenAIProvider();
  const model = getOpenAIModel();
  const visionModel = getOpenAIVisionModel();

  return {
    provider: providerAvailable ? "openai" : "unconfigured",
    model: providerAvailable ? model : undefined,
    visionModel: providerAvailable && visionModel ? visionModel : undefined,
    apiMode: openAIApiMode(),
    webResearchEnabled: providerAvailable && supportsHostedOpenAIFeatures(),
    moderationEnabled: providerAvailable && supportsHostedOpenAIFeatures() && !envBoolean("COMRADEIQ_DISABLE_MODERATION"),
    realtime: hasRealtimeTransport() ? "ably" : "sse",
    missionPersistence: durableStorageConfigured ? "vercel-blob-private" : localFilesystemStorage ? "local-filesystem" : "memory",
    artifactStorage: durableStorageConfigured ? "vercel-blob-private" : localFilesystemStorage ? "local-filesystem" : "memory",
    durableStorageConfigured,
    coordination: "instance-local-fenced",
    deploymentReady: providerAvailable && durableStorageConfigured,
    limits: runtimeLimits(),
  };
}
