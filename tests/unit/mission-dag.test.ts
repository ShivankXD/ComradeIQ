import { describe, expect, it } from "vitest";

import { executeMissionDag, MissionDagError, type MissionDagNode } from "../../lib/agents/dag";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe("executeMissionDag", () => {
  it("runs independent research and writing in parallel, then passes reviewed upstream outputs to the assembler", async () => {
    const researcherGate = deferred();
    const writerGate = deferred();
    const started: string[] = [];
    const received: Record<string, Readonly<Record<string, string>>> = {};
    const nodes: MissionDagNode<{ objective: string }, string>[] = [
      {
        id: "researcher",
        dependsOn: [],
        run: async () => {
          started.push("researcher");
          await researcherGate.promise;
          return "research notes";
        },
      },
      {
        id: "writer",
        dependsOn: [],
        run: async () => {
          started.push("writer");
          await writerGate.promise;
          return "draft";
        },
      },
      {
        id: "formatter",
        dependsOn: ["researcher", "writer"],
        run: async (_, upstream) => {
          received.formatter = upstream;
          return `formatted ${upstream.writer} using ${upstream.researcher}`;
        },
      },
      {
        id: "critic",
        dependsOn: ["researcher", "writer"],
        run: async (_, upstream) => {
          received.critic = upstream;
          return `reviewed ${upstream.writer}`;
        },
      },
      {
        id: "assembler",
        dependsOn: ["formatter", "critic"],
        run: async (_, upstream) => {
          received.assembler = upstream;
          return `${upstream.formatter}; ${upstream.critic}`;
        },
      },
    ];

    const execution = executeMissionDag(nodes, { objective: "Create a release brief" });
    expect(started).toEqual(expect.arrayContaining(["researcher", "writer"]));
    expect(started).toHaveLength(2);

    researcherGate.resolve();
    writerGate.resolve();
    const results = await execution;

    expect(received.formatter).toEqual({ researcher: "research notes", writer: "draft" });
    expect(received.critic).toEqual({ researcher: "research notes", writer: "draft" });
    expect(received.assembler).toEqual({
      formatter: "formatted draft using research notes",
      critic: "reviewed draft",
    });
    expect(results.assembler).toBe("formatted draft using research notes; reviewed draft");
  });

  it("rejects invalid dependencies rather than silently fabricating a plan", async () => {
    const cycle: MissionDagNode<undefined, string>[] = [
      { id: "formatter", dependsOn: ["critic"], run: async () => "formatted" },
      { id: "critic", dependsOn: ["formatter"], run: async () => "reviewed" },
    ];

    await expect(executeMissionDag(cycle, undefined)).rejects.toBeInstanceOf(MissionDagError);
  });
});
