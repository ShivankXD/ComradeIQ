"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId, useRef } from "react";

import { useCommanderStore } from "@/lib/store";

import { useModalDialog } from "./useModalDialog";

interface MissionActivityPanelProps {
  onOpenTeamMap: () => void;
  onClose: () => void;
}

function displayName(value: string) {
  return value.replace(/(^|[-_\s])(\w)/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

export function MissionActivityPanel({ onOpenTeamMap, onClose }: MissionActivityPanelProps) {
  const status = useCommanderStore((state) => state.status);
  const comrades = useCommanderStore((state) => state.comrades);
  const thinking = useCommanderStore((state) => state.thinking);
  const messages = useCommanderStore((state) => state.busMessages);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const active = Object.values(comrades).filter((comrade) => comrade.connected).length;
  const latestUpdate = messages.at(-1)?.content;
  const activitySummary = thinking.join("").slice(-800);

  useModalDialog({ open: true, dialogRef, initialFocusRef: closeButtonRef, onClose });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px]"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.aside
          ref={dialogRef}
          initial={{ x: 360 }}
          animate={{ x: 0 }}
          exit={{ x: 360 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="absolute right-0 top-0 flex h-[100dvh] w-full max-w-[390px] flex-col border-l border-white/[0.1] bg-[#1a1d1c] p-4 shadow-2xl sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.17em] text-[#78e0c1]">Mission activity</p>
              <h2 id={titleId} className="mt-1 text-sm font-medium text-[#f0f4f2]">{status} · {active}/{Object.keys(comrades).length} Comrades online</h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.1] text-lg leading-none text-[#d7dedb] transition hover:bg-white/[0.08]"
              aria-label="Close mission activity"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <button type="button" onClick={onOpenTeamMap} className="mt-5 rounded-xl border border-white/[0.1] bg-[#222725] p-3 text-left transition hover:border-[#10a37f]/55 hover:bg-[#252c29]">
            <p className="text-sm font-medium text-white">Open team controls</p>
            <p className="mt-1 text-xs leading-5 text-[#acb6b1]">Review the compact network or switch a specialty on or off.</p>
          </button>

          {activitySummary && (
            <section className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3" aria-label="Latest activity summary">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#9da7a2]">Activity summary</p>
              <p className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs leading-5 text-[#d1dad5]">{activitySummary}</p>
            </section>
          )}

          <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#9ca6a1]">Specialists</p>
          <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {Object.values(comrades).map((comrade) => {
              const update = comrade.connected ? comrade.result || comrade.thought || "Waiting for a relevant assignment." : "Offline until reconnected.";
              return (
                <article key={comrade.id} className="rounded-xl border border-white/[0.075] bg-[#202422] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${comrade.connected ? "bg-[#78e0c1]" : "bg-[#737a76]"}`} aria-hidden="true" />
                    <p className="text-sm text-[#e8eeeb]">{displayName(comrade.id)}</p>
                    <span className="ml-auto text-[10px] capitalize text-[#a4aea9]">{comrade.connected ? comrade.status : "offline"}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#aeb8b3]">{update}</p>
                </article>
              );
            })}
          </div>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">Mission is {status}. {latestUpdate ?? ""}</p>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}
