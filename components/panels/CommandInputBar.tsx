"use client";

import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";

import { launchMission } from "@/lib/agents/mission-client";
import { saveMission } from "@/lib/history/db";
import { flushEvents } from "@/lib/history/recorder";
import { cancelReplay } from "@/lib/history/replay";
import { useCommanderStore, type ChatWidget, type CommanderStatus, type MissionType } from "@/lib/store";

const inFlight: CommanderStatus[] = ["thinking", "dispatching", "delegating", "monitoring", "synthesizing"];
const maxAttachments = 3;
const maxAttachmentBytes = 4 * 1024 * 1024;
const attachmentAccept = ".txt,.md,.markdown,.json,.csv,.pdf,image/png,image/jpeg,image/webp";

const typeFor = (value: string): MissionType => /\b(presentation|slides?|powerpoint|pptx?|deck)\b/i.test(value) ? "presentation" : "general";

// Interactive chat commands that open a widget instead of running a mission.
const CHESS_CMD = /\b(?:play|start|begin|game of)\s+chess\b|\bchess\s+(?:game|match|with\s+me)\b|let'?s\s+play\s+chess|^\s*chess\s*$/i;
// Video intent: a request verb near "video/clip/trailer/youtube", OR "video/clip
// of/about/…", OR an explicit youtube/yt/music-video mention. "video game(s)" as a
// bare topic is excluded so document/slide asks about games don't hijack.
const VIDEO_CMD = /\b(?:show|find|get|give|play|search|watch|pull\s+up|want|need|fetch|display)\b[^.?!]*\b(?:videos?|clips?|trailers?|youtube|yt)\b|\b(?:videos?|clips?|trailers?)\s+(?:of|about|on|for|showing|with|walkthrough)\b|\byoutube\b|\byt\b|\bmusic\s+video\b/i;

