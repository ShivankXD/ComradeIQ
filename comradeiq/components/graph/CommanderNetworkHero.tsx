"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCommanderStore, type ComradeStatus } from "@/lib/store";

type AgentId = "researcher" | "writer" | "formatter" | "critic" | "assembler";
type Point = { x: number; y: number };

const agents: { id: AgentId; label: string; detail: string; symbol: string }[] = [
  { id: "researcher", label: "Researcher", detail: "Research & sources", symbol: "R" },
  { id: "writer", label: "Writer", detail: "Narrative & copy", symbol: "W" },
  { id: "formatter", label: "Formatter", detail: "Structure & polish", symbol: "F" },
  { id: "critic", label: "Critic", detail: "Review & quality", symbol: "C" },
  { id: "assembler", label: "Assembler", detail: "Final delivery", symbol: "A" },
];

const startingPositions: Record<AgentId, Point> = {
  researcher: { x: 22, y: 21 }, writer: { x: 78, y: 21 }, critic: { x: 18, y: 63 }, formatter: { x: 82, y: 63 }, assembler: { x: 50, y: 78 },
};

const statusCopy: Record<ComradeStatus, string> = {
  idle: "Ready for a mission", thinking: "Reviewing the brief", working: "Working on it", done: "Report complete", disconnected: "Guarding the fortress",
};

