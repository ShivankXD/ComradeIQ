import "server-only";

const DEFAULT_OPENAI_MODEL = "gpt-5.6-terra";

function envBoolean(name: string, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function envInteger(name: string, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
export const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL?.trim();

export interface RuntimeConfiguration {
  provider: "openai" | "unconfigured";
  model?: string;
  visionModel?: string;
  webResearchEnabled: boolean;
  moderationEnabled: boolean;
  realtime: "ably" | "sse";
  missionPersistence: "vercel-blob-private" | "memory";
  artifactStorage: "vercel-blob-private" | "memory";
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
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function hasRealtimeTransport() {
  return Boolean(process.env.ABLY_API_KEY?.trim());
}

export function hasPrivateBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim() || (process.env.VERCEL_OIDC_TOKEN?.trim() && process.env.BLOB_STORE_ID?.trim()));
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
  const providerAvailable = hasOpenAIProvider();
  return {
    provider: providerAvailable ? "openai" : "unconfigured",
    model: providerAvailable ? OPENAI_MODEL : undefined,
    visionModel: providerAvailable && OPENAI_VISION_MODEL ? OPENAI_VISION_MODEL : undefined,
    webResearchEnabled: providerAvailable,
    moderationEnabled: providerAvailable && !envBoolean("COMRADEIQ_DISABLE_MODERATION"),
    realtime: hasRealtimeTransport() ? "ably" : "sse",
    missionPersistence: durableStorageConfigured ? "vercel-blob-private" : "memory",
    artifactStorage: durableStorageConfigured ? "vercel-blob-private" : "memory",
    durableStorageConfigured,
    coordination: "instance-local-fenced",
    // A memory fallback is useful for local development, but intentionally not called deployment-ready.
    deploymentReady: providerAvailable && durableStorageConfigured,
    limits: runtimeLimits(),
  };
}
