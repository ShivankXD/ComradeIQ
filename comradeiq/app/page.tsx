"use client";

import { useState } from "react";

import { CommandInputBar } from "@/components/panels/CommandInputBar";
import { MissionActivityPanel } from "@/components/panels/MissionActivityPanel";
import { MissionConversation } from "@/components/panels/MissionConversation";
import { TeamMapDialog } from "@/components/panels/TeamMapDialog";
import { useMissionHistory } from "@/lib/history/use-mission-history";
import { cancelReplay, replayMission } from "@/lib/history/replay";
import { useCommanderStore, type CommanderStatus } from "@/lib/store";

const inFlight: CommanderStatus[] = ["thinking", "dispatching", "delegating", "synthesizing"];

export default function Home() {
  const commanderName = useCommanderStore((state) => state.name);
  const setCommanderName = useCommanderStore((state) => state.setCommanderName);
  const status = useCommanderStore((state) => state.status);
  const objective = useCommanderStore((state) => state.objective);
  const resetMissionView = useCommanderStore((state) => state.resetMissionView);
  const { missions } = useMissionHistory();
  const [activityOpen, setActivityOpen] = useState(false);
  const [teamMapOpen, setTeamMapOpen] = useState(false);
  const busy = inFlight.includes(status);

  function startNewMission() {
    if (busy) return;
    cancelReplay();
    resetMissionView();
    setActivityOpen(false);
  }

  return <main className="flex h-screen overflow-hidden bg-[#212121] text-[#ececec]">
    <aside className="hidden w-[252px] shrink-0 flex-col border-r border-white/[0.08] bg-[#171717] p-3 md:flex">
      <div className="flex items-center gap-2 px-2 py-2"><div className="grid h-7 w-7 place-items-center rounded-lg bg-[#10a37f] text-xs font-bold text-white">C</div><span className="text-sm font-semibold">ComradeIQ</span></div>
      <button type="button" onClick={startNewMission} disabled={busy} className="mt-5 flex items-center gap-2 rounded-lg border border-white/[0.12] px-3 py-2.5 text-left text-sm text-[#eeeeee] transition hover:bg-white/[0.07] disabled:opacity-40"><span className="text-lg leading-none">+</span> New mission</button>
      <p className="mt-6 px-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#85858e]">Recent</p>
      <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
        {missions.length ? missions.map((mission) => <button key={mission.id} type="button" disabled={busy} onClick={() => void replayMission(mission.id)} title={mission.missionText} className="w-full truncate rounded-lg px-3 py-2 text-left text-sm text-[#b9b9c1] transition hover:bg-white/[0.07] hover:text-white disabled:opacity-40">{mission.missionText}</button>) : <p className="px-3 py-2 text-xs leading-5 text-[#777780]">Your completed missions will appear here.</p>}
      </div>
      <div className="border-t border-white/[0.08] px-2 pt-4"><label className="text-[11px] text-[#8d8d96]" htmlFor="commander-name">Commander</label><input id="commander-name" value={commanderName} onChange={(event) => setCommanderName(event.target.value)} className="mt-1 w-full bg-transparent text-sm text-[#d8d8df] outline-none" /></div>
    </aside>

    <section className="flex min-w-0 flex-1 flex-col bg-[#212121]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] px-4 sm:px-6">
        <div className="flex items-center gap-2"><div className="grid h-7 w-7 place-items-center rounded-lg bg-[#10a37f] text-xs font-bold text-white md:hidden">C</div><span className="text-sm font-medium">{objective ? commanderName : "Give the Commander a mission"}</span>{objective && <span className="hidden text-xs text-[#8d8d96] sm:inline">· {status}</span>}</div>
        {objective && <button type="button" onClick={() => setActivityOpen(true)} className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs text-[#d8d8de] transition hover:bg-white/[0.07]">Activity</button>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto"><MissionConversation /></div>
      <div className="shrink-0 border-t border-white/[0.08] bg-[#212121] px-4 pb-4 pt-3"><CommandInputBar /></div>
    </section>

    {activityOpen && objective && <MissionActivityPanel onClose={() => setActivityOpen(false)} onOpenTeamMap={() => { setActivityOpen(false); setTeamMapOpen(true); }} />}
    <TeamMapDialog open={teamMapOpen} onClose={() => setTeamMapOpen(false)} />
  </main>;
}
