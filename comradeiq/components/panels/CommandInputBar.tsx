"use client";

import { type FormEvent, type KeyboardEvent, useRef, useState } from "react";

import { launchMission } from "@/lib/agents/mission-client";
import { saveMission } from "@/lib/history/db";
import { flushEvents } from "@/lib/history/recorder";
import { cancelReplay } from "@/lib/history/replay";
import { useCommanderStore, type CommanderStatus, type MissionType } from "@/lib/store";

const inFlight: CommanderStatus[] = ["thinking", "dispatching", "delegating", "monitoring", "synthesizing"];
const maxAttachments = 3;
const maxAttachmentBytes = 4 * 1024 * 1024;
const attachmentAccept = ".txt,.md,.markdown,.json,.csv,.pdf,image/png,image/jpeg,image/webp";

const typeFor = (value: string): MissionType => /\b(presentation|slides?|powerpoint|pptx|deck)\b/i.test(value) ? "presentation" : "general";

function isSupportedAttachment(file: File) {
  return ["text/plain", "text/markdown", "application/json", "text/csv", "application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type)
    || /\.(txt|md|markdown|json|csv|pdf|png|jpe?g|webp)$/i.test(file.name);
}

function formatBytes(value: number) {
  return value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function CommandInputBar() {
  const commanderName = useCommanderStore((state) => state.name);
  const status = useCommanderStore((state) => state.status);
  const [draft, setDraft] = useState("");
  const [useInternet, setUseInternet] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentNotice, setAttachmentNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = inFlight.includes(status);

  function addAttachments(files: FileList | File[]) {
    const incoming = Array.from(files);
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of incoming) {
      if (!isSupportedAttachment(file)) {
        rejected.push(`${file.name} is not a supported attachment.`);
        continue;
      }
      if (file.size > maxAttachmentBytes) {
        rejected.push(`${file.name} is larger than 4 MB.`);
        continue;
      }
      if (attachments.some((item) => item.name === file.name && item.size === file.size) || accepted.some((item) => item.name === file.name && item.size === file.size)) continue;
      if (attachments.length + accepted.length >= maxAttachments) {
        rejected.push(`You can attach up to ${maxAttachments} files.`);
        break;
      }
      accepted.push(file);
    }
    if (accepted.length) setAttachments((current) => [...current, ...accepted]);
    setAttachmentNotice(rejected[0] ?? (accepted.length ? `${accepted.length} file${accepted.length === 1 ? "" : "s"} attached.` : ""));
  }

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const missionText = draft.trim();
    if (!missionText || busy) return;
    const clientMissionId = crypto.randomUUID();
    const selectedAttachments = attachments;
    setDraft("");
    setAttachments([]);
    setAttachmentNotice("");
    cancelReplay();

    try {
      const launched = await launchMission(commanderName, missionText, typeFor(missionText), clientMissionId, { useInternet, attachments: selectedAttachments });
      try {
        await saveMission({ id: launched.missionId, commanderName, missionText, status: "thinking", createdAt: Date.now() });
      } catch (error) {
        // The live mission remains usable even if local history storage is unavailable.
        console.error("Mission started but could not be saved to local history", error);
      }
    } catch (error) {
      try {
        await saveMission({ id: clientMissionId, commanderName, missionText, status: "error", createdAt: Date.now(), completedAt: Date.now() });
      } catch (historyError) {
        console.error("Failed to save the unsuccessful mission", historyError);
      }
      console.error("Mission launch failed", error);
    } finally {
      await flushEvents();
    }
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void submit();
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-3xl" aria-label="Mission composer">
      <input
        ref={fileInput}
        type="file"
        multiple
        className="hidden"
        accept={attachmentAccept}
        data-testid="attachment-input"
        onChange={(event) => {
          if (event.target.files) addAttachments(event.target.files);
          event.target.value = "";
        }}
      />
      <div className="rounded-2xl border border-white/[0.14] bg-[#303633] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.18)] transition focus-within:border-[#68d9b9]/70 focus-within:shadow-[0_12px_32px_rgba(0,0,0,0.2),0_0_0_3px_rgba(16,163,127,0.1)]">
        {attachments.length > 0 && <div className="mb-2 flex flex-wrap gap-2" aria-label="Attached files">{attachments.map((file) => <span key={`${file.name}-${file.size}`} className="flex max-w-full items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.06] px-2 py-1 text-xs text-[#d7e0db]"><span className="truncate">{file.name}</span><span className="shrink-0 text-[#9eaaa4]">{formatBytes(file.size)}</span><button type="button" onClick={() => setAttachments((items) => items.filter((item) => item !== file))} className="ml-1 grid h-4 w-4 shrink-0 place-items-center rounded text-sm leading-none text-[#bac5bf] hover:bg-white/[0.12] hover:text-white" aria-label={`Remove ${file.name}`}>×</button></span>)}</div>}
        <textarea
          id="mission-input"
          data-testid="mission-composer"
          rows={1}
          value={draft}
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={keyDown}
          placeholder={busy ? `${commanderName} is working...` : "Message ComradeIQ"}
          aria-describedby="composer-help"
          className="max-h-40 min-h-12 w-full resize-none bg-transparent px-1 py-1 text-[15px] leading-6 text-[#f4f7f5] outline-none placeholder:text-[#a2aba6] disabled:cursor-not-allowed disabled:opacity-55"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <button type="button" onClick={() => fileInput.current?.click()} disabled={busy || attachments.length >= maxAttachments} data-testid="add-attachment" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg leading-none text-[#d5ded9] transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-45" aria-label="Add attachment" title="Add a supported attachment">+</button>
            <button type="button" onClick={() => setUseInternet((enabled) => !enabled)} disabled={busy} data-testid="internet-toggle" aria-pressed={useInternet} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${useInternet ? "bg-[#10a37f]/20 text-[#9ef0d5]" : "text-[#c0cbc5] hover:bg-white/[0.08]"}`}>{useInternet ? "Web on" : "Search web"}</button>
          </div>
          <button type="submit" disabled={!draft.trim() || busy} data-testid="send-mission" aria-label="Send" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e9f0ec] text-lg font-semibold leading-none text-[#153129] transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#4f5753] disabled:text-[#89928d]">↑</button>
        </div>
      </div>
      <p id="composer-help" className="mt-2 text-center text-[11px] leading-5 text-[#89948e]">Attach text, Markdown, JSON, CSV, PDF, or PNG/JPEG/WebP images (up to {maxAttachments} files, 4 MB each). Images require a compatible configured provider.</p>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{attachmentNotice}</p>
      {attachmentNotice && <p className="mt-1 text-center text-[11px] text-[#c7d2cc]">{attachmentNotice}</p>}
    </form>
  );
}
