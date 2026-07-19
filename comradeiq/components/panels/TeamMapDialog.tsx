"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { useCommanderStore, type ComradeState } from "@/lib/store";

import { useModalDialog } from "./useModalDialog";

interface TeamMapDialogProps {
  open: boolean;
  onClose: () => void;
}

const mapSlots: Record<string, string> = {
  researcher: "sm:col-start-1 sm:row-start-1",
  writer: "sm:col-start-3 sm:row-start-1",
  critic: "sm:col-start-1 sm:row-start-2",
  formatter: "sm:col-start-3 sm:row-start-2",
  assembler: "col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-3",
};

function displayName(value: string) {
  return value.replace(/(^|[-_\s])(\w)/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

function workCopy(comrade: ComradeState) {
  if (!comrade.connected) return "Offline. Reconnect when this specialty is needed.";
  if (comrade.status === "working") return "Working on the active mission.";
  if (comrade.status === "thinking") return "Reviewing the Commander’s brief.";
  if (comrade.status === "done") return "Finished its assigned step.";
  return "Available for a relevant mission.";
}

export function TeamMapDialog({ open, onClose }: TeamMapDialogProps) {
  const commanderName = useCommanderStore((state) => state.name);
  const commanderStatus = useCommanderStore((state) => state.status);
  const comrades = useCommanderStore((state) => state.comrades);
  const toggleComradeConnection = useCommanderStore((state) => state.toggleComradeConnection);
  const [notice, setNotice] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const team = Object.values(comrades);
  const activeCount = team.filter((comrade) => comrade.connected).length;

  useModalDialog({ open, dialogRef, initialFocusRef: closeButtonRef, onClose });

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  function toggleConnection(id: string) {
    const comrade = comrades[id];
    if (!comrade) return;
    if (toggleComradeConnection(id)) {
      setNotice(`${displayName(id)} is now ${comrade.connected ? "offline" : "online"}.`);
    } else {
      setNotice("Keep at least two Comrades online so the Commander can complete a mission.");
    }
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3600);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-[#080a09]/80 p-3 backdrop-blur-md sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 290 }}
            className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/[0.14] bg-[#171a19] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.65)] sm:max-h-[calc(100dvh-3rem)] sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-controls-title"
            aria-describedby="team-controls-description"
            tabIndex={-1}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#78e0c1]">Team controls</p>
                <h2 id="team-controls-title" className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#f4f7f6]">Commander network</h2>
                <p id="team-controls-description" className="mt-1 max-w-2xl text-sm leading-6 text-[#adb5b1]">
                  The Commander connects directly to each Comrade. Turn specialties on only when they are useful; Comrades never connect to one another.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                data-testid="close-team-controls"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.12] bg-white/[0.04] text-lg leading-none text-[#d9e0dd] transition hover:bg-white/[0.1]"
                aria-label="Close team controls"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3">
              <p className="text-sm text-[#dce5e1]"><span className="font-medium text-white">{activeCount}/{team.length}</span> Comrades online</p>
              <p className="text-xs text-[#98a39e]">Use the buttons below to connect or disconnect a specialty.</p>
            </div>

            <section className="relative mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-[radial-gradient(circle_at_50%_50%,rgba(16,163,127,0.12),transparent_26rem),#121514] p-3 sm:p-5" aria-label="Network map">
              <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] [background-size:28px_28px]" />
              <svg className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {[
                  [50, 50, 16.7, 16.7], [50, 50, 83.3, 16.7], [50, 50, 16.7, 50], [50, 50, 83.3, 50], [50, 50, 50, 83.3],
                ].map(([x1, y1, x2, y2], index) => <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4bd0ae" strokeOpacity="0.26" strokeWidth="0.3" />)}
              </svg>
              <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-x-10 sm:gap-y-3">
                <article className="order-first col-span-2 rounded-2xl border border-[#58d7b5]/40 bg-[#18332b]/95 p-3 text-center shadow-[0_12px_32px_rgba(16,163,127,0.14)] sm:col-span-1 sm:col-start-2 sm:row-start-2">
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#10a37f] text-sm font-semibold text-white">C</div>
                  <p className="mt-2 text-sm font-semibold text-white">{commanderName}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#83e4cb]">Commander · {commanderStatus}</p>
                </article>
                {team.map((comrade) => {
                  const online = comrade.connected;
                  return (
                    <article key={comrade.id} className={`rounded-2xl border p-2.5 transition ${mapSlots[comrade.id] ?? ""} ${online ? "border-white/[0.13] bg-[#202422]/95" : "border-white/[0.07] bg-[#171a18]/95 opacity-70"}`}>
                      <div className="flex items-start gap-2">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${online ? "bg-[#78e0c1]" : "bg-[#707874]"}`} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#edf3f0]">{displayName(comrade.id)}</p>
                          <p className="mt-0.5 truncate text-[11px] text-[#9ba6a1]">{comrade.specialty}</p>
                        </div>
                      </div>
                      <p className="mt-2 min-h-8 text-xs leading-[1.15rem] text-[#b6c0bb]">{workCopy(comrade)}</p>
                      <button
                        type="button"
                        onClick={() => toggleConnection(comrade.id)}
                        aria-pressed={online}
                        data-testid={`toggle-comrade-${comrade.id}`}
                        className={`mt-2 w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${online ? "border-[#62d8b7]/35 bg-[#10a37f]/10 text-[#a2f1d9] hover:bg-[#10a37f]/18" : "border-white/[0.12] bg-white/[0.04] text-[#d7dfdb] hover:bg-white/[0.09]"}`}
                      >
                        {online ? `Disconnect ${displayName(comrade.id)}` : `Connect ${displayName(comrade.id)}`}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
            <p className="mt-4 text-xs leading-5 text-[#8f9994]">The layout is fixed and responsive, so network cards remain readable at every screen size.</p>
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{notice ?? ""}</p>
            {notice && <p className="mt-3 rounded-xl border border-[#78e0c1]/20 bg-[#10a37f]/10 px-3 py-2 text-sm text-[#b8f4e0]">{notice}</p>}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
