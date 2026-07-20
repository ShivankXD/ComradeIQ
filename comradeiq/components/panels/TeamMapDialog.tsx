"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { useCommanderStore, type ComradeState } from "@/lib/store";

import { useModalDialog } from "./useModalDialog";

interface TeamMapDialogProps {
  open: boolean;
  onClose: () => void;
}

const mapSlots: Record<string, string> = {
  researcher: "sm:col-start-1 sm:row-start-1",
  writer:     "sm:col-start-3 sm:row-start-1",
  critic:     "sm:col-start-1 sm:row-start-2",
  formatter:  "sm:col-start-3 sm:row-start-2",
  assembler:  "col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-3",
};

function displayName(value: string) {
  return value.replace(/(^|[-_\s])(\w)/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

function workCopy(comrade: ComradeState) {
  if (!comrade.connected) return "Offline. Reconnect when this specialty is needed.";
  if (comrade.status === "working") return "Working on the active mission.";
  if (comrade.status === "thinking") return "Reviewing the Commander's brief.";
  if (comrade.status === "done") return "Finished its assigned step.";
  return "Available for a relevant mission.";
}

export function TeamMapDialog({ open, onClose }: TeamMapDialogProps) {
  const commanderName = useCommanderStore((state) => state.name);
  const commanderStatus = useCommanderStore((state) => state.status);
  const comrades = useCommanderStore((state) => state.comrades);
  const toggleComradeConnection = useCommanderStore((state) => state.toggleComradeConnection);
  const [notice, setNotice] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const team = Object.values(comrades);
  const activeCount = team.filter((comrade) => comrade.connected).length;

  useModalDialog({ open, dialogRef, initialFocusRef: closeButtonRef, onClose });

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  function toggleConnection(id: string) {
    const comrade = comrades[id];
    if (!comrade) return;
    if (toggleComradeConnection(id)) {
      setNotice(`${displayName(id)} is now ${comrade.connected ? "offline" : "online"}.`);
    } else {
      setNotice("Keep at least two Comrades online so the Commander can complete a mission.");
    }
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3600);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 290 }}
            className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-y-auto rounded-3xl p-4 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-controls-title"
            aria-describedby="team-controls-description"
            tabIndex={-1}
            style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--border-mid)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,229,160,0.06)",
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p
                  className="text-[9px] font-semibold uppercase"
                  style={{ color: "var(--accent)", letterSpacing: "0.22em", fontFamily: "var(--font-code)" }}
                >
                  Team controls
                </p>
                <h2
                  id="team-controls-title"
                  className="mt-1 text-xl font-bold"
                  style={{ color: "var(--text-primary)", letterSpacing: "-0.03em", fontFamily: "var(--font-brand)" }}
                >
                  Commander network
                </h2>
                <p
                  id="team-controls-description"
                  className="mt-1 max-w-2xl text-sm leading-6"
                  style={{ color: "var(--text-secondary)" }}
                >
                  The Commander connects directly to each Comrade. Turn specialties on only when they are useful; Comrades never connect to one another.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                data-testid="close-team-controls"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg leading-none transition-all duration-150"
                style={{
                  border: "1px solid var(--border-mid)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                }}
                aria-label="Close team controls"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            {/* Stats row */}
            <div
              className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
              style={{
                background: "rgba(0,229,160,0.04)",
                border: "1px solid rgba(0,229,160,0.12)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                <span className="font-semibold" style={{ color: "var(--accent)" }}>
                  {activeCount}/{team.length}
                </span>{" "}
                Comrades online
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}
              >
                Use the buttons below to connect or disconnect a specialty.
              </p>
            </div>

            {/* Network map */}
            <section
              className="relative mt-4 overflow-hidden rounded-2xl p-3 sm:p-5"
              aria-label="Network map"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-dim)",
              }}
            >
              {/* Grid background */}
              <div
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{
                  backgroundImage: "linear-gradient(rgba(0,229,160,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,160,0.08) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />

              {/* Network lines SVG */}
              <svg
                className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {[
                  [50, 50, 16.7, 16.7],
                  [50, 50, 83.3, 16.7],
                  [50, 50, 16.7, 50],
                  [50, 50, 83.3, 50],
                  [50, 50, 50, 83.3],
                ].map(([x1, y1, x2, y2], index) => (
                  <line
                    key={index}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#00e5a0"
                    strokeOpacity="0.18"
                    strokeWidth="0.3"
                    strokeDasharray="2 2"
                  />
                ))}
              </svg>

              <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-x-10 sm:gap-y-3">
                {/* Commander node */}
                <article
                  className="order-first col-span-2 rounded-2xl p-4 text-center sm:col-span-1 sm:col-start-2 sm:row-start-2"
                  style={{
                    background: "rgba(0,229,160,0.06)",
                    border: "1px solid rgba(0,229,160,0.3)",
                    boxShadow: "0 0 24px rgba(0,229,160,0.1)",
                  }}
                >
                  <div
                    className="mx-auto grid h-10 w-10 place-items-center rounded-xl text-sm font-bold text-black"
                    style={{
                      background: "linear-gradient(135deg, #00e5a0, #00c487)",
                      boxShadow: "0 0 20px rgba(0,229,160,0.4)",
                    }}
                  >
                    C
                  </div>
                  <p
                    className="mt-2 text-sm font-bold"
                    style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
                  >
                    {commanderName}
                  </p>
                  <p
                    className="mt-0.5 text-[9px] font-semibold uppercase"
                    style={{ color: "var(--accent)", letterSpacing: "0.14em", fontFamily: "var(--font-code)" }}
                  >
                    Commander · {commanderStatus}
                  </p>
                </article>

                {/* Comrade nodes */}
                {team.map((comrade) => {
                  const online = comrade.connected;
                  return (
                    <article
                      key={comrade.id}
                      className={`rounded-2xl p-3 transition-all duration-200 ${mapSlots[comrade.id] ?? ""}`}
                      style={{
                        border: `1px solid ${online ? "rgba(0,229,160,0.2)" : "var(--border-dim)"}`,
                        background: online ? "rgba(0,229,160,0.03)" : "rgba(255,255,255,0.015)",
                        opacity: online ? 1 : 0.6,
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full transition-all duration-300"
                          style={{
                            background: online ? "#00e5a0" : "rgba(120,130,125,0.5)",
                            boxShadow: online ? "0 0 8px rgba(0,229,160,0.8)" : "none",
                          }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-semibold"
                            style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
                          >
                            {displayName(comrade.id)}
                          </p>
                          <p
                            className="mt-0.5 truncate text-[11px]"
                            style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}
                          >
                            {comrade.specialty}
                          </p>
                        </div>
                      </div>

                      <p
                        className="mt-2.5 min-h-8 text-xs leading-[1.2rem]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {workCopy(comrade)}
                      </p>

                      <button
                        type="button"
                        onClick={() => toggleConnection(comrade.id)}
                        aria-pressed={online}
                        data-testid={`toggle-comrade-${comrade.id}`}
                        className="mt-2.5 w-full rounded-xl px-2.5 py-2 text-xs font-semibold transition-all duration-150"
                        style={
                          online
                            ? {
                                background: "rgba(0,229,160,0.08)",
                                border: "1px solid rgba(0,229,160,0.25)",
                                color: "var(--accent)",
                              }
                            : {
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid var(--border-mid)",
                                color: "var(--text-secondary)",
                              }
                        }
                        onMouseEnter={(e) => {
                          if (online) {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,80,80,0.08)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,80,80,0.3)";
                            (e.currentTarget as HTMLButtonElement).style.color = "#ff8a65";
                          } else {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,229,160,0.06)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,160,0.2)";
                            (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (online) {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,229,160,0.08)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,160,0.25)";
                            (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
                          } else {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-mid)";
                            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                          }
                        }}
                      >
                        {online ? `Disconnect ${displayName(comrade.id)}` : `Connect ${displayName(comrade.id)}`}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>

            <p
              className="mt-4 text-xs leading-5"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}
            >
              Network cards remain readable at every screen size.
            </p>

            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{notice ?? ""}</p>
            {notice && (
              <p
                className="mt-3 rounded-xl px-3 py-2 text-sm"
                style={{
                  border: "1px solid rgba(0,229,160,0.2)",
                  background: "rgba(0,229,160,0.06)",
                  color: "var(--accent)",
                }}
              >
                {notice}
              </p>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
