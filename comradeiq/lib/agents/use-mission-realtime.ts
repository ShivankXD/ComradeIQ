"use client";

import * as Ably from "ably";
import { useEffect } from "react";

import { patchMission } from "@/lib/history/db";
import { recordEvent } from "@/lib/history/recorder";
import type { CommanderStatus } from "@/lib/store";

import { applyMissionEvent, classifyEvent } from "./mission-events";

const TERMINAL: CommanderStatus[] = ["complete", "error"];

export function useMissionRealtime(missionId?: string) {
  useEffect(() => {
    if (!missionId) return;
    const activeMissionId = missionId;

    let realtime: Ably.Realtime | undefined;
    let disposed = false;

    async function connect() {
      const readiness = await fetch("/api/health/ai").then((response) => response.json() as Promise<{ realtimeEnabled?: boolean }>).catch(() => null);
      if (disposed || !readiness?.realtimeEnabled) return;
      realtime = new Ably.Realtime({ authUrl: `/api/ably/token?missionId=${encodeURIComponent(activeMissionId)}` });
      const channel = realtime.channels.get(`mission:${activeMissionId}`);
      channel.subscribe((message) => {
      if (!message.name) return;

      // Render first, then persist — the canvas must never wait on IndexedDB.
      applyMissionEvent(message.name, message.data);
      recordEvent({
        missionId: activeMissionId,
        name: message.name,
        data: message.data,
        eventType: classifyEvent(message.name, message.data),
        timestamp: Date.now(),
      });

      // Keep the history chip's status dot in step with the live mission.
      if (message.name === "commander.status") {
        const status = (message.data as { status: CommanderStatus }).status;
        void patchMission(activeMissionId, {
          status,
          ...(TERMINAL.includes(status) ? { completedAt: Date.now() } : {}),
        });
      }
      if (message.name === "mission.result") {
        const { presentationUrl } = message.data as { presentationUrl: string };
        void patchMission(activeMissionId, { resultUrl: presentationUrl });
      }
      });
    }
    void connect();

    return () => {
      disposed = true;
      realtime?.close();
    };
  }, [missionId]);
}