function anchor(center: Point, toward: Point, radius: Point) {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const scale = 1 / Math.max(Math.abs(dx) / radius.x, Math.abs(dy) / radius.y, 0.001);
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

interface CommanderNetworkHeroProps { compact?: boolean; showPrompt?: boolean; }

export function CommanderNetworkHero({ compact = false, showPrompt = true }: CommanderNetworkHeroProps) {
  const commanderName = useCommanderStore((state) => state.name);
  const commanderStatus = useCommanderStore((state) => state.status);
  const commanderThinking = useCommanderStore((state) => state.thinking);
  const comrades = useCommanderStore((state) => state.comrades);
  const toggleComradeConnection = useCommanderStore((state) => state.toggleComradeConnection);
  const [positions, setPositions] = useState(startingPositions);
  const [notice, setNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef<AgentId | null>(null);
  const commander = { x: 50, y: 47 };
  const activeCount = useMemo(() => Object.values(comrades).filter((comrade) => comrade.connected).length, [comrades]);

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const id = draggedRef.current;
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!id || !bounds) return;
      setPositions((current) => ({ ...current, [id]: {
        x: Math.max(12, Math.min(88, ((event.clientX - bounds.left) / bounds.width) * 100)),
        y: Math.max(14, Math.min(86, ((event.clientY - bounds.top) / bounds.height) * 100)),
      } }));
    }
    function onUp() { draggedRef.current = null; }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, []);

  function toggle(id: AgentId) {
    if (toggleComradeConnection(id)) return;
    setNotice("At least 2 Comrades must stay operational.");
    window.setTimeout(() => setNotice(null), 2600);
  }

  return <section className={`relative mx-auto w-full ${compact ? "max-w-5xl" : "max-w-4xl"}`}>
    <div ref={containerRef} className={`relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_50%_48%,rgba(16,163,127,0.13),transparent_25rem),linear-gradient(150deg,#222524,#171918)] shadow-[0_24px_70px_rgba(0,0,0,0.3)] ${compact ? "h-[540px]" : "h-[405px] sm:h-[460px]"}`}>
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="pointer-events-none absolute left-1/2 top-[47%] h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#42d2ae]/15 shadow-[0_0_0_28px_rgba(66,210,174,0.025),0_0_0_58px_rgba(66,210,174,0.018)]" />
      <div className="absolute inset-x-5 top-4 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.18em] text-[#929b98]"><span>Commander network</span><span>{activeCount}/5 active</span></div>

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="clean-edge" x1="0" x2="1"><stop stopColor="#10a37f" /><stop offset="1" stopColor="#73e1c2" /></linearGradient></defs>
        {agents.map((agent) => {
          const targetCenter = positions[agent.id];
          const source = anchor(commander, targetCenter, { x: 10, y: 13 });
          const target = anchor(targetCenter, commander, { x: 8.5, y: 10 });
          const connected = comrades[agent.id].connected;
          return <g key={agent.id} className="pointer-events-auto">
            <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="transparent" strokeWidth="5" className="cursor-pointer" onClick={() => toggle(agent.id)} />
            <motion.line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={connected ? "url(#clean-edge)" : "#515653"} strokeWidth={connected ? "0.32" : "0.2"} strokeDasharray={connected ? "0" : "1.2 1.5"} initial={{ pathLength: 0 }} animate={{ pathLength: 1, opacity: connected ? 0.82 : 0.38 }} transition={{ duration: 0.55 }} />
            <ellipse cx={source.x} cy={source.y} rx="0.35" ry="0.72" fill={connected ? "#d5fff1" : "#6b726d"} />
            <motion.ellipse cx={target.x} cy={target.y} rx="0.44" ry="0.9" fill={connected ? "#d5fff1" : "#6b726d"} animate={connected ? { opacity: [0.45, 1, 0.45] } : undefined} transition={{ duration: 1.8, repeat: Infinity }} />
          </g>;
        })}
      </svg>

      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="absolute z-10 w-48 -translate-x-1/2 -translate-y-1/2 text-center sm:w-56" style={{ left: `${commander.x}%`, top: `${commander.y}%` }}>
        <div className="rounded-2xl border border-[#46d3b1]/45 bg-[#1a2823]/95 px-4 py-4 shadow-[0_14px_35px_rgba(16,163,127,0.18)] backdrop-blur">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#10a37f] text-base font-semibold text-white">C</div>
          <p className="mt-3 truncate text-sm font-semibold text-white">{commanderName}</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#77e2c5]">{commanderStatus}</p>
        </div>
        <p className="mt-2 h-8 overflow-hidden px-1 text-[10px] leading-4 text-[#aab2af]">{commanderThinking.join("") || "Ready to coordinate the team."}</p>
      </motion.div>

      {agents.map((agent, index) => {
        const comrade = comrades[agent.id];
        const status = comrade.connected ? comrade.status : "disconnected";
        const thought = comrade.connected ? (comrade.thought || comrade.result || statusCopy[status]) : statusCopy.disconnected;
        const point = positions[agent.id];
        return <motion.div key={agent.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="absolute z-10 w-32 -translate-x-1/2 -translate-y-1/2 text-center sm:w-36" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
          <div onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); draggedRef.current = agent.id; }} className={`relative select-none touch-none rounded-2xl border px-3 py-3 text-left transition ${comrade.connected ? "cursor-grab border-white/[0.12] bg-[#242726]/95 shadow-lg hover:border-[#48d4b2]/50 active:cursor-grabbing" : "cursor-grab border-white/[0.06] bg-[#1b1d1d] opacity-50 grayscale active:cursor-grabbing"}`}>
            <div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-lg bg-white/[0.07] text-[10px] font-semibold text-[#dce5e1]">{agent.symbol}</span><span className={`ml-auto h-1.5 w-1.5 rounded-full ${comrade.connected ? "bg-[#58e0bb]" : "bg-[#737872]"}`} /></div>
            <p className="mt-2 text-[11px] font-semibold text-[#f1f4f3]">{agent.label}</p><p className="mt-0.5 text-[9px] text-[#9ba5a1]">{agent.detail}</p>
          </div>
          <p className="mt-1.5 h-7 overflow-hidden px-1 text-[9px] leading-3 text-[#9ea8a4]">{thought}</p>
        </motion.div>;
      })}
      <p className="pointer-events-none absolute bottom-3 right-4 text-[10px] text-[#77817d]">Drag a card to arrange · Click a link to disconnect</p>
    </div>
    {showPrompt && <div className="mt-6 text-center"><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#f2f4f3]">Give the Commander a mission.</h1><p className="mt-2 text-sm text-[#a8b0ad]">One goal in. A coordinated specialist team out.</p></div>}
    <AnimatePresence>{notice && <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-amber-200/20 bg-[#292719] px-3 py-2 text-xs text-amber-100">{notice}</motion.p>}</AnimatePresence>
  </section>;
}
