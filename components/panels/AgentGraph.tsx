"use client";

import { useMemo } from "react";

import { useCommanderStore, type ComradeStatus } from "@/lib/store";

/**
 * Live multi-agent DAG. Each specialist node reflects its real mission status
 * (idle → thinking → working → done), and dependency edges light up as upstream
 * work completes — the same topology the orchestrator executes server-side.
 */

interface GraphNode {
  id: string;
  label: string;
  short: string;
  x: number;
  y: number;
}

// viewBox is 720 x 210. Commander orchestrates; the pipeline flows left→right.
const COMMANDER: GraphNode = { id: "commander", label: "Commander", short: "C", x: 60, y: 105 };
const NODES: GraphNode[] = [
  { id: "researcher", label: "Researcher", short: "R", x: 250, y: 48 },
  { id: "writer", label: "Writer", short: "W", x: 250, y: 162 },
  { id: "formatter", label: "Formatter", short: "F", x: 410, y: 105 },
  { id: "critic", label: "Critic", short: "Cr", x: 550, y: 105 },
  { id: "assembler", label: "Assembler", short: "A", x: 668, y: 105 },
];

// Directed dependency edges [from, to] — matches orchestrator buildAgentDag.
const EDGES: Array<[string, string]> = [
  ["commander", "researcher"],
  ["commander", "writer"],
  ["researcher", "formatter"],
  ["writer", "formatter"],
  ["formatter", "critic"],
  ["critic", "assembler"],
];

const COLORS: Record<ComradeStatus | "commander", { ring: string; fill: string; text: string; glow: string }> = {
  idle: { ring: "rgba(255,255,255,0.14)", fill: "rgba(255,255,255,0.03)", text: "var(--text-muted)", glow: "none" },
  disconnected: { ring: "rgba(255,255,255,0.06)", fill: "rgba(255,255,255,0.015)", text: "rgba(255,255,255,0.2)", glow: "none" },
  thinking: { ring: "#fbbf24", fill: "rgba(251,191,36,0.12)", text: "#fbbf24", glow: "rgba(251,191,36,0.55)" },
  working: { ring: "#00e5a0", fill: "rgba(0,229,160,0.14)", text: "#00e5a0", glow: "rgba(0,229,160,0.7)" },
  done: { ring: "rgba(0,229,160,0.6)", fill: "rgba(0,229,160,0.1)", text: "#a0f0d0", glow: "rgba(0,229,160,0.25)" },
  commander: { ring: "#00e5a0", fill: "rgba(0,229,160,0.16)", text: "#00e5a0", glow: "rgba(0,229,160,0.5)" },
};

