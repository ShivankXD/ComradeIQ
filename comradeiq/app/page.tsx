"use client";

import { CommandInputBar } from "@/components/panels/CommandInputBar";
import { MissionActivityPanel } from "@/components/panels/MissionActivityPanel";
import { MissionConversation } from "@/components/panels/MissionConversation";
import { TeamMapDialog } from "@/components/panels/TeamMapDialog";
import { useMissionHistory } from "@/lib/history/use-mission-history";
import { cancelReplay, replayMission } from "@/lib/history/replay";
import { useCommanderStore, type CommanderStatus } from "@/lib/store";
import { useState } from "react";

const inFlight: CommanderStatus[] = ["thinking", "dispatching", "delegating", "synthesizing"];

export default function Home() {
  const commanderName = useCommanderStore((state) => state.name);
  const setCommanderName = useCommanderStore((state) => state.setCommanderName);
  const status = useCommanderStore((state) => state.status);
  const objective = useCommanderStore((state) => state.objective);
  const resetMissionView = useCommanderStore((state) => state.resetMissionView);
  const { missions } = useMissionHistory();
  const busy = inFlight.includes(status);
  const [teamMapOpen, setTeamMapOpen] = useState(false);

  function startNewChat() {
    if (busy) return;
    cancelReplay();
    resetMissionView();
  }

  return (
    <main className="flex h-screen overflow-hidden bg-[#1d1f1f] text-[#ececec]">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.08] bg-[#151717] p-3 md:flex">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#10a37f] text-xs font-bold text-white">C</div>
          <span className="text-sm font-semibold tracking-tight">ComradeIQ</span>
        </div>
        <button type="button" onClick={startNewChat} disabled={busy} className="mt-4 flex items-center gap-2 rounded-lg border border-white/[0.12] px-3 py-2.5 text-left text-sm text-[#ececec] transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40">
          <span className="text-lg leading-none">+</span> New mission
        </button>
        <p className="mt-6 px-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#7c7c86]">Recent</p>
        <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
          {missions.length ? missions.map((mission) => (
            <button key={mission.id} type="button" disabled={busy} onClick={() => void replayMission(mission.id)} title={mission.missionText} className="w-full truncate rounded-lg px-3 py-2 text-left text-sm text-[#b7b7bf] transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
              {mission.missionText}
            </button>
          )) : <p className="px-3 py-2 text-xs leading-5 text-[#73737d]">Your completed missions will appear here.</p>}
        </div>
        <div className="border-t border-white/[0.08] px-2 pt-4">
          <label className="text-[11px] text-[#888891]" htmlFor="commander-name">Commander</label>
          <input id="commander-name" value={commanderName} onChange={(event) => setCommanderName(event.target.value)} className="mt-1 w-full bg-transparent text-sm text-[#d9d9df] outline-none placeholder:text-[#666]" />
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-[#1d1f1f]">
        <header className="flex h-14 shrink-0 items-center border-b border-white/[0.08] px-4 md:hidden">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#10a37f] text-xs font-bold text-white">C</div>
          <span className="ml-2 text-sm font-semibold">ComradeIQ</span>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto"><MissionConversation /></div>
        <div className="shrink-0 border-t border-white/[0.08] bg-[#1d1f1f] px-4 pb-4 pt-3"><CommandInputBar /></div>
      </section>

      {objective && <div className="hidden w-80 shrink-0 xl:block"><MissionActivityPanel onOpenTeamMap={() => setTeamMapOpen(true)} /></div>}
      <TeamMapDialog open={teamMapOpen} onClose={() => setTeamMapOpen(false)} />
    </main>
  );
}
