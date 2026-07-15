import OpenAI from "openai";

import type { ComradeStatus } from "@/lib/store";
import type { MissionType } from "@/lib/store";

import { missionChannelName, publishMissionEvent } from "./realtime";

export type ComradeRole = "researcher" | "writer" | "formatter" | "critic" | "assembler";

export interface ComradeOrder {
  missionId: string;
  comradeId: string;
  role: ComradeRole;
  order: string;
  commanderName: string;
  missionType: MissionType;
}

export interface ComradeResult {
  comradeId: string;
  role: ComradeRole;
  output: string;
}

function systemPrompt(role: ComradeRole, commanderName: string) {
  return `You are Comrade ${role}. You only reason about the order you were given by Commander ${commanderName}. You do not know the original user mission, you only know your order.`;
}

function outputInstruction(role: ComradeRole, missionType: MissionType) {
  if (missionType === "presentation") {
    switch (role) {
      case "researcher": return "Return a concise per-slide image-query research packet. Image search is stubbed, so include placeholder image URLs for every proposed slide.";
      case "writer": return "Draft concise slide content by section: each title must be a takeaway, with no more than five short bullets per slide.";
      case "formatter": return "Return valid JSON shaped exactly as { slides: [{ title, bullets, imageQuery }] }. Only structure material included in the order.";
      case "critic": return "Review only slide material explicitly delivered in the Commander order, flagging long titles, dense bullets, weak image direction, or sequence conflicts. If no material is present, wait for Commander-delivered content.";
      case "assembler": return "Finalize slide sequence and named transitions using only Commander-delivered materials. Return a concise structural plan, not new slide copy.";
    }
  }
  switch (role) {
    case "researcher":
      return "Produce a compact research packet from the order. The image search is currently stubbed, so include the supplied placeholder image URLs alongside focused findings.";
    case "writer":
      return "Draft only the requested content section described in the order. Do not add a final deliverable wrapper.";
    case "formatter":
      return "Convert only the material included in the order into valid slide-ready JSON. Do not infer missing source material.";
    case "critic":
      return "Review only an artifact explicitly included in the order by Commander. If no artifact is included, respond that you are awaiting Commander-delivered material; do not invent a review.";
    case "assembler":
      return "Combine only the materials explicitly included in the order into a final structured outline. Do not introduce new content.";
  }
}

async function publishStatus(input: ComradeOrder, status: ComradeStatus) {
  const channel = missionChannelName(input.missionId);
  await publishMissionEvent(channel, "comrade.status", { comradeId: input.comradeId, status });
  await publishMissionEvent(channel, "bus.message", {
    id: `${input.missionId}:${input.comradeId}:${status}:${Date.now()}`,
    kind: "status",
    from: input.comradeId,
    to: "commander",
    content: `Comrade ${input.role} to Commander ${input.commanderName}: ${status}.`,
    timestamp: Date.now(),
    missionId: input.missionId,
  });
}

async function streamText(channel: string, eventName: string, text: string, comradeId: string) {
  const chunks = text.match(/.{1,36}(?:\s|$)|.{1,36}/g) ?? [text];
  for (const chunk of chunks) {
    await publishMissionEvent(channel, eventName, { comradeId, token: chunk });
  }
}

/** Runs a single Comrade without exposing the original mission to it. */
export async function runComrade(input: ComradeOrder): Promise<ComradeResult> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const channel = missionChannelName(input.missionId);
  await publishStatus(input, "thinking");

  const thinkingStream = await client.responses.create({
    model: "gpt-5.6-terra",
    stream: true,
    instructions: `${systemPrompt(input.role, input.commanderName)}\n\nProvide short, display-safe planning notes about this order only. Do not mention any original mission or other Comrades' private reasoning.`,
    input: `Commander order: ${input.order}`,
  });

  for await (const event of thinkingStream) {
    if (event.type === "response.output_text.delta") {
      await publishMissionEvent(channel, "comrade.thinking.delta", { comradeId: input.comradeId, token: event.delta });
    }
  }

  await publishStatus(input, "working");

  let output = "";
  if (input.role === "researcher") {
    output = JSON.stringify({
      research_brief: `Search-flavored research stub for: ${input.order}`,
      per_slide_image_queries: [
        { slide: 1, query: "editorial hero image matching the opening claim", placeholderUrl: "https://placehold.co/1280x720/0b1020/93c5fd?text=Research+Image+01" },
        { slide: 2, query: "supporting editorial image matching the evidence slide", placeholderUrl: "https://placehold.co/1280x720/0b1020/93c5fd?text=Research+Image+02" },
      ],
    }, null, 2);
    await streamText(channel, "comrade.output.delta", output, input.comradeId);
  } else {
    const outputStream = await client.responses.create({
      model: "gpt-5.6-terra",
      stream: true,
      instructions: `${systemPrompt(input.role, input.commanderName)}\n\n${outputInstruction(input.role, input.missionType)}`,
      input: `Commander order: ${input.order}`,
    });

    for await (const event of outputStream) {
      if (event.type === "response.output_text.delta") {
        output += event.delta;
        await publishMissionEvent(channel, "comrade.output.delta", { comradeId: input.comradeId, token: event.delta });
      }
    }
  }

  await publishStatus(input, "done");
  return { comradeId: input.comradeId, role: input.role, output };
}