function edgePath(from: GraphNode, to: GraphNode) {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x + 22} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x - 22} ${to.y}`;
}

export function AgentGraph() {
  const comrades = useCommanderStore((state) => state.comrades);
  const status = useCommanderStore((state) => state.status);

  const missionOver = status === "complete" || status === "cancelled" || status === "error";
  const commanderActive = !missionOver && status !== "idle";

  const nodeState = useMemo(() => {
    const map = new Map<string, ComradeStatus>();
    for (const node of NODES) {
      const comrade = comrades[node.id];
      if (!comrade || !comrade.connected) {
        map.set(node.id, "disconnected");
      } else {
        map.set(node.id, comrade.status);
      }
    }
    return map;
  }, [comrades]);

  const anyActive = useMemo(
    () => [...nodeState.values()].some((s) => s === "thinking" || s === "working" || s === "done"),
    [nodeState],
  );

  return (
    <div
      className="mt-6 rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}
      aria-label="Live multi-agent execution graph"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border-dim)" }}>
        <p className="text-[9px] font-semibold uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.2em", fontFamily: "var(--font-code)" }}>
          Agent network
        </p>
        <div className="flex items-center gap-3">
          {[
            { label: "Working", color: "#00e5a0" },
            { label: "Thinking", color: "#fbbf24" },
            { label: "Done", color: "#a0f0d0" },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1 text-[9px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} aria-hidden="true" />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="px-2 py-2">
        <svg viewBox="0 0 720 210" role="img" aria-label="Multi-agent dependency graph" style={{ width: "100%", height: "auto", display: "block" }}>
          {/* Edges */}
          {EDGES.map(([fromId, toId]) => {
            const from = fromId === "commander" ? COMMANDER : NODES.find((n) => n.id === fromId)!;
            const to = toId === "commander" ? COMMANDER : NODES.find((n) => n.id === toId)!;
            const fromDone = fromId === "commander" ? commanderActive || missionOver : nodeState.get(fromId) === "done";
            const toBusy = nodeState.get(toId) === "thinking" || nodeState.get(toId) === "working";
            const flowing = fromDone && toBusy;
            const lit = fromDone;
            return (
              <g key={`${fromId}-${toId}`}>
                <path
                  d={edgePath(from, to)}
                  fill="none"
                  stroke={lit ? "rgba(0,229,160,0.5)" : "rgba(255,255,255,0.08)"}
                  strokeWidth={lit ? 1.6 : 1}
                  style={{ transition: "stroke 0.5s ease" }}
                />
                {flowing && (
                  <path
                    d={edgePath(from, to)}
                    fill="none"
                    stroke="#00e5a0"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeDasharray="6 90"
                    style={{ filter: "drop-shadow(0 0 4px rgba(0,229,160,0.9))" }}
                  >
                    <animate attributeName="stroke-dashoffset" from="96" to="0" dur="1.1s" repeatCount="indefinite" />
                  </path>
                )}
              </g>
            );
          })}

          {/* Commander node */}
          <GraphCircle node={COMMANDER} palette={COLORS.commander} pulsing={commanderActive} label="Commander" />

          {/* Specialist nodes */}
          {NODES.map((node) => {
            const s = nodeState.get(node.id) ?? "idle";
            const palette = COLORS[s];
            const pulsing = s === "thinking" || s === "working";
            return <GraphCircle key={node.id} node={node} palette={palette} pulsing={pulsing} done={s === "done"} label={node.label} />;
          })}
        </svg>
      </div>

      {!anyActive && !missionOver && (
        <p className="px-4 pb-3 text-center text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>
          Specialists activate as the Commander delegates the mission.
        </p>
      )}
    </div>
  );
}

function GraphCircle({
  node,
  palette,
  pulsing,
  done,
  label,
}: {
  node: GraphNode;
  palette: { ring: string; fill: string; text: string; glow: string };
  pulsing?: boolean;
  done?: boolean;
  label: string;
}) {
  return (
    <g>
      {pulsing && (
        <circle cx={node.x} cy={node.y} r={22} fill="none" stroke={palette.ring} strokeWidth={1.5} opacity={0.5}>
          <animate attributeName="r" from="20" to="30" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.5" to="0" dur="1.6s" repeatCount="indefinite" />
        </circle>
      )}
      <circle
        cx={node.x}
        cy={node.y}
        r={20}
        fill={palette.fill}
        stroke={palette.ring}
        strokeWidth={1.8}
        style={{ transition: "all 0.4s ease", filter: palette.glow !== "none" ? `drop-shadow(0 0 8px ${palette.glow})` : "none" }}
      />
      {done ? (
        <path
          d={`M ${node.x - 6} ${node.y} L ${node.x - 1.5} ${node.y + 5} L ${node.x + 7} ${node.y - 6}`}
          fill="none"
          stroke="#a0f0d0"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill={palette.text} style={{ fontFamily: "var(--font-code)" }}>
          {node.short}
        </text>
      )}
      <text x={node.x} y={node.y + 36} textAnchor="middle" fontSize={10} fill={palette.text} style={{ fontFamily: "var(--font-code)", letterSpacing: "0.02em", transition: "fill 0.4s ease" }}>
        {label}
      </text>
    </g>
  );
}
