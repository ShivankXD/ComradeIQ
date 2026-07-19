import { NextResponse } from "next/server";

import { runtimeErrorResponse, withRequestId } from "@/lib/agents/api";
import { RuntimeError } from "@/lib/agents/errors";
import { getOwnedMission } from "@/lib/agents/missions";
import { hasRealtimeTransport } from "@/lib/agents/model";
import { createMissionSubscriptionToken } from "@/lib/agents/realtime";
import { requestIdFor } from "@/lib/agents/request";
import { requireAnonymousSession } from "@/lib/agents/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = requestIdFor(request);
  try {
    const missionId = new URL(request.url).searchParams.get("missionId");
    if (!missionId) throw new RuntimeError("bad_request", "Mission id is required.", { status: 400 });
    if (!hasRealtimeTransport()) throw new RuntimeError("provider_unconfigured", "Ably is not configured; use the built-in mission stream instead.", { status: 503 });
    const session = requireAnonymousSession(request);
    await getOwnedMission(missionId, session.id);
    return withRequestId(NextResponse.json(await createMissionSubscriptionToken(missionId, session.id)), requestId);
  } catch (error) {
    return runtimeErrorResponse(error, requestId, "ably.token");
  }
}
