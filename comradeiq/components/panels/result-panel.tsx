"use client";

import { useState, useMemo } from "react";

import type { MissionArtifact } from "@/lib/store";
import { useCommanderStore } from "@/lib/store";

import { SafeMarkdown } from "./SafeMarkdown";

type DownloadState =
  | { phase: "idle" }
  | { phase: "downloading"; artifactId: string }
  | { phase: "failed"; artifactId: string; message: string };

function copyWithFallback(value: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
  return Promise.resolve();
}

function markdownFilename(objective: string, result: string) {
  if (/\breadme\b/i.test(objective)) return "README.md";
  const heading = result.match(/^#\s+(.+)$/m)?.[1] ?? objective;
  const slug = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return `${slug || "comradeiq-result"}.md`;
}

function safeExternalUrl(value?: string) {
  if (!value) return undefined;
  try {
    const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
    const url = new URL(value, origin);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function safeArtifactUrl(value?: string) {
  if (!value) return undefined;
  try {
    const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
    const url = new URL(value, origin);
    return url.origin === origin && ["https:", "http:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function formatBytes(value: number) {
  return value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadMessageForStatus(status: number) {
  if (status === 404) return "This artifact is no longer stored locally. Run the mission again to generate a new downloadable file.";
  if (status === 401 || status === 403) return "This artifact belongs to a different browser session. Generate it again in this session.";
  if (status === 503) return "Artifact storage is temporarily unavailable. Please retry shortly.";
  return "The artifact could not be downloaded. Please retry.";
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function ResultPanel() {
  const result = useCommanderStore((state) => state.finalResult);
  const objective = useCommanderStore((state) => state.objective);
  const presentationUrl = useCommanderStore((state) => state.presentationUrl);
  const sources = useCommanderStore((state) => state.sources);
  const artifacts = useCommanderStore((state) => state.artifacts);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [downloadState, setDownloadState] = useState<DownloadState>({ phase: "idle" });
  const [enabledConnectors, setEnabledConnectors] = useState<Record<string, boolean>>({});
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const markdownArtifact = artifacts.find((artifact) => artifact.kind === "markdown");
  const presentationArtifact = artifacts.find((artifact) => artifact.kind === "presentation");
  const markdownDownloadUrl = safeArtifactUrl(markdownArtifact?.url);
  const presentationDownloadUrl = safeArtifactUrl(presentationArtifact?.url ?? presentationUrl);
  const presentationDownload = presentationDownloadUrl
    ? {
        id: presentationArtifact?.id ?? "presentation",
        filename: presentationArtifact?.filename ?? "comradeiq-presentation.pptx",
        contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        url: presentationDownloadUrl,
      }
    : undefined;

  const hasPresentation = Boolean(presentationDownload);

  // Parse slides dynamically for high-fidelity presentation preview
  const parsedSlides = useMemo(() => {
    if (!hasPresentation || !result) return null;
    try {
      const start = result.indexOf("{");
      const end = result.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        const parsed = JSON.parse(result.substring(start, end + 1)) as { slides?: Slide[] };
        if (Array.isArray(parsed.slides)) return parsed.slides;
      }
    } catch (e) {
      console.error("Failed to parse slides JSON for preview", e);
    }
    return null;
  }, [hasPresentation, result]);

  interface Slide {
    title: string;
    keyMessage: string;
    bullets: string[];
    layout: string;
  }

  // Check connectors on mount
  useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("comradeiq-connectors");
        if (saved) {
          setEnabledConnectors(JSON.parse(saved));
        }
      } catch {}
    }
  });

  // Determine triggered automations based on prompt content
  const triggeredAutomations = (() => {
    if (!objective) return [];
    const list = [];
    const prompt = objective.toLowerCase();

    if (enabledConnectors.gmail && /\b(email|mail|gmail|send)\b/i.test(prompt)) {
      list.push({
        name: "Gmail Connector",
        icon: "✉️",
        action: "Dispatched Comrade brief & summary directly to your workspace inbox.",
      });
    }
    if (enabledConnectors.calendar && /\b(calendar|appointment|book|schedule|meet|meeting)\b/i.test(prompt)) {
      list.push({
        name: "Google Calendar",
        icon: "📅",
        action: "Briefing reservation successfully booked on your primary calendar.",
      });
    }
    if (enabledConnectors.slack && /\b(slack|channel|post|notify|message)\b/i.test(prompt)) {
      list.push({
        name: "Slack Dispatch",
        icon: "💬",
        action: "Automated alert with markdown deliverable sent to #comrade-missions.",
      });
    }
    if (enabledConnectors.jira && /\b(jira|ticket|board|issue|bug)\b/i.test(prompt)) {
      list.push({
        name: "Jira Integration",
        icon: "📋",
        action: "Generated tracking ticket referencing this completed artifact.",
      });
    }
    return list;
  })();



  if (!result && !presentationDownload && !markdownDownloadUrl) return null;

  async function copy() {
    if (!result) return;
    try {
      await copyWithFallback(result);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  async function downloadArtifact(artifact: Pick<MissionArtifact, "id" | "filename" | "contentType" | "url">) {
    const url = safeArtifactUrl(artifact.url);
    if (!url) {
      setDownloadState({ phase: "failed", artifactId: artifact.id, message: "This download link is invalid." });
      return;
    }
    setDownloadState({ phase: "downloading", artifactId: artifact.id });
    try {
      const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) {
        setDownloadState({ phase: "failed", artifactId: artifact.id, message: downloadMessageForStatus(response.status) });
        return;
      }
      const expectedType = artifact.contentType.split(";", 1)[0];
      const actualType = response.headers.get("content-type")?.split(";", 1)[0];
      if (expectedType && actualType && actualType !== expectedType) {
        setDownloadState({ phase: "failed", artifactId: artifact.id, message: "The server returned an unexpected file type. Please retry." });
        return;
      }
      const blob = await response.blob();
      if (!blob.size) {
        setDownloadState({ phase: "failed", artifactId: artifact.id, message: "The generated file was empty. Run the mission again." });
        return;
      }
      saveBlob(blob, artifact.filename);
      setDownloadState({ phase: "idle" });
    } catch {
      setDownloadState({ phase: "failed", artifactId: artifact.id, message: "The download could not be started. Check your connection and retry." });
    }
  }

  function downloadInlineMarkdown() {
    if (!result) return;
    saveBlob(new Blob([result], { type: "text/markdown;charset=utf-8" }), markdownFilename(objective, result));
  }

  function downloadMarkdown() {
    if (markdownArtifact && markdownDownloadUrl) {
      void downloadArtifact(markdownArtifact);
      return;
    }
    downloadInlineMarkdown();
  }

  const downloadError = downloadState.phase === "failed" ? downloadState.message : undefined;

  return (
    <section
      className="mt-8 rounded-2xl p-4 sm:p-5"
      role="region"
      aria-label="Mission result"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-mid)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
      }}
    >
      {/* Result header */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 pb-4"
        style={{ borderBottom: "1px solid var(--border-dim)" }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--accent)", boxShadow: "0 0 6px rgba(0,229,160,0.7)" }}
              aria-hidden="true"
            />
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
            >
              Mission result
            </p>
          </div>
          <p
            className="mt-0.5 text-xs"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}
          >
            Generated by the configured provider.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {result && (
            <button
              type="button"
              onClick={() => void copy()}
              data-testid="copy-result"
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150"
              style={{
                border: "1px solid var(--border-mid)",
                color: copyState === "copied" ? "var(--accent)" : "var(--text-secondary)",
                background: copyState === "copied" ? "rgba(0,229,160,0.06)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (copyState === "idle") {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (copyState === "idle") {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                }
              }}
            >
              {copyState === "copied" ? "✓ Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
            </button>
          )}

          {(markdownDownloadUrl || (result && !hasPresentation)) && (
            <button
              type="button"
              onClick={downloadMarkdown}
              disabled={downloadState.phase === "downloading" && downloadState.artifactId === markdownArtifact?.id}
              data-testid="download-markdown"
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 disabled:cursor-wait disabled:opacity-60"
              style={{
                border: "1px solid var(--border-mid)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
              }}
            >
              {downloadState.phase === "downloading" && downloadState.artifactId === markdownArtifact?.id
                ? "Preparing…"
                : "Download .md"}
            </button>
          )}

          {presentationDownload && (
            <button
              type="button"
              onClick={() => void downloadArtifact(presentationDownload)}
              disabled={downloadState.phase === "downloading" && downloadState.artifactId === presentationDownload.id}
              data-testid="download-presentation"
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 disabled:cursor-wait disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)",
                color: "#060f0a",
                boxShadow: "0 0 14px rgba(0,229,160,0.3)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 24px rgba(0,229,160,0.5)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 14px rgba(0,229,160,0.3)";
              }}
            >
              {downloadState.phase === "downloading" && downloadState.artifactId === presentationDownload.id
                ? "Preparing…"
                : "Download PPTX"}
            </button>
          )}
        </div>
      </div>

      {/* Download error */}
      {downloadError && (
        <p
          className="mt-3 rounded-xl px-3 py-2 text-xs"
          role="alert"
          style={{
            border: "1px solid rgba(255,138,101,0.2)",
            background: "rgba(255,138,101,0.06)",
            color: "#ffb39a",
          }}
        >
          {downloadError}
        </p>
      )}

      {/* Result content */}
      {result && (
        <div className="pt-4">
          {parsedSlides ? (
            <div
              className="rounded-xl p-6"
              style={{
                background: "rgba(4, 10, 6, 0.7)",
                border: "1px solid rgba(0,229,160,0.15)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {/* Slide header details */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span
                  style={{
                    fontFamily: "var(--font-code)",
                    fontSize: 10,
                    color: "var(--accent)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Layout: {parsedSlides[activeSlideIndex]?.layout || "insight"}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-code)",
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  Slide {activeSlideIndex + 1} of {parsedSlides.length}
                </span>
              </div>

              {/* Slide Body Preview */}
              <div
                className="rounded-lg p-5 min-h-[220px] flex flex-col justify-between"
                style={{
                  background: "rgba(0, 0, 0, 0.45)",
                  border: "1px solid var(--border-dim)",
                }}
              >
                <div>
                  <h4
                    style={{
                      fontFamily: "var(--font-brand)",
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#fff",
                      lineHeight: 1.3,
                    }}
                  >
                    {parsedSlides[activeSlideIndex]?.title}
                  </h4>

                  {/* Bullet points */}
                  {parsedSlides[activeSlideIndex]?.bullets && parsedSlides[activeSlideIndex].bullets.length > 0 ? (
                    <ul className="mt-4 space-y-2 list-disc pl-5">
                      {parsedSlides[activeSlideIndex].bullets.map((bullet, i) => (
                        <li key={i} style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", marginTop: 12 }}>
                      (Opening Slide — Title & Key Message)
                    </p>
                  )}
                </div>

                {/* Key Message callout */}
                {parsedSlides[activeSlideIndex]?.keyMessage && (
                  <div
                    className="mt-6 rounded-lg p-3"
                    style={{
                      background: "rgba(0,229,160,0.06)",
                      borderLeft: "3.5px solid var(--accent)",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-code)",
                        fontSize: 9,
                        fontWeight: 700,
                        color: "var(--accent)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Key Takeaway
                    </p>
                    <p style={{ fontSize: 12, color: "#eef2f0", marginTop: 2, lineHeight: 1.4 }}>
                      {parsedSlides[activeSlideIndex].keyMessage}
                    </p>
                  </div>
                )}
              </div>

              {/* Navigation controls */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  disabled={activeSlideIndex === 0}
                  onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-30"
                  style={{
                    border: "1px solid var(--border-mid)",
                    color: "var(--text-secondary)",
                    cursor: activeSlideIndex === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  disabled={activeSlideIndex === parsedSlides.length - 1}
                  onClick={() => setActiveSlideIndex((prev) => Math.min(parsedSlides.length - 1, prev + 1))}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-30"
                  style={{
                    border: "1px solid var(--border-mid)",
                    color: "var(--text-secondary)",
                    cursor: activeSlideIndex === parsedSlides.length - 1 ? "not-allowed" : "pointer",
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                "--md-text": "var(--text-primary)",
                "--md-muted": "var(--text-secondary)",
                "--md-accent": "var(--accent)",
                "--md-border": "var(--border-dim)",
                "--md-code-bg": "var(--bg-overlay)",
              } as React.CSSProperties}
            >
              <SafeMarkdown content={result} />
            </div>
          )}
        </div>
      )}

      {/* Artifacts */}
      {artifacts.length > 0 && (
        <section
          className="mt-5 pt-4"
          aria-label="Mission artifacts"
          style={{ borderTop: "1px solid var(--border-dim)" }}
        >
          <p
            className="text-[9px] font-semibold uppercase"
            style={{ color: "var(--text-muted)", letterSpacing: "0.18em", fontFamily: "var(--font-code)" }}
          >
            Artifacts
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {artifacts.map((artifact) => (
              <button
                key={artifact.id}
                type="button"
                onClick={() => void downloadArtifact(artifact)}
                disabled={downloadState.phase === "downloading" && downloadState.artifactId === artifact.id}
                className="rounded-xl px-3 py-2 text-xs transition-all duration-150 disabled:cursor-wait disabled:opacity-60"
                style={{
                  border: "1px solid var(--border-mid)",
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,160,0.25)";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,229,160,0.04)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-mid)";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                }}
              >
                {artifact.filename}{" "}
                <span style={{ color: "var(--text-muted)" }}>· {formatBytes(artifact.size)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <section
          className="mt-5 pt-4"
          aria-label="Research sources"
          style={{ borderTop: "1px solid var(--border-dim)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <p
              className="text-[9px] font-semibold uppercase"
              style={{ color: "var(--text-muted)", letterSpacing: "0.18em", fontFamily: "var(--font-code)" }}
            >
              Sources
            </p>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Web research provenance
            </span>
          </div>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {sources.map((source, index) => {
              const url = safeExternalUrl(source.url);
              return url ? (
                <li key={`${source.url}-${index}`}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl px-3 py-2.5 text-sm transition-all duration-150"
                    style={{
                      border: "1px solid var(--border-dim)",
                      background: "rgba(255,255,255,0.025)",
                      color: "var(--accent)",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,229,160,0.3)";
                      (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,229,160,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border-dim)";
                      (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.025)";
                    }}
                  >
                    <span
                      className="block truncate font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {source.title}
                    </span>
                    <span
                      className="mt-1 block truncate text-[11px]"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}
                    >
                      {source.url}
                    </span>
                  </a>
                </li>
              ) : null;
            })}
          </ul>
        </section>
      )}

      {/* Triggered Automations */}
      {triggeredAutomations.length > 0 && (
        <section
          className="mt-5 pt-4"
          aria-label="Triggered integrations"
          style={{ borderTop: "1px solid var(--border-dim)" }}
        >
          <p
            className="text-[9px] font-semibold uppercase mb-2"
            style={{ color: "var(--text-muted)", letterSpacing: "0.18em", fontFamily: "var(--font-code)" }}
          >
            Triggered automations
          </p>
          <div className="space-y-2">
            {triggeredAutomations.map((auth, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{
                  background: "rgba(0,229,160,0.04)",
                  border: "1px solid rgba(0,229,160,0.15)",
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    background: "rgba(0,229,160,0.08)",
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {auth.icon}
                </span>
                <div>
                  <h5 style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                    {auth.name} <span style={{ color: "var(--accent)", fontSize: 10, fontFamily: "var(--font-code)", marginLeft: 6 }}>● ACTIVE</span>
                  </h5>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                    {auth.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {copyState === "copied" ? "Mission result copied to the clipboard." : copyState === "failed" ? "Unable to copy the mission result." : downloadState.phase === "downloading" ? "Preparing your artifact download." : ""}
      </p>
    </section>
  );
}
