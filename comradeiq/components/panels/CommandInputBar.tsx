"use client";

import { FormEvent, KeyboardEvent, useState } from "react";

import { launchMission } from "@/lib/agents/mission-client";
import { patchMission, saveMission } from "@/lib/history/db";
import { flushEvents } from "@/lib/history/recorder";
import { cancelReplay } from "@/lib/history/replay";
import { useCommanderStore, type CommanderStatus } from "@/lib/store";

const inFlight: CommanderStatus[] = ["thinking", "dispatching", "delegating", "synthesizing"];

export function CommandInputBar() {
  const commanderName = useCommanderStore((state) => state.name);
  const missionType = useCommanderStore((state) => state.missionType);
  const status = useCommanderStore((state) => state.status);
  const [draft, setDraft] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const busy = inFlight.includes(status);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const missionText = draft.trim();
    if (!missionText || busy) return;

    setDraft("");
    cancelReplay();
    const id = crypto.randomUUID();
    await saveMission({ id, commanderName, missionText, status: "thinking", createdAt: Date.now() });
    try {
      await launchMission(commanderName, missionText, missionType, id);
    } catch (error) {
      console.error("Mission launch failed", error);
      await patchMission(id, { status: "error", completedAt: Date.now() });
    } finally {
      await flushEvents();
    }
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-3xl">
      <div className={`rounded-2xl border bg-[#2f2f2f] p-3 shadow-lg transition ${isFocused ? "border-[#6b6b73]" : "border-white/[0.13]"}`}>
        <label className="sr-only" htmlFor="mission-input">Message</label>
        <textarea id="mission-input" rows={1} value={draft} disabled={busy} onChange={(event) => setDraft(event.target.value)} onKeyDown={keyDown} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} placeholder={busy ? `${commanderName} is working…` : "Message ComradeIQ"} className="max-h-40 min-h-12 w-full resize-none bg-transparent px-1 py-1 text-[15px] leading-6 text-[#f2f2f2] outline-none placeholder:text-[#8b8b94] disabled:cursor-not-allowed disabled:opacity-50" />
        <div className="mt-2 flex items-center justify-between">
          <span className="rounded-md bg-white/[0.07] px-2 py-1 text-[11px] text-[#b3b3bc]">Generate presentation</span>
          <button type="submit" disabled={!draft.trim() || busy} aria-label="Send message" className="grid h-8 w-8 place-items-center rounded-lg bg-[#ececec] text-lg font-semibold leading-none text-[#222] transition hover:bg-white disabled:bg-[#4a4a4f] disabled:text-[#777]">↑</button>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-[#777780]">ComradeIQ can make mistakes. Check important information.</p>
    </form>
  );
}
