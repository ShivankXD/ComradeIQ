import { describe, expect, it } from "vitest";

import {
  assertPresentationQuality,
  buildPresentation,
  isPptxArchive,
  presentationFilename,
  requestedSlideCount,
  sanitizePresentation,
  type PresentationJson,
} from "../../lib/agents/presentation";

describe("presentation artifact generation", () => {
  it("sanitizes untrusted slide content before it reaches the PPTX generator", () => {
    const raw = {
      slides: [
        {
          title: `  ${"A".repeat(100)}  `,
          keyMessage: `  ${"Key point ".repeat(30)} `,
          bullets: [" useful point ", "", ...Array.from({ length: 6 }, (_, index) => `point ${index}`)],
          layout: "process",
        },
        { title: "   ", keyMessage: "", bullets: [], layout: "insight" },
        null,
      ],
    } as unknown as PresentationJson;

    const sanitized = sanitizePresentation(raw);

    expect(sanitized.slides).toHaveLength(1);
    expect(sanitized.slides[0]).toMatchObject({
      title: "A".repeat(90),
      keyMessage: "Key point ".repeat(21),
      bullets: ["useful point", "point 0", "point 1", "point 2", "point 3"],
      layout: "process",
    });
    expect(sanitized.slides[0].keyMessage).toHaveLength(210);
  });

  it("builds a real ZIP-based PPTX buffer and a safe download filename without a live storage credential", async () => {
    const deck = sanitizePresentation({
      slides: [{
        title: "Release verification",
        keyMessage: "A short verification loop protects the release without slowing the team down.",
        bullets: ["Run lint", "Run unit tests", "Build for production"],
        layout: "process",
      }],
    });

    assertPresentationQuality(deck, 1);
    const artifact = await buildPresentation(deck, [{ title: "OpenAI documentation", url: "https://platform.openai.com/docs" }]);

    expect(artifact).toBeInstanceOf(Uint8Array);
    expect(artifact.byteLength).toBeGreaterThan(1_000);
    expect(isPptxArchive(artifact)).toBe(true);
    expect(presentationFilename("Release verification / Q3")).toBe("comradeiq-release-verification-q3.pptx");
  });

  it("honors an explicit slide count and otherwise uses a concise default", () => {
    expect(requestedSlideCount("Create a 5-slide deck for volunteers")).toBe(5);
    expect(requestedSlideCount("Create a presentation for volunteers")).toBe(3);
  });

  it("keeps research sources inside the requested deck and renders four closing actions", async () => {
    const deck = sanitizePresentation({
      slides: [
        { title: "A garden needs a shared launch plan", keyMessage: "A clear first week turns interest into visible progress.", bullets: ["Set a launch date", "Name a volunteer lead"], layout: "opening" },
        { title: "Start with one reliable growing zone", keyMessage: "A manageable first plot creates confidence and a repeatable rhythm.", bullets: ["Choose a sunny plot", "Assign weekly watering", "Post a simple task board"], layout: "process" },
        { title: "Leave with four actions", keyMessage: "Every volunteer should know the next practical move.", bullets: ["Confirm the site", "Invite neighbors", "Gather tools", "Schedule the first workday"], layout: "action" },
      ],
    });

    assertPresentationQuality(deck, 3);
    const artifact = await buildPresentation(deck, [{ title: "Community gardening guidance", url: "https://example.com/garden" }]);
    const archiveNames = Buffer.from(artifact).toString("latin1");

    expect(archiveNames).toContain("ppt/slides/slide1.xml");
    expect(archiveNames).toContain("ppt/slides/slide2.xml");
    expect(archiveNames).toContain("ppt/slides/slide3.xml");
    expect(archiveNames).not.toContain("ppt/slides/slide4.xml");
  });
});
