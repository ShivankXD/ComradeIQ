"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

import { useCommanderStore } from "@/lib/store";

export function BusTray() {
  const messages = useCommanderStore((state) => state.busMessages);
  const trayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tray = trayRef.current;
    if (tray) tray.scrollTo({ left: tray.scrollWidth, behavior: "smooth" });
  }, [messages.length]);

  return (
    <aside className="absolute inset-x-0 bottom-0 z-40 border-t border-blue-400/30 bg-[#070b12]/95 font-mono shadow-[0_-10px_32px_rgba(59,130,246,0.08)] backdrop-blur">
      <div className="flex h-11 items-center gap-3 px-3 sm:px-5">
        <div className="flex shrink-0 items-center gap-2 text-[9px] tracking-[0.2em] text-blue-200/75">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)]" /> BUS
        </div>
        <div ref={trayRef} className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {messages.length ? messages.map((message) => (
            <motion.p key={message.id} initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} className="shrink-0 border border-blue-300/20 bg-blue-300/[0.055] px-2.5 py-1 text-[10px] text-blue-100/80 shadow-[inset_0_0_12px_rgba(59,130,246,0.06)]">
              <span className="text-blue-300/60">{message.from.toUpperCase()} → {message.to.toUpperCase()}</span><span className="ml-2">{message.content}</span>
            </motion.p>
          )) : <p className="text-[10px] tracking-[0.12em] text-blue-200/35">BUS LINK IDLE / AWAITING TRAFFIC</p>}
        </div>
        <div className="hidden shrink-0 text-[9px] tracking-[0.12em] text-blue-300/45 sm:block">LIVE FEED</div>
      </div>
    </aside>
  );
}
