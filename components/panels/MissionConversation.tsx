"use client";

import { useEffect, useRef, useState } from "react";

import { cancelMission, retryMission } from "@/lib/agents/mission-client";
import { useMissionRealtime } from "@/lib/agents/use-mission-realtime";
import { useCommanderStore, type CommanderStatus } from "@/lib/store";

import { AgentConsole } from "./AgentConsole";
import { AgentGraph } from "./AgentGraph";
import { MissionTimeline } from "./MissionTimeline";
import { ResultPanel } from "./result-panel";
import { TypingIndicator } from "./TypingIndicator";
import { SafeMarkdown } from "./SafeMarkdown";

const inFlight: CommanderStatus[] = ["thinking", "dispatching", "delegating", "synthesizing"];

// Seed prompt categories
const SEED_PROMPTS = [
  {
    category: "Chat",
    color: "#00e5a0",
    bg: "rgba(0,229,160,0.06)",
    border: "rgba(0,229,160,0.18)",
    prompts: [
      "Explain how large language models handle multi-step reasoning",
      "What are the key differences between REST and GraphQL APIs?",
    ],
  },
  {
    category: "Document",
    color: "#3d9eff",
    bg: "rgba(61,158,255,0.06)",
    border: "rgba(61,158,255,0.18)",
    prompts: [
      "Write a README for a Next.js + TypeScript SaaS starter project",
      "Generate a technical design doc for a multi-agent orchestration system",
    ],
  },
  {
    category: "Slides",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.06)",
    border: "rgba(168,85,247,0.18)",
    prompts: [
      "Create a 6-slide investor pitch deck for an AI productivity startup",
      "Make a presentation on the future of multi-agent AI systems",
    ],
  },
  {
    category: "Research",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.06)",
    border: "rgba(251,191,36,0.18)",
    prompts: [
      "Research the latest advances in reasoning models and summarise findings",
      "Compare the top 3 vector databases for production RAG applications",
    ],
  },
];

