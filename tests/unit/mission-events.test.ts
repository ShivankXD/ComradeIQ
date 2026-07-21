import { beforeEach, describe, expect, it } from "vitest";

import { applyMissionEvent } from "../../lib/agents/mission-events";
import { useCommanderStore } from "../../lib/store";

describe("mission event state hydration", () => {
  beforeEach(() => {
    useCommanderStore.getState().reset();
  });

  it("renders a persisted provider rejection from the initial mission snapshot", () => {
    useCommanderStore.getState().setMissionActive(true);

    applyMissionEvent("mission.state", {
      status: "error",
      mission: {
        status: "error",
        lastError: { message: "The AI provider rejected this server configuration." },
      },
    });

    expect(useCommanderStore.getState()).toMatchObject({
      status: "error",
      isMissionActive: false,
      error: "The AI provider rejected this server configuration.",
    });
  });

  it("maps a persisted timeout to the actionable UI error state", () => {
    useCommanderStore.getState().setMissionActive(true);

    applyMissionEvent("mission.state", {
      status: "timed_out",
      mission: {
        status: "timed_out",
        lastError: { message: "The mission exceeded its time limit." },
      },
    });

    expect(useCommanderStore.getState()).toMatchObject({
      status: "error",
      isMissionActive: false,
      error: "The mission exceeded its time limit.",
    });
  });
});
