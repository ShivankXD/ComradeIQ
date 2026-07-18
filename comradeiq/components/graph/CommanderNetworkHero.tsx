"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCommanderStore, type ComradeStatus } from "@/lib/store";

type Point = { x: number; y: number };
type AgentId = "researcher" | "writer" | "formatter" | "critic" | "assembler";

const agents: { id: AgentId; code: string; label: string; specialty: string; glyph: string }[] = [
  { id: "researcher", code: "01", label: "Researcher", specialty: "Intel & references", glyph: "⌕" },
  { id: "writer", code: "02", label: "Writer", specialty: "Narrative & voice", glyph: "⌁" },
  { id: "critic", code: "03", label: "Critic", specialty: "Quality & clarity", glyph: "◎" },
  { id: "formatter", code: "04", label: "Formatter", specialty: "Structure & polish", glyph: "▤" },
  { id: "assembler", code: "05", label: "Assembler", specialty: "Final delivery", glyph: "◇" },
];

const defaultPositions: Record<AgentId, Point> = {
  researcher: { x: 20, y: 26 }, writer: { x: 80, y: 26 }, critic: { x: 20, y: 67 }, formatter: { x: 80, y: 67 }, assembler: { x: 50, y: 82 },
};

const statusText: Record<ComradeStatus, string> = {
  idle: "Standing by for a mission.", thinking: "Reviewing Commander’s order.", working: "Executing assigned work.", done: "Report sent to Commander.", disconnected: "Guarding the fortress.",
};

