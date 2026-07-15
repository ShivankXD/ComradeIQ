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

    const realtime = new Ably.Realtime({ authUrl: `/api/ably/token?missionId=${encodeURIComponent(missionId)}` });
    const channel = realtime.channels.get(`mission:${missionId}`);
    channel.subscribe((message) => {
      if (!message.name) return;

      // Render first, then persist — the canvas must never wait on IndexedDB.
      applyMissionEvent(message.name, message.data);
      recordEvent({
        missionId,
        name: message.name,
        data: message.data,
        eventType: classifyEvent(message.name, message.data),
        timestamp: Date.now(),
      });

      // Keep the history chip's status dot in step with the live mission.
      if (message.name === "commander.status") {
        const status = (message.data as { status: CommanderStatus }).status;
        void patchMission(missionId, {
          status,
          ...(TERMINAL.includes(status) ? { completedAt: Date.now() } : {}),
        });
      }
      if (message.name === "mission.result") {
        const { presentationUrl } = message.data as { presentationUrl: string };
        void patchMission(missionId, { resultUrl: presentationUrl });
      }
    });

    return () => {
      channel.unsubscribe();
      realtime.close();
    };
  }, [missionId]);
}
