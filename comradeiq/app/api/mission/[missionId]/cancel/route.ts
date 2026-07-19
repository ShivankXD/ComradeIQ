import { NextResponse } from "next/server";

import { runtimeErrorResponse, withRequestId } from "@/lib/agents/api";
import { cancelRunningMission } from "@/lib/agents/orchestrator";
import { getOwnedMission, transitionMission } from "@/lib/agents/missions";
import { emitMissionEvent } from "@/lib/agents/realtime";
import { requestIdFor } from "@/lib/agents/request";
import { assertSameOrigin, requireAnonymousSession } from "@/lib/agents/session";
import { RuntimeError } from "@/lib/agents/errors";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ missionId: string }> }) {
  const requestId = requestIdFor(request);
  try {
    assertSameOrigin(request);
    const { missionId } = await params;
    const session = requireAnonymousSession(request);
    const mission = await getOwnedMission(missionId, session.id);
    if (["complete", "error", "cancelled", "timed_out", "interrupted"].includes(mission.status)) {
      throw new RuntimeError("mission_state", "This mission is already stopped.", { status: 409 });
    }
    cancelRunningMission(missionId);
    await transitionMission(missionId, "cancelled");
    await emitMissionEvent(missionId, "commander.status", { status: "cancelled" }, requestId);
    await emitMissionEvent(missionId, "mission.error", { code: "cancelled", message: "Mission cancelled.", retryable: false }, requestId);
    return withRequestId(NextResponse.json({ cancelled: true, missionId, requestId, status: "cancelled" }), requestId);
  } catch (error) {
    return runtimeErrorResponse(error, requestId, "mission.cancel");
  }
}
