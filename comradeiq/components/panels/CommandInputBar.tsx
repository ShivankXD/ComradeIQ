"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";

import { launchMission } from "@/lib/agents/mission-client";
import { patchMission, saveMission } from "@/lib/history/db";
import { flushEvents } from "@/lib/history/recorder";
import { cancelReplay } from "@/lib/history/replay";
import { useCommanderStore, type CommanderStatus, type MissionType } from "@/lib/store";

const inFlight: CommanderStatus[] = ["thinking", "dispatching", "delegating", "synthesizing"];

function missionTypeFor(message: string): MissionType {
  return /\b(presentation|slides?|powerpoint|pptx|deck)\b/i.test(message) ? "presentation" : "general";
}

export function CommandInputBar() {
  const commanderName = useCommanderStore((state) => state.name);
  const status = useCommanderStore((state) => state.status);
  const [draft, setDraft] = useState("");
  const [useInternet, setUseInternet] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = inFlight.includes(status);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const missionText = draft.trim();
    if (!missionText || busy) return;
    const id = crypto.randomUUID();
    const attachmentContext = await Promise.all(attachments.slice(0, 3).map(async (file) => {
      if (file.type.startsWith("text/") || /\.(md|txt|json|csv)$/i.test(file.name)) return `${file.name}:\n${(await file.text()).slice(0, 12000)}`;
      return `${file.name} (${file.type || "media reference"})`;
    }));
    const missionType = missionTypeFor(missionText);
    setDraft("");
    setAttachments([]);
    cancelReplay();
    await saveMission({ id, commanderName, missionText, status: "thinking", createdAt: Date.now() });
    try {
      await launchMission(commanderName, missionText, missionType, id, { useInternet, attachmentContext });
    } catch (error) {
      console.error("Mission launch failed", error);
      await patchMission(id, { status: "error", completedAt: Date.now() });
    } finally { await flushEvents(); }
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); }
  }

  return <form onSubmit={submit} className="mx-auto w-full max-w-3xl">
    <input ref={fileInputRef} className="hidden" type="file" multiple accept="image/*,video/*,audio/*,.txt,.md,.json,.csv,.pdf" onChange={(event) => setAttachments(Array.from(event.target.files ?? []).slice(0, 3))} />
    <div className="border border-[#b6ed71]/30 bg-[#0a0e09] p-2 shadow-[0_0_28px_rgba(156,220,79,0.08)] [clip-path:polygon(12px_0,calc(100%-12px)_0,100%_12px,100%_calc(100%-12px),calc(100%-12px)_100%,12px_100%,0_calc(100%-12px),0_12px)]">
      {attachments.length > 0 && <div className="flex flex-wrap gap-1.5 px-2 pt-1">{attachments.map((file) => <span key={`${file.name}-${file.size}`} className="rounded border border-[#b6ed71]/25 bg-[#172015] px-2 py-1 font-mono text-[10px] text-[#d8f7af]">{file.name}</span>)}</div>}
      <textarea id="mission-input" rows={1} value={draft} disabled={busy} onChange={(event) => setDraft(event.target.value)} onKeyDown={keyDown} placeholder={busy ? `${commanderName} is coordinating…` : "Give the Commander a mission…"} className="min-h-12 w-full resize-none bg-transparent px-3 py-2 text-[15px] text-[#eef3ea] outline-none placeholder:text-[#7c8577] disabled:opacity-50" />
      <div className="flex items-center justify-between border-t border-[#b6ed71]/15 px-1 pt-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="grid h-8 w-8 place-items-center border border-[#b6ed71]/30 text-lg text-[#d6f7a7] transition hover:bg-[#b6ed71]/10" aria-label="Add media or reference" title="Add media or reference">+</button>
          <button type="button" onClick={() => setUseInternet((enabled) => !enabled)} className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition ${useInternet ? "border-[#b6ed71]/65 bg-[#b6ed71]/10 text-[#d8ffa7]" : "border-white/[0.12] text-[#8f988a]"}`}>◎ Use internet</button>
          <span className="hidden font-mono text-[10px] text-[#7e8978] sm:inline">AUTO ROUTING · {missionTypeFor(draft).toUpperCase()}</span>
        </div>
        <button type="submit" disabled={!draft.trim() || busy} aria-label="Send mission" className="grid h-8 w-9 place-items-center border border-[#cfff89]/55 bg-[#b6ed71] font-mono text-lg font-bold text-[#0a1008] transition hover:bg-[#d9ffab] disabled:border-white/[0.08] disabled:bg-[#343a31] disabled:text-[#6f766b]">↑</button>
      </div>
    </div>
    <p className="mt-2 text-center font-mono text-[10px] tracking-[0.08em] text-[#687163]">SECURE CHANNEL · ATTACH TEXT, MEDIA, OR REFERENCE FILES · REVIEW IMPORTANT OUTPUTS</p>
  </form>;
}
