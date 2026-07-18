"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";

import { ResultPanel } from "@/components/panels/result-panel";
import { CommanderNetworkHero } from "@/components/graph/CommanderNetworkHero";
import { useMissionRealtime } from "@/lib/agents/use-mission-realtime";
import { useCommanderStore } from "@/lib/store";

const statusCopy: Record<string, string> = {
  thinking: "I’m working through your request and building a plan.",
  dispatching: "I’ve mapped the work and I’m assigning the right specialists.",
  delegating: "Your team is working on the mission now.",
  synthesizing: "I’m reconciling the team’s work into a final result.",
  complete: "Your mission is complete.",
  error: "I hit a problem while running this mission.",
  monitoring: "Tell me what you’d like to create.",
  idle: "Tell me what you’d like to create.",
};

export function MissionConversation() {
  const objective = useCommanderStore((state) => state.objective);
  const commanderName = useCommanderStore((state) => state.name);
  const status = useCommanderStore((state) => state.status);
  const thinking = useCommanderStore((state) => state.thinking);
  const messages = useCommanderStore((state) => state.busMessages);
  const missionId = useCommanderStore((state) => state.missionId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useMissionRealtime(missionId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, thinking.length, status]);

  if (!objective) {
    return (
      <div className="flex min-h-full items-center justify-center px-5 py-7"><CommanderNetworkHero /></div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-7 px-5 py-8 sm:px-8">
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="sticky top-0 z-20 relative overflow-hidden rounded-[22px] border border-white/[0.1] bg-[radial-gradient(circle_at_72%_15%,rgba(29,174,139,0.18),transparent_37%),#232625]/95 px-5 py-4 shadow-[0_15px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border border-[#5ad0b3]/15" />
        <div className="relative flex items-center justify-between gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#79ddc2]">Live command room</p>
            <h1 className="mt-1 text-base font-semibold tracking-[-0.02em] text-[#f4f6f5]">Commander is meeting with the council</h1>
            <p className="mt-1 text-xs leading-5 text-[#acb4b1]">The team is mapping the mission, exchanging reports, and preparing the handoff.</p>
          </div>
          <div className="flex shrink-0 -space-x-2.5" aria-label="Commander and five specialists in council">
            {["C", "⌕", "✦", "▤", "◌", "◇"].map((mark, index) => <motion.span key={`${mark}-${index}`} animate={status === "complete" ? undefined : { y: [0, index % 2 ? -3 : 2, 0] }} transition={{ duration: 2.2, delay: index * 0.12, repeat: Infinity, ease: "easeInOut" }} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-[#232625] text-[10px] ${index === 0 ? "bg-[#13a982] text-white" : "bg-[#3a3d3e] text-[#e0e5e2]"}`}>{mark}</motion.span>)}
          </div>
        </div>
      </motion.section>
      <div className="flex items-start justify-end gap-3">
        <div className="max-w-[82%] rounded-2xl rounded-tr-md bg-[#2f2f2f] px-4 py-3 text-sm leading-6 text-[#f5f5f5]">{objective}</div>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#5d5d66] text-xs font-semibold text-white">You</div>
      </div>

      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#10a37f] text-xs font-semibold text-white">C</div>
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-sm font-medium text-[#ececec]">{commanderName}</p>
          <p className="mt-1 text-sm leading-6 text-[#d4d4d8]">{statusCopy[status]}</p>
          {thinking.length > 0 && (
            <details className="mt-3 max-w-2xl rounded-xl border border-white/[0.09] bg-white/[0.035] px-3 py-2.5 text-sm text-[#b7b7bf]">
              <summary className="cursor-pointer select-none text-xs font-medium text-[#d8d8df]">View planning</summary>
              <p className="mt-2 whitespace-pre-wrap leading-6">{thinking.join("")}</p>
            </details>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {messages.slice(-8).map((message) => (
          <motion.div key={message.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#232328] text-[10px] font-semibold text-[#bfc0c7]">{message.from.slice(0, 1).toUpperCase()}</div>
            <div className="pt-1 text-sm leading-6 text-[#c9c9d0]">
              <span className="mr-2 text-xs font-medium text-[#8f8f99]">{message.from === "commander" ? commanderName : message.from}</span>
              {message.content}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <ResultPanel />
      <div ref={bottomRef} />
    </div>
  );
}
