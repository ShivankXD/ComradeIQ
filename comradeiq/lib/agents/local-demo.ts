"use client";

import { useCommanderStore, type BusMessage } from "@/lib/store";

const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function post(missionId: string, from: string, to: string, content: string, kind: BusMessage["kind"] = "status") {
  useCommanderStore.getState().postMessage({ id: `${missionId}:${from}:${Date.now()}:${Math.random()}`, missionId, from, to, content, kind, timestamp: Date.now() });
}

function deckFor(objective: string) {
  const conciseObjective = objective.length > 64 ? `${objective.slice(0, 61)}…` : objective;
  return {
    slides: [
      { title: "The opportunity", bullets: [conciseObjective, "Why this matters now", "The audience outcome"], imageQuery: "editorial opening image, ambitious team at work", transition: "fade" },
      { title: "What the evidence says", bullets: ["The core signal", "A focused supporting insight", "The strategic implication"], imageQuery: "clean data visualization with human context", transition: "push" },
      { title: "A practical path forward", bullets: ["Start with the highest-leverage move", "Sequence the next milestones", "Measure what changes"], imageQuery: "modern roadmap and collaboration scene", transition: "fade" },
      { title: "The decision", bullets: ["Commit to the first step", "Align the owners", "Review progress together"], imageQuery: "confident closing image, forward movement", transition: "fade" },
    ],
  };
}

/** A polished offline demonstration path. The real path remains the server-side OpenAI Commander. */
export async function runLocalMissionDemo(missionId: string, commanderName: string, objective: string) {
  const store = useCommanderStore.getState();
  store.appendThinking("I’m framing the mission, identifying the useful workstreams, and convening the council.");
  post(missionId, "commander", "team", `${commanderName} is convening the council around the mission.`);
  await pause(650);

  store.setStatus("dispatching");
  const orders: Record<string, string> = {
    researcher: "Finding visual directions and credible supporting signals.",
    writer: "Drafting a clear narrative arc for the audience.",
    formatter: "Translating the story into slide-ready structure.",
    critic: "Checking density, sequence, and decision clarity.",
    assembler: "Preparing a clean final handoff.",
  };
  Object.entries(orders).forEach(([id, order]) => {
    store.updateComrade(id, { status: "thinking", thought: order });
    post(missionId, "commander", id, `Dispatch: ${order}`, "mission");
  });
  await pause(800);

  store.setStatus("delegating");
  await Promise.all(Object.entries(orders).map(async ([id, order], index) => {
    await pause(260 + index * 130);
    store.updateComrade(id, { status: "working", thought: order });
    await pause(460 + index * 90);
    const report = id === "researcher" ? "Image directions and source leads are ready." : id === "writer" ? "Narrative draft is ready for review." : id === "formatter" ? "Slide structure is organized and ready." : id === "critic" ? "The review found a clear, concise path." : "The final sequence is assembled.";
    store.updateComrade(id, { status: "done", result: report });
    post(missionId, id, "commander", `Comrade ${id} to Commander ${commanderName}: ${report}`);
  }));

  store.setStatus("synthesizing");
  store.appendThinking("The council’s reports agree on a concise, audience-first direction. I’m resolving the final sequence now.");
  await pause(700);
  store.setFinalResult(JSON.stringify(deckFor(objective), null, 2));
  post(missionId, "commander", "user", "The council has completed its presentation plan. Connect an OpenAI key to generate the production deck.", "result");
  store.setStatus("complete");
}
