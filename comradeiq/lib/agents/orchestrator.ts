import OpenAI from "openai";
import type { ResponseFunctionToolCall } from "openai/resources/responses/responses";

import type { BusMessage, ComradeState, MissionType } from "@/lib/store";

import { runComrade, type ComradeRole } from "./comrade";
import { buildPresentation, sanitizePresentation, type PresentationJson } from "./presentation";
import { missionChannelName, publishMissionEvent } from "./realtime";
import { OPENAI_MODEL } from "./model";

const COMMANDER_SYSTEM_PROMPT = `You are the Commander. You only reason about the user's objective and how to decompose it. You never write final content yourself. You never reference what individual Comrades are thinking.`;

export interface MissionBrief {
  id: string;
  objective: string;
  assignee: Pick<ComradeState, "id" | "name" | "specialty">;
  dependencies: string[];
}

export interface ConnectedComrade {
  comrade_id: string;
  role: string;
}

export interface DispatchOrder {
  comrade_id: string;
  role: string;
  order: string;
}

interface StartMissionInput {
  missionId: string;
  commanderName: string;
  missionText: string;
  missionType: MissionType;
  connectedComrades: ConnectedComrade[];
  useInternet: boolean;
  attachmentContext: string[];
}

interface StartMissionResult {
  dispatches: DispatchOrder[];
  finalJson?: PresentationJson;
  finalResult?: string;
  presentationUrl?: string;
}

function presentationDispatchRequirements() {
  return `This is a presentation mission. Include these role-specific orders: researcher finds image queries per proposed slide; writer drafts slide content by section; formatter structures material as { slides: [{ title, bullets, imageQuery }] }; critic flags slide-density or sequence issues only when source material is supplied by Commander; assembler finalizes slide order and transitions.`;
}

function isDirectConversation(message: string) {
  const normalized = message.trim().toLowerCase();
  return /^(hi|hello|hey|thanks|thank you)[!. ]*$/.test(normalized)
    || /^(what|which|who|when|where|why|how)\b/.test(normalized)
    || normalized.length < 48;
}

async function answerDirectly(client: OpenAI, message: string, useInternet: boolean, references: string[]) {
  const response = await client.responses.create({
    model: OPENAI_MODEL,
    instructions: "You are Commander Atlas, a helpful AI assistant. Give a direct, accurate answer to the user. Be concise for casual conversation. Use Markdown only when it makes the answer easier to use. Never claim to have performed work you did not perform.",
    input: `User message: ${message}\n\nAttached reference text:\n${references.join("\n---\n") || "None"}`,
    ...(useInternet ? { tools: [{ type: "web_search" as const }] } : {}),
  });
  return response.output_text.trim() || "I wasn’t able to produce a response for that request.";
}

async function synthesizePresentation(
  client: OpenAI,
  missionText: string,
  comradeReports: Awaited<ReturnType<typeof runComrade>>[],
) {
  const synthesis = await client.responses.create({
    model: OPENAI_MODEL,
    instructions: `You are the Commander performing presentation synthesis. Resolve conflicts among the reports, especially titles or bullets that are too long for a slide. Produce only a coherent audience-facing presentation JSON. Each slide must have a concise takeaway title, no more than five brief bullets, one image query, and a simple transition name.`,
    input: `Mission objective: ${missionText}\nComrade reports:\n${JSON.stringify(comradeReports)}`,
    text: {
      format: {
        type: "json_schema",
        name: "presentation_deck",
        strict: true,
        schema: {
          type: "object",
          properties: {
            slides: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  bullets: { type: "array", items: { type: "string" } },
                  imageQuery: { type: "string" },
                  transition: { type: "string" },
                },
                required: ["title", "bullets", "imageQuery", "transition"],
                additionalProperties: false,
              },
            },
          },
          required: ["slides"],
          additionalProperties: false,
        },
      },
    },
  });

  const presentation = sanitizePresentation(JSON.parse(synthesis.output_text) as PresentationJson);
  if (!presentation.slides.length) throw new Error("Commander synthesis returned no presentation slides.");
  return presentation;
}

