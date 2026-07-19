import { NextResponse } from "next/server";

import { runtimeErrorResponse, withRequestId } from "@/lib/agents/api";
import { getOwnedMissionSnapshot, reconcileMissionLiveness } from "@/lib/agents/missions";
import { requestIdFor } from "@/lib/agents/request";
import { requireAnonymousSession } from "@/lib/agents/session";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ missionId: string }> }) {
  const requestId = requestIdFor(request);
  try {
    const { missionId } = await params;
    const session = requireAnonymousSession(request);
    await reconcileMissionLiveness(missionId, session.id);
    const mission = await getOwnedMissionSnapshot(missionId, session.id);
    return withRequestId(NextResponse.json({ mission, requestId }), requestId);
  } catch (error) {
    return runtimeErrorResponse(error, requestId, "mission.get");
  }
}
