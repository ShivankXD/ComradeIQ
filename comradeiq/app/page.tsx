"use client";

import { useCallback, useRef, useState } from "react";

import { CommandInputBar } from "@/components/panels/CommandInputBar";
import { MissionActivityPanel } from "@/components/panels/MissionActivityPanel";
import { MissionConversation } from "@/components/panels/MissionConversation";
import { ProviderStatus } from "@/components/panels/ProviderStatus";
import { TeamMapDialog } from "@/components/panels/TeamMapDialog";
import { TeamStatus } from "@/components/panels/TeamStatus";
import { useKeyboardShortcuts } from "@/components/panels/useKeyboardShortcuts";
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

  // ── Keyboard shortcuts ──────────────────────────────
  const handleNewMission = useCallback(() => {
    if (busy) return;
    cancelReplay();
    resetMissionView();
    setActivityOpen(false);
    setMobileNavOpen(false);
  }, [busy, resetMissionView]);

  const handleOpenTeam = useCallback(() => {
    if (busy) return;
    setActivityOpen(false);
    setTeamMapOpen(true);
  }, [busy]);

  useKeyboardShortcuts([
    { key: "k", meta: true, description: "New mission",    handler: handleNewMission },
    { key: "/", meta: true, description: "Team controls", handler: handleOpenTeam },
  ]);

  const navigation = (scope: "desktop" | "mobile") => (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 py-1 mb-1">
        <div
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold text-black"
          style={{
            background: "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)",
            boxShadow: "0 0 20px rgba(0,229,160,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >
          C
        </div>
        <div>
          <p
            className="text-sm font-bold tracking-tight"
            style={{ fontFamily: "var(--font-brand)", color: "var(--text-primary)", letterSpacing: "-0.01em" }}
          >
            ComradeIQ
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)", letterSpacing: "0.08em" }}>
            MISSION CONTROL
          </p>
        </div>
      </div>

      {/* New Mission */}
      <button
        type="button"
        onClick={startNewMission}
        disabled={busy}
        data-testid={scope === "desktop" ? "new-mission" : "mobile-new-mission"}
        className="mt-4 group relative flex items-center justify-between gap-2.5 w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: "rgba(0,229,160,0.06)",
          border: "1px solid rgba(0,229,160,0.2)",
          color: "var(--accent)",
        }}
        onMouseEnter={(e) => {
          if (!busy) {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,229,160,0.12)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,160,0.4)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(0,229,160,0.12)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,229,160,0.06)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,160,0.2)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
        }}
      >
        <span className="flex items-center gap-2">
          <span
            className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-xs font-bold text-black transition-transform duration-150 group-hover:scale-110"
            style={{ background: "linear-gradient(135deg, #00e5a0, #00c487)" }}
            aria-hidden="true"
          >
            +
          </span>
          New mission
        </span>
        {/* Keyboard shortcut hint */}
        <kbd
          className="hidden shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[9px] sm:flex"
          style={{
            background: "rgba(0,229,160,0.08)",
            border: "1px solid rgba(0,229,160,0.2)",
            color: "rgba(0,229,160,0.7)",
            fontFamily: "var(--font-code)",
          }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Recent Missions */}
      <p
        className="mt-6 px-2 text-[9px] font-semibold uppercase"
        style={{ color: "var(--text-muted)", letterSpacing: "0.18em", fontFamily: "var(--font-code)" }}
      >
        Recent missions
      </p>
      <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {missions.length ? (
          missions.map((mission) => (
            <button
              key={mission.id}
              type="button"
              disabled={busy}
              onClick={() => selectMission(mission.id)}
              title={mission.missionText}
              className="w-full truncate rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
              }}
            >
              {mission.missionText}
            </button>
          ))
        ) : (
          <p className="px-3 py-2 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
            Completed missions will appear here.
          </p>
        )}
      </div>

      {/* Commander section */}
      <div
        className="mt-4 pt-4"
        style={{ borderTop: "1px solid var(--border-dim)" }}
      >
        <label
          className="block text-[9px] font-semibold uppercase px-1 mb-1.5"
          htmlFor={`commander-name-${scope}`}
          style={{ color: "var(--text-muted)", letterSpacing: "0.14em", fontFamily: "var(--font-code)" }}
        >
          Commander
        </label>
        <input
          id={`commander-name-${scope}`}
          value={commanderName}
          onChange={(event) => setCommanderName(event.target.value)}
          className="w-full rounded-lg px-2.5 py-2 text-[13px] transition-all duration-150"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-dim)",
            color: "var(--text-primary)",
            outline: "none",
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(0,229,160,0.35)";
            (e.currentTarget as HTMLInputElement).style.boxShadow = "0 0 0 2px rgba(0,229,160,0.08)";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = "var(--border-dim)";
            (e.currentTarget as HTMLInputElement).style.boxShadow = "none";
          }}
        />
        <div className="mt-3"><ProviderStatus /></div>
      </div>
    </>
  );

  return (
    <main
      className="flex h-[100dvh] overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside
        className="hidden w-[248px] shrink-0 flex-col p-3 md:flex"
        style={{
          background: "var(--bg-panel)",
          borderRight: "1px solid var(--border-dim)",
        }}
        aria-label="Mission navigation"
      >
        {navigation("desktop")}
      </aside>

      {/* ── Main area ───────────────────────────────── */}
      <section
        className="flex min-w-0 flex-1 flex-col"
        style={{ background: "var(--bg-base)" }}
      >
        {/* Header */}
        <header
          className="flex min-h-14 shrink-0 items-center justify-between gap-3 px-3 sm:px-5"
          style={{
            borderBottom: "1px solid var(--border-dim)",
            background: "rgba(8,9,10,0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              data-testid="mobile-menu"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-all duration-150 md:hidden"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              aria-label="Open mission navigation"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-mission-navigation"
            >
              <span className="flex w-[14px] flex-col gap-[4px]" aria-hidden="true">
                <span className="h-px w-full rounded-full" style={{ background: "currentColor" }} />
                <span className="h-px w-3/4 rounded-full" style={{ background: "currentColor" }} />
                <span className="h-px w-full rounded-full" style={{ background: "currentColor" }} />
              </span>
            </button>

            <div className="min-w-0">
              <p
                className="truncate text-sm font-semibold"
                style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
              >
                {objective || "New mission"}
              </p>
              {objective && (
                <p
                  className="hidden truncate text-[10px] sm:block"
                  style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)", letterSpacing: "0.06em" }}
                >
                  STATUS: {status.toUpperCase()}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {objective && (
              <button
                type="button"
                onClick={() => setActivityOpen(true)}
                data-testid="mission-activity"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150"
                style={{
                  border: "1px solid var(--border-mid)",
                  color: "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,160,0.3)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,229,160,0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-mid)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
                aria-haspopup="dialog"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: busy ? "var(--accent)" : "var(--text-muted)",
                    boxShadow: busy ? "0 0 6px var(--accent)" : "none",
                    animation: busy ? "pulse-dot 1.4s ease-in-out infinite" : "none",
                  }}
                  aria-hidden="true"
                />
                Activity
              </button>
            )}
            <TeamStatus onOpenTeamControls={openTeamControls} />
          </div>
        </header>

        {/* Conversation */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <MissionConversation />
        </div>

        {/* Input bar */}
        <div
          className="shrink-0 px-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-3 sm:px-5"
          style={{ borderTop: "1px solid var(--border-dim)" }}
        >
          <CommandInputBar />
        </div>
      </section>

      {/* ── Mobile nav overlay ───────────────────────── */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMobileNavOpen(false);
          }}
        >
          <aside
            ref={mobileNavRef}
            id="mobile-mission-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Mission navigation"
            tabIndex={-1}
            className="flex h-[100dvh] w-[min(85vw,300px)] flex-col p-3 shadow-2xl"
            style={{
              background: "var(--bg-panel)",
              borderRight: "1px solid var(--border-mid)",
            }}
          >
            <div className="flex justify-end mb-1">
              <button
                ref={mobileNavCloseRef}
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-lg leading-none transition-all"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                aria-label="Close mission navigation"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            {navigation("mobile")}
          </aside>
        </div>
      )}

      {activityOpen && objective && (
        <MissionActivityPanel onClose={() => setActivityOpen(false)} onOpenTeamMap={openTeamControls} />
      )}
      <TeamMapDialog open={teamMapOpen} onClose={() => setTeamMapOpen(false)} />
    </main>
  );
}
