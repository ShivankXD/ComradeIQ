"use client";

import type { MissionEventType } from "@/lib/history/db";
import type { BusMessage, CommanderStatus, MissionArtifact, MissionSource } from "@/lib/store";
import { useCommanderStore } from "@/lib/store";

const commanderStatuses: CommanderStatus[] = ["idle", "thinking", "dispatching", "delegating", "monitoring", "synthesizing", "complete", "cancelled", "error"];
const failedServerStatuses = new Set(["error", "timed_out", "interrupted"]);
const terminalServerStatuses = new Set(["complete", "cancelled", "error", "timed_out", "interrupted"]);

function isCommanderStatus(value: unknown): value is CommanderStatus {
  return typeof value === "string" && commanderStatuses.includes(value as CommanderStatus);
}

/**
 * The API exposes a few terminal states that the compact UI deliberately folds
 * into its single actionable `error` state. Without this mapping a persisted
 * timeout/interruption can leave the composer looking as though work is still
 * in progress.
 */
function displayStatus(value: unknown): CommanderStatus | undefined {
  if (isCommanderStatus(value)) return value;
  return value === "timed_out" || value === "interrupted" ? "error" : undefined;
}

function isTerminalServerStatus(value: unknown) {
  return typeof value === "string" && terminalServerStatuses.has(value);
}

function safeUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value, typeof window === "undefined" ? "http://localhost" : window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}

function asSources(value: unknown): MissionSource[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const source = candidate as { title?: unknown; url?: unknown };
    const url = safeUrl(source.url);
    if (typeof source.title !== "string" || !url) return [];
    return [{ title: source.title.slice(0, 280), url }];
  });
}

function asArtifacts(value: unknown): MissionArtifact[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const artifact = candidate as Partial<MissionArtifact>;
    const url = safeUrl(artifact.url);
    if (!url || (artifact.kind !== "markdown" && artifact.kind !== "presentation") || typeof artifact.id !== "string" || typeof artifact.filename !== "string" || typeof artifact.contentType !== "string" || typeof artifact.size !== "number") return [];
    return [{ id: artifact.id, kind: artifact.kind, filename: artifact.filename, contentType: artifact.contentType, size: artifact.size, url }];
  });
}

function setResultJson(value: unknown) {
  try {
    useCommanderStore.getState().setFinalResult(JSON.stringify(value, null, 2));
  } catch {
    useCommanderStore.getState().setFinalResult("The mission returned an unreadable structured result.");
  }
}

function applyPublicResult(payload: { finalJson?: unknown; finalResult?: unknown; presentationUrl?: unknown; artifacts?: unknown; sources?: unknown }) {
  const store = useCommanderStore.getState();
  if (typeof payload.finalResult === "string") store.setFinalResult(payload.finalResult);
  if (payload.finalJson !== undefined) setResultJson(payload.finalJson);
  const sources = asSources(payload.sources);
  if (sources) store.setSources(sources);
  const artifacts = asArtifacts(payload.artifacts);
  if (artifacts) {
    store.setArtifacts(artifacts);
    const presentation = artifacts.find((artifact) => artifact.kind === "presentation");
    if (presentation) store.setPresentationUrl(presentation.url);
  }
  const presentationUrl = safeUrl(payload.presentationUrl);
  if (presentationUrl) store.setPresentationUrl(presentationUrl);
}

/**
 * The single place a mission event is turned into store state.
 *
 * Both the live Ably subscription and history replay drive the topology through
 * this function, so a replayed mission renders exactly like the live one did.
 */
export function applyMissionEvent(name: string, data: unknown) {
  const store = useCommanderStore.getState();

  switch (name) {
    case "thinking.delta":
      store.appendThinking((data as { token: string }).token);
      break;
    case "comrade.thinking.delta": {
      const payload = data as { comradeId: string; token: string };
      store.appendComradeThinking(payload.comradeId, payload.token);
      break;
    }
    case "comrade.output.delta": {
      const payload = data as { comradeId: string; token: string };
      store.appendComradeResult(payload.comradeId, payload.token);
      break;
    }
    case "comrade.status": {
      const payload = data as { comradeId: string; status: "thinking" | "working" | "done" };
      store.updateComrade(payload.comradeId, { status: payload.status });
      break;
    }
    case "mission.result": {
      applyPublicResult(data as { finalJson?: unknown; finalResult?: unknown; presentationUrl?: unknown; artifacts?: unknown; sources?: unknown });
      break;
    }
    case "bus.message":
      store.postMessage(data as BusMessage);
      break;
    case "commander.status": {
      const status = (data as { status?: unknown }).status;
      if (isCommanderStatus(status)) {
        store.setStatus(status);
        if (["complete", "cancelled", "error"].includes(status)) store.setMissionActive(false);
      }
      break;
    }
    case "mission.state": {
      const payload = data as {
        status?: unknown;
        state?: unknown;
        mission?: { status?: unknown; finalJson?: unknown; finalResult?: unknown; presentationUrl?: unknown; artifacts?: unknown; sources?: unknown; lastError?: { message?: unknown } };
      };
      const serverStatus = payload.status ?? payload.state ?? payload.mission?.status;
      const status = displayStatus(serverStatus);
      if (isCommanderStatus(status)) {
        store.setStatus(status);
        if (isTerminalServerStatus(serverStatus)) store.setMissionActive(false);
      }
      if (payload.mission) {
        applyPublicResult(payload.mission);
        const message = payload.mission.lastError?.message;
        if (typeof message === "string" && message.trim()) {
          store.setError(message);
          // A snapshot can be the first and only update a browser receives if
          // the provider rejects a mission before SSE attaches. Render the
          // stored failure as an actionable UI error in that case.
          if (typeof serverStatus === "string" && failedServerStatuses.has(serverStatus)) {
            store.setStatus("error");
            store.setMissionActive(false);
          }
        }
      }
      break;
    }
    case "mission.error": {
      const payload = data as { code?: unknown; message?: unknown };
      const message = typeof payload.message === "string" && payload.message.trim() ? payload.message : "The mission could not be completed.";
      store.setError(message);
      if (payload.code === "cancelled") {
        store.setStatus("cancelled");
      } else {
        store.setStatus("error");
      }
      store.setMissionActive(false);
      break;
    }
  }
}

/**
 * Buckets an event for storage. `dispatch` and `report` are distinguished by the
 * bus message's own kind, since both arrive as bus traffic.
 */
export function classifyEvent(name: string, data: unknown): MissionEventType {
  switch (name) {
    case "thinking.delta":
    case "comrade.thinking.delta":
      return "thinking";
    case "comrade.output.delta":
      return "report";
    case "comrade.status":
    case "commander.status":
    case "mission.state":
      return "status";
    case "mission.result":
    case "mission.error":
      return "report";
    case "bus.message": {
      const kind = (data as BusMessage | undefined)?.kind;
      if (kind === "mission") return "dispatch";
      if (kind === "result") return "report";
      return "bus";
    }
    default:
      return "bus";
  }
}
