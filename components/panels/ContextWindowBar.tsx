"use client";

import { useMemo } from "react";
import { useCommanderStore } from "@/lib/store";

const MAX_TOKENS = 200_000;

/** Rough character-to-token approximation (≈ 4 chars per token for English). */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function getBarColor(pct: number): { fill: string; glow: string; label: string } {
  if (pct >= 85) return {
    fill: "linear-gradient(90deg, #ff6b6b, #ff4444)",
    glow: "rgba(255,80,80,0.6)",
    label: "#ff8a8a",
  };
  if (pct >= 60) return {
    fill: "linear-gradient(90deg, #ffbe5c, #ff9a2e)",
    glow: "rgba(255,190,92,0.6)",
    label: "#ffca6a",
  };
  return {
    fill: "linear-gradient(90deg, #00e5a0, #3d9eff)",
    glow: "rgba(0,229,160,0.55)",
    label: "#00e5a0",
  };
}

export function ContextWindowBar() {
  const objective   = useCommanderStore((s) => s.objective);
  const thinking    = useCommanderStore((s) => s.thinking);
  const busMessages = useCommanderStore((s) => s.busMessages);
  const finalResult = useCommanderStore((s) => s.finalResult);
  const status      = useCommanderStore((s) => s.status);

  const usedTokens = useMemo(() => {
    const parts = [
      objective,
      thinking.join(""),
      busMessages.map((m) => m.content).join(""),
      finalResult ?? "",
    ];
    return Math.min(parts.reduce((sum, p) => sum + estimateTokens(p), 0), MAX_TOKENS);
  }, [objective, thinking, busMessages, finalResult]);

  const pct = Math.min((usedTokens / MAX_TOKENS) * 100, 100);
  const isBusy = ["thinking", "dispatching", "delegating", "monitoring", "synthesizing"].includes(status);
  const { fill, glow, label } = getBarColor(pct);

  return (
    <div
      style={{
        background: "rgba(4,8,5,0.55)",
        border: "1px solid rgba(0,229,160,0.1)",
        borderRadius: 14,
        padding: "10px 12px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {/* Animated live dot */}
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isBusy ? "#00e5a0" : "rgba(120,150,130,0.5)",
              boxShadow: isBusy ? "0 0 6px rgba(0,229,160,0.9)" : "none",
              animation: isBusy ? "pulse-dot 1.2s ease-in-out infinite" : "none",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-code)",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Context window
          </span>
        </div>
        {/* Token count */}
        <span
          style={{
            fontFamily: "var(--font-code)",
            fontSize: 9,
            color: label,
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          {formatTokens(usedTokens)} / 200k
        </span>
      </div>

      {/* Progress track */}
      <div
        style={{
          position: "relative",
          height: 6,
          borderRadius: 999,
          background: "rgba(255,255,255,0.07)",
          overflow: "hidden",
        }}
      >
        {/* Filled bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${Math.max(pct, pct > 0 ? 1.5 : 0)}%`,
            background: fill,
            borderRadius: 999,
            boxShadow: pct > 0 ? `0 0 8px ${glow}` : "none",
            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s ease",
          }}
        />

        {/* Shimmer overlay when AI is active */}
        {isBusy && pct > 0 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s linear infinite",
              borderRadius: 999,
              // Clip to filled area
              clipPath: `inset(0 ${100 - pct}% 0 0 round 999px)`,
            }}
          />
        )}
      </div>

      {/* Percentage row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 3,
            alignItems: "center",
          }}
        >
          {/* Mini segment ticks */}
          {[25, 50, 75].map((mark) => (
            <span
              key={mark}
              style={{
                fontFamily: "var(--font-code)",
                fontSize: 8,
                color: pct >= mark ? label : "var(--text-muted)",
                opacity: pct >= mark ? 0.7 : 0.3,
                transition: "color 0.5s ease, opacity 0.5s ease",
              }}
            >
              {mark}%
            </span>
          ))}
        </div>
        <span
          style={{
            fontFamily: "var(--font-code)",
            fontSize: 9,
            fontWeight: 700,
            color: pct > 0 ? label : "var(--text-muted)",
            letterSpacing: "0.04em",
            transition: "color 0.5s ease",
          }}
        >
          {pct.toFixed(1)}% used
        </span>
      </div>
    </div>
  );
}
