"use client";

import { useEffect, useRef, useState } from "react";

import { cancelMission, retryMission } from "@/lib/agents/mission-client";
import { useMissionRealtime } from "@/lib/agents/use-mission-realtime";
import { useCommanderStore, type CommanderStatus } from "@/lib/store";

import { ResultPanel } from "./result-panel";

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

  if (!objective) {
    return (
      <section className="mx-auto flex min-h-full w-full max-w-3xl items-center px-5 py-10 sm:px-8" aria-labelledby="welcome-title">
        <div className="w-full rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_55%_0%,rgba(16,163,127,0.12),transparent_22rem),#222624] px-6 py-9 shadow-[0_18px_55px_rgba(0,0,0,0.16)] sm:px-10 sm:py-12">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#10a37f] text-base font-bold text-white shadow-[0_10px_24px_rgba(16,163,127,0.26)]">C</div>
          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#82dfc4]">Mission control</p>
          <h1 id="welcome-title" className="mt-2 max-w-xl text-3xl font-semibold tracking-[-0.045em] text-[#f3f7f5] sm:text-4xl">Give the Commander a mission.</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#bac5bf]">Ask a direct question, create a README, research with web access enabled, or prepare a presentation. ComradeIQ only shows work from the configured provider.</p>
          <div className="mt-8 grid gap-3 text-sm text-[#d7e1dc] sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"><p className="font-medium text-white">Ask</p><p className="mt-1 text-xs leading-5 text-[#aab5af]">Get a direct answer when a team is not needed.</p></div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"><p className="font-medium text-white">Create</p><p className="mt-1 text-xs leading-5 text-[#aab5af]">Turn a brief into a structured artifact.</p></div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"><p className="font-medium text-white">Coordinate</p><p className="mt-1 text-xs leading-5 text-[#aab5af]">Open Team Controls only when you want to tune specialists.</p></div>
          </div>
        </div>
      </section>
    );
  }

  const configurationHint = runtimeMode === "unavailable" ? "Live AI is not configured or is unavailable for this deployment." : "You can retry the mission after checking the configuration or request details.";
  const needsConfiguration = runtimeMode === "unavailable" || /configur|api key|openai/i.test(error ?? "");

  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8" aria-label="Mission conversation">
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{commanderName}: {statusCopy[status]} {error ?? ""}</p>
      <ol className="space-y-7" aria-label="Conversation messages">
        <li className="flex items-start justify-end gap-3">
          <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-[#363b39] px-4 py-3 text-[15px] leading-6 text-[#f5f7f6] shadow-sm">{objective}</div>
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#555d59] text-[10px] font-semibold text-white" aria-label="Your message">You</div>
        </li>
        <li className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#10a37f] text-xs font-semibold text-white" aria-hidden="true">C</div>
          <article className="min-w-0 flex-1" aria-label={`${commanderName} status`}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-sm font-semibold text-[#f1f5f3]">{commanderName}</p>
              <span className={`inline-flex items-center gap-1.5 text-xs ${status === "error" ? "text-amber-200" : "text-[#9ba7a1]"}`}><span className={`h-1.5 w-1.5 rounded-full ${busy ? "animate-pulse bg-[#78e0c1]" : status === "error" ? "bg-amber-300" : "bg-[#84908a]"}`} aria-hidden="true" />{status}</span>
            </div>
            <p className="mt-1 text-[15px] leading-6 text-[#d0dad5]">{statusCopy[status]}</p>
            {busy && missionId && <button type="button" onClick={() => void cancel()} disabled={actionState !== "idle"} data-testid="cancel-mission" className="mt-3 rounded-lg border border-white/[0.12] px-2.5 py-1.5 text-xs font-medium text-[#d6e1dc] transition hover:bg-white/[0.07] disabled:cursor-wait disabled:opacity-60">{actionState === "cancelling" ? "Cancelling…" : "Cancel mission"}</button>}
            {activitySummary && busy && <details className="mt-3 max-w-xl rounded-xl border border-white/[0.09] bg-white/[0.035] px-3 py-2.5 text-sm text-[#b9c4be]"><summary className="cursor-pointer select-none text-xs font-medium text-[#dce5e0]">View activity summary</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-5">{activitySummary}</p></details>}
          </article>
        </li>
      </ol>

      {status === "error" && (
        <section className="mt-6 rounded-2xl border border-amber-200/20 bg-amber-200/[0.06] p-4" role="alert" aria-label="Mission error">
          <p className="text-sm font-semibold text-amber-100">The mission could not be completed</p>
          <p className="mt-1 text-sm leading-6 text-amber-50/80">{error || configurationHint}</p>
          {needsConfiguration && <code className="mt-3 block rounded-lg bg-black/20 px-3 py-2 text-xs text-amber-50">OPENAI_API_KEY=…</code>}
          <div className="mt-3 flex flex-wrap gap-2">
            {missionId && <button type="button" onClick={() => void retry()} disabled={actionState !== "idle"} data-testid="retry-mission" className="rounded-lg bg-[#e7efe9] px-3 py-1.5 text-xs font-semibold text-[#173329] transition hover:bg-white disabled:cursor-wait disabled:opacity-60">{actionState === "retrying" ? "Retrying…" : "Retry mission"}</button>}
          </div>
        </section>
      )}
      <ResultPanel />
      <div ref={bottomRef} />
    </section>
  );
}
