import type { ComradeRole, MissionType } from "./contracts";

export type MissionIntent = "conversation" | "artifact" | "presentation" | "research";

export interface IntentCapabilities {
  providerAvailable: boolean;
  webEnabled: boolean;
  visionEnabled: boolean;
  durableArtifactStorage: boolean;
  /** Local development files survive dev-server restarts, but are not deployable storage. */
  persistentLocalArtifactStorage?: boolean;
  /** OpenAI-compatible gateways can need a compact delivery DAG to meet their request deadline. */
  compactDelivery?: boolean;
}

export interface IntentInput {
  text: string;
  missionType: MissionType;
  attachmentKinds: Array<"text" | "pdf" | "image" | "unsupported">;
  capabilities: IntentCapabilities;
}

export interface MissionRoute {
  intent: MissionIntent;
  activeRoles: ComradeRole[];
  producesMarkdown: boolean;
  producesPresentation: boolean;
  usesWeb: boolean;
  needsVision: boolean;
  notices: string[];
}

const PRESENTATION_TERMS = /\b(presentation|slide\s*deck|slides?|powerpoint|pptx?|keynote)\b/i;
const ARTIFACT_TERMS = /\b(readme|markdown|\.md\b|document(?:ation)?|write\s+(?:a\s+)?(?:file|doc)|generate\s+(?:a\s+)?(?:file|document)|code\s+(?:file|snippet|module)|csv|json)\b/i;
const RESEARCH_TERMS = /\b(research|sources?|citations?|latest|current|compare|market|news|find\s+out|look\s+up)\b/i;
const GREETING = /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening)|thanks|thank\s+you)[!,.\s]*$/i;

/**
 * Deterministic, inspectable routing. It deliberately uses explicit task signals
 * and capabilities rather than a message-length shortcut or hidden model guess.
 */
export function classifyMissionIntent(input: IntentInput): MissionRoute {
  const text = input.text.trim();
  const hasImage = input.attachmentKinds.includes("image");
  const isPresentation = input.missionType === "presentation" || PRESENTATION_TERMS.test(text);
  const isArtifact = ARTIFACT_TERMS.test(text);
  const asksForResearch = RESEARCH_TERMS.test(text);
  const wantsWeb = asksForResearch && input.capabilities.webEnabled;
  // The full specialist pipeline runs for document/slide missions so the whole
  // team visibly participates. Per-role token budgets stay compact (see
  // comrade.outputBudget), keeping the fast provider well within its deadline.
  const artifactDeliveryRoles: ComradeRole[] = ["writer", "formatter", "critic", "assembler"];
  const presentationDeliveryRoles: ComradeRole[] = ["writer", "formatter", "critic", "assembler"];
  const notices: string[] = [];

  if (!input.capabilities.providerAvailable) {
    notices.push("Live AI is not configured on this deployment.");
  }
  if (asksForResearch && !input.capabilities.webEnabled) {
    notices.push("Internet research was requested but is disabled for this mission.");
  }
  if (hasImage && !input.capabilities.visionEnabled) {
    notices.push("Image input is attached but no vision-capable model is configured.");
  }
  if ((isPresentation || isArtifact) && !input.capabilities.durableArtifactStorage && !input.capabilities.persistentLocalArtifactStorage) {
    notices.push("Artifacts are available only for this running instance until private object storage is configured.");
  }

  if (isPresentation) {
    return {
      intent: "presentation",
      activeRoles: ["researcher", ...presentationDeliveryRoles],
      producesMarkdown: false,
      producesPresentation: true,
      usesWeb: wantsWeb,
      needsVision: hasImage && input.capabilities.visionEnabled,
      notices,
    };
  }

  if (isArtifact) {
    return {
      intent: "artifact",
      activeRoles: ["researcher", ...artifactDeliveryRoles],
      producesMarkdown: true,
      producesPresentation: false,
      usesWeb: wantsWeb,
      needsVision: hasImage && input.capabilities.visionEnabled,
      notices,
    };
  }

  if (wantsWeb) {
    return {
      intent: "research",
      activeRoles: ["researcher", "writer", "critic", "assembler"],
      producesMarkdown: false,
      producesPresentation: false,
      usesWeb: true,
      needsVision: hasImage && input.capabilities.visionEnabled,
      notices,
    };
  }

  return {
    intent: "conversation",
    activeRoles: GREETING.test(text) ? [] : ["writer"],
    producesMarkdown: false,
    producesPresentation: false,
    usesWeb: false,
    needsVision: hasImage && input.capabilities.visionEnabled,
    notices,
  };
}
