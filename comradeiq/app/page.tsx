"use client";

import { useRef, useState } from "react";

import { CommandInputBar } from "@/components/panels/CommandInputBar";
import { MissionActivityPanel } from "@/components/panels/MissionActivityPanel";
import { MissionConversation } from "@/components/panels/MissionConversation";
import { ProviderStatus } from "@/components/panels/ProviderStatus";
import { TeamMapDialog } from "@/components/panels/TeamMapDialog";
import { TeamStatus } from "@/components/panels/TeamStatus";
import { useModalDialog } from "@/components/panels/useModalDialog";
import { useMissionHistory } from "@/lib/history/use-mission-history";
import { cancelReplay, replayMission } from "@/lib/history/replay";
import { useCommanderStore, type CommanderStatus } from "@/lib/store";

const inFlight: CommanderStatus[] = ["thinking", "dispatching", "delegating", "monitoring", "synthesizing"];

export default function Home() {
  const commanderName = useCommanderStore((state) => state.name);
  const setCommanderName = useCommanderStore((state) => state.setCommanderName);
  const status = useCommanderStore((state) => state.status);
  const objective = useCommanderStore((state) => state.objective);
  const resetMissionView = useCommanderStore((state) => state.resetMissionView);
  const { missions } = useMissionHistory();
  const [activityOpen, setActivityOpen] = useState(false);
  const [teamMapOpen, setTeamMapOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const mobileNavCloseRef = useRef<HTMLButtonElement | null>(null);
  const busy = inFlight.includes(status);

  useModalDialog({ open: mobileNavOpen, dialogRef: mobileNavRef, initialFocusRef: mobileNavCloseRef, onClose: () => setMobileNavOpen(false) });

  function startNewMission() {
    if (busy) return;
    cancelReplay();
    resetMissionView();
    setActivityOpen(false);
    setMobileNavOpen(false);
  }

  function openTeamControls() {
    setActivityOpen(false);
    setTeamMapOpen(true);
  }

  function selectMission(missionId: string) {
    if (busy) return;
    setMobileNavOpen(false);
    void replayMission(missionId);
  }

  const navigation = (scope: "desktop" | "mobile") => (
    <>
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#10a37f] text-xs font-bold text-white shadow-[0_8px_18px_rgba(16,163,127,0.2)]">C</div>
        <div><p className="text-sm font-semibold tracking-[-0.02em] text-[#f0f5f2]">ComradeIQ</p><p className="text-[10px] text-[#8e9993]">AI mission control</p></div>
      </div>
      <button type="button" onClick={startNewMission} disabled={busy} data-testid={scope === "desktop" ? "new-mission" : "mobile-new-mission"} className="mt-5 flex items-center gap-2 rounded-xl border border-white/[0.13] bg-white/[0.025] px-3 py-2.5 text-left text-sm font-medium text-[#e3ebe7] transition hover:border-[#62d8b7]/50 hover:bg-[#10a37f]/[0.08] disabled:cursor-not-allowed disabled:opacity-45"><span className="text-lg leading-none" aria-hidden="true">+</span> New mission</button>
      <p className="mt-6 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8e9993]">Recent missions</p>
      <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
        {missions.length ? missions.map((mission) => <button key={mission.id} type="button" disabled={busy} onClick={() => selectMission(mission.id)} title={mission.missionText} className="w-full truncate rounded-lg px-3 py-2 text-left text-sm text-[#bdc7c1] transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">{mission.missionText}</button>) : <p className="px-3 py-2 text-xs leading-5 text-[#858f89]">Completed missions will appear here on this device.</p>}
      </div>
      <div className="mt-4 border-t border-white/[0.08] px-2 pt-4">
        <label className="text-[11px] text-[#a3ada7]" htmlFor={`commander-name-${scope}`}>Commander name</label>
        <input id={`commander-name-${scope}`} value={commanderName} onChange={(event) => setCommanderName(event.target.value)} className="mt-1 w-full rounded-md bg-transparent px-1 py-1 text-sm text-[#e2e9e5] outline-none placeholder:text-[#7c8780]" />
        <div className="mt-4"><ProviderStatus /></div>
      </div>
    </>
  );

  return (
    <main className="flex h-[100dvh] overflow-hidden bg-[#202422] text-[#edf2ef]">
      <aside className="hidden w-[264px] shrink-0 flex-col border-r border-white/[0.08] bg-[#171a19] p-3 md:flex" aria-label="Mission navigation">
        {navigation("desktop")}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-[#202422]">
        <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#202422]/95 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => setMobileNavOpen(true)} data-testid="mobile-menu" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#dce5e0] transition hover:bg-white/[0.08] md:hidden" aria-label="Open mission navigation" aria-expanded={mobileNavOpen} aria-controls="mobile-mission-navigation">
              <span className="flex w-4 flex-col gap-1" aria-hidden="true"><span className="h-px w-full bg-current" /><span className="h-px w-full bg-current" /><span className="h-px w-full bg-current" /></span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#eef4f1]">{objective || "New mission"}</p>
              {objective && <p className="hidden truncate text-[11px] text-[#98a39d] sm:block">Commander status: {status}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {objective && <button type="button" onClick={() => setActivityOpen(true)} data-testid="mission-activity" className="inline-flex rounded-lg border border-white/[0.1] px-2.5 py-1.5 text-xs font-medium text-[#dce5df] transition hover:bg-white/[0.07]" aria-haspopup="dialog">Activity</button>}
            <TeamStatus onOpenTeamControls={openTeamControls} />
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto"><MissionConversation /></div>
        <div className="shrink-0 border-t border-white/[0.08] bg-[#202422] px-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-3 sm:px-5"><CommandInputBar /></div>
      </section>

      {mobileNavOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileNavOpen(false); }}>
        <aside ref={mobileNavRef} id="mobile-mission-navigation" role="dialog" aria-modal="true" aria-label="Mission navigation" tabIndex={-1} className="flex h-[100dvh] w-[min(85vw,320px)] flex-col border-r border-white/[0.1] bg-[#171a19] p-3 shadow-2xl">
          <div className="flex justify-end"><button ref={mobileNavCloseRef} type="button" onClick={() => setMobileNavOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-lg leading-none text-[#dce5df] transition hover:bg-white/[0.08]" aria-label="Close mission navigation"><span aria-hidden="true">×</span></button></div>
          {navigation("mobile")}
        </aside>
      </div>}

      {activityOpen && objective && <MissionActivityPanel onClose={() => setActivityOpen(false)} onOpenTeamMap={openTeamControls} />}
      <TeamMapDialog open={teamMapOpen} onClose={() => setTeamMapOpen(false)} />
    </main>
  );
}