function edgeAnchor(center: Point, toward: Point, radius: Point) {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const scale = 1 / Math.max(Math.abs(dx) / radius.x, Math.abs(dy) / radius.y, 0.001);
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

function tacticalPath(source: Point, target: Point) {
  const horizontal = Math.abs(target.x - source.x) >= Math.abs(target.y - source.y);
  const elbow = horizontal ? { x: (source.x + target.x) / 2, y: source.y } : { x: source.x, y: (source.y + target.y) / 2 };
  return `M ${source.x} ${source.y} L ${elbow.x} ${elbow.y} L ${target.x} ${target.y}`;
}

interface CommanderNetworkHeroProps { compact?: boolean; showPrompt?: boolean; }

export function CommanderNetworkHero({ compact = false, showPrompt = true }: CommanderNetworkHeroProps) {
  const commanderName = useCommanderStore((state) => state.name);
  const commanderStatus = useCommanderStore((state) => state.status);
  const commanderThinking = useCommanderStore((state) => state.thinking);
  const comrades = useCommanderStore((state) => state.comrades);
  const toggleComradeConnection = useCommanderStore((state) => state.toggleComradeConnection);
  const [positions, setPositions] = useState(defaultPositions);
  const [notice, setNotice] = useState<string | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<AgentId | null>(null);
  const commanderPoint = { x: 50, y: 51 };
  const commanderThought = commanderThinking.join("");
  const activeCount = useMemo(() => Object.values(comrades).filter((comrade) => comrade.connected).length, [comrades]);

  useEffect(() => {
    function move(event: PointerEvent) {
      const id = dragRef.current;
      const bounds = frameRef.current?.getBoundingClientRect();
      if (!id || !bounds) return;
      setPositions((current) => ({ ...current, [id]: {
        x: Math.max(13, Math.min(87, ((event.clientX - bounds.left) / bounds.width) * 100)),
        y: Math.max(17, Math.min(87, ((event.clientY - bounds.top) / bounds.height) * 100)),
      } }));
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
    <section className={`relative mx-auto w-full ${compact ? "max-w-[1320px] py-2" : "max-w-[1640px] px-3 py-2 sm:px-6"}`}>
      <div ref={frameRef} className={`atlas-grid relative overflow-hidden border border-[#b6ed71]/25 bg-[#050806] shadow-[inset_0_0_90px_rgba(74,120,37,0.11),0_24px_80px_rgba(0,0,0,0.5)] ${compact ? "h-[640px]" : "h-[calc(100dvh-152px)]"}`}>
        <div className="pointer-events-none absolute inset-3 border border-[#b6ed71]/20 [clip-path:polygon(18px_0,calc(100%-18px)_0,100%_18px,100%_calc(100%-18px),calc(100%-18px)_100%,18px_100%,0_calc(100%-18px),0_18px)]" />
        <div className="pointer-events-none absolute left-1/2 top-[47%] h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#b6ed71]/15 shadow-[0_0_0_35px_rgba(182,237,113,0.06),0_0_0_75px_rgba(182,237,113,0.035),0_0_0_115px_rgba(182,237,113,0.018)]" />
        <div className="pointer-events-none absolute inset-x-8 top-4 flex items-center justify-between font-mono text-[10px] tracking-[0.22em] text-[#9da897]">
          <span>SECURE COMMAND INTERFACE <b className="ml-2 text-[#b6ed71]">L1 CLEARANCE</b></span>
          <span className="hidden text-[#a9b4a2] md:block">ATLAS COMMAND NETWORK</span>
          <span>SYSTEM STATUS <b className="ml-2 text-[#b6ed71]">OPERATIONAL ●</b></span>
        </div>

        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="atlas-edge" x1="0" x2="1"><stop offset="0" stopColor="#d7ff93" /><stop offset="0.5" stopColor="#90c653" /><stop offset="1" stopColor="#d7ff93" /></linearGradient>
            <filter id="atlas-glow"><feGaussianBlur stdDeviation="0.28" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {agents.map((agent) => {
            const targetCenter = positions[agent.id];
            const source = edgeAnchor(commanderPoint, targetCenter, { x: 12.5, y: 16 });
            const target = edgeAnchor(targetCenter, commanderPoint, { x: 13, y: 10 });
            const connected = comrades[agent.id].connected;
            return <g key={agent.id} className="pointer-events-auto">
              <path d={tacticalPath(source, target)} fill="none" stroke="transparent" strokeWidth="4" className="cursor-pointer" onClick={() => toggleConnection(agent.id)} />
              <motion.path d={tacticalPath(source, target)} fill="none" stroke={connected ? "url(#atlas-edge)" : "#43503d"} strokeWidth={connected ? "0.34" : "0.22"} strokeDasharray={connected ? "0" : "1 1.4"} filter={connected ? "url(#atlas-glow)" : undefined} initial={{ pathLength: 0 }} animate={{ pathLength: 1, opacity: connected ? 0.98 : 0.46 }} transition={{ duration: 0.75 }} />
              <ellipse cx={source.x} cy={source.y} rx="0.35" ry="0.76" fill={connected ? "#efffcf" : "#63705d"} />
              <motion.ellipse cx={target.x} cy={target.y} rx="0.48" ry="1.04" fill={connected ? "#efffcf" : "#63705d"} animate={connected ? { opacity: [0.45, 1, 0.45] } : undefined} transition={{ duration: 1.8, repeat: Infinity }} />
            </g>;
          })}
        </svg>

        <motion.article initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="atlas-commander-card absolute z-10 w-[280px] -translate-x-1/2 -translate-y-1/2 text-center sm:w-[325px]" style={{ left: `${commanderPoint.x}%`, top: `${commanderPoint.y}%` }}>
          <div className="atlas-plate atlas-commander relative px-6 py-7">
            <div className="mx-auto grid h-20 w-20 place-items-center border border-[#b6ed71]/70 bg-[#10190d] text-5xl font-black text-[#efffcf] shadow-[0_0_24px_rgba(182,237,113,0.22)] [clip-path:polygon(50%_0,92%_22%,92%_76%,50%_100%,8%_76%,8%_22%)]">C</div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.26em] text-[#b6ed71]">Command authority</p>
            <h2 className="mt-2 font-mono text-2xl font-semibold uppercase tracking-[0.08em] text-[#f0f3ed]">{commanderName}</h2>
            <p className="mt-2 font-mono text-sm uppercase tracking-[0.28em] text-[#b6ed71]">{commanderStatus}</p>
            <div className="mt-4 border-y border-[#b6ed71]/18 py-2 font-mono text-[10px] tracking-[0.16em] text-[#dff8be]">● SYSTEM ONLINE</div>
            <p className="mt-3 h-8 overflow-hidden text-xs leading-4 text-[#bdc5b7]">{commanderThought || "Ready. Standing by for the council."}</p>
          </div>
        </motion.article>

        {agents.map((agent, index) => {
          const comrade = comrades[agent.id];
          const status = comrade.connected ? comrade.status : "disconnected";
          const thought = comrade.connected ? (comrade.thought || comrade.result || statusText[status]) : statusText.disconnected;
          const point = positions[agent.id];
          return <motion.article key={agent.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className="atlas-agent-card absolute z-10 w-[250px] -translate-x-1/2 -translate-y-1/2 sm:w-[310px]" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
            <div onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); dragRef.current = agent.id; }} className={`atlas-plate relative select-none touch-none px-5 py-4 ${comrade.connected ? "cursor-grab hover:border-[#d7ff93]/70 active:cursor-grabbing" : "cursor-grab border-[#5f665c]/60 opacity-55 grayscale active:cursor-grabbing"}`}>
              <span className="absolute left-5 top-3 font-mono text-sm text-[#b6ed71]">{agent.code}</span><span className="absolute right-5 top-4 text-[9px] tracking-[0.3em] text-[#a5ae9e]">● ●</span>
              <div className="mt-6 flex items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center border border-[#b6ed71]/45 bg-[#0d120c] font-mono text-3xl text-[#c9f185] [clip-path:polygon(20%_0,80%_0,100%_20%,100%_80%,80%_100%,20%_100%,0_80%,0_20%)]">{agent.glyph}</div>
                <div className="min-w-0"><h3 className="font-mono text-xl font-semibold uppercase tracking-[0.06em] text-[#f1f4ef]">{agent.label}</h3><p className="mt-1 text-sm text-[#b6ed71]">{agent.specialty}</p></div>
              </div>
              <div className="my-4 h-px bg-[#b6ed71]/18" />
              <p className="text-sm text-[#c2c9bd]">{thought.length > 66 ? `${thought.slice(0, 66)}…` : thought}</p>
              <span className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-[#0a1008] bg-[#e9ffc5] shadow-[0_0_13px_rgba(205,255,139,0.9)]" />
            </div>
          </motion.article>;
        })}

        <div className="pointer-events-none absolute inset-x-8 bottom-4 flex items-center justify-between font-mono text-[10px] tracking-[0.16em] text-[#99a591]"><span>NETWORK STABLE · {activeCount}/5 COMRADES ONLINE</span><span>ATLAS PROTOCOL v2.4.7</span><span>SECURE LINK · ENCRYPTED</span></div>
      </div>
      {showPrompt && <div className="mt-3 text-center"><p className="font-mono text-xs uppercase tracking-[0.24em] text-[#b6ed71]">Give the Commander a mission</p></div>}
      <AnimatePresence>{notice && <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 border border-amber-200/40 bg-[#1a1d12] px-4 py-2 font-mono text-xs text-amber-100">{notice}</motion.p>}</AnimatePresence>
    </section>
  );
}
