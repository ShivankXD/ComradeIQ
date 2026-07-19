import { describe, expect, it } from "vitest";

import { RuntimeError } from "../../lib/agents/errors";
import { toChatCompletionRequest } from "../../lib/agents/openai";

describe("OpenAI-compatible Chat Completions adapter", () => {
  it("translates system instructions, multimodal user input, and a strict schema", () => {
    const request = toChatCompletionRequest({
      instructions: "Return only structured output.",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: "Summarize this." },
          { type: "input_image", image_url: "data:image/png;base64,AAAA", detail: "auto" },
        ],
      }],
      max_output_tokens: 321,
      text: {
        format: {
          type: "json_schema",
          name: "summary",
          strict: true,
          schema: { type: "object", properties: { answer: { type: "string" } }, required: ["answer"], additionalProperties: false },
        },
      },
    }, "gateway-model");

    expect(request).toMatchObject({
      model: "gateway-model",
      max_completion_tokens: 321,
      messages: [
        { role: "system", content: "Return only structured output." },
        {
          role: "user",
          content: [
            { type: "text", text: "Summarize this." },
            { type: "image_url", image_url: { url: "data:image/png;base64,AAAA", detail: "auto" } },
          ],
        },
      ],
      response_format: { type: "json_schema", json_schema: { name: "summary", strict: true } },
    });
  });

  it("refuses to silently drop a hosted Responses tool", () => {
    expect(() => toChatCompletionRequest({
      input: "Research this.",
      tools: [{ type: "web_search" }],
    }, "gateway-model")).toThrow(RuntimeError);
  });
});
