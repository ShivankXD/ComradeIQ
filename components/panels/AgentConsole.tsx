"use client";

import { useEffect, useMemo, useRef } from "react";

import { useCommanderStore, type BusMessage, type CommanderStatus } from "@/lib/store";

/**
 * Live agent console — a terminal-styled, real-time log of the ACTUAL mission
 * orchestration events (dispatch, per-agent status, synthesis, completion) that
 * the backend emits over SSE. It is a faithful ops view of the pipeline rendered
 * in a command-line aesthetic, not a real shell and not simulated output.
 */

type Tone = "prompt" | "accent" | "thinking" | "working" | "done" | "muted" | "error" | "ok";

interface ConsoleLine {
  key: string;
  prefix: string;
  text: string;
  tone: Tone;
}

const toneColor: Record<Tone, string> = {
  prompt: "#00e5a0",
  accent: "#3d9eff",
  thinking: "#fbbf24",
  working: "#00e5a0",
  done: "#a0f0d0",
  muted: "var(--text-muted)",
  error: "#ff8a65",
  ok: "#00e5a0",
};

function statusWord(content: string): { word: string; tone: Tone } {
  if (/\bthinking\b/i.test(content)) return { word: "thinking", tone: "thinking" };
  if (/\bworking\b/i.test(content)) return { word: "working", tone: "working" };
  if (/\bdone\b/i.test(content)) return { word: "done", tone: "done" };
  return { word: "update", tone: "muted" };
}

function lineFor(message: BusMessage): ConsoleLine {
  const base = { key: message.id };
  switch (message.kind) {
    case "mission":
      return { ...base, prefix: "⟩", text: `dispatch --agent ${message.to}`, tone: "accent" };
    case "status": {
      const { word, tone } = statusWord(message.content);
      return { ...base, prefix: `[${message.from}]`, text: word, tone };
    }
    case "result":
      return { ...base, prefix: "⟩", text: message.content, tone: "ok" };
    case "conflict":
      return { ...base, prefix: "!", text: message.content, tone: "error" };
    default:
      return { ...base, prefix: "#", text: message.content, tone: "muted" };
  }
}

const busyStatuses: CommanderStatus[] = ["thinking", "dispatching", "delegating", "monitoring", "synthesizing"];

const phaseLine: Partial<Record<CommanderStatus, string>> = {
  thinking: "commander: planning mission",
  dispatching: "commander: assigning specialists",
  delegating: "commander: specialists executing",
  synthesizing: "commander: synthesizing deliverable",
};

export function AgentConsole() {
  const objective = useCommanderStore((state) => state.objective);
  const status = useCommanderStore((state) => state.status);
  const messages = useCommanderStore((state) => state.busMessages);
  const scrollRef = useRef<HTMLDivElement>(null);

  const busy = busyStatuses.includes(status);

  const lines = useMemo<ConsoleLine[]>(() => {
    const out: ConsoleLine[] = [];
    out.push({
      key: "boot",
      prefix: "commander@comradeiq:~$",
      text: `mission run --objective "${(objective || "…").slice(0, 60)}${objective.length > 60 ? "…" : ""}"`,
      tone: "prompt",
    });
    for (const message of messages) out.push(lineFor(message));
    const phase = phaseLine[status];
    if (busy && phase) out.push({ key: `phase-${status}`, prefix: "…", text: phase, tone: "muted" });
    if (status === "complete") out.push({ key: "complete", prefix: "✓", text: "mission complete", tone: "ok" });
    if (status === "error") out.push({ key: "failed", prefix: "✗", text: "mission failed", tone: "error" });
    if (status === "cancelled") out.push({ key: "cancelled", prefix: "✗", text: "mission cancelled", tone: "muted" });
    return out;
  }, [objective, messages, status, busy]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div
      className="mt-4 rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(0,229,160,0.14)", background: "rgba(2, 6, 4, 0.92)" }}
      aria-label="Live agent console"
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid rgba(0,229,160,0.1)", background: "rgba(0,0,0,0.35)" }}>
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f56" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ffbd2e" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#27c93f" }} />
        </span>
        <p className="ml-1 text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.16em", fontFamily: "var(--font-code)" }}>
          agent-console — mission ops
        </p>
        <span className="ml-auto flex items-center gap-1.5 text-[9px]" style={{ color: busy ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-code)" }}>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: busy ? "var(--accent)" : "var(--text-muted)",
              boxShadow: busy ? "0 0 6px var(--accent)" : "none",
              animation: busy ? "pulse-dot 1.2s ease-in-out infinite" : "none",
            }}
            aria-hidden="true"
          />
          {busy ? "LIVE" : "IDLE"}
        </span>
      </div>

      {/* Terminal body */}
      <div
        ref={scrollRef}
        className="px-4 py-3 overflow-y-auto"
        style={{ maxHeight: 210, fontFamily: "var(--font-code)", fontSize: 11.5, lineHeight: 1.7 }}
      >
        {lines.map((line) => (
          <div key={line.key} className="flex gap-2" style={{ animation: "fadeSlideUp 0.25s ease both" }}>
            <span style={{ color: toneColor[line.tone], flexShrink: 0, opacity: line.tone === "muted" ? 0.7 : 1 }}>{line.prefix}</span>
            <span style={{ color: line.tone === "prompt" ? "var(--text-primary)" : toneColor[line.tone], wordBreak: "break-word" }}>{line.text}</span>
          </div>
        ))}
        {/* Blinking cursor while the mission is live */}
        {busy && (
          <div className="flex gap-2">
            <span style={{ color: "#00e5a0" }}>❯</span>
            <span
              aria-hidden="true"
              style={{ display: "inline-block", width: 7, height: 14, background: "#00e5a0", animation: "consoleBlink 1s step-end infinite" }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes consoleBlink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }
      `}</style>
    </div>
  );
}
