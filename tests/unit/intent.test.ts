import { describe, expect, it } from "vitest";

import { classifyMissionIntent, type IntentInput } from "../../lib/agents/intent";

const availableCapabilities: IntentInput["capabilities"] = {
  providerAvailable: true,
  webEnabled: false,
  visionEnabled: false,
  durableArtifactStorage: true,
};

function classify(overrides: Partial<IntentInput>) {
  return classifyMissionIntent({
    text: "",
    missionType: "general",
    attachmentKinds: [],
    capabilities: availableCapabilities,
    ...overrides,
  });
}

describe("classifyMissionIntent", () => {
  it("routes a greeting directly without activating theatrical specialist work", () => {
    const route = classify({ text: "Hello!" });

    expect(route).toMatchObject({
      intent: "conversation",
      activeRoles: [],
      producesMarkdown: false,
      producesPresentation: false,
      usesWeb: false,
    });
  });

  it("routes a README request to the Markdown artifact workflow", () => {
    const route = classify({ text: "Write a README.md for my API." });

    expect(route).toMatchObject({
      intent: "artifact",
      activeRoles: ["writer", "formatter", "critic", "assembler"],
      producesMarkdown: true,
      producesPresentation: false,
      usesWeb: false,
    });
  });

  it("only routes research through the web capability when the user enabled it", () => {
    const disabled = classify({ text: "Research current market news with sources." });
    const enabled = classify({
      text: "Research current market news with sources.",
      capabilities: { ...availableCapabilities, webEnabled: true },
    });

    expect(disabled).toMatchObject({ intent: "conversation", usesWeb: false });
    expect(disabled.notices).toContain("Internet research was requested but is disabled for this mission.");
    expect(enabled).toMatchObject({
      intent: "research",
      activeRoles: ["researcher", "writer", "critic", "assembler"],
      usesWeb: true,
    });
  });

  it("routes a presentation request to the deck workflow and reports unavailable optional capability", () => {
    const route = classify({
      text: "Create slides from this image.",
      missionType: "presentation",
      attachmentKinds: ["image"],
      capabilities: { ...availableCapabilities, providerAvailable: false, durableArtifactStorage: false },
    });

    expect(route).toMatchObject({
      intent: "presentation",
      activeRoles: ["writer", "formatter", "critic", "assembler"],
      producesPresentation: true,
      needsVision: false,
    });
    expect(route.notices).toEqual(expect.arrayContaining([
      "Live AI is not configured on this deployment.",
      "Image input is attached but no vision-capable model is configured.",
      "Artifacts are available only for this running instance until private object storage is configured.",
    ]));
  });

  it("uses a compact writer-to-Commander path for latency-constrained chat gateways", () => {
    const route = classify({
      text: "Create a README for Pulse.",
      capabilities: { ...availableCapabilities, compactDelivery: true },
    });

    expect(route).toMatchObject({ intent: "artifact", activeRoles: ["writer"], producesMarkdown: true });
  });

  it("generates compact gateway presentations directly as a real deck artifact", () => {
    const route = classify({
      text: "Create a PowerPoint presentation about Pulse.",
      capabilities: { ...availableCapabilities, compactDelivery: true },
    });

    expect(route).toMatchObject({ intent: "presentation", activeRoles: [], producesPresentation: true });
  });

  it("triggers presentation mode when the user explicitly requests a 'ppt'", () => {
    const route = classify({
      text: "Create a ppt summarizing our quarterly results.",
    });

    expect(route).toMatchObject({
      intent: "presentation",
      producesPresentation: true,
    });
  });
});
