import { after, NextResponse } from "next/server";

import { runtimeErrorResponse, withRequestId } from "@/lib/agents/api";
import { RuntimeError } from "@/lib/agents/errors";
import { acquireMissionSlot, consumeMissionRateLimit } from "@/lib/agents/limits";
import { getOwnedMission, resetMissionForRetry } from "@/lib/agents/missions";
import { getRuntimeConfiguration } from "@/lib/agents/model";
import { executeMission } from "@/lib/agents/orchestrator";
import { requestIdFor } from "@/lib/agents/request";
import { assertSameOrigin, requireAnonymousSession } from "@/lib/agents/session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ missionId: string }> }) {
  const requestId = requestIdFor(request);
  let slot: ReturnType<typeof acquireMissionSlot> | undefined;
  try {
    assertSameOrigin(request);
    const { missionId } = await params;
    const session = requireAnonymousSession(request);
    if (getRuntimeConfiguration().provider === "unconfigured") {
      throw new RuntimeError("provider_unconfigured", "Live AI is not configured. Add OPENAI_API_KEY on the server and restart the deployment.", { status: 503 });
    }
    await getOwnedMission(missionId, session.id);
    consumeMissionRateLimit(session.id);
    slot = acquireMissionSlot(session.id);
    await resetMissionForRetry(missionId, session.id, requestId);
    after(async () => {
      try {
        await executeMission(missionId);
      } finally {
        slot?.release();
      }
    });
    return withRequestId(NextResponse.json({ started: true, retried: true, mode: "live", missionId, requestId, status: "queued", streamUrl: `/api/mission/${missionId}/events` }, { status: 202 }), requestId);
  } catch (error) {
    slot?.release();
    return runtimeErrorResponse(error, requestId, "mission.retry");
  }
}