async function synthesizeGeneralMission(
  client: OpenAI,
  missionText: string,
  reports: Awaited<ReturnType<typeof runComrade>>[],
  useInternet: boolean,
) {
  const synthesis = await client.responses.create({
    model: OPENAI_MODEL,
    instructions: `You are the Assembler Comrade delivering the final result to the user. Fulfil the user's request directly and use concise Markdown when it improves usability. For a greeting, reply naturally and briefly. For a README request, return a complete, practical README in Markdown. Do not mention hidden reasoning, the internal team, or that you are an AI. ${useInternet ? "Web research was enabled: use the provided research material only when it materially improves accuracy." : "Do not claim to have searched the internet."}`,
    input: `User request: ${missionText}\n\nSpecialist reports:\n${JSON.stringify(reports)}`,
    ...(useInternet ? { tools: [{ type: "web_search" as const }] } : {}),
  });
  return synthesis.output_text.trim() || "The team completed the request, but returned no final text.";
}

/** Foundation for the Commander: turns a mission plan into independent briefs. */
export function createMissionBriefs(
  objective: string,
  comrades: Pick<ComradeState, "id" | "name" | "specialty">[],
): MissionBrief[] {
  return comrades.map((assignee, index) => ({
    id: `mission-${index + 1}`,
    objective,
    assignee,
    dependencies: [],
  }));
}

/**
 * Runs only on the server. Thinking updates and dispatches are published to the
 * mission's Ably channel, keeping provider credentials out of the browser.
 */
