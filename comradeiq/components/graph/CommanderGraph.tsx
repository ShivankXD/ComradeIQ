"use client";

import {
  BaseEdge,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  getBezierPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCommanderStore, type ComradeStatus } from "@/lib/store";
import { useMissionRealtime } from "@/lib/agents/use-mission-realtime";
import { BusTray } from "@/components/panels/BusTray";
import { ThinkingDropdown } from "@/components/panels/ThinkingDropdown";

type CommanderNodeData = { name: string; status: string; thinking: string };
type ComradeNodeData = { label: string; status: ComradeStatus; connected: boolean; thinking?: string; output?: string };
type EdgeFlight = { id: string; direction: "outbound" | "inbound"; color: string };

const statusTone: Record<ComradeStatus, string> = {
  idle: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  thinking: "border-violet-400/50 bg-violet-400/10 text-violet-200",
  working: "border-cyan-400/50 bg-cyan-400/10 text-cyan-200",
  done: "border-emerald-400/50 bg-emerald-400/10 text-emerald-200",
  disconnected: "border-rose-400/50 bg-rose-400/10 text-rose-200",
};

export function CommanderNode({ data }: NodeProps) {
  const commander = data as unknown as CommanderNodeData;

  return (
    <div className={`relative grid h-44 w-52 place-items-center p-px [filter:drop-shadow(0_0_18px_rgba(255,45,45,0.58))] ${commander.status === "idle" ? "commander-idle-pulse" : ""}`}>
      <Handle type="source" position={Position.Top} className="!h-1 !w-1 !border-0 !bg-[#ff2d2d]" />
      <Handle type="source" position={Position.Right} className="!h-1 !w-1 !border-0 !bg-[#ff2d2d]" />
      <Handle type="source" position={Position.Bottom} className="!h-1 !w-1 !border-0 !bg-[#ff2d2d]" />
      <Handle type="source" position={Position.Left} className="!h-1 !w-1 !border-0 !bg-[#ff2d2d]" />
      <div className="absolute -top-[74px] left-1/2 w-72 -translate-x-1/2 border border-[#ff2d2d]/30 bg-[#120b0e]/95 px-3 py-2 font-mono shadow-[0_0_16px_rgba(255,45,45,0.12)]">
        <p className="text-[8px] tracking-[0.2em] text-red-300/70">COMMANDER THINKING / LIVE</p>
        <p className="mt-1 max-h-11 overflow-hidden text-[10px] leading-4 text-slate-200/85">
          {commander.thinking || "Awaiting mission analysis…"}
          {commander.status === "thinking" && <span className="ml-1 inline-block h-2 w-1 animate-pulse bg-red-300 align-middle" />}
        </p>
      </div>
      <div className="absolute inset-0 bg-[#ff2d2d] [clip-path:polygon(50%_0%,96%_17%,89%_76%,50%_100%,11%_76%,4%_17%)]" />
      <div className="absolute inset-[2px] grid place-items-center bg-[#160b0d] [clip-path:polygon(50%_0%,96%_17%,89%_76%,50%_100%,11%_76%,4%_17%)]">
        <div className="text-center font-mono">
          <p className="text-[10px] tracking-[0.3em] text-[#ff9595]/70">COMMAND NODE</p>
          <h2 className="mt-2 text-lg font-bold tracking-[0.16em] text-red-50">{commander.name}</h2>
          <div className="mt-2 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#ff9595]">
            <span>{commander.status}</span>
            <ThinkingDropdown label="Commander" thinking={commander.thinking} tone="red" placement="top" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComradeNode({ data }: NodeProps) {
  const comrade = data as unknown as ComradeNodeData;
  const displayedStatus = comrade.connected ? comrade.status : "disconnected";
  const liveUpdate = comrade.output || comrade.thinking;

  return (
    <div className={`relative grid h-40 w-40 place-items-center rounded-full border border-[#2d6bff]/85 bg-[#08111d] text-center font-mono shadow-[0_0_24px_rgba(45,107,255,0.38),inset_0_0_18px_rgba(45,107,255,0.15)] transition-all duration-300 ${comrade.connected ? "comrade-breathe" : "grayscale opacity-35 saturate-0"}`}>
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-[#2d6bff]" />
      <div className="absolute inset-2 rounded-full border border-[#2d6bff]/15" />
      <div className="relative flex flex-col items-center gap-1.5 px-3">
        <span className="text-[10px] tracking-[0.18em] text-blue-200/65">COMRADE</span>
        <span className="text-xs font-bold tracking-[0.1em] text-blue-50">{comrade.label}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider ${statusTone[displayedStatus]}`}>
          {displayedStatus}
        </span>
        <ThinkingDropdown label={comrade.label} thinking={comrade.thinking} />
        {comrade.connected && liveUpdate && (
          <p className="max-h-7 overflow-hidden text-[8px] leading-3 text-blue-100/80">{liveUpdate.slice(-88)}</p>
        )}
        {!comrade.connected && (
          <motion.p
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="mt-0.5 max-w-28 text-[8px] leading-3 text-blue-100"
          >
            Commander, we are protecting the castle wall.
          </motion.p>
        )}
      </div>
    </div>
  );
}

function GradientEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const gradientId = `commander-gradient-${id}`;
  const flight = (data as { flight?: EdgeFlight } | undefined)?.flight;
  const isOutbound = flight?.direction === "outbound";

  return (
    <>
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0%" stopColor="#ff2d2d" />
          <stop offset="48%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#2d6bff" />
        </linearGradient>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className="commander-gradient-edge"
        style={{ ...style, stroke: `url(#${gradientId})`, strokeWidth: 1.75 }}
      />
      {flight && (
        <motion.circle
          key={flight.id}
          r="5"
          fill={flight.color}
          filter={`drop-shadow(0 0 5px ${flight.color})`}
          initial={{ cx: isOutbound ? sourceX : targetX, cy: isOutbound ? sourceY : targetY, opacity: 0 }}
          animate={{
            cx: isOutbound ? [sourceX, (sourceX + targetX) / 2, targetX] : [targetX, (sourceX + targetX) / 2, sourceX],
            cy: isOutbound ? [sourceY, (sourceY + targetY) / 2, targetY] : [targetY, (sourceY + targetY) / 2, sourceY],
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: 1.25, ease: "easeInOut" }}
        />
      )}
    </>
  );
}

const nodeTypes = { commander: CommanderNode, comrade: ComradeNode };
const edgeTypes = { gradient: GradientEdge };

const positions = [
  { x: 440, y: 46 },
  { x: 720, y: 235 },
  { x: 615, y: 555 },
  { x: 265, y: 555 },
  { x: 155, y: 235 },
];

const roles = ["researcher", "writer", "formatter", "critic", "assembler"] as const;

export function CommanderGraph() {
  const commanderName = useCommanderStore((state) => state.name);
  const commanderStatus = useCommanderStore((state) => state.status);
  const comrades = useCommanderStore((state) => state.comrades);
  const missionId = useCommanderStore((state) => state.missionId);
  const objective = useCommanderStore((state) => state.objective);
  const thinking = useCommanderStore((state) => state.thinking);
  const messages = useCommanderStore((state) => state.busMessages);
  const toggleComradeConnection = useCommanderStore((state) => state.toggleComradeConnection);
  const [toast, setToast] = useState<string | null>(null);
  const [flights, setFlights] = useState<Record<string, EdgeFlight>>({});
  const [soundEnabled, setSoundEnabled] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageId = useRef<string | null>(null);

  useMissionRealtime(missionId);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    const message = messages.at(-1);
    if (!message || message.id === lastMessageId.current) return;
    lastMessageId.current = message.id;

    const role = message.from === "commander" ? message.to : message.from;
    if (!roles.includes(role as (typeof roles)[number])) return;
    const direction = message.from === "commander" ? "outbound" : "inbound";
    const flight: EdgeFlight = { id: message.id, direction, color: direction === "outbound" ? "#ff2d2d" : "#2d6bff" };
    setFlights((current) => ({ ...current, [role]: flight }));
    const timeout = setTimeout(() => setFlights((current) => {
      const rest = { ...current };
      delete rest[role];
      return rest;
    }), 1300);

    if (soundEnabled && typeof window !== "undefined") {
      const AudioContextClass = window.AudioContext;
      if (AudioContextClass) {
        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = direction === "outbound" ? 620 : 360;
        gain.gain.setValueAtTime(0.035, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.09);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.1);
      }
    }
    return () => clearTimeout(timeout);
  }, [messages, soundEnabled]);

  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    if (toggleComradeConnection(edge.target)) return;

    setToast("At least 2 Comrades must stay operational.");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, [toggleComradeConnection]);

  const nodes: Node[] = [
    {
      id: "commander",
      type: "commander",
      position: { x: 455, y: 322 },
      data: { name: commanderName, status: commanderStatus, thinking: thinking.join("") },
      draggable: false,
    },
    ...roles.map((role, index) => ({
      id: role,
      type: "comrade",
      position: positions[index],
      data: {
        label: role.toUpperCase(),
        status: comrades[role].status,
        connected: comrades[role].connected,
        thinking: comrades[role].thought,
        output: comrades[role].result,
      },
      draggable: false,
    })),
  ];

  const edges: Edge[] = roles.map((role) => ({
    id: `commander-${role}`,
    source: "commander",
    target: role,
    type: "gradient",
    animated: comrades[role].connected,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#2d6bff", width: 16, height: 16 },
    style: { cursor: "pointer", opacity: comrades[role].connected ? 1 : 0.2 },
    data: { flight: flights[role] },
  }));

  return (
    <section className="relative h-full w-full overflow-hidden">
      <div className="pointer-events-none absolute left-4 top-3 z-10 font-mono text-[10px] tracking-[0.16em] text-red-200/65">MISSION: {objective || "UNNAMED"} &nbsp;|&nbsp; STATUS: {commanderStatus.toUpperCase()} &nbsp;|&nbsp; {Object.values(comrades).filter((comrade) => comrade.connected).length}/5 COMRADES ACTIVE</div>
      <button type="button" onClick={() => setSoundEnabled((enabled) => !enabled)} className={`absolute right-4 top-3 z-20 border px-2 py-1 font-mono text-[9px] tracking-[0.12em] transition ${soundEnabled ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-100" : "border-slate-400/30 bg-black/20 text-slate-400"}`}>SOUND {soundEnabled ? "ON" : "OFF"}</button>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 border border-amber-300/50 bg-[#1a1307]/95 px-4 py-3 font-mono text-xs text-amber-100 shadow-[0_0_22px_rgba(251,191,36,0.2)]"
        >
          {toast}
        </motion.div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.16 }}
        nodesConnectable={false}
        nodesDraggable={false}
        elementsSelectable={false}
        onEdgeClick={handleEdgeClick}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
      >
        {/* No React Flow <Background>: the zone's graph-paper grid is the texture. */}
        <Controls showInteractive={false} className="!border-blue-400/20 !bg-[#0d1420] !fill-blue-200" />
      </ReactFlow>
      <BusTray />
    </section>
  );
}
