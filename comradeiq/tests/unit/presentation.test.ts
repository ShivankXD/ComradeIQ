import { describe, expect, it } from "vitest";

import {
  buildPresentation,
  presentationFilename,
  sanitizePresentation,
  type PresentationJson,
} from "../../lib/agents/presentation";

describe("presentation artifact generation", () => {
  it("sanitizes untrusted slide content before it reaches the PPTX generator", () => {
    const raw = {
      slides: [
        {
          title: `  ${"A".repeat(100)}  `,
          bullets: [" useful point ", "", ...Array.from({ length: 6 }, (_, index) => `point ${index}`)],
          imageQuery: `  ${"image direction ".repeat(20)} `,
          transition: " ",
        },
        { title: "   ", bullets: [], imageQuery: "", transition: "fade" },
        null,
      ],
    } as unknown as PresentationJson;

    const sanitized = sanitizePresentation(raw);

    expect(sanitized.slides).toHaveLength(1);
    expect(sanitized.slides[0]).toMatchObject({
      title: "A".repeat(90),
      bullets: ["useful point", "point 0", "point 1", "point 2", "point 3"],
      transition: "fade",
    });
    expect(sanitized.slides[0].imageQuery).toHaveLength(180);
  });

  it("builds a real ZIP-based PPTX buffer and a safe download filename without a live storage credential", async () => {
    const deck = sanitizePresentation({
      slides: [{
        title: "Release verification",
        bullets: ["Run lint", "Run unit tests", "Build for production"],
        imageQuery: "release checklist on a dark desk",
        transition: "fade",
      }],
    });

    const artifact = await buildPresentation(deck, [{ title: "OpenAI documentation", url: "https://platform.openai.com/docs" }]);

    expect(artifact).toBeInstanceOf(Uint8Array);
    expect(artifact.byteLength).toBeGreaterThan(1_000);
    expect(new TextDecoder().decode(artifact.slice(0, 2))).toBe("PK");
    expect(presentationFilename("Release verification / Q3")).toBe("comradeiq-release-verification-q3.pptx");
  });
});
