"use client";

import { useCommanderStore, type MissionType } from "@/lib/store";
import { runLocalMissionDemo } from "./local-demo";

export async function launchMission(
  commanderName: string,
  missionText: string,
  missionType: MissionType,
  // Supplied by the caller so the history row exists before the mission runs.
  missionId: string = crypto.randomUUID(),
) {
  const store = useCommanderStore.getState();
  const connectedComrades = Object.values(store.comrades)
    .filter((comrade) => comrade.connected)
    .map((comrade) => ({ comrade_id: comrade.id, role: comrade.id }));

  store.setCommanderName(commanderName);
  store.setObjective(missionText);
  store.setMissionId(missionId);
  store.setMissionType(missionType);
  store.clearThinking();
  store.clearComradeActivity();
  store.setFinalResult(undefined);
  store.setPresentationUrl(undefined);
  store.setStatus("thinking");
  store.setMissionActive(true);

  const response = await fetch("/api/mission", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ missionId, commanderName, missionText, missionType, connectedComrades }),
  });

  const payload = await response.json().catch(() => null) as { error?: string; finalJson?: unknown; presentationUrl?: string } | null;
  if (!response.ok) {
    const message = payload?.error ?? "The Commander could not start the mission.";
    // Keep the prototype valuable immediately after cloning. A configured
    // server always takes the real OpenAI/Ably route; missing credentials get
    // a clearly contained, local demonstration of the same command-room flow.
    if (/OPENAI_API_KEY|ABLY_API_KEY|not configured/i.test(message)) {
      await runLocalMissionDemo(missionId, commanderName, missionText);
      return;
    }
    useCommanderStore.getState().setStatus("error");
    throw new Error(message);
  }

  if (payload?.finalJson) useCommanderStore.getState().setFinalResult(JSON.stringify(payload.finalJson, null, 2));
  if (payload?.presentationUrl) useCommanderStore.getState().setPresentationUrl(payload.presentationUrl);
}
