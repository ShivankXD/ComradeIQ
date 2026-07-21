"use client";

import { useCommanderStore, type MissionType } from "@/lib/store";

type LaunchOptions = {
  useInternet?: boolean;
  attachments?: File[];
};

type MissionResponse = {
  error?: string;
  code?: string;
  missionId?: string;
  clientMissionId?: string;
  requestId?: string;
  mode?: "live";
  status?: string;
  streamUrl?: string;
  missionUrl?: string;
  route?: { notices?: string[] };
};

export type LaunchedMission = {
  missionId: string;
  requestId?: string;
  streamUrl?: string;
  missionUrl?: string;
};

async function readPayload(response: Response): Promise<MissionResponse | null> {
  return response.json().catch(() => null) as Promise<MissionResponse | null>;
}

function safeError(payload: MissionResponse | null, fallback: string) {
  return typeof payload?.error === "string" && payload.error.trim() ? payload.error : fallback;
}

export async function launchMission(
  commanderName: string,
  missionText: string,
  missionType: MissionType,
  clientMissionId: string = crypto.randomUUID(),
  options: LaunchOptions = {},
): Promise<LaunchedMission> {
  const store = useCommanderStore.getState();
  const connectedComrades = Object.values(store.comrades)
    .filter((comrade) => comrade.connected)
    .map((comrade) => ({ comrade_id: comrade.id, role: comrade.id }));

  store.setCommanderName(commanderName);
  store.setObjective(missionText);
  // The server owns the durable mission id. Do not subscribe to the temporary
  // client correlation id while the launch request is being accepted.
  store.setMissionId(undefined);
  store.setMissionType(missionType);
  store.clearThinking();
  store.clearComradeActivity();
  store.setFinalResult(undefined);
  store.setPresentationUrl(undefined);
  store.setSources([]);
  store.setArtifacts([]);
  store.setError(undefined);
  store.setRuntimeMode("unknown");
  store.setStatus("thinking");
  store.setMissionActive(true);

  const formData = new FormData();
  formData.set("missionId", clientMissionId);
  formData.set("commanderName", commanderName);
  formData.set("missionText", missionText);
  formData.set("missionType", missionType);
  formData.set("connectedComrades", JSON.stringify(connectedComrades));
  formData.set("useInternet", options.useInternet ? "true" : "false");
  for (const attachment of options.attachments ?? []) formData.append("attachments", attachment, attachment.name);

  let response: Response;
  try {
    response = await fetch("/api/mission", { method: "POST", body: formData });
  } catch {
    const current = useCommanderStore.getState();
    current.setError("The mission request could not reach the configured service. Please try again.");
    current.setRuntimeMode("unavailable");
    current.setStatus("error");
    current.setMissionActive(false);
    throw new Error(current.error);
  }

  const payload = await readPayload(response);
  if (!response.ok) {
    const message = safeError(payload, "The Commander could not start the mission.");
    const current = useCommanderStore.getState();
    current.setError(message);
    current.setRuntimeMode(response.status >= 500 ? "unavailable" : "unknown");
    current.setStatus("error");
    current.setMissionActive(false);
    throw new Error(message);
  }

  const missionId = payload?.missionId;
  if (!missionId) {
    const current = useCommanderStore.getState();
    current.setError("The service accepted the mission without a mission identifier. Please retry.");
    current.setStatus("error");
    current.setMissionActive(false);
    throw new Error(current.error);
  }

  const current = useCommanderStore.getState();
  current.setMissionId(missionId);
  current.setRuntimeMode(payload?.mode ?? "live");
  for (const notice of payload?.route?.notices ?? []) {
    if (!notice.trim()) continue;
    current.postMessage({
      id: `${missionId}:configuration:${crypto.randomUUID()}`,
      kind: "system",
      from: "system",
      to: "user",
      content: notice,
      timestamp: Date.now(),
      missionId,
    });
  }
  return { missionId, requestId: payload?.requestId, streamUrl: payload?.streamUrl, missionUrl: payload?.missionUrl };
}

async function missionAction(missionId: string, action: "cancel" | "retry") {
  const response = await fetch(`/api/mission/${encodeURIComponent(missionId)}/${action}`, { method: "POST" });
  const payload = await readPayload(response);
  if (!response.ok) {
    const message = safeError(payload, `Unable to ${action} this mission.`);
    const store = useCommanderStore.getState();
    store.setError(message);
    store.setStatus("error");
    throw new Error(message);
  }
  return payload;
}

export async function cancelMission(missionId: string) {
  const payload = await missionAction(missionId, "cancel");
  if (payload?.status === "cancelled" || payload?.missionId) {
    const store = useCommanderStore.getState();
    store.setStatus("cancelled");
    store.setMissionActive(false);
  }
}

export async function retryMission(missionId: string) {
  const payload = await missionAction(missionId, "retry");
  const store = useCommanderStore.getState();
  store.setMissionId(payload?.missionId ?? missionId);
  store.clearThinking();
  store.clearComradeActivity();
  store.setFinalResult(undefined);
  store.setPresentationUrl(undefined);
  store.setSources([]);
  store.setArtifacts([]);
  store.setError(undefined);
  store.setStatus("thinking");
  store.setMissionActive(true);
}
