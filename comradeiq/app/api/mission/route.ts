import { NextResponse } from "next/server";

import { startMission, type ConnectedComrade } from "@/lib/agents/orchestrator";
import type { MissionType } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      missionId?: string;
      commanderName?: string;
      missionText?: string;
      missionType?: MissionType;
      connectedComrades?: ConnectedComrade[];
      useInternet?: boolean;
      attachmentContext?: string[];
    };

    if (!body.missionId || !body.commanderName?.trim() || !body.missionText?.trim() || !["presentation", "general"].includes(body.missionType ?? "") || !Array.isArray(body.connectedComrades)) {
      return NextResponse.json({ error: "A mission id, Commander name, mission objective, and operational Comrades are required." }, { status: 400 });
    }

    const result = await startMission({
      missionId: body.missionId,
      commanderName: body.commanderName.trim(),
      missionText: body.missionText.trim(),
      missionType: body.missionType as MissionType,
      connectedComrades: body.connectedComrades,
      useInternet: Boolean(body.useInternet),
      attachmentContext: body.attachmentContext?.filter((item) => typeof item === "string").slice(0, 3) ?? [],
    });

    return NextResponse.json({ started: true, mode: "live", missionId: body.missionId, finalJson: result.finalJson, finalResult: result.finalResult, presentationUrl: result.presentationUrl });
  } catch (error) {
    console.error("Commander mission failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "The Commander could not start the mission." }, { status: 500 });
  }
}