function WelcomeSeedChips() {
  const setSeedPrompt = useCommanderStore((state) => state.setSeedPrompt);
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{ animation: "fadeSlideUp 0.55s ease both" }}>
      <p
        className="mb-3 text-[9px] font-semibold uppercase"
        style={{ color: "var(--text-muted)", letterSpacing: "0.18em", fontFamily: "var(--font-code)" }}
      >
        Try a mission
      </p>
      <div className="space-y-3">
        {SEED_PROMPTS.map((group, gi) => (
          <div
            key={group.category}
            style={{ animation: "fadeSlideUp 0.4s ease both", animationDelay: `${gi * 0.07}s` }}
          >
            <p className="mb-1.5 text-[10px] font-semibold" style={{ color: group.color, fontFamily: "var(--font-code)", letterSpacing: "0.06em" }}>
              {group.category}
            </p>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
              {group.prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setSeedPrompt(prompt)}
                  onMouseEnter={() => setHovered(prompt)}
                  onMouseLeave={() => setHovered(null)}
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-[13px] leading-5 transition-all duration-150"
                  style={{
                    background: hovered === prompt ? group.bg : "rgba(255,255,255,0.025)",
                    border: `1px solid ${hovered === prompt ? group.border : "rgba(255,255,255,0.07)"}`,
                    color: hovered === prompt ? "var(--text-primary)" : "var(--text-secondary)",
                    boxShadow: hovered === prompt ? `0 0 18px ${group.bg}` : "none",
                    flex: "1 1 0",
                    minWidth: 0,
                  }}
                >
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {prompt}
                  </span>
                  <svg
                    aria-hidden="true"
                    width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0, opacity: hovered === prompt ? 1 : 0, color: group.color, transition: "opacity 0.15s" }}
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes welcome-ping {
          0%   { opacity: 0.6; transform: scale(1); }
          60%  { opacity: 0;   transform: scale(1.45); }
          100% { opacity: 0;   transform: scale(1.45); }
        }
      `}</style>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied!" : "Copy to clipboard"}
      title={copied ? "Copied!" : "Copy to clipboard"}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-all duration-150"
      style={{
        background: copied ? "rgba(0,229,160,0.1)" : "transparent",
        border: `1px solid ${copied ? "rgba(0,229,160,0.25)" : "transparent"}`,
        color: copied ? "var(--accent)" : "var(--text-muted)",
      }}
      onMouseEnter={(e) => {
        if (!copied) {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
        }
      }}
    >
      {copied ? (
        <>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

const statusCopy: Record<CommanderStatus, string> = {
  idle: "Ready when you are.",
  thinking: "Reviewing the mission and selecting the right specialists.",
  dispatching: "Assigning the next steps to the active team.",
  delegating: "The selected specialists are working on this mission.",
  monitoring: "Monitoring mission progress.",
  synthesizing: "Reviewing the work and preparing the final result.",
  complete: "Mission complete.",
  cancelled: "Mission cancelled.",
  error: "This mission needs attention.",
};

const statusColor: Record<CommanderStatus, string> = {
  idle: "var(--text-muted)",
  thinking: "var(--accent)",
  dispatching: "var(--accent)",
  delegating: "#3d9eff",
  monitoring: "#3d9eff",
  synthesizing: "var(--accent)",
  complete: "var(--accent)",
  cancelled: "var(--text-muted)",
  error: "#ff8a65",
};

export function MissionConversation() {
  const objective = useCommanderStore((state) => state.objective);
  const commanderName = useCommanderStore((state) => state.name);
  const status = useCommanderStore((state) => state.status);
  const thinking = useCommanderStore((state) => state.thinking);
  const missionId = useCommanderStore((state) => state.missionId);
  const error = useCommanderStore((state) => state.error);
  const runtimeMode = useCommanderStore((state) => state.runtimeMode);
  const finalResult = useCommanderStore((state) => state.finalResult);
  const chatHistory = useCommanderStore((state) => state.chatHistory);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [actionState, setActionState] = useState<"idle" | "cancelling" | "retrying">("idle");
  const busy = inFlight.includes(status);
  const activitySummary = thinking.join("").slice(-700);

  useMissionRealtime(missionId);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [error, finalResult, status, thinking.length]);

  async function cancel() {
    if (!missionId || actionState !== "idle") return;
    setActionState("cancelling");
    try {
      await cancelMission(missionId);
    } finally {
      setActionState("idle");
    }
  }

  async function retry() {
    if (!missionId || actionState !== "idle") return;
    setActionState("retrying");
    try {
      await retryMission(missionId);
    } finally {
      setActionState("idle");
    }
  }

  /* Welcome / idle state */
  if (!objective) {
    return (
      <section
        className="mx-auto flex min-h-full w-full max-w-3xl items-start px-5 py-10 sm:px-8"
        aria-labelledby="welcome-title"
        style={{ animation: "fadeSlideUp 0.4s ease both" }}
      >
        <div className="w-full space-y-6">
          {/* Hero card */}
          <div
            className="w-full rounded-3xl p-8 sm:p-10"
            style={{
              background: "rgba(4, 8, 5, 0.58)",
              border: "1px solid rgba(0,229,160,0.12)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            {/* Logo mark + pulse ring */}
            <div className="relative inline-flex">
              <div
                className="grid h-12 w-12 place-items-center rounded-2xl text-base font-bold text-black"
                style={{
                  background: "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)",
                  boxShadow: "0 0 28px rgba(0,229,160,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              >
                C
              </div>
              <span
                aria-hidden="true"
                className="absolute -inset-1 rounded-[18px]"
                style={{ border: "1px solid rgba(0,229,160,0.35)", animation: "welcome-ping 2.4s ease-in-out infinite" }}
              />
            </div>

            <p
              className="mt-7 text-[10px] font-semibold uppercase"
              style={{ color: "var(--accent)", letterSpacing: "0.2em", fontFamily: "var(--font-code)" }}
            >
              Mission Control - Ready
            </p>

            <h1
              id="welcome-title"
              className="mt-2 max-w-xl text-3xl font-bold sm:text-4xl"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.04em", fontFamily: "var(--font-brand)", lineHeight: 1.15 }}
            >
              Give the Commander<br />
              <span style={{ background: "linear-gradient(135deg, #00e5a0 0%, #3d9eff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                a mission.
              </span>
            </h1>

            <p className="mt-4 max-w-lg text-[15px] leading-7" style={{ color: "var(--text-secondary)" }}>
              One prompt. A team of specialists - Researcher, Writer, Critic, Formatter, Assembler - working in a real dependency pipeline to deliver a verified result.
            </p>

            {/* Capability pills */}
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { label: "Direct chat",   color: "rgba(0,229,160,0.08)",  border: "rgba(0,229,160,0.2)" },
                { label: "Markdown docs", color: "rgba(61,158,255,0.08)", border: "rgba(61,158,255,0.2)" },
                { label: "PPTX slides",   color: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.2)" },
                { label: "Web research",  color: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)" },
              ].map(({ label, color, border }) => (
                <span
                  key={label}
                  className="rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{ background: color, border: `1px solid ${border}`, color: "var(--text-secondary)" }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Seed prompt chips */}
          <WelcomeSeedChips />
        </div>
      </section>
    );
  }

  const configurationHint = runtimeMode === "unavailable"
    ? "Live AI is not configured or is unavailable for this deployment."
    : "You can retry the mission after checking the configuration or request details.";
  const needsConfiguration = runtimeMode === "unavailable" || /configur|api key|openai|groq/i.test(error ?? "");

  return (
    <section
      className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8"
      aria-label="Mission conversation"
      style={{ animation: "fadeSlideUp 0.3s ease both" }}
    >
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {commanderName}: {statusCopy[status]} {error ?? ""}
      </p>

      {/* Mission timeline */}
      <MissionTimeline />

      {/* Live multi-agent execution graph + ops console */}
      {status !== "idle" && <AgentGraph />}
      {status !== "idle" && <AgentConsole />}

      <ol className="space-y-6 mt-6" aria-label="Conversation messages">
        {chatHistory.map((turn) => {
          const isUser = turn.role === "user";
          const isJson = !isUser && turn.content.startsWith("{") && turn.content.includes("slides");

          if (isUser) {
            return (
              <li key={turn.id} className="flex items-start justify-end gap-3">
                <div
                  className="max-w-[85%] rounded-2xl rounded-tr-md px-4 py-3 text-[15px] leading-6"
                  style={{
                    background: "rgba(4, 12, 6, 0.82)",
                    border: "1px solid rgba(0,229,160,0.15)",
                    color: "var(--text-primary)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                  }}
                >
                  {turn.content}
                </div>
                <div
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid var(--border-mid)", color: "var(--text-secondary)" }}
                  aria-label="Your message"
                >
                  You
                </div>
              </li>
            );
          } else {
            // Auto-detect mission type badge from content
            const isSlides = isJson;
            const isResearch = !isJson && /\[.+?\]\(https?:\/\/.+?\)/.test(turn.content) && turn.content.split("http").length > 3;
            const isDocument = !isJson && !isResearch && turn.content.length > 400 && /^#{1,3}\s/m.test(turn.content);
            const typeBadge = isSlides
              ? { label: "Slides",   color: "#a855f7", bg: "rgba(168,85,247,0.1)",  border: "rgba(168,85,247,0.25)" }
              : isResearch
              ? { label: "Research", color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)" }
              : isDocument
              ? { label: "Document", color: "#3d9eff", bg: "rgba(61,158,255,0.1)",  border: "rgba(61,158,255,0.25)" }
              : { label: "Chat",     color: "#00e5a0", bg: "rgba(0,229,160,0.08)",  border: "rgba(0,229,160,0.2)"  };

            return (
              <li key={turn.id} className="flex items-start gap-3">
                <div
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-black"
                  style={{ background: "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)", boxShadow: "0 0 16px rgba(0,229,160,0.3)" }}
                  aria-hidden="true"
                >
                  C
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{commanderName}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                      style={{ background: typeBadge.bg, border: `1px solid ${typeBadge.border}`, color: typeBadge.color }}
                    >
                      {typeBadge.label}
                    </span>
                    <CopyButton text={isJson ? "(Presentation slide deck)" : turn.content} />
                  </div>

                  {isJson ? (
                    <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
                      (Presentation slide deck generated successfully. Review and download via the control deck below.)
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 14,
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                        "--md-text": "var(--text-primary)",
                        "--md-muted": "var(--text-secondary)",
                        "--md-accent": "var(--accent)",
                        "--md-border": "var(--border-dim)",
                        "--md-code-bg": "var(--bg-overlay)",
                      } as React.CSSProperties}
                    >
                      <SafeMarkdown content={turn.content} />
                    </div>
                  )}
                </div>
              </li>
            );
          }
        })}

        {/* Active thinking turn */}
        {chatHistory.length > 0 && chatHistory.at(-1)?.role === "user" && (
          <li className="flex items-start gap-3">
            <div
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-black"
              style={{ background: "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)", boxShadow: "0 0 16px rgba(0,229,160,0.3)" }}
              aria-hidden="true"
            >
              C
            </div>

            <article className="min-w-0 flex-1" aria-label={`${commanderName} status`}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{commanderName}</p>
                <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: statusColor[status] }}>
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: statusColor[status],
                      boxShadow: busy ? `0 0 6px ${statusColor[status]}` : "none",
                      animation: busy ? "pulse-dot 1.4s ease-in-out infinite" : "none",
                    }}
                    aria-hidden="true"
                  />
                  {status}
                </span>
              </div>
              <div className="mt-2">
                <TypingIndicator
                  label={
                    status === "thinking" ? "Planning mission..." :
                    status === "dispatching" ? "Dispatching to specialists..." :
                    status === "delegating" ? "Specialists are working..." :
                    status === "synthesizing" ? "Synthesizing results..." :
                    "Working..."
                  }
                />
              </div>

              {busy && missionId && (
                <button
                  type="button"
                  onClick={() => void cancel()}
                  disabled={actionState !== "idle"}
                  data-testid="cancel-mission"
                  className="mt-3 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 disabled:cursor-wait disabled:opacity-60"
                  style={{ border: "1px solid var(--border-mid)", color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,80,80,0.35)";
                    (e.currentTarget as HTMLButtonElement).style.color = "#ff8a65";
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,80,80,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-mid)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  {actionState === "cancelling" ? "Cancelling..." : "Cancel mission"}
                </button>
              )}

              {activitySummary && busy && (
                <details
                  className="mt-3 max-w-xl rounded-xl px-3 py-2.5 text-sm"
                  style={{ border: "1px solid var(--border-dim)", background: "rgba(255,255,255,0.025)", color: "var(--text-secondary)" }}
                >
                  <summary className="cursor-pointer select-none text-xs font-medium" style={{ color: "var(--text-secondary)", outline: "none" }}>
                    View activity summary
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5" style={{ color: "var(--text-muted)" }}>
                    {activitySummary}
                  </p>
                </details>
              )}
            </article>
          </li>
        )}
      </ol>

      {/* Error state */}
      {status === "error" && (
        <section
          className="mt-6 rounded-2xl p-4"
          role="alert"
          aria-label="Mission error"
          style={{ border: "1px solid rgba(255,138,101,0.25)", background: "rgba(255,138,101,0.05)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "#ffb39a" }}>
            The mission could not be completed
          </p>
          <p className="mt-1 text-sm leading-6" style={{ color: "rgba(255,179,154,0.75)" }}>
            {error || configurationHint}
          </p>
          {needsConfiguration && (
            <code
              className="mt-3 block rounded-lg px-3 py-2 text-xs"
              style={{ background: "rgba(0,0,0,0.3)", color: "#ffb39a", fontFamily: "var(--font-code)" }}
            >
              OPENAI_API_KEY=... or GROQ_API_KEY=...
            </code>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {missionId && (
              <button
                type="button"
                onClick={() => void retry()}
                disabled={actionState !== "idle"}
                data-testid="retry-mission"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 disabled:cursor-wait disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #00e5a0, #00c487)", color: "#060f0a" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(0,229,160,0.35)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
              >
                {actionState === "retrying" ? "Retrying..." : "Retry mission"}
              </button>
            )}
          </div>
        </section>
      )}

      <ResultPanel />
      <div ref={bottomRef} />
    </section>
  );
}
