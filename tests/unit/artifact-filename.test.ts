import { describe, expect, it } from "vitest";

import { markdownArtifactFilename } from "../../lib/agents/artifact-filename";

describe("markdownArtifactFilename", () => {
  it("uses the conventional README.md filename for GitHub README requests", () => {
    expect(markdownArtifactFilename("Write a good GitHub README for Pulse", "# Pulse")).toBe("README.md");
  });

  it("derives a safe Markdown filename from the generated heading otherwise", () => {
    expect(markdownArtifactFilename("Draft project documentation", "# Launch Checklist")).toBe("launch-checklist.md");
  });
});
