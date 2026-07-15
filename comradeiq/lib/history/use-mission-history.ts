"use client";

import { useCallback, useEffect, useState } from "react";

import { useCommanderStore } from "@/lib/store";

import { listMissions, type StoredMission } from "./db";

/**
 * Reads the browser-cached mission list for the history strip.
 *
 * Refreshes whenever a mission reaches a terminal state (or a new one starts),
 * which is when a chip's label or status dot would actually change.
 */
export function useMissionHistory() {
  const [missions, setMissions] = useState<StoredMission[]>([]);
  const status = useCommanderStore((state) => state.status);
  const missionId = useCommanderStore((state) => state.missionId);

  const refresh = useCallback(() => {
    listMissions()
      .then(setMissions)
      .catch((error) => console.error("Failed to read mission history", error));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, missionId, status]);

  return { missions, refresh };
}
