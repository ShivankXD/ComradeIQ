"use client";

import { AnimatePresence, motion } from "framer-motion";

import { useCommanderStore } from "@/lib/store";

interface MissionActivityPanelProps { onOpenTeamMap: () => void; onClose: () => void; }

export function MissionActivityPanel({ onOpenTeamMap, onClose }: MissionActivityPanelProps) {
  const status = useCommanderStore((state) => state.status);
  const comrades = useCommanderStore((state) => state.comrades);
  const thinking = useCommanderStore((state) => state.thinking);
  const messages = useCommanderStore((state) => state.busMessages);
  const active = Object.values(comrades).filter((comrade) => comrade.connected).length;

  return <AnimatePresence>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px]" onMouseDown={onClose}>
      <motion.aside initial={{ x: 360 }} animate={{ x: 0 }} exit={{ x: 360 }} transition={{ type: "spring", damping: 28, stiffness: 300 }} onMouseDown={(event) => event.stopPropagation()} className="absolute right-0 top-0 flex h-full w-full max-w-[360px] flex-col border-l border-white/[0.1] bg-[#1c1c1e] p-5 shadow-2xl">
        <div className="flex items-start justify-between"><div><p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#10a37f]">Mission activity</p><p className="mt-1 text-sm text-[#ebebee]">{status} · {active}/5 agents active</p></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-xl text-[#b5b5bf] transition hover:bg-white/[0.08]" aria-label="Close activity">×</button></div>
        <button type="button" onClick={onOpenTeamMap} className="mt-5 rounded-xl border border-white/[0.09] bg-[#242426] p-3 text-left transition hover:border-[#10a37f]/45"><p className="text-sm font-medium text-white">Open team map</p><p className="mt-1 text-xs leading-5 text-[#a9a9b1]">Adjust connections or take a Comrade offline.</p></button>
        {thinking.length > 0 && <section className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"><p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#909099]">Commander plan</p><p className="mt-2 max-h-24 overflow-auto text-xs leading-5 text-[#c9c9d0]">{thinking.join("")}</p></section>}
        <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#8c8c95]">Agent updates</p>
        <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {Object.values(comrades).map((comrade) => <article key={comrade.id} className="rounded-xl border border-white/[0.07] bg-[#232325] px-3 py-2.5"><div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${comrade.connected ? "bg-[#10a37f]" : "bg-[#73737b]"}`} /><p className="text-sm capitalize text-[#e3e3e8]">{comrade.id}</p><span className="ml-auto text-[10px] capitalize text-[#96969f]">{comrade.connected ? comrade.status : "offline"}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#9d9da6]">{comrade.connected ? comrade.result || comrade.thought || "Awaiting an order." : "Guarding the fortress."}</p></article>)}
          {messages.length > 0 && <p className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-xs leading-5 text-[#a9a9b0]">{messages.at(-1)?.content}</p>}
        </div>
      </motion.aside>
    </motion.div>
  </AnimatePresence>;
}
