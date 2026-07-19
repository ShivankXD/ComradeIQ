"use client";

import { useEffect } from "react";

import { patchMission } from "@/lib/history/db";
import { recordEvent } from "@/lib/history/recorder";
import type { CommanderStatus } from "@/lib/store";

import { applyMissionEvent, classifyEvent } from "./mission-events";

const TERMINAL: CommanderStatus[] = ["complete", "cancelled", "error"];
const EVENT_NAMES = [
  "thinking.delta",
  "comrade.thinking.delta",
  "comrade.output.delta",
  "comrade.status",
  "mission.result",
  "mission.error",
  "mission.state",
  "bus.message",
  "commander.status",
];

interface SharedSubscription {
  references: number;
  source: EventSource;
}

const subscriptions = new Map<string, SharedSubscription>();

function parseEvent(event: MessageEvent<string>) {
  try {
    return JSON.parse(event.data) as unknown;
  } catch {
    return undefined;
  }
}

function handleEvent(missionId: string, name: string, event: MessageEvent<string>) {
  const data = parseEvent(event);
  if (data === undefined) return;

  // Render first, then persist — a slow IndexedDB write must never delay activity.
  applyMissionEvent(name, data);
  if (name !== "mission.state") {
    recordEvent({
      missionId,
      name,
      data,
      eventType: classifyEvent(name, data),
      timestamp: Date.now(),
    });
  }

  if (name === "commander.status") {
    const status = (data as { status?: CommanderStatus }).status;
    if (status) {
      void patchMission(missionId, { status, ...(TERMINAL.includes(status) ? { completedAt: Date.now() } : {}) });
    }
  }
  if (name === "mission.state") {
    const state = data as { status?: CommanderStatus; mission?: { status?: CommanderStatus; completedAt?: number; presentationUrl?: string } };
    const status = state.status ?? state.mission?.status;
    if (status) void patchMission(missionId, { status, ...(TERMINAL.includes(status) ? { completedAt: state.mission?.completedAt ?? Date.now() } : {}) });
  }
  if (name === "mission.result") {
    const payload = data as { presentationUrl?: string };
    if (payload.presentationUrl) void patchMission(missionId, { resultUrl: payload.presentationUrl });
  }
}

function retainSubscription(missionId: string) {
  const existing = subscriptions.get(missionId);
  if (existing) {
    existing.references += 1;
    return;
  }

  const source = new EventSource(`/api/mission/${encodeURIComponent(missionId)}/events`);
  for (const name of EVENT_NAMES) {
    source.addEventListener(name, (event) => handleEvent(missionId, name, event as MessageEvent<string>));
  }
  // The server closes each SSE response before its route duration expires. Native
  // EventSource reconnects with Last-Event-ID and receives durable catch-up events.
  source.onerror = () => undefined;
  subscriptions.set(missionId, { references: 1, source });
}

function releaseSubscription(missionId: string) {
  const existing = subscriptions.get(missionId);
  if (!existing) return;
  existing.references -= 1;
  if (existing.references > 0) return;
  existing.source.close();
  subscriptions.delete(missionId);
}

/** SSE is the default durable transport; Ably may still be used by external clients but is never required by the UI. */
export function useMissionRealtime(missionId?: string) {
  useEffect(() => {
    if (!missionId) return;
    retainSubscription(missionId);
    return () => releaseSubscription(missionId);
  }, [missionId]);
}
