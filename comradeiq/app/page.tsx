"use client";

import { CommanderGraph } from "@/components/graph/CommanderGraph";
import { CommandInputBar } from "@/components/panels/CommandInputBar";
import { ResultPanel } from "@/components/panels/result-panel";
import { useCommanderStore } from "@/lib/store";

export default function Home() {
  const isMissionActive = useCommanderStore((state) => state.isMissionActive);
  const commanderName = useCommanderStore((state) => state.name);
  const setCommanderName = useCommanderStore((state) => state.setCommanderName);
  const replayMissionId = useCommanderStore((state) => state.replayMissionId);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#0a0a0a]">
      {/* Slim command strip — one bar so the canvas keeps the height. */}
      <header className="flex h-9 shrink-0 items-center justify-between gap-4 border-b border-red-400/20 bg-black/40 px-4 font-mono">
        <div className="flex items-baseline gap-3 overflow-hidden">
          <p className="shrink-0 text-[10px] tracking-[0.28em] text-red-300/70">COMRADEIQ // AI COMMAND CENTER</p>
          <span className="shrink-0 text-slate-700">|</span>
          <p className="shrink-0 text-[10px] tracking-[0.16em] text-slate-300">{isMissionActive ? "MISSION TOPOLOGY" : "MISSION SETUP"}</p>
          {replayMissionId && (
            <span
              data-replay-badge
              className="shrink-0 rounded-sm border border-amber-300/50 bg-amber-300/10 px-1.5 py-0.5 text-[9px] tracking-[0.18em] text-amber-200"
            >
              ▶ REPLAY
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <label className="sr-only" htmlFor="commander-name">Commander designation</label>
          <input
            id="commander-name"
            value={commanderName}
            onChange={(event) => setCommanderName(event.target.value)}
            spellCheck={false}
            autoComplete="off"
            className="w-40 border-b border-transparent bg-transparent text-right text-[10px] tracking-[0.16em] text-slate-300 outline-none transition hover:border-blue-300/25 focus:border-red-300/60 focus:text-red-100"
          />
          <p className="hidden text-[10px] tracking-[0.16em] text-blue-200/60 sm:block">{isMissionActive ? "NETWORK / ACTIVE" : "NETWORK / STANDBY"}</p>
        </div>
      </header>

      {/* ZONE A — topology canvas. All mission output surfaces here. */}
      <section className="zone-grid relative min-h-0 flex-[8] overflow-hidden">
        <CommanderGraph />
        {/* Sits clear of the BusTray, which occupies the bottom 44px of this zone. */}
        <div className="pointer-events-none absolute bottom-14 right-3 z-20 w-[min(24rem,42vw)]">
          <div className="pointer-events-auto max-h-[38vh] overflow-auto">
            <ResultPanel />
          </div>
        </div>
      </section>

      {/* ZONE B — one-way mission input. Never renders agent output. */}
      <section className="relative min-h-[120px] flex-[2] shrink-0 overflow-hidden border-t border-[#2d6bff]/20">
        <div className="zone-grid zone-grid-dim pointer-events-none absolute inset-0" />
        <div className="relative h-full">
          <CommandInputBar />
        </div>
      </section>
    </main>
  );
}
