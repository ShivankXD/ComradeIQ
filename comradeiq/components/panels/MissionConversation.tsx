"use client";

import { useEffect, useRef } from "react";

import { CommanderNetworkHero } from "@/components/graph/CommanderNetworkHero";
import { ResultPanel } from "@/components/panels/result-panel";
import { useMissionRealtime } from "@/lib/agents/use-mission-realtime";
import { useCommanderStore } from "@/lib/store";

const copy: Record<string, string> = {
  thinking: "Thinking through your request…", dispatching: "Putting the right work in motion…", delegating: "The team is working on the mission…", synthesizing: "Preparing the final answer…", complete: "Done.", error: "Live AI needs configuration.",
};

export function MissionConversation() {
  const objective = useCommanderStore((state) => state.objective);
  const commanderName = useCommanderStore((state) => state.name);
  const status = useCommanderStore((state) => state.status);
  const thinking = useCommanderStore((state) => state.thinking);
  const missionId = useCommanderStore((state) => state.missionId);
  const error = useCommanderStore((state) => state.error);
  const bottomRef = useRef<HTMLDivElement>(null);

  useMissionRealtime(missionId);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [status, error]);

  if (!objective) return <div className="flex min-h-full items-center justify-center px-5 py-8"><CommanderNetworkHero /></div>;

  return <div className="mx-auto w-full max-w-3xl px-5 py-9 sm:px-8">
    <div className="flex items-start justify-end gap-3"><div className="max-w-[82%] rounded-2xl rounded-tr-md bg-[#303030] px-4 py-3 text-[15px] leading-6 text-[#f4f4f5]">{objective}</div><div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#5b5b64] text-[10px] font-semibold text-white">You</div></div>
    <div className="mt-8 flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#10a37f] text-xs font-semibold text-white">C</div><div className="min-w-0 flex-1"><p className="text-sm font-medium text-[#eeeeef]">{commanderName}</p><p className="mt-1 text-[15px] leading-6 text-[#d1d1d6]">{copy[status] ?? "Working on your request…"}</p>{thinking.length > 0 && status !== "complete" && <details className="mt-3 max-w-xl rounded-xl border border-white/[0.09] bg-white/[0.035] px-3 py-2.5 text-sm text-[#b7b7bf]"><summary className="cursor-pointer select-none text-xs font-medium text-[#d8d8df]">View plan</summary><p className="mt-2 whitespace-pre-wrap leading-6">{thinking.join("")}</p></details>}</div></div>
    {status === "error" && <section className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4"><p className="text-sm font-medium text-amber-100">Live AI isn’t configured</p><p className="mt-1 text-sm leading-6 text-amber-50/75">{error || "Add an OpenAI API key to enable real model responses."}</p><code className="mt-3 block rounded-lg bg-black/20 px-3 py-2 text-xs text-amber-50">OPENAI_API_KEY=…</code></section>}
    <ResultPanel />
    <div ref={bottomRef} />
  </div>;
}
