"use client";

import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNode } from "./agent-node";

const nodeTypes = { agent: AgentNode };

interface MissionGraphProps {
  nodes?: Node[];
  edges?: Edge[];
}

export function MissionGraph({ nodes = [], edges = [] }: MissionGraphProps) {
  return (
    <div className="h-full min-h-96 w-full bg-[#0a0a0a]">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Background color="#1d332b" gap={24} />
        <Controls className="!border-emerald-400/20 !bg-[#101512] !fill-emerald-200" />
      </ReactFlow>
    </div>
  );
}
