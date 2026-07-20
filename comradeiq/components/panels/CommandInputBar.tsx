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

const typeFor = (value: string): MissionType => /\b(presentation|slides?|powerpoint|pptx?|deck)\b/i.test(value) ? "presentation" : "general";

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

    const store = useCommanderStore.getState();
    const isContinuing = store.chatHistory.length > 0;

    // 1. Add user turn to chat history
    store.addChatTurn({
      id: `user-${Date.now()}`,
      role: "user" as const,
      content: missionText,
      timestamp: Date.now(),
    });

    // 2. Compile text context if continuing the same chat
    let compiledPrompt = missionText;
    if (isContinuing) {
      const contextParts = store.chatHistory
        .slice(0, -1) // Exclude the latest user turn which is compiledPrompt
        .map((turn) => `${turn.role === "user" ? "User" : "Commander"}: ${turn.content}`);
      compiledPrompt = `Previous conversation:\n${contextParts.join("\n")}\n\nLatest instruction: ${missionText}`;
    }

    const clientMissionId = crypto.randomUUID();
    const selectedAttachments = attachments;
    setDraft("");
    setAttachments([]);
    setAttachmentNotice("");
    cancelReplay();

    try {
      // Launch mission with compiledPrompt so the AI understands previous questions/turns
      const launched = await launchMission(commanderName, compiledPrompt, typeFor(missionText), clientMissionId, { useInternet, attachments: selectedAttachments });
      // Keep track of the original user prompt for UI display in store
      useCommanderStore.getState().setObjective(missionText);
      try {
        await saveMission({ id: launched.missionId, commanderName, missionText, status: "thinking", createdAt: Date.now() });
      } catch (error) {
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

  const canSubmit = Boolean(draft.trim()) && !busy;

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

      {/* Main input container */}
      <div
        className="rounded-2xl p-3 transition-all duration-200"
        style={{
          background: "rgba(4, 8, 5, 0.60)",
          border: "1px solid rgba(0,229,160,0.14)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
        onFocusCapture={(e) => {
          if ((e.target as HTMLElement).tagName === "TEXTAREA") {
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,229,160,0.35)";
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.28), 0 0 0 3px rgba(0,229,160,0.08)";
          }
        }}
        onBlurCapture={(e) => {
          if ((e.target as HTMLElement).tagName === "TEXTAREA") {
            (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-mid)";
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.28)";
          }
        }}
      >
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5" aria-label="Attached files">
            {attachments.map((file) => (
              <span
                key={`${file.name}-${file.size}`}
                className="flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs"
                style={{
                  background: "rgba(0,229,160,0.07)",
                  border: "1px solid rgba(0,229,160,0.2)",
                  color: "var(--text-secondary)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "var(--accent)" }}
                  aria-hidden="true"
                />
                <span className="truncate" style={{ color: "var(--text-primary)" }}>{file.name}</span>
                <span style={{ color: "var(--text-muted)" }}>{formatBytes(file.size)}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((items) => items.filter((item) => item !== file))}
                  className="ml-0.5 grid h-4 w-4 shrink-0 place-items-center rounded text-xs leading-none transition-all"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,80,80,0.15)";
                    (e.currentTarget as HTMLButtonElement).style.color = "#ff6b6b";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                  }}
                  aria-label={`Remove ${file.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          id="mission-input"
          data-testid="mission-composer"
          rows={1}
          value={draft}
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={keyDown}
          placeholder={busy ? `${commanderName} is working…` : "Give the Commander a mission…"}
          aria-describedby="composer-help"
          className="max-h-40 min-h-12 w-full resize-none bg-transparent px-1 py-1 text-[15px] leading-6 outline-none disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            color: "var(--text-primary)",
            caretColor: "var(--accent)",
          }}
        />

        {/* Toolbar */}
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1">
            {/* Attach */}
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy || attachments.length >= maxAttachments}
              data-testid="add-attachment"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-base leading-none transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
              }}
              aria-label="Add attachment"
              title="Add a supported attachment"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            {/* Web search toggle */}
            <button
              type="button"
              onClick={() => setUseInternet((enabled) => !enabled)}
              disabled={busy}
              data-testid="internet-toggle"
              aria-pressed={useInternet}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40"
              style={
                useInternet
                  ? {
                      background: "rgba(0,229,160,0.1)",
                      border: "1px solid rgba(0,229,160,0.25)",
                      color: "var(--accent)",
                    }
                  : {
                      background: "transparent",
                      border: "1px solid transparent",
                      color: "var(--text-muted)",
                    }
              }
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled && !useInternet) {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!useInternet) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                }
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
              {useInternet ? "Web on" : "Web search"}
            </button>
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!canSubmit}
            data-testid="send-mission"
            aria-label="Send"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-bold leading-none transition-all duration-150 disabled:cursor-not-allowed"
            style={
              canSubmit
                ? {
                    background: "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)",
                    color: "#060f0a",
                    boxShadow: "0 0 18px rgba(0,229,160,0.3)",
                  }
                : {
                    background: "rgba(255,255,255,0.07)",
                    color: "var(--text-muted)",
                  }
            }
            onMouseEnter={(e) => {
              if (canSubmit) {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 28px rgba(0,229,160,0.5)";
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (canSubmit) {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 18px rgba(0,229,160,0.3)";
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              }
            }}
          >
            ↑
          </button>
        </div>
      </div>

      <p
        id="composer-help"
        className="mt-2 text-center text-[10px] leading-5"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}
      >
        txt · md · json · csv · pdf · png/jpg/webp — up to {maxAttachments} files, 4 MB each
      </p>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{attachmentNotice}</p>
      {attachmentNotice && (
        <p className="mt-1 text-center text-[11px]" style={{ color: "var(--text-secondary)" }}>{attachmentNotice}</p>
      )}
    </form>
  );
}
