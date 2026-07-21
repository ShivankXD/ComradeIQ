"use client";

import { applyMissionEvent } from "@/lib/agents/mission-events";
import { useCommanderStore } from "@/lib/store";

import { getEvents, getMission } from "./db";

/**
 * Replays a cached mission into the Zone A topology.
 *
 * Pacing uses the recorded gaps rather than a fixed delay, so the mission keeps
 * its original rhythm (bursts of thinking, pauses between dispatches). Gaps are
 * compressed and clamped: real missions spend seconds waiting on the model, and
 * a faithful replay of that would just look frozen.
 */

const SPEED = 0.35;
const MAX_GAP_MS = 320;
/** Guards against a replay that would take longer than anyone will watch. */
const MAX_TOTAL_MS = 45_000;

let activeToken = 0;

export function cancelReplay() {
  activeToken += 1;
  useCommanderStore.getState().endReplay();
}

export async function replayMission(missionId: string): Promise<void> {
  const token = ++activeToken;
  const store = useCommanderStore.getState();

  const [mission, events] = await Promise.all([getMission(missionId), getEvents(missionId)]);
  if (!mission || token !== activeToken) return;

  store.resetMissionView();
  store.setCommanderName(mission.commanderName);
  store.setObjective(mission.missionText);
  store.setMissionId(missionId);
  store.setMissionActive(true);
  store.beginReplay(missionId);

  if (!events.length) {
    // Nothing was captured (e.g. the mission failed before any event streamed).
    store.setStatus(mission.status === "error" ? "error" : "complete");
    store.endReplay();
    return;
  }

  let elapsed = 0;
  let previous = events[0].timestamp;

  for (const event of events) {
    const gap = Math.min(Math.max(event.timestamp - previous, 0) * SPEED, MAX_GAP_MS);
    previous = event.timestamp;

    if (gap > 0 && elapsed < MAX_TOTAL_MS) {
      elapsed += gap;
      await sleep(gap);
    }
    // The user started another replay or issued a live mission.
    if (token !== activeToken) return;

    applyMissionEvent(event.name, event.data);
  }

  if (token !== activeToken) return;
  useCommanderStore.getState().endReplay();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