export async function startMission({ missionId, commanderName, missionText, missionType, connectedComrades, useInternet, attachmentContext }: StartMissionInput): Promise<StartMissionResult> {
  if (!process.env.OPENAI_API_KEY) throw new Error("Live AI is not configured. Add OPENAI_API_KEY to .env.local and restart the app.");
  if (!connectedComrades.length) throw new Error("No operational Comrades are available for dispatch.");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const channel = missionChannelName(missionId);

  await publishMissionEvent(channel, "commander.status", { status: "thinking" });

  if (missionType === "general" && isDirectConversation(missionText)) {
    const finalResult = await answerDirectly(client, missionText, useInternet, attachmentContext);
    await publishMissionEvent(channel, "mission.result", { finalResult });
    await publishMissionEvent(channel, "commander.status", { status: "complete" });
    return { dispatches: [], finalResult };
  }

  const thinkingStream = await client.responses.create({
    model: OPENAI_MODEL,
    stream: true,
    instructions: `${COMMANDER_SYSTEM_PROMPT}\n\nFirst, provide concise, user-visible numbered planning notes about the mission objective only. This is a high-level planning trace, not private chain-of-thought. Do not discuss individual Comrades, assign work, or write the final deliverable.`,
    input: `Commander: ${commanderName}\nMission objective: ${missionText}\nReference material: ${attachmentContext.join("\n---\n") || "None"}`,
  });

  for await (const event of thinkingStream) {
    if (event.type === "response.output_text.delta") {
      await publishMissionEvent(channel, "thinking.delta", { token: event.delta });
    }
  }

  await publishMissionEvent(channel, "commander.status", { status: "dispatching" });

  const availableComrades = connectedComrades.map((comrade) => ({
    comrade_id: comrade.comrade_id,
    role: comrade.role,
  }));
  const planResponse = await client.responses.create({
    model: OPENAI_MODEL,
    instructions: `${COMMANDER_SYSTEM_PROMPT}\n\nCreate a dispatch plan for the mission. Call dispatch_plan exactly once. Include exactly one specific written order for every provided operational Comrade, using its exact id and role. The plan array's order is the dispatch order. Do not produce final mission content.\n\n${missionType === "presentation" ? presentationDispatchRequirements() : ""}`,
    input: `Mission objective: ${missionText}\nReference material: ${attachmentContext.join("\n---\n") || "None"}\nInternet research: ${useInternet ? "enabled" : "disabled"}\nOperational Comrades: ${JSON.stringify(availableComrades)}`,
    tools: [{
      type: "function",
      name: "dispatch_plan",
      description: "Create ordered assignments for operational Comrades.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          orders: {
            type: "array",
            items: {
              type: "object",
              properties: {
                comrade_id: { type: "string" },
                role: { type: "string" },
                order: { type: "string" },
              },
              required: ["comrade_id", "role", "order"],
              additionalProperties: false,
            },
          },
        },
        required: ["orders"],
        additionalProperties: false,
      },
    }],
    tool_choice: { type: "function", name: "dispatch_plan" },
  });

  const functionCall = planResponse.output.find((item): item is ResponseFunctionToolCall => item.type === "function_call" && item.name === "dispatch_plan");
  if (!functionCall) throw new Error("Commander did not return a dispatch plan.");

  const parsed = JSON.parse(functionCall.arguments) as { orders: DispatchOrder[] };
  const plannedOrders = new Map(parsed.orders.map((order) => [order.comrade_id, order]));
  const dispatches = connectedComrades.map((comrade) => {
    const planned = plannedOrders.get(comrade.comrade_id);
    return {
      comrade_id: comrade.comrade_id,
      role: comrade.role,
      order: planned?.order ?? `Carry out the ${comrade.role} portion of the Commander-assigned work.`,
    };
  });

  for (const dispatch of dispatches) {
    const busMessage: BusMessage = {
      id: `${missionId}:${dispatch.comrade_id}:dispatch`,
      kind: "mission",
      from: "commander",
      to: dispatch.comrade_id,
      content: `Dispatch to ${dispatch.role}: ${dispatch.order}`,
      timestamp: Date.now(),
      missionId,
    };
    await publishMissionEvent(channel, "bus.message", busMessage);
  }

  await publishMissionEvent(channel, "commander.status", { status: "delegating" });
  const comradeReports = await Promise.all(dispatches.map((dispatch) => runComrade({
    missionId,
    comradeId: dispatch.comrade_id,
    role: dispatch.role as ComradeRole,
    order: dispatch.order,
    commanderName,
    missionType,
    useInternet,
  })));

  if (missionType === "presentation") {
    await publishMissionEvent(channel, "commander.status", { status: "synthesizing" });
    const finalJson = await synthesizePresentation(client, missionText, comradeReports);
    await buildPresentation(missionId, finalJson);
    const presentationUrl = `/api/presentation/${missionId}`;
    await publishMissionEvent(channel, "mission.result", { finalJson, presentationUrl });
    await publishMissionEvent(channel, "bus.message", {
      id: `${missionId}:commander:presentation-ready`,
      kind: "result",
      from: "commander",
      to: "user",
      content: "Presentation synthesis complete. Deck ready for download.",
      timestamp: Date.now(),
      missionId,
    } satisfies BusMessage);
    await publishMissionEvent(channel, "commander.status", { status: "complete" });
    return { dispatches, finalJson, presentationUrl };
  }

  await publishMissionEvent(channel, "commander.status", { status: "synthesizing" });
  const finalResult = await synthesizeGeneralMission(client, missionText, comradeReports, useInternet);
  await publishMissionEvent(channel, "mission.result", { finalResult });
  await publishMissionEvent(channel, "bus.message", {
    id: `${missionId}:commander:general-ready`, kind: "result", from: "commander", to: "user",
    content: "The Commander has assembled the final response.", timestamp: Date.now(), missionId,
  } satisfies BusMessage);
  await publishMissionEvent(channel, "commander.status", { status: "complete" });
  return { dispatches, finalResult };
}
