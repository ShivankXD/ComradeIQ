"use client";

import { motion } from "framer-motion";

import { useCommanderStore, type ComradeStatus } from "@/lib/store";

const statusTone: Record<ComradeStatus, string> = {
  idle: "bg-[#838792]",
  thinking: "bg-[#aa8cff]",
  working: "bg-[#5b9cff]",
  done: "bg-[#4be0a1]",
  disconnected: "bg-[#777b84]",
};

const readableStatus: Record<string, string> = {
  thinking: "Assessing", dispatching: "Assigning", delegating: "In council", synthesizing: "Resolving", complete: "Complete", error: "Needs attention", idle: "Standing by", monitoring: "Standing by",
};

interface MissionActivityPanelProps {
  onOpenTeamMap: () => void;
}

export function MissionActivityPanel({ onOpenTeamMap }: MissionActivityPanelProps) {
  const commanderName = useCommanderStore((state) => state.name);
  const status = useCommanderStore((state) => state.status);
  const thinking = useCommanderStore((state) => state.thinking);
  const comrades = useCommanderStore((state) => state.comrades);
  const messages = useCommanderStore((state) => state.busMessages);
  const activeCount = Object.values(comrades).filter((comrade) => comrade.connected).length;

  return (
    <aside className="flex h-full flex-col border-l border-white/[0.08] bg-[#181a1a] px-4 py-5">
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6fd9bc]">Live battleground</p>
          <h2 className="mt-1 text-sm font-semibold text-[#f0f2f1]">Mission activity</h2>
        </div>
        <span className="rounded-full border border-[#65d6b8]/20 bg-[#1e463a]/45 px-2 py-1 text-[10px] font-medium text-[#89ead0]">{readableStatus[status]}</span>
      </div>

      <button type="button" onClick={onOpenTeamMap} className="group mt-5 overflow-hidden rounded-2xl border border-white/[0.11] bg-[radial-gradient(circle_at_73%_30%,rgba(30,198,156,0.18),transparent_42%),#202322] p-3 text-left shadow-[0_13px_25px_rgba(0,0,0,0.2)] transition hover:border-[#5ed7b7]/45">
        <div className="flex items-start justify-between">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#22c49f] to-[#087d68] text-sm font-semibold text-white shadow-[0_6px_14px_rgba(21,193,151,0.32)]">C</div>
          <span className="mt-1.5 h-2 w-2 rounded-full bg-[#80efd1] shadow-[0_0_12px_#80efd1]" />
        </div>
        <p className="mt-3 text-sm font-medium text-[#eff3f1]">Open team map</p>
        <p className="mt-1 text-xs leading-5 text-[#a6aeab]">Tune connections, review the council, or take a specialist offline.</p>
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-2.5 text-[10px] text-[#80cbb5]">
          <span>{activeCount}/5 operational</span><span className="transition group-hover:translate-x-0.5">Open ↗</span>
        </div>
      </button>

      <section className="mt-5 min-h-0 flex-1 overflow-y-auto pr-0.5">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#1c5144] text-[11px] font-semibold text-[#b9ffe9]">C</div>
            <div className="min-w-0"><p className="truncate text-xs font-medium text-[#e8edeb]">{commanderName}</p><p className="text-[10px] text-[#87cbb8]">{readableStatus[status]}</p></div>
          </div>
          <p className="mt-3 max-h-16 overflow-hidden text-xs leading-5 text-[#aeb6b3]">{thinking.join("") || "The Commander is convening the right specialists for this mission."}</p>
        </div>

        <p className="mt-5 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#727b78]">Council feed</p>
        <div className="mt-2 space-y-2">
          {Object.values(comrades).map((comrade, index) => {
            const statusLabel = comrade.connected ? comrade.status : "guarding fortress";
            const update = comrade.connected ? (comrade.result || comrade.thought || "Awaiting a Commander order.") : "Guarding the fortress. Connection held in reserve.";
            return <motion.article key={comrade.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className={`rounded-xl border border-white/[0.07] px-3 py-2.5 ${comrade.connected ? "bg-[#202222]" : "bg-[#1b1d1d] opacity-60"}`}>
              <div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${comrade.connected ? statusTone[comrade.status] : statusTone.disconnected}`} /><p className="text-xs font-medium capitalize text-[#dde2e0]">{comrade.id}</p><span className="ml-auto text-[9px] capitalize text-[#878f8d]">{statusLabel}</span></div>
              <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-[#969f9c]">{update}</p>
            </motion.article>;
          })}
        </div>

        {messages.length > 0 && <><p className="mt-5 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#727b78]">Latest signal</p><p className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-[11px] leading-5 text-[#a7afac]">{messages.at(-1)?.content}</p></>}
      </section>
    </aside>
  );
}
