"use client";

import { useEffect, useRef, useState } from "react";

import type { StoredMission } from "@/lib/history/db";

interface MissionHistoryItemProps {
  mission: StoredMission;
  busy: boolean;
  archived?: boolean;
  onSelect: (id: string) => void;
  onShare: (id: string) => void;
  onArchive: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
  relativeTime: (ts: number) => string;
}

function statusColor(status: string) {
  if (status === "complete") return "var(--accent)";
  if (status === "error") return "#ff8a65";
  return "var(--text-muted)";
}

export function MissionHistoryItem({
  mission,
  busy,
  archived = false,
  onSelect,
  onShare,
  onArchive,
  onDelete,
  relativeTime,
}: MissionHistoryItemProps) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const kebabRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // The history strip lives in an overflow-scroll container, so the popover is
  // positioned as a fixed overlay anchored to the kebab button to avoid clipping.
  useEffect(() => {
    if (!menuOpen) return;
    const place = () => {
      const rect = kebabRef.current?.getBoundingClientRect();
      if (rect) setMenuPos({ top: rect.bottom + 6, left: Math.max(8, rect.right - 168) });
    };
    place();
    const close = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node) || kebabRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      setConfirmDelete(false);
      setShared(false);
    }
  }, [menuOpen]);

  const showKebab = hovered || menuOpen;

  function runShare() {
    onShare(mission.id);
    setShared(true);
    window.setTimeout(() => {
      setShared(false);
      setMenuOpen(false);
    }, 1100);
  }

  const menuItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "8px 10px",
    fontSize: 12.5,
    color: "var(--text-secondary)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    borderRadius: 8,
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        disabled={busy}
        onClick={() => onSelect(mission.id)}
        title={mission.missionText}
        className="w-full rounded-lg py-2 pl-3 pr-8 text-left transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ color: "var(--text-secondary)", opacity: archived ? 0.72 : 1 }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
        }}
      >
        <span className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: statusColor(mission.status) }}
            aria-hidden="true"
          />
          <span className="flex-1 truncate text-[13px]">{mission.missionText}</span>
        </span>
        <span className="mt-0.5 block pl-3 text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>
          {archived ? "archived · " : ""}{relativeTime(mission.createdAt)}
        </span>
      </button>

      {/* Hover-revealed 3-dot menu trigger */}
      <button
        ref={kebabRef}
        type="button"
        aria-label="Chat options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((open) => !open);
        }}
        className="absolute right-1 top-1.5 grid h-6 w-6 place-items-center rounded-md transition-all duration-150"
        style={{
          opacity: showKebab ? 1 : 0,
          pointerEvents: showKebab ? "auto" : "none",
          color: menuOpen ? "var(--accent)" : "var(--text-muted)",
          background: menuOpen ? "rgba(0,229,160,0.1)" : "transparent",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = menuOpen ? "rgba(0,229,160,0.1)" : "transparent"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {/* Popover menu (fixed so the scroll container cannot clip it) */}
      {menuOpen && (
        <div
          ref={menuRef}
          role="menu"
          className="w-42 rounded-xl p-1.5"
          style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            width: 168,
            zIndex: 60,
            background: "rgba(8, 14, 10, 0.97)",
            border: "1px solid rgba(0,229,160,0.18)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={runShare}
            style={{ ...menuItemStyle, color: shared ? "var(--accent)" : "var(--text-secondary)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
            </svg>
            {shared ? "Link copied" : "Share chat"}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => { onArchive(mission.id, !archived); setMenuOpen(false); }}
            style={menuItemStyle}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            {archived ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 8 3 21 21 21 21 8" /><rect x="1" y="3" width="22" height="5" /><path d="M12 17V11M9 14l3-3 3 3" />
                </svg>
                Unarchive
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 8 3 21 21 21 21 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
                </svg>
                Archive
              </>
            )}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              if (!confirmDelete) { setConfirmDelete(true); return; }
              onDelete(mission.id);
              setMenuOpen(false);
            }}
            style={{ ...menuItemStyle, color: confirmDelete ? "#ff8a65" : "var(--text-secondary)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,80,80,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            {confirmDelete ? "Click to confirm" : "Delete chat"}
          </button>
        </div>
      )}
    </div>
  );
}
