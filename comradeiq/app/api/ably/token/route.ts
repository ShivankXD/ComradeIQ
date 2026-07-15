import { NextResponse } from "next/server";

import { createMissionSubscriptionToken } from "@/lib/agents/realtime";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const missionId = new URL(request.url).searchParams.get("missionId");
  if (!missionId || !/^[a-zA-Z0-9-]{1,128}$/.test(missionId)) {
    return NextResponse.json({ error: "Invalid mission id." }, { status: 400 });
  }

  try {
    return NextResponse.json(await createMissionSubscriptionToken(missionId));
  } catch (error) {
    console.error("Unable to create Ably token", error);
    return NextResponse.json({ error: "Realtime authentication is unavailable." }, { status: 500 });
  }
}
