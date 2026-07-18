export const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.6-terra";

export function hasOpenAIProvider() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function hasRealtimeTransport() {
  return Boolean(process.env.ABLY_API_KEY);
}
