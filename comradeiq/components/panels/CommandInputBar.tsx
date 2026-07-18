"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";

import { launchMission } from "@/lib/agents/mission-client";
import { patchMission, saveMission } from "@/lib/history/db";
import { flushEvents } from "@/lib/history/recorder";
import { cancelReplay } from "@/lib/history/replay";
import { useCommanderStore, type CommanderStatus, type MissionType } from "@/lib/store";

const inFlight: CommanderStatus[] = ["thinking", "dispatching", "delegating", "synthesizing"];
const typeFor = (value: string): MissionType => /\b(presentation|slides?|powerpoint|pptx|deck)\b/i.test(value) ? "presentation" : "general";

export function CommandInputBar() {
  const commanderName = useCommanderStore((state) => state.name);
  const status = useCommanderStore((state) => state.status);
  const [draft, setDraft] = useState("");
  const [useInternet, setUseInternet] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = inFlight.includes(status);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const missionText = draft.trim();
    if (!missionText || busy) return;
    const id = crypto.randomUUID();
    const attachmentContext = await Promise.all(attachments.slice(0, 3).map(async (file) => {
      if (file.type.startsWith("text/") || /\.(md|txt|json|csv)$/i.test(file.name)) return `${file.name}:\n${(await file.text()).slice(0, 12000)}`;
      return `[Attached reference: ${file.name} (${file.type || "media"})]`;
    }));
    setDraft(""); setAttachments([]); cancelReplay();
    await saveMission({ id, commanderName, missionText, status: "thinking", createdAt: Date.now() });
    try { await launchMission(commanderName, missionText, typeFor(missionText), id, { useInternet, attachmentContext }); }
    catch (error) { console.error("Mission launch failed", error); await patchMission(id, { status: "error", completedAt: Date.now() }); }
    finally { await flushEvents(); }
  }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }

  return <form onSubmit={submit} className="mx-auto w-full max-w-3xl">
    <input ref={fileInput} type="file" multiple className="hidden" accept="image/*,video/*,audio/*,.txt,.md,.json,.csv,.pdf" onChange={(event) => setAttachments(Array.from(event.target.files ?? []).slice(0, 3))} />
    <div className="rounded-2xl border border-white/[0.13] bg-[#303030] p-3 shadow-lg transition focus-within:border-[#6d6d76]">
      {attachments.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{attachments.map((file) => <span key={`${file.name}-${file.size}`} className="flex items-center gap-1 rounded-lg bg-white/[0.08] px-2 py-1 text-xs text-[#d2d2d8]">{file.name}<button type="button" onClick={() => setAttachments((items) => items.filter((item) => item !== file))} className="ml-1 text-[#93939c] hover:text-white" aria-label={`Remove ${file.name}`}>×</button></span>)}</div>}
      <textarea id="mission-input" rows={1} value={draft} disabled={busy} onChange={(event) => setDraft(event.target.value)} onKeyDown={keyDown} placeholder={busy ? `${commanderName} is working…` : "Message ComradeIQ"} className="max-h-40 min-h-12 w-full resize-none bg-transparent px-1 py-1 text-[15px] leading-6 text-[#f2f2f2] outline-none placeholder:text-[#8b8b94] disabled:opacity-50" />
      <div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-2"><button type="button" onClick={() => fileInput.current?.click()} className="grid h-8 w-8 place-items-center rounded-lg text-lg text-[#c9c9d0] transition hover:bg-white/[0.09]" aria-label="Add media or reference" title="Add media or reference">+</button><button type="button" onClick={() => setUseInternet((enabled) => !enabled)} className={`rounded-lg px-2 py-1 text-xs transition ${useInternet ? "bg-[#10a37f]/20 text-[#78e0c1]" : "text-[#a5a5ae] hover:bg-white/[0.08]"}`}>{useInternet ? "Web on" : "Search web"}</button></div><button type="submit" disabled={!draft.trim() || busy} aria-label="Send" className="grid h-8 w-8 place-items-center rounded-lg bg-[#ececec] text-lg font-semibold leading-none text-[#222] transition hover:bg-white disabled:bg-[#4a4a4f] disabled:text-[#777]">↑</button></div>
    </div>
    <p className="mt-2 text-center text-[11px] text-[#777780]">Attach text, images, or files for reference. Check important information.</p>
  </form>;
}
