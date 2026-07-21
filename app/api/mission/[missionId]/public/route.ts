import { NextResponse } from "next/server";

import { runtimeErrorResponse, withRequestId } from "@/lib/agents/api";
import { RuntimeError } from "@/lib/agents/errors";
import { getShareableMissionSnapshot } from "@/lib/agents/missions";
import { requestIdFor } from "@/lib/agents/request";

export const runtime = "nodejs";

/**
 * Public, read-only snapshot for shareable mission permalinks. No session is
 * required: the mission id is an unguessable UUID and only completed missions
 * are served, using the already-sanitized public snapshot (no owner session,
 * raw input, or attachment contents).
 */
export async function GET(request: Request, { params }: { params: Promise<{ missionId: string }> }) {
  const requestId = requestIdFor(request);
  try {
    const { missionId } = await params;
    const mission = await getShareableMissionSnapshot(missionId);
    if (!mission) {
      throw new RuntimeError("not_found", "This shared mission is unavailable. It may still be running, or durable storage is not configured on this deployment.", { status: 404 });
    }
    return withRequestId(NextResponse.json({ mission, requestId }), requestId);
  } catch (error) {
    return runtimeErrorResponse(error, requestId, "mission.public");
  }
}
