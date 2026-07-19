import { NextResponse } from "next/server";

import { getRuntimeConfiguration, hasOpenAIProvider, hasRealtimeTransport, OPENAI_MODEL } from "@/lib/agents/model";
import { objectStorageConfiguration } from "@/lib/agents/storage";

export const runtime = "nodejs";

/** Public, credential-free deployment readiness state for the in-app onboarding surface. */
export async function GET() {
  const configuration = getRuntimeConfiguration();
  return NextResponse.json({
    provider: hasOpenAIProvider() ? "openai" : "unconfigured",
    model: hasOpenAIProvider() ? OPENAI_MODEL : undefined,
    realtimeEnabled: hasRealtimeTransport(),
    configuration: {
      ...configuration,
      storage: objectStorageConfiguration(),
      progressTransport: "sse",
      ablyOptional: hasRealtimeTransport(),
      rateLimitScope: "server-instance",
      concurrencyScope: "server-instance with durable attempt fencing",
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