function extractVideoQuery(text: string): string {
  let q = text.replace(/\b(?:please|hey|can you|could you|would you|i(?:'d)?\s*(?:want|like|need)|give me|get me|show me|find me)\b/gi, " ");
  q = q.replace(/\b(?:show|find|play|search(?:\s+for)?|get|give|watch|pull\s+up|display|fetch|need|want)\b/gi, " ");
  q = q.replace(/\b(?:a|an|the)?\s*(?:youtube\s*)?(?:music\s*)?(?:videos?|clips?|trailers?)\s*(?:of|about|on|for|showing|with)?\b/gi, " ");
  q = q.replace(/\b(?:showing|walkthrough\s+of|walkthrough)\b/gi, " walkthrough ");
  q = q.replace(/\b(?:from|on|in|via|off(?:\s+of)?)\s+(?:youtube|yt)\b/gi, " ");
  q = q.replace(/\b(?:youtube|yt)\b/gi, " ");
  q = q.replace(/^[\s,]*(?:a|an|the)\s+/i, "");
  q = q.replace(/[?.!]+\s*$/g, "").replace(/\s+/g, " ").trim();
  return q || text;
}

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
  const seedPrompt = useCommanderStore((state) => state.seedPrompt);
  const setSeedPrompt = useCommanderStore((state) => state.setSeedPrompt);
  const autoRunPrompt = useCommanderStore((state) => state.autoRunPrompt);
  const setAutoRunPrompt = useCommanderStore((state) => state.setAutoRunPrompt);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Consume seed prompt from welcome chips - populate draft and focus
  useEffect(() => {
    if (!seedPrompt) return;
    setDraft(seedPrompt);
    setSeedPrompt(undefined);
    setTimeout(() => textareaRef.current?.focus(), 60);
  }, [seedPrompt, setSeedPrompt]);

  // One-click live demo: auto-submit a representative mission exactly once.
  useEffect(() => {
    if (!autoRunPrompt || busy) return;
    const prompt = autoRunPrompt;
    setAutoRunPrompt(undefined);
    setDraft(prompt);
    // Defer so the store reset/render settles before launching the mission.
    setTimeout(() => void executeLaunch(prompt, "camo"), 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunPrompt, busy]);

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

  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  async function executeLaunch(missionText: string, themeId: string) {
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

    // The visual theme only affects presentation decks. Appending it to chat or
    // document prompts pollutes the request (e.g. "hi" became a camo essay), so
    // only tag presentation missions.
    if (typeFor(missionText) === "presentation") {
      compiledPrompt = `${compiledPrompt} [THEME: ${themeId}]`;
    }

    const clientMissionId = crypto.randomUUID();
    const selectedAttachments = attachments;
    setDraft("");
    setAttachments([]);
    setAttachmentNotice("");
    setPendingPrompt(null);
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

  function openWidgetTurn(text: string, widgetTurn: { content: string; widget?: ChatWidget }) {
    const store = useCommanderStore.getState();
    cancelReplay();
    store.setObjective(text);
    store.setStatus("idle");
    store.addChatTurn({ id: `user-${Date.now()}`, role: "user", content: text, timestamp: Date.now() });
    store.addChatTurn({ id: `w-${Date.now()}`, role: "commander", content: widgetTurn.content, timestamp: Date.now(), widget: widgetTurn.widget });
    setDraft("");
  }

  function openChess(text: string) {
    openWidgetTurn(text, { content: "Challenge accepted. You are White, I am Black - make your move, Commander.", widget: { type: "chess" } });
  }

  async function openVideo(text: string) {
    const query = extractVideoQuery(text);
    openWidgetTurn(text, { content: `Searching for a video: “${query}”…` });
    try {
      const res = await fetch("/api/video-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const data = (await res.json().catch(() => ({}))) as { videoId?: string; title?: string };
      const store = useCommanderStore.getState();
      if (res.ok && data.videoId) {
        store.addChatTurn({ id: `video-${Date.now()}`, role: "commander", content: "", timestamp: Date.now(), widget: { type: "video", videoId: data.videoId, title: data.title, query } });
      } else {
        store.addChatTurn({ id: `video-fail-${Date.now()}`, role: "commander", content: `I couldn't find a video for “${query}”. Try rephrasing your request.`, timestamp: Date.now() });
      }
    } catch {
      useCommanderStore.getState().addChatTurn({ id: `video-err-${Date.now()}`, role: "commander", content: "Video search failed. Please try again.", timestamp: Date.now() });
    }
  }

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const missionText = draft.trim();
    if (!missionText || busy) return;

    if (CHESS_CMD.test(missionText)) { openChess(missionText); return; }
    if (VIDEO_CMD.test(missionText)) { void openVideo(missionText); return; }

    if (typeFor(missionText) === "presentation") {
      setPendingPrompt(missionText);
      return;
    }

    void executeLaunch(missionText, "camo");
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

      {pendingPrompt ? (
        <div
          className="rounded-2xl p-4 transition-all duration-200"
          style={{
            background: "rgba(4, 8, 5, 0.90)",
            border: "1px solid rgba(0,229,160,0.22)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(0,229,160,0.06)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <div>
              <h5 style={{ fontWeight: 700, fontSize: 13, color: "var(--accent)", fontFamily: "var(--font-code)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Select Presentation Theme
              </h5>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                Choose a design language for your slide deck.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPendingPrompt(null)}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: "camo", name: "Camo Combat", desc: "Military dark olive & neon green", color: "#00e5a0" },
              { id: "cyberpunk", name: "Cyberpunk Neon", desc: "Violet background & pink accents", color: "#ff007f" },
              { id: "minimal", name: "Midnight Minimal", desc: "Sleek charcoal & white layout", color: "#ffffff" },
              { id: "ocean", name: "Ocean Breeze", desc: "Navy blue background & aqua/sky", color: "#00e5ff" }
            ].map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => void executeLaunch(pendingPrompt, theme.id)}
                className="rounded-xl p-3 text-left transition-all duration-150"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid var(--border-dim)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,160,0.25)";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,229,160,0.04)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-dim)";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.025)";
                }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: theme.color, display: "inline-block" }} />
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#fff" }}>{theme.name}</span>
                </div>
                <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{theme.desc}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
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
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setAttachmentNotice("");
            }}
            placeholder={attachmentNotice || "Give the Commander a mission…"}
            onKeyDown={keyDown}
            className="block w-full resize-none bg-transparent py-1.5 pl-1.5 text-[15px] outline-none placeholder:text-zinc-500"
            style={{ color: "var(--text-primary)" }}
          />

          {/* Action Row */}
          <div
            className="mt-3.5 flex items-center justify-between gap-3 border-t pt-3"
            style={{ borderTopColor: "var(--border-dim)" }}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Paperclip */}
              <button
                type="button"
                disabled={attachments.length >= maxAttachments}
                onClick={() => fileInput.current?.click()}
                data-testid="add-attachment"
                aria-label="Add file attachment"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-lg transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45"
                style={{ color: "var(--text-muted)", background: "transparent" }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>

              {/* Web research switch */}
              <button
                type="button"
                onClick={() => setUseInternet((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150"
                style={
                  useInternet
                    ? {
                        background: "rgba(0,229,160,0.08)",
                        border: "1px solid rgba(0,229,160,0.22)",
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
      )}

      <p
        id="composer-help"
        className="mt-2 text-center text-[10px] leading-5"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}
      >
        txt | md | json | csv | pdf | png/jpg/webp - up to {maxAttachments} files, 4 MB each
      </p>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{attachmentNotice}</p>
      {attachmentNotice && (
        <p className="mt-1 text-center text-[11px]" style={{ color: "var(--text-secondary)" }}>{attachmentNotice}</p>
      )}
    </form>
  );
}
