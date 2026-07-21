"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId, useRef } from "react";

import { useCommanderStore } from "@/lib/store";

import { useModalDialog } from "./useModalDialog";

interface MissionActivityPanelProps {
  onOpenTeamMap: () => void;
  onClose: () => void;
}

function displayName(value: string) {
  return value.replace(/(^|[-_\s])(\w)/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

export function MissionActivityPanel({ onOpenTeamMap, onClose }: MissionActivityPanelProps) {
  const status = useCommanderStore((state) => state.status);
  const comrades = useCommanderStore((state) => state.comrades);
  const thinking = useCommanderStore((state) => state.thinking);
  const messages = useCommanderStore((state) => state.busMessages);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const active = Object.values(comrades).filter((comrade) => comrade.connected).length;
  const latestUpdate = messages.at(-1)?.content;
  const activitySummary = thinking.join("").slice(-800);

  useModalDialog({ open: true, dialogRef, initialFocusRef: closeButtonRef, onClose });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.aside
          ref={dialogRef}
          initial={{ x: 380 }}
          animate={{ x: 0 }}
          exit={{ x: 380 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="absolute right-0 top-0 flex h-[100dvh] w-full max-w-[380px] flex-col p-4 shadow-2xl sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          style={{
            background: "var(--bg-panel)",
            borderLeft: "1px solid var(--border-mid)",
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-[9px] font-semibold uppercase"
                style={{ color: "var(--accent)", letterSpacing: "0.2em", fontFamily: "var(--font-code)" }}
              >
                Mission activity
              </p>
              <h2
                id={titleId}
                className="mt-1 text-sm font-semibold"
                style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
              >
                {status} · {active}/{Object.keys(comrades).length} online
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg leading-none transition-all duration-150"
              style={{
                border: "1px solid var(--border-mid)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
              }}
              aria-label="Close mission activity"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          {/* Team controls shortcut */}
          <button
            type="button"
            onClick={onOpenTeamMap}
            className="mt-5 rounded-2xl p-4 text-left transition-all duration-150"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-dim)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,160,0.25)";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,229,160,0.04)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-dim)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-surface)";
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              Open team controls
            </p>
            <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
              Review the network or switch a specialty on or off.
            </p>
          </button>

          {/* Activity summary */}
          {activitySummary && (
            <section
              className="mt-4 rounded-2xl p-3"
              aria-label="Latest activity summary"
              style={{
                border: "1px solid var(--border-dim)",
                background: "rgba(255,255,255,0.025)",
              }}
            >
              <p
                className="text-[9px] font-semibold uppercase"
                style={{ color: "var(--text-muted)", letterSpacing: "0.16em", fontFamily: "var(--font-code)" }}
              >
                Activity summary
              </p>
              <p
                className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs leading-5"
                style={{ color: "var(--text-secondary)" }}
              >
                {activitySummary}
              </p>
            </section>
          )}

          {/* Specialists list */}
          <p
            className="mt-5 text-[9px] font-semibold uppercase"
            style={{ color: "var(--text-muted)", letterSpacing: "0.18em", fontFamily: "var(--font-code)" }}
          >
            Specialists
          </p>
          <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {Object.values(comrades).map((comrade) => {
              const online = comrade.connected;
              const update = online
                ? comrade.result || comrade.thought || "Waiting for a relevant assignment."
                : "Offline until reconnected.";
              return (
                <article
                  key={comrade.id}
                  className="rounded-xl px-3 py-2.5 transition-all duration-150"
                  style={{
                    border: `1px solid ${online ? "rgba(0,229,160,0.12)" : "var(--border-dim)"}`,
                    background: "var(--bg-surface)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 rounded-full transition-all duration-300"
                      style={{
                        background: online ? "#00e5a0" : "rgba(120,130,125,0.5)",
                        boxShadow: online ? "0 0 5px rgba(0,229,160,0.7)" : "none",
                      }}
                      aria-hidden="true"
                    />
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
                    >
                      {displayName(comrade.id)}
                    </p>
                    <span
                      className="ml-auto text-[10px] capitalize"
                      style={{
                        color: online ? "var(--accent)" : "var(--text-muted)",
                        fontFamily: "var(--font-code)",
                      }}
                    >
                      {online ? comrade.status : "offline"}
                    </span>
                  </div>
                  <p
                    className="mt-1.5 line-clamp-2 text-xs leading-5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {update}
                  </p>
                </article>
              );
            })}
          </div>

          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            Mission is {status}. {latestUpdate ?? ""}
          </p>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}
