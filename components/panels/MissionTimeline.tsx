"use client";

import { useMemo } from "react";
import { useCommanderStore, type CommanderStatus } from "@/lib/store";

type Phase = {
  id: CommanderStatus;
  label: string;
  description: string;
};

const PHASES: Phase[] = [
  { id: "thinking",    label: "Planning",     description: "Selecting specialists" },
  { id: "dispatching", label: "Dispatching",  description: "Assigning tasks" },
  { id: "delegating",  label: "Executing",    description: "Specialists working" },
  { id: "synthesizing",label: "Synthesizing", description: "Reviewing results" },
  { id: "complete",    label: "Complete",     description: "Mission accomplished" },
];

const STATUS_ORDER: CommanderStatus[] = [
  "thinking", "dispatching", "delegating", "monitoring", "synthesizing", "complete",
];

function getPhaseIndex(status: CommanderStatus): number {
  const idx = STATUS_ORDER.indexOf(status);
  // monitoring maps to delegating visually
  if (idx === -1) return -1;
  if (status === "monitoring") return 2;
  const phaseIds = PHASES.map((p) => p.id);
  return phaseIds.indexOf(status);
}

export function MissionTimeline() {
  const status = useCommanderStore((state) => state.status);
  const comrades = useCommanderStore((state) => state.comrades);
  const thinking = useCommanderStore((state) => state.thinking);

  const activePhaseIndex = getPhaseIndex(status);
  const isActive = activePhaseIndex >= 0;
  const isError = status === "error";
  const isCancelled = status === "cancelled";
  const isDone = status === "complete";

  const activeComrades = useMemo(
    () => Object.values(comrades).filter((c) => c.connected && (c.status === "working" || c.status === "thinking" || c.status === "done")),
    [comrades]
  );

  if (!isActive && !isError && !isCancelled && !isDone) return null;

  return (
    <div
      className="mt-6 rounded-2xl overflow-hidden"
      style={{
        border: "1px solid var(--border-dim)",
        background: "var(--bg-surface)",
      }}
    >
      {/* Timeline header */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-dim)" }}
      >
        <p
          className="text-[9px] font-semibold uppercase"
          style={{ color: "var(--text-muted)", letterSpacing: "0.2em", fontFamily: "var(--font-code)" }}
        >
          Mission timeline
        </p>
        {(isError || isCancelled) && (
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase"
            style={{
              background: isError ? "rgba(255,138,101,0.1)" : "rgba(150,150,150,0.1)",
              border: `1px solid ${isError ? "rgba(255,138,101,0.3)" : "rgba(150,150,150,0.2)"}`,
              color: isError ? "#ff8a65" : "var(--text-muted)",
              fontFamily: "var(--font-code)",
              letterSpacing: "0.1em",
            }}
          >
            {isError ? "Failed" : "Cancelled"}
          </span>
        )}
      </div>

      {/* Steps */}
      <div className="flex items-start gap-0 overflow-x-auto px-4 py-4">
        {PHASES.map((phase, i) => {
          const isCompleted = isDone ? true : (activePhaseIndex > i);
          const isCurrent = activePhaseIndex === i && !isDone && !isError && !isCancelled;

          return (
            <div key={phase.id} className="flex items-start gap-0 min-w-0">
              {/* Step node */}
              <div className="flex flex-col items-center" style={{ minWidth: 68 }}>
                {/* Circle */}
                <div
                  className="relative grid h-8 w-8 place-items-center rounded-full transition-all duration-500"
                  style={
                    isCompleted
                      ? {
                          background: "rgba(0,229,160,0.15)",
                          border: "1.5px solid rgba(0,229,160,0.5)",
                          boxShadow: "0 0 10px rgba(0,229,160,0.2)",
                        }
                      : isCurrent
                        ? {
                            background: "rgba(0,229,160,0.08)",
                            border: "1.5px solid rgba(0,229,160,0.8)",
                            boxShadow: "0 0 16px rgba(0,229,160,0.35)",
                          }
                        : {
                            background: "rgba(255,255,255,0.03)",
                            border: "1.5px solid var(--border-dim)",
                          }
                  }
                >
                  {isCompleted ? (
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2.5 6.5L5.5 9.5L10.5 3.5" stroke="#00e5a0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : isCurrent ? (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: "var(--accent)",
                        boxShadow: "0 0 8px rgba(0,229,160,0.9)",
                        animation: "pulse-dot 1.2s ease-in-out infinite",
                      }}
                    />
                  ) : (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: "var(--border-mid)" }}
                    />
                  )}
                </div>

                {/* Label */}
                <p
                  className="mt-2 text-center text-[10px] font-semibold"
                  style={{
                    color: isCompleted || isCurrent ? "var(--text-primary)" : "var(--text-muted)",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.3,
                  }}
                >
                  {phase.label}
                </p>
                <p
                  className="mt-0.5 text-center text-[9px] leading-tight"
                  style={{
                    color: isCurrent ? "var(--accent)" : "var(--text-muted)",
                    fontFamily: "var(--font-code)",
                    maxWidth: 60,
                  }}
                >
                  {phase.description}
                </p>
              </div>

              {/* Connector line */}
              {i < PHASES.length - 1 && (
                <div
                  className="mt-4 h-px flex-1 shrink-0 transition-all duration-700"
                  style={{
                    minWidth: 24,
                    background: isCompleted
                      ? "linear-gradient(90deg, rgba(0,229,160,0.5), rgba(0,229,160,0.2))"
                      : "var(--border-dim)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Active comrades strip */}
      {activeComrades.length > 0 && (
        <div
          className="flex flex-wrap gap-2 px-4 pb-4"
          style={{ borderTop: "1px solid var(--border-dim)", paddingTop: "12px" }}
        >
          <p
            className="w-full text-[9px] font-semibold uppercase mb-1"
            style={{ color: "var(--text-muted)", letterSpacing: "0.18em", fontFamily: "var(--font-code)" }}
          >
            Active specialists
          </p>
          {activeComrades.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs"
              style={{
                background: c.status === "working" || c.status === "thinking"
                  ? "rgba(0,229,160,0.06)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${c.status === "working" || c.status === "thinking" ? "rgba(0,229,160,0.2)" : "var(--border-dim)"}`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{
                  background: c.status === "done" ? "#a0f0d0" : "var(--accent)",
                  boxShadow: c.status !== "done" ? "0 0 5px rgba(0,229,160,0.8)" : "none",
                  animation: c.status !== "done" ? "pulse-dot 1.2s ease-in-out infinite" : "none",
                }}
              />
              <span
                className="font-medium capitalize"
                style={{ color: "var(--text-primary)" }}
              >
                {c.name.charAt(0) + c.name.slice(1).toLowerCase()}
              </span>
              <span
                style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)", fontSize: 10 }}
              >
                {c.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Latest thinking */}
      {thinking.length > 0 && status !== "complete" && (
        <div
          className="px-4 pb-4"
          style={{ borderTop: activeComrades.length > 0 ? "none" : "1px solid var(--border-dim)", paddingTop: activeComrades.length > 0 ? 0 : 12 }}
        >
          <p
            className="truncate text-[11px] leading-5 italic"
            style={{ color: "var(--text-muted)" }}
          >
            {thinking.at(-1)?.slice(0, 120)}…
          </p>
        </div>
      )}
    </div>
  );
}
