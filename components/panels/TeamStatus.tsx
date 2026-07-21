"use client";

import { useMemo } from "react";

import { useCommanderStore } from "@/lib/store";

type TeamStatusProps = {
  onOpenTeamControls: () => void;
};

function displayName(value: string) {
  return value.replace(/(^|[-_\s])(\w)/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

function dotColor(connected: boolean, status: string) {
  if (!connected) return { bg: "rgba(120,130,125,0.6)", glow: "none" };
  if (status === "working" || status === "thinking") return { bg: "#00e5a0", glow: "0 0 6px rgba(0,229,160,0.8)" };
  if (status === "done") return { bg: "#a0f0d0", glow: "none" };
  return { bg: "rgba(180,195,188,0.5)", glow: "none" };
}

export function TeamStatus({ onOpenTeamControls }: TeamStatusProps) {
  const commanderName = useCommanderStore((state) => state.name);
  const commanderStatus = useCommanderStore((state) => state.status);
  const comrades = useCommanderStore((state) => state.comrades);
  const team = useMemo(() => Object.values(comrades), [comrades]);
  const activeCount = team.filter((comrade) => comrade.connected).length;

  return (
    <section className="flex min-w-0 items-center gap-2" aria-label="Commander and Comrades status">
      {/* Commander chip — desktop */}
      <div className="hidden min-w-0 items-center gap-2 lg:flex">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-black"
          style={{
            background: "linear-gradient(135deg, #00e5a0, #00c487)",
            boxShadow: "0 0 12px rgba(0,229,160,0.25)",
          }}
        >
          C
        </span>
        <span
          className="max-w-28 truncate text-xs font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {commanderName}
        </span>
        <span
          className="h-px w-5 shrink-0 rounded-full"
          style={{ background: "rgba(0,229,160,0.25)" }}
          aria-hidden="true"
        />
      </div>

      {/* Comrade dots */}
      <div className="flex items-center -space-x-1.5" aria-hidden="true">
        {team.map((comrade) => {
          const dot = dotColor(comrade.connected, comrade.status);
          return (
            <span
              key={comrade.id}
              className="grid h-6 w-6 place-items-center rounded-full"
              style={{
                background: "var(--bg-elevated)",
                border: "1.5px solid var(--bg-surface)",
              }}
            >
              <span
                className="h-2 w-2 rounded-full transition-all duration-300"
                style={{ background: dot.bg, boxShadow: dot.glow }}
              />
            </span>
          );
        })}
      </div>

      <span
        className="hidden whitespace-nowrap text-[11px] sm:inline"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}
      >
        {activeCount}/{team.length} online
      </span>

      <button
        type="button"
        onClick={onOpenTeamControls}
        data-testid="team-controls"
        aria-label="Open team controls"
        className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150"
        style={{
          border: "1px solid var(--border-mid)",
          color: "var(--text-secondary)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,160,0.3)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,229,160,0.06)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-mid)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
      >
        <span className="hidden sm:inline">Team controls</span>
        <span className="sm:hidden">Team</span>
      </button>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {commanderName} is {commanderStatus}. {activeCount} of {team.length} Comrades are online:{" "}
        {team.map((comrade) => `${displayName(comrade.id)} ${comrade.connected ? comrade.status : "offline"}`).join(", ")}.
      </p>
    </section>
  );
}
