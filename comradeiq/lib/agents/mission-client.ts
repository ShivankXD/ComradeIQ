"use client";

import { useCommanderStore, type MissionType } from "@/lib/store";

export async function launchMission(
  commanderName: string,
  missionText: string,
  missionType: MissionType,
  // Supplied by the caller so the history row exists before the mission runs.
  missionId: string = crypto.randomUUID(),
  options: { useInternet?: boolean; attachmentContext?: string[] } = {},
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
  store.setError(undefined);
  store.setRuntimeMode("unknown");
  store.setStatus("thinking");
  store.setMissionActive(true);

  const response = await fetch("/api/mission", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ missionId, commanderName, missionText, missionType, connectedComrades, ...options }),
  });

  const payload = await response.json().catch(() => null) as { error?: string; finalJson?: unknown; finalResult?: string; presentationUrl?: string; mode?: "live" | "demo" } | null;
  if (!response.ok) {
    const message = payload?.error ?? "The Commander could not start the mission.";
    const current = useCommanderStore.getState();
    current.setError(message);
    current.setRuntimeMode("unavailable");
    current.setStatus("error");
    throw new Error(message);
  }

  const current = useCommanderStore.getState();
  current.setRuntimeMode(payload?.mode ?? "live");
  if (payload?.finalJson) current.setFinalResult(JSON.stringify(payload.finalJson, null, 2));
  if (payload?.finalResult) current.setFinalResult(payload.finalResult);
  if (payload?.presentationUrl) current.setPresentationUrl(payload.presentationUrl);
  current.setStatus("complete");
}
