"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCommanderStore, type ComradeStatus } from "@/lib/store";

type Point = { x: number; y: number };
type AgentId = "researcher" | "writer" | "formatter" | "critic" | "assembler";

const agents: { id: AgentId; label: string; specialty: string; glyph: string }[] = [
  { id: "researcher", label: "Researcher", specialty: "Intel & references", glyph: "⌕" },
  { id: "writer", label: "Writer", specialty: "Narrative & voice", glyph: "✦" },
  { id: "formatter", label: "Formatter", specialty: "Structure & polish", glyph: "▤" },
  { id: "critic", label: "Critic", specialty: "Quality & clarity", glyph: "◌" },
  { id: "assembler", label: "Assembler", specialty: "Final delivery", glyph: "◇" },
];

// Deliberately irregular: a command table / constellation, never a textbook star.
const defaultPositions: Record<AgentId, Point> = {
  researcher: { x: 24, y: 22 },
  writer: { x: 76, y: 22 },
  formatter: { x: 78, y: 66 },
  critic: { x: 22, y: 67 },
  assembler: { x: 50, y: 82 },
};

const statusText: Record<ComradeStatus, string> = {
  idle: "Standing by for a mission.",
  thinking: "Reading the Commander’s brief…",
  working: "Turning the brief into useful work…",
  done: "Report ready for the Commander.",
  disconnected: "Guarding the fortress.",
};

const statusTone: Record<ComradeStatus, string> = {
  idle: "bg-[#8f939e]",
  thinking: "bg-[#9d86ff]",
  working: "bg-[#64a7ff]",
  done: "bg-[#4ee0a4]",
  disconnected: "bg-[#6f727b]",
};

function curvedPath(source: Point, target: Point, id: AgentId) {
  const bends: Record<AgentId, Point> = {
    researcher: { x: -4, y: -13 }, writer: { x: 8, y: -12 }, formatter: { x: 11, y: 7 }, critic: { x: -11, y: 10 }, assembler: { x: 2, y: 18 },
  };
  const bend = bends[id];
  const control = { x: (source.x + target.x) / 2 + bend.x, y: (source.y + target.y) / 2 + bend.y };
  return `M ${source.x} ${source.y} Q ${control.x} ${control.y} ${target.x} ${target.y}`;
}

