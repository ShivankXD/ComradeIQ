"use client";

import { useMemo } from "react";

import { useCommanderStore } from "@/lib/store";

type TeamStatusProps = {
  onOpenTeamControls: () => void;
};

function displayName(value: string) {
  return value.replace(/(^|[-_\s])(\w)/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

function toneFor(connected: boolean, status: string) {
  if (!connected) return "bg-[#62666a]";
  if (status === "working" || status === "thinking") return "bg-[#78e0c1] shadow-[0_0_0_3px_rgba(120,224,193,0.12)]";
  if (status === "done") return "bg-[#a4eac9]";
  return "bg-[#8d9692]";
}

/** A deliberately compact, always-available summary of the Commander network. */
export function TeamStatus({ onOpenTeamControls }: TeamStatusProps) {
  const commanderName = useCommanderStore((state) => state.name);
  const commanderStatus = useCommanderStore((state) => state.status);
  const comrades = useCommanderStore((state) => state.comrades);
  const team = useMemo(() => Object.values(comrades), [comrades]);
  const activeCount = team.filter((comrade) => comrade.connected).length;

  return (
    <section className="flex min-w-0 items-center gap-2" aria-label="Commander and Comrades status">
      <div className="hidden min-w-0 items-center gap-2 lg:flex">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#10a37f] text-[11px] font-bold text-white">C</span>
        <span className="max-w-28 truncate text-xs font-medium text-[#e8eeeb]">{commanderName}</span>
        <span className="h-1 w-4 shrink-0 rounded-full bg-[#3b7465]" aria-hidden="true" />
      </div>
      <div className="flex items-center -space-x-1" aria-hidden="true">
        {team.map((comrade) => (
          <span
            key={comrade.id}
            className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#212121] bg-[#313633] text-[9px] font-semibold text-[#e8eeeb]"
          >
            <span className={`h-2 w-2 rounded-full ${toneFor(comrade.connected, comrade.status)}`} />
          </span>
        ))}
      </div>
      <span className="hidden whitespace-nowrap text-[11px] text-[#aab2ae] sm:inline">{activeCount}/{team.length} online</span>
      <button
        type="button"
        onClick={onOpenTeamControls}
        data-testid="team-controls"
        aria-label="Open team controls"
        className="whitespace-nowrap rounded-lg border border-white/[0.12] px-2.5 py-1.5 text-xs font-medium text-[#dce5e1] transition hover:border-[#57cfae]/60 hover:bg-[#10a37f]/10"
      >
        <span className="hidden sm:inline">Team controls</span>
        <span className="sm:hidden">Team</span>
      </button>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {commanderName} is {commanderStatus}. {activeCount} of {team.length} Comrades are online: {team.map((comrade) => `${displayName(comrade.id)} ${comrade.connected ? comrade.status : "offline"}`).join(", ")}.
      </p>
    </section>
  );
}
