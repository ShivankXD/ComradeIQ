"use client";

import { useState } from "react";

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

/** Artifact bytes must only be fetched from this ComradeIQ origin. */
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

  const hasPresentation = Boolean(presentationDownload);
  const downloadError = downloadState.phase === "failed" ? downloadState.message : undefined;

  return (
    <section className="mt-8 rounded-2xl border border-white/[0.1] bg-[#242826] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.12)] sm:p-5" role="region" aria-label="Mission result">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div>
          <p className="text-sm font-medium text-[#f3f7f5]">Mission result</p>
          <p className="mt-0.5 text-xs text-[#9da8a2]">Generated by the configured provider.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {result && <button type="button" onClick={() => void copy()} data-testid="copy-result" className="rounded-lg border border-white/[0.12] px-2.5 py-1.5 text-xs font-medium text-[#d9e3de] transition hover:bg-white/[0.07]">{copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}</button>}
          {(markdownDownloadUrl || (result && !hasPresentation)) && <button type="button" onClick={downloadMarkdown} disabled={downloadState.phase === "downloading" && downloadState.artifactId === markdownArtifact?.id} data-testid="download-markdown" className="rounded-lg border border-white/[0.12] px-2.5 py-1.5 text-xs font-medium text-[#d9e3de] transition hover:bg-white/[0.07] disabled:cursor-wait disabled:opacity-60">{downloadState.phase === "downloading" && downloadState.artifactId === markdownArtifact?.id ? "Preparing…" : "Download Markdown"}</button>}
          {presentationDownload && <button type="button" onClick={() => void downloadArtifact(presentationDownload)} disabled={downloadState.phase === "downloading" && downloadState.artifactId === presentationDownload.id} data-testid="download-presentation" className="rounded-lg bg-[#10a37f] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#13b38c] disabled:cursor-wait disabled:opacity-60">{downloadState.phase === "downloading" && downloadState.artifactId === presentationDownload.id ? "Preparing…" : "Download PPTX"}</button>}
        </div>
      </div>
      {downloadError && <p className="mt-3 rounded-lg border border-amber-300/25 bg-amber-200/[0.06] px-3 py-2 text-xs text-amber-100" role="alert">{downloadError}</p>}
      {result && <div className="pt-3"><SafeMarkdown content={result} /></div>}
      {artifacts.length > 0 && <section className="mt-5 border-t border-white/[0.08] pt-4" aria-label="Mission artifacts"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eaaa4]">Artifacts</p><div className="mt-2 flex flex-wrap gap-2">{artifacts.map((artifact) => <button key={artifact.id} type="button" onClick={() => void downloadArtifact(artifact)} disabled={downloadState.phase === "downloading" && downloadState.artifactId === artifact.id} className="rounded-lg border border-white/[0.1] bg-white/[0.025] px-2.5 py-2 text-xs text-[#d8e3dd] transition hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-60">{artifact.filename} <span className="text-[#9aa69f]">· {formatBytes(artifact.size)}</span></button>)}</div></section>}
      {sources.length > 0 && <section className="mt-5 border-t border-white/[0.08] pt-4" aria-label="Research sources"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eaaa4]">Sources</p><span className="text-[11px] text-[#8d9992]">Web research provenance</span></div><ul className="mt-2 grid gap-2 sm:grid-cols-2">{sources.map((source, index) => { const url = safeExternalUrl(source.url); return url ? <li key={`${source.url}-${index}`}><a href={url} target="_blank" rel="noreferrer" className="block rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-2.5 text-sm text-[#a4ecd4] transition hover:border-[#55cfae]/45 hover:bg-[#10a37f]/[0.06]"><span className="block truncate font-medium">{source.title}</span><span className="mt-1 block truncate text-[11px] text-[#99aaa2]">{source.url}</span></a></li> : null; })}</ul></section>}
      <p className="sr-only" role="status" aria-live="polite">{copyState === "copied" ? "Mission result copied to the clipboard." : copyState === "failed" ? "Unable to copy the mission result." : downloadState.phase === "downloading" ? "Preparing your artifact download." : ""}</p>
    </section>
  );
}
