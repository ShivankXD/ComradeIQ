"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { CommandInputBar } from "@/components/panels/CommandInputBar";
import { ConnectorsDialog } from "@/components/panels/ConnectorsDialog";
import { ContextWindowBar } from "@/components/panels/ContextWindowBar";
import { MissionActivityPanel } from "@/components/panels/MissionActivityPanel";
import { MissionConversation } from "@/components/panels/MissionConversation";
import { MissionHistoryItem } from "@/components/panels/MissionHistoryItem";
import { ProviderStatus } from "@/components/panels/ProviderStatus";
import { TeamMapDialog } from "@/components/panels/TeamMapDialog";
import { TeamStatus } from "@/components/panels/TeamStatus";
import { useKeyboardShortcuts } from "@/components/panels/useKeyboardShortcuts";
import { useModalDialog } from "@/components/panels/useModalDialog";
import { useMissionHistory } from "@/lib/history/use-mission-history";
import { deleteMission, setMissionArchived } from "@/lib/history/db";
import { cancelReplay, replayMission } from "@/lib/history/replay";
import { useCommanderStore, type CommanderStatus } from "@/lib/store";

const inFlight: CommanderStatus[] = ["thinking", "dispatching", "delegating", "monitoring", "synthesizing"];

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function Home() {
  const commanderName = useCommanderStore((state) => state.name);
  const setCommanderName = useCommanderStore((state) => state.setCommanderName);
  const status = useCommanderStore((state) => state.status);
  const objective = useCommanderStore((state) => state.objective);
  const resetMissionView = useCommanderStore((state) => state.resetMissionView);
  const { missions, archivedMissions, refresh: refreshHistory } = useMissionHistory();
  const [showArchived, setShowArchived] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [teamMapOpen, setTeamMapOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [hasActiveConnectors, setHasActiveConnectors] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const mobileNavCloseRef = useRef<HTMLButtonElement | null>(null);
  const busy = inFlight.includes(status);
  const [elapsedSec, setElapsedSec] = useState(0);
  const setAutoRunPrompt = useCommanderStore((state) => state.setAutoRunPrompt);

  // One-click live demo: when arriving from the landing page with ?demo=1,
  // auto-launch a representative mission so judges see the full pipeline instantly.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") !== "1") return;
    setAutoRunPrompt("Give a concise 3-paragraph briefing on how a multi-agent AI system coordinates specialists - researcher, writer, critic - to deliver a more reliable result than a single model.");
    // Clear the flag from the URL so a refresh doesn't relaunch the demo.
    window.history.replaceState(null, "", "/app");
  }, [setAutoRunPrompt]);

  // Live elapsed-time ticker - starts when mission goes in-flight, resets on completion
  useEffect(() => {
    if (!busy) { setElapsedSec(0); return; }
    setElapsedSec(0);
    const interval = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [busy]);

  const formatElapsed = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Check connectors status periodically or on mount/dialog close
  const checkConnectors = useCallback(() => {
    try {
      const saved = localStorage.getItem("comradeiq-connectors");
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, boolean>;
        setHasActiveConnectors(Object.values(parsed).some(Boolean));
      } else {
        setHasActiveConnectors(false);
      }
    } catch {
      setHasActiveConnectors(false);
    }
  }, []);

  // Check on mount
  useState(() => {
    if (typeof window !== "undefined") {
      checkConnectors();
    }
  });

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

  function shareMission(id: string) {
    if (typeof window === "undefined") return;
    const link = `${window.location.origin}/m/${id}`;
    void (navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(link)
      : Promise.resolve()
    ).catch(() => undefined);
  }

  function archiveMission(id: string, archived: boolean) {
    void setMissionArchived(id, archived).then(refreshHistory).catch((error) => console.error("Failed to archive chat", error));
  }

  function removeMission(id: string) {
    // If the deleted chat is the one on screen, return to a clean canvas.
    const store = useCommanderStore.getState();
    if (store.missionId === id || store.replayMissionId === id) {
      cancelReplay();
      resetMissionView();
    }
    void deleteMission(id).then(refreshHistory).catch((error) => console.error("Failed to delete chat", error));
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
      {/* Brand - links back to the landing page */}
      <Link
        href="/"
        className="flex items-center gap-3 px-2 py-1 mb-1 rounded-lg transition-colors"
        style={{ textDecoration: "none" }}
        title="Back to ComradeIQ home"
        aria-label="ComradeIQ home"
        onClick={() => setMobileNavOpen(false)}
      >
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
      </Link>

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
            <MissionHistoryItem
              key={mission.id}
              mission={mission}
              busy={busy}
              onSelect={selectMission}
              onShare={shareMission}
              onArchive={archiveMission}
              onDelete={removeMission}
              relativeTime={relativeTime}
            />
          ))
        ) : (
          <p className="px-3 py-2 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
            Completed missions will appear here.
          </p>
        )}

        {/* Archived chats */}
        {archivedMissions.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowArchived((open) => !open)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[10px] font-semibold uppercase transition-colors"
              style={{ color: "var(--text-muted)", letterSpacing: "0.14em", fontFamily: "var(--font-code)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
              aria-expanded={showArchived}
            >
              <span>Archived · {archivedMissions.length}</span>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showArchived ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showArchived && archivedMissions.map((mission) => (
              <MissionHistoryItem
                key={mission.id}
                mission={mission}
                busy={busy}
                archived
                onSelect={selectMission}
                onShare={shareMission}
                onArchive={archiveMission}
                onDelete={removeMission}
                relativeTime={relativeTime}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context window + Commander section */}
      <div
        className="mt-4 pt-4 space-y-3"
        style={{ borderTop: "1px solid var(--border-dim)" }}
      >
        {/* Context window bar */}
        <ContextWindowBar />

        {/* Commander name input */}
        <div>
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
      </div>
    </>
  );

  return (
    <main
      className="flex h-[100dvh] overflow-hidden"
      style={{ background: "transparent", position: "relative", zIndex: 1 }}
    >
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside
        className="hidden w-[248px] shrink-0 flex-col p-3 md:flex"
        style={{
          background: "rgba(4, 8, 5, 0.55)",
          borderRight: "1px solid rgba(0,229,160,0.1)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
        aria-label="Mission navigation"
      >
        {navigation("desktop")}
      </aside>

      {/* ── Main area ───────────────────────────────── */}
      <section
        className="flex min-w-0 flex-1 flex-col"
        style={{ background: "transparent" }}
      >
        {/* Header */}
        <header
          className="flex min-h-14 shrink-0 items-center justify-between gap-3 px-3 sm:px-5"
          style={{
            borderBottom: "1px solid rgba(0,229,160,0.1)",
            background: "rgba(4, 8, 5, 0.60)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
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
                  className="hidden truncate text-[10px] sm:flex items-center gap-1.5"
                  style={{ color: busy ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-code)", letterSpacing: "0.06em" }}
                >
                  {busy ? (
                    <>
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)", animation: "pulse-dot 1.4s ease-in-out infinite" }}
                        aria-hidden="true"
                      />
                      {status.toUpperCase()} · {formatElapsed(elapsedSec)}
                    </>
                  ) : (
                    <>STATUS: {status.toUpperCase()}</>
                  )}
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
            
            {/* Connectors / Integrations Button */}
            <button
              type="button"
              onClick={() => setConnectorsOpen(true)}
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
                  background: hasActiveConnectors ? "var(--accent)" : "var(--text-muted)",
                  boxShadow: hasActiveConnectors ? "0 0 6px var(--accent)" : "none",
                  animation: hasActiveConnectors ? "pulse-dot 1.4s ease-in-out infinite" : "none",
                }}
                aria-hidden="true"
              />
              Plugins
            </button>

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
          style={{ borderTop: "1px solid rgba(0,229,160,0.08)" }}
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
              background: "rgba(4, 8, 5, 0.75)",
              borderRight: "1px solid rgba(0,229,160,0.12)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
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
      <ConnectorsDialog
        isOpen={connectorsOpen}
        onClose={() => {
          setConnectorsOpen(false);
          checkConnectors();
        }}
      />
    </main>
  );
}
