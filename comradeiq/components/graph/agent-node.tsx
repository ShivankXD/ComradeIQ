"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

export type AgentNodeData = {
  label: string;
  specialty: string;
  status: string;
};

export function AgentNode({ data }: NodeProps) {
  const agent = data as unknown as AgentNodeData;

  return (
    <div className="min-w-44 border border-emerald-400/40 bg-[#101512] px-3 py-2 font-mono text-xs text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.12)]">
      <Handle type="target" position={Position.Left} className="!bg-emerald-400" />
      <p className="font-semibold tracking-[0.12em]">{agent.label}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-emerald-300/70">{agent.specialty}</p>
      <p className="mt-2 text-[10px] text-emerald-200/70">{agent.status}</p>
      <Handle type="source" position={Position.Right} className="!bg-emerald-400" />
    </div>
  );
}
