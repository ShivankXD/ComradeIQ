"use client";

import type { MissionEventType } from "@/lib/history/db";
import type { BusMessage, CommanderStatus } from "@/lib/store";
import { useCommanderStore } from "@/lib/store";

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
      const payload = data as { finalJson?: unknown; finalResult?: string; presentationUrl?: string };
      if (payload.finalResult) store.setFinalResult(payload.finalResult);
      if (payload.finalJson) store.setFinalResult(JSON.stringify(payload.finalJson, null, 2));
      store.setPresentationUrl(payload.presentationUrl);
      break;
    }
    case "bus.message":
      store.postMessage(data as BusMessage);
      break;
    case "commander.status":
      store.setStatus((data as { status: CommanderStatus }).status);
      break;
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
      return "status";
    case "mission.result":
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