function edgeAnchor(center: Point, toward: Point, radius: Point) {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const scale = 1 / Math.max(Math.abs(dx) / radius.x, Math.abs(dy) / radius.y, 0.001);
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

interface CommanderNetworkHeroProps {
  compact?: boolean;
  showPrompt?: boolean;
}

export function CommanderNetworkHero({ compact = false, showPrompt = true }: CommanderNetworkHeroProps) {
  const commanderName = useCommanderStore((state) => state.name);
  const commanderStatus = useCommanderStore((state) => state.status);
  const commanderThinking = useCommanderStore((state) => state.thinking);
  const comrades = useCommanderStore((state) => state.comrades);
  const toggleComradeConnection = useCommanderStore((state) => state.toggleComradeConnection);
  const [notice, setNotice] = useState<string | null>(null);
  const [positions, setPositions] = useState(defaultPositions);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<AgentId | null>(null);

  const commanderPoint = { x: 50, y: 49 };
  const activeCount = useMemo(() => Object.values(comrades).filter((comrade) => comrade.connected).length, [comrades]);
  const commanderThought = commanderThinking.join("");

  useEffect(() => {
    function move(event: PointerEvent) {
      if (!dragRef.current || !frameRef.current) return;
      const bounds = frameRef.current.getBoundingClientRect();
      const x = Math.max(11, Math.min(89, ((event.clientX - bounds.left) / bounds.width) * 100));
      const y = Math.max(12, Math.min(88, ((event.clientY - bounds.top) / bounds.height) * 100));
      const id = dragRef.current;
      setPositions((current) => ({ ...current, [id]: { x, y } }));
    }
    function stop() { dragRef.current = null; }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
  }, []);

  function toggleConnection(id: AgentId) {
    if (toggleComradeConnection(id)) return;
    setNotice("At least 2 Comrades must stay operational.");
    window.setTimeout(() => setNotice(null), 2600);
  }

  return (
    <section className={`relative mx-auto w-full ${compact ? "max-w-[900px] py-3" : "max-w-[860px] py-5 sm:py-8"}`}>
      <div className="pointer-events-none absolute left-[22%] top-[34%] h-56 w-[55%] rounded-full bg-[#14866e]/[0.1] blur-[90px]" />
      <div ref={frameRef} className={`relative mx-auto overflow-hidden rounded-[28px] border border-white/[0.055] bg-[radial-gradient(circle_at_50%_49%,rgba(26,158,128,0.09),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.018),transparent_38%)] ${compact ? "h-[510px]" : "h-[370px] sm:h-[395px]"}`}>
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="network-link" x1="0" x2="1">
              <stop offset="0" stopColor="#17c69e" stopOpacity="0.9" />
              <stop offset="1" stopColor="#9af2d8" stopOpacity="0.55" />
            </linearGradient>
            <filter id="link-glow"><feGaussianBlur stdDeviation="0.3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {agents.map((agent) => {
            const comrade = comrades[agent.id];
            const cardCenter = positions[agent.id];
            const source = edgeAnchor(commanderPoint, cardCenter, { x: 10.6, y: 13.5 });
            const target = edgeAnchor(cardCenter, commanderPoint, { x: 8.2, y: 11 });
            const path = curvedPath(source, target, agent.id);
            return (
              <g key={agent.id} className="pointer-events-auto">
                <path d={path} fill="none" stroke="transparent" strokeWidth="5" className="cursor-pointer" onClick={() => toggleConnection(agent.id)} />
                <motion.path d={path} fill="none" stroke={comrade.connected ? "url(#network-link)" : "#53545b"} strokeWidth={comrade.connected ? "0.35" : "0.22"} strokeDasharray={comrade.connected ? "0" : "1.1 1.4"} filter={comrade.connected ? "url(#link-glow)" : undefined} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: comrade.connected ? 0.92 : 0.44 }} transition={{ duration: 0.9, delay: 0.06 }} />
                <ellipse cx={source.x} cy={source.y} rx="0.38" ry="0.8" fill={comrade.connected ? "#b6ffe7" : "#62636b"} />
                <motion.ellipse cx={target.x} cy={target.y} rx="0.53" ry="1.12" fill={comrade.connected ? "#c9ffef" : "#6a6b73"} animate={comrade.connected ? { opacity: [0.45, 1, 0.45] } : undefined} transition={{ duration: 2.2, repeat: Infinity }} />
              </g>
            );
          })}
        </svg>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute z-10 w-52 -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${commanderPoint.x}%`, top: `${commanderPoint.y}%` }}>
          <div className="relative overflow-hidden rounded-[22px] border border-[#35d3ad]/50 bg-[#172421]/95 px-4 py-4 shadow-[0_20px_55px_rgba(12,196,153,0.2)] backdrop-blur-xl">
            <div className="absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-[#8ff5d9] to-transparent" />
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-[14px] bg-gradient-to-br from-[#21c59f] to-[#087e67] text-lg font-semibold text-white shadow-[0_8px_20px_rgba(17,196,154,0.35)]">C</div>
            <p className="mt-3 truncate text-sm font-semibold tracking-[-0.01em] text-white">{commanderName}</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#8bf0d2]">{commanderStatus}</p>
          </div>
          {commanderThought && <p className="mt-2 h-8 overflow-hidden px-1 text-[10px] leading-4 text-[#aeb9b5]">{commanderThought.length > 58 ? `${commanderThought.slice(0, 58)}…` : commanderThought}</p>}
        </motion.div>

        {agents.map((agent, index) => {
          const comrade = comrades[agent.id];
          const status = comrade.connected ? comrade.status : "disconnected";
          const thinking = comrade.connected ? (comrade.thought || comrade.result || statusText[status]) : statusText.disconnected;
          const point = positions[agent.id];
          return (
            <motion.div key={agent.id} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + index * 0.07 }} className="absolute z-10 w-[142px] -translate-x-1/2 -translate-y-1/2 text-center sm:w-[158px]" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
              <div onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); dragRef.current = agent.id; }} className={`group relative select-none touch-none rounded-[20px] border px-3 py-3.5 transition-all duration-300 ${comrade.connected ? "cursor-grab border-white/[0.13] bg-[#252628]/95 shadow-[0_15px_30px_rgba(0,0,0,0.28)] hover:-translate-y-0.5 hover:border-[#54d6b7]/45 active:cursor-grabbing" : "cursor-grab border-white/[0.06] bg-[#202124]/90 opacity-55 grayscale active:cursor-grabbing"}`}>
                <span className="pointer-events-none absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-[#252628] bg-[#b9ffea] shadow-[0_0_12px_rgba(119,255,213,0.72)]" aria-hidden="true" />
                <div className="flex items-center justify-between">
                  <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-white/[0.07] text-sm text-[#ededf0]">{agent.glyph}</span>
                  <span className={`h-2 w-2 rounded-full shadow-[0_0_9px_currentColor] ${statusTone[status]}`} />
                </div>
                <p className="mt-3 text-xs font-semibold text-[#f4f4f6]">{agent.label}</p>
                <p className="mt-1 text-[10px] text-[#a0a1ab]">{agent.specialty}</p>
              </div>
              <p className="mt-2 min-h-8 px-1 text-[10px] leading-4 text-[#aeb2b5]">{thinking.length > 82 ? `${thinking.slice(0, 82)}…` : thinking}</p>
            </motion.div>
          );
        })}
        <p className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-[#79817f]">{activeCount}/5 operational · drag any card to tune the map</p>
      </div>

      {showPrompt && <div className="relative mx-auto mt-1 max-w-xl text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#72d9bd]">The council is ready</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#f5f7f6] sm:text-[38px]">Give the Commander a mission.</h1>
        <p className="mt-2 text-sm leading-6 text-[#aeb4b2]">One goal in. A coordinated specialist team out.</p>
      </div>}

      <AnimatePresence>
        {notice && <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-amber-300/20 bg-[#302817] px-3 py-2 text-xs text-amber-100 shadow-lg">{notice}</motion.p>}
      </AnimatePresence>
    </section>
  );
}
