import { after, NextResponse } from "next/server";

import { runtimeErrorResponse, withRequestId } from "@/lib/agents/api";
import { classifyMissionIntent } from "@/lib/agents/intent";
import { acquireMissionSlot, consumeMissionRateLimit } from "@/lib/agents/limits";
import { createMission } from "@/lib/agents/missions";
import { getRuntimeConfiguration } from "@/lib/agents/model";
import { executeMission } from "@/lib/agents/orchestrator";
import { parseMissionRequest, publicAttachmentLabels, requestIdFor } from "@/lib/agents/request";
import { assertSameOrigin, getAnonymousSession, setAnonymousSessionCookie } from "@/lib/agents/session";
import { RuntimeError } from "@/lib/agents/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const requestId = requestIdFor(request);
  let slot: ReturnType<typeof acquireMissionSlot> | undefined;
  try {
    assertSameOrigin(request);
    const session = getAnonymousSession(request, true);
    if (!session) throw new RuntimeError("forbidden", "Unable to establish a mission session.", { status: 403 });
    const configuration = getRuntimeConfiguration();
    if (configuration.provider === "unconfigured") {
      throw new RuntimeError("provider_unconfigured", "Live AI is not configured. Add OPENAI_API_KEY on the server, then restart the deployment.", { status: 503 });
    }

    consumeMissionRateLimit(session.id);
    slot = acquireMissionSlot(session.id);
    const input = await parseMissionRequest(request);
    const route = classifyMissionIntent({
      text: input.missionText,
      missionType: input.missionType,
      attachmentKinds: input.attachments.map((attachment) => attachment.kind),
      capabilities: {
        providerAvailable: configuration.provider === "openai",
        webEnabled: input.useInternet && configuration.webResearchEnabled,
        visionEnabled: Boolean(configuration.visionModel),
        durableArtifactStorage: configuration.durableStorageConfigured,
        compactDelivery: configuration.apiMode === "chat-completions",
      },
    });
    const mission = await createMission(session.id, requestId, input, route);

    after(async () => {
      try {
        await executeMission(mission.id);
      } finally {
        slot?.release();
      }
    });

    const response = NextResponse.json({
      started: true,
      mode: "live",
      missionId: mission.id,
      clientMissionId: input.clientMissionId,
      requestId,
      status: "queued",
      streamUrl: `/api/mission/${mission.id}/events`,
      missionUrl: `/api/mission/${mission.id}`,
      route: { intent: route.intent, notices: route.notices },
      attachments: publicAttachmentLabels(input.attachments),
    }, { status: 202 });
    setAnonymousSessionCookie(response, session);
    return withRequestId(response, requestId);
  } catch (error) {
    slot?.release();
    return runtimeErrorResponse(error, requestId, "mission.start");
  }
}
