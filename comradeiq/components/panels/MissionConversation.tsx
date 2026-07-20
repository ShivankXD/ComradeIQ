"use client";

import { useEffect, useRef, useState } from "react";

import { cancelMission, retryMission } from "@/lib/agents/mission-client";
import { useMissionRealtime } from "@/lib/agents/use-mission-realtime";
import { useCommanderStore, type CommanderStatus } from "@/lib/store";

import { MissionTimeline } from "./MissionTimeline";
import { ResultPanel } from "./result-panel";
import { TypingIndicator } from "./TypingIndicator";

const inFlight: CommanderStatus[] = ["thinking", "dispatching", "delegating", "synthesizing"];
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

  /* ── Welcome / idle state ─────────────────────────── */
  if (!objective) {
    return (
      <section
        className="mx-auto flex min-h-full w-full max-w-3xl items-center px-5 py-10 sm:px-8"
        aria-labelledby="welcome-title"
        style={{ animation: "fadeSlideUp 0.4s ease both" }}
      >
        <div
          className="w-full rounded-3xl p-8 sm:p-12"
          style={{
            background: "rgba(4, 8, 5, 0.58)",
            border: "1px solid rgba(0,229,160,0.12)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {/* Logo mark */}
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-base font-bold text-black"
            style={{
              background: "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)",
              boxShadow: "0 0 28px rgba(0,229,160,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
          >
            C
          </div>

          <p
            className="mt-8 text-[10px] font-semibold uppercase"
            style={{ color: "var(--accent)", letterSpacing: "0.2em", fontFamily: "var(--font-code)" }}
          >
            Mission Control
          </p>

          <h1
            id="welcome-title"
            className="mt-2 max-w-xl text-3xl font-bold sm:text-4xl"
            style={{
              color: "var(--text-primary)",
              letterSpacing: "-0.04em",
              fontFamily: "var(--font-brand)",
              lineHeight: 1.15,
            }}
          >
            Give the Commander<br />a mission.
          </h1>

          <p className="mt-4 max-w-lg text-[15px] leading-7" style={{ color: "var(--text-secondary)" }}>
            Ask a direct question, create a README, research with web access enabled, or prepare a presentation. ComradeIQ only shows work from the configured provider.
          </p>

          {/* Capability cards */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { title: "Ask", desc: "Get a direct answer when a team is not needed." },
              { title: "Create", desc: "Turn a brief into a structured artifact." },
              { title: "Coordinate", desc: "Open Team Controls to tune specialists." },
            ].map(({ title, desc }) => (
              <div
                key={title}
                className="rounded-2xl p-4 transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid var(--border-dim)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,229,160,0.15)";
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(0,229,160,0.04)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-dim)";
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.025)";
                }}
              >
                <p className="font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{title}</p>
                <p className="mt-1.5 text-xs leading-5" style={{ color: "var(--text-muted)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const configurationHint = runtimeMode === "unavailable"
    ? "Live AI is not configured or is unavailable for this deployment."
    : "You can retry the mission after checking the configuration or request details.";
  const needsConfiguration = runtimeMode === "unavailable" || /configur|api key|openai/i.test(error ?? "");

  return (
    <section
      className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8"
      aria-label="Mission conversation"
      style={{ animation: "fadeSlideUp 0.3s ease both" }}
    >
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {commanderName}: {statusCopy[status]} {error ?? ""}
      </p>

      {/* ── Mission timeline ── */}
      <MissionTimeline />

      <ol className="space-y-6 mt-6" aria-label="Conversation messages">
        {/* User message */}
        <li className="flex items-start justify-end gap-3">
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
            {objective}
          </div>
          <div
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid var(--border-mid)",
              color: "var(--text-secondary)",
            }}
            aria-label="Your message"
          >
            You
          </div>
        </li>

        {/* Commander response */}
        <li className="flex items-start gap-3">
          <div
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-black"
            style={{
              background: "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)",
              boxShadow: "0 0 16px rgba(0,229,160,0.3)",
            }}
            aria-hidden="true"
          >
            C
          </div>

          <article className="min-w-0 flex-1" aria-label={`${commanderName} status`}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
              >
                {commanderName}
              </p>
              <span
                className="inline-flex items-center gap-1.5 text-xs"
                style={{ color: statusColor[status] }}
              >
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

            {/* Typing indicator while busy, static copy otherwise */}
            {busy ? (
              <div className="mt-2">
                <TypingIndicator
                  label={
                    status === "thinking" ? "Planning mission…" :
                    status === "dispatching" ? "Dispatching to specialists…" :
                    status === "delegating" ? "Specialists are working…" :
                    status === "synthesizing" ? "Synthesizing results…" :
                    "Working…"
                  }
                />
              </div>
            ) : (
              <p
                className="mt-1.5 text-[15px] leading-6"
                style={{ color: "var(--text-secondary)" }}
              >
                {statusCopy[status]}
              </p>
            )}

            {busy && missionId && (
              <button
                type="button"
                onClick={() => void cancel()}
                disabled={actionState !== "idle"}
                data-testid="cancel-mission"
                className="mt-3 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 disabled:cursor-wait disabled:opacity-60"
                style={{
                  border: "1px solid var(--border-mid)",
                  color: "var(--text-secondary)",
                }}
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
                {actionState === "cancelling" ? "Cancelling…" : "Cancel mission"}
              </button>
            )}

            {activitySummary && busy && (
              <details
                className="mt-3 max-w-xl rounded-xl px-3 py-2.5 text-sm"
                style={{
                  border: "1px solid var(--border-dim)",
                  background: "rgba(255,255,255,0.025)",
                  color: "var(--text-secondary)",
                }}
              >
                <summary
                  className="cursor-pointer select-none text-xs font-medium"
                  style={{ color: "var(--text-secondary)", outline: "none" }}
                >
                  View activity summary
                </summary>
                <p
                  className="mt-2 whitespace-pre-wrap text-xs leading-5"
                  style={{ color: "var(--text-muted)" }}
                >
                  {activitySummary}
                </p>
              </details>
            )}
          </article>
        </li>
      </ol>

      {/* Error state */}
      {status === "error" && (
        <section
          className="mt-6 rounded-2xl p-4"
          role="alert"
          aria-label="Mission error"
          style={{
            border: "1px solid rgba(255,138,101,0.25)",
            background: "rgba(255,138,101,0.05)",
          }}
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
              style={{
                background: "rgba(0,0,0,0.3)",
                color: "#ffb39a",
                fontFamily: "var(--font-code)",
              }}
            >
              OPENAI_API_KEY=…
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
                style={{
                  background: "linear-gradient(135deg, #00e5a0, #00c487)",
                  color: "#060f0a",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(0,229,160,0.35)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                }}
              >
                {actionState === "retrying" ? "Retrying…" : "Retry mission"}
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
