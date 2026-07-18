"use client";

import { AnimatePresence, motion } from "framer-motion";

import { CommanderNetworkHero } from "@/components/graph/CommanderNetworkHero";

interface TeamMapDialogProps {
  open: boolean;
  onClose: () => void;
}

export function TeamMapDialog({ open, onClose }: TeamMapDialogProps) {
  return (
    <AnimatePresence>
      {open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-[#0b0d0d]/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Team map controls" onMouseDown={onClose}>
        <motion.section initial={{ opacity: 0, scale: 0.97, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 14 }} transition={{ type: "spring", damping: 26, stiffness: 280 }} className="relative max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-white/[0.13] bg-[#1b1d1d] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.65)] sm:p-7" onMouseDown={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6ee0c0]">Team controls</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#f4f7f6]">Commander’s council map</h2>
              <p className="mt-1 text-sm text-[#a7adab]">Drag any specialist card to tune the room. Tap a connection to take a specialist offline or bring them back.</p>
            </div>
            <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-lg text-[#c9cecc] transition hover:bg-white/[0.1]" aria-label="Close team map">×</button>
          </div>
          <CommanderNetworkHero compact showPrompt={false} />
        </motion.section>
      </motion.div>}
    </AnimatePresence>
  );
}
