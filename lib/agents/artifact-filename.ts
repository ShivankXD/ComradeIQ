export function markdownArtifactFilename(objective: string, markdown: string) {
  if (/\breadme(?:\.md)?\b/i.test(objective)) return "README.md";
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1] ?? objective;
  const slug = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return `${slug || "comradeiq-artifact"}.md`;
}
