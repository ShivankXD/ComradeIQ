"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, KeyboardEvent, useState } from "react";

import { launchMission } from "@/lib/agents/mission-client";
import { useCommanderStore, type CommanderStatus } from "@/lib/store";

const IN_FLIGHT: CommanderStatus[] = ["thinking", "dispatching", "delegating", "synthesizing"];

// The stored designation already carries the "Commander" title (e.g. "Commander
// Atlas"), so it is interpolated as-is rather than re-prefixed.
function statusLabel(status: CommanderStatus, commanderName: string) {
  switch (status) {
    case "thinking": return `Mission in progress — ${commanderName} is analyzing the objective…`;
    case "dispatching": return `Mission in progress — ${commanderName} is dispatching…`;
    case "delegating": return `Mission in progress — Comrades are executing their orders…`;
    case "synthesizing": return `Mission in progress — ${commanderName} is synthesizing the deck…`;
    case "complete": return "Mission complete — results are on the topology canvas.";
    case "error": return "Mission failed — see the Commander node for the error state.";
    default: return null;
  }
}

/**
 * Zone B. One-way mission issuing only: submitted text clears immediately and
 * every response surfaces in the Zone A topology. Nothing the agents produce is
 * ever rendered here.
 */
export function CommandInputBar() {
  const commanderName = useCommanderStore((state) => state.name);
  const missionType = useCommanderStore((state) => state.missionType);
  const status = useCommanderStore((state) => state.status);
  const missionId = useCommanderStore((state) => state.missionId);
  const missionHistory = useCommanderStore((state) => state.missionHistory);
  const recordMission = useCommanderStore((state) => state.recordMission);
  const setObjective = useCommanderStore((state) => state.setObjective);
  const setMissionId = useCommanderStore((state) => state.setMissionId);
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  const busy = IN_FLIGHT.includes(status);
  const inlineStatus = statusLabel(status, commanderName);

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const mission = draft.trim();
    if (!mission || busy) return;

    setDraft("");
    try {
      await launchMission(commanderName, mission, missionType);
    } catch (error) {
      console.error("Mission launch failed", error);
    } finally {
      // launchMission assigns the id before dispatching, so a failed mission is
      // still chipped — the topology keeps its error state for inspection.
      const launchedId = useCommanderStore.getState().missionId;
      if (launchedId) recordMission({ id: launchedId, objective: mission, at: Date.now() });
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  function replayMission(id: string, objective: string) {
    setMissionId(id);
    setObjective(objective);
  }

  return (
    <div className="relative flex h-full flex-col justify-center px-4 pb-3 pt-2">
      <div className="mx-auto w-full max-w-3xl">
        {missionHistory.length > 0 && (
          <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="shrink-0 font-mono text-[9px] tracking-[0.18em] text-slate-500">PAST MISSIONS</span>
            {missionHistory.map((past) => (
              <button
                key={past.id}
                type="button"
                onClick={() => replayMission(past.id, past.objective)}
                title={past.objective}
                className={`shrink-0 truncate rounded-full border px-3 py-1 font-mono text-[9px] tracking-[0.08em] transition ${
                  past.id === missionId
                    ? "border-[#ff2d2d]/50 bg-[#ff2d2d]/10 text-red-100"
                    : "border-slate-400/20 bg-black/30 text-slate-400 hover:border-[#2d6bff]/40 hover:text-blue-200"
                }`}
                style={{ maxWidth: "13rem" }}
              >
                {past.objective}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div
            className={`flex items-end gap-2 rounded-3xl border bg-[#0b0f14]/90 px-4 py-2.5 backdrop-blur-sm transition duration-300 ${
              focused
                ? "border-[#ff2d2d]/60 shadow-[0_0_22px_rgba(255,45,45,0.22),inset_0_0_16px_rgba(255,45,45,0.05)]"
                : "border-[#2d6bff]/25 shadow-[0_0_18px_rgba(45,107,255,0.10)]"
            }`}
          >
            <span className={`mb-2 h-2 w-2 shrink-0 rounded-full transition ${busy ? "animate-pulse bg-[#ff2d2d] shadow-[0_0_8px_rgba(255,45,45,0.9)]" : "bg-[#2d6bff]/70"}`} />
            <label className="sr-only" htmlFor="mission-input">Mission objective</label>
            <textarea
              id="mission-input"
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={busy}
              placeholder={busy ? `${commanderName} is executing the current mission…` : `Issue a mission to ${commanderName}…`}
              className="max-h-20 min-h-9 w-full resize-none bg-transparent py-1.5 font-mono text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!draft.trim() || busy}
              aria-label="Dispatch mission"
              className="mb-0.5 shrink-0 rounded-full border border-[#ff2d2d]/50 bg-[#ff2d2d]/10 px-3.5 py-1.5 font-mono text-[10px] tracking-[0.12em] text-red-100 transition hover:bg-[#ff2d2d]/25 disabled:cursor-not-allowed disabled:border-slate-500/25 disabled:bg-transparent disabled:text-slate-600"
            >
              SEND →
            </button>
          </div>
        </form>

        <div className="mt-2 h-4 text-center">
          <AnimatePresence mode="wait">
            {inlineStatus && (
              <motion.p
                key={status}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`font-mono text-[9px] tracking-[0.14em] ${status === "error" ? "text-rose-300/80" : "text-slate-500"}`}
              >
                {inlineStatus}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
