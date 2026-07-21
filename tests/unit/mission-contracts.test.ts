import { beforeEach, describe, expect, it } from "vitest";

import { canTransitionMission, normalizeConnectedComrades } from "../../lib/agents/contracts";
import { useCommanderStore } from "../../lib/store";

describe("Commander-only connection limits", () => {
  beforeEach(() => {
    useCommanderStore.getState().reset();
  });

  it("accepts only unique Commander-to-Comrade links and rejects peer-shaped input", () => {
    const connections = normalizeConnectedComrades([
      { comrade_id: "researcher", role: "researcher" },
      { comrade_id: "researcher", role: "researcher" },
      { comrade_id: "writer", role: "critic" },
      { comrade_id: "assembler", role: "assembler" },
      { comrade_id: "not-a-comrade", role: "not-a-comrade" },
    ]);

    expect(connections).toEqual([
      { comrade_id: "researcher", role: "researcher" },
      { comrade_id: "assembler", role: "assembler" },
    ]);
  });

  it("keeps at least two operational Comrades connected", () => {
    const store = useCommanderStore.getState();

    expect(store.toggleComradeConnection("researcher")).toBe(true);
    expect(store.toggleComradeConnection("writer")).toBe(true);
    expect(store.toggleComradeConnection("formatter")).toBe(true);
    expect(store.toggleComradeConnection("critic")).toBe(false);
    expect(Object.values(useCommanderStore.getState().comrades).filter((comrade) => comrade.connected)).toHaveLength(2);
  });
});

describe("mission state transitions", () => {
  it("allows the normal forward path and recovery from terminal states", () => {
    expect(canTransitionMission("queued", "thinking")).toBe(true);
    expect(canTransitionMission("thinking", "delegating")).toBe(true);
    expect(canTransitionMission("delegating", "synthesizing")).toBe(true);
    expect(canTransitionMission("synthesizing", "complete")).toBe(true);
    expect(canTransitionMission("complete", "queued")).toBe(true);
    expect(canTransitionMission("error", "queued")).toBe(true);
  });

  it("rejects illegal terminal-state rewrites", () => {
    expect(canTransitionMission("complete", "synthesizing")).toBe(false);
    expect(canTransitionMission("cancelled", "delegating")).toBe(false);
  });
});
