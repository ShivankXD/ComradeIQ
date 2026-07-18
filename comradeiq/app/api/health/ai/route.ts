import { NextResponse } from "next/server";

import { hasOpenAIProvider, hasRealtimeTransport, OPENAI_MODEL } from "@/lib/agents/model";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    provider: hasOpenAIProvider() ? "openai" : "unconfigured",
    model: hasOpenAIProvider() ? OPENAI_MODEL : undefined,
    realtimeEnabled: hasRealtimeTransport(),
  });
}
