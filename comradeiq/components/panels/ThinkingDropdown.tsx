"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface ThinkingDropdownProps {
  label: string;
  thinking?: string;
  tone?: "red" | "blue";
  placement?: "bottom" | "top";
}

export function ThinkingDropdown({ label, thinking, tone = "blue", placement = "bottom" }: ThinkingDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isRed = tone === "red";

  useEffect(() => {
    const closeOnClickAway = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnClickAway);
    return () => document.removeEventListener("pointerdown", closeOnClickAway);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button type="button" aria-label={`Show ${label} thinking`} aria-expanded={isOpen} onClick={(event) => { event.stopPropagation(); setIsOpen((open) => !open); }} className={`nodrag nopan grid h-5 w-5 place-items-center border text-[11px] transition ${isRed ? "border-red-300/50 bg-red-300/10 text-red-100 hover:bg-red-300/20" : "border-blue-300/50 bg-blue-300/10 text-blue-100 hover:bg-blue-300/20"}`}>
        ◌
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.section initial={{ opacity: 0, y: placement === "bottom" ? -5 : 5, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: placement === "bottom" ? -5 : 5, scale: 0.97 }} className={`absolute left-1/2 z-50 w-64 -translate-x-1/2 border bg-[#090e16]/[0.98] p-3 font-mono shadow-[0_0_22px_rgba(59,130,246,0.18)] ${placement === "bottom" ? "top-7" : "bottom-7"} ${isRed ? "border-red-300/40" : "border-blue-300/40"}`} style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 3px)" }}>
            <p className={`text-[8px] tracking-[0.2em] ${isRed ? "text-red-200/70" : "text-blue-200/70"}`}>{label.toUpperCase()} / THINKING</p>
            <p className="mt-2 max-h-36 overflow-y-auto whitespace-pre-wrap pr-1 text-[10px] leading-4 text-slate-200/85 [scrollbar-width:thin]">{thinking || "No active thinking stream."}</p>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
