"use client";

import { Chess, type Square } from "chess.js";
import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Live chess against Commander Atlas. The board and every move are validated by
 * chess.js (real rules); the Commander's moves come from the LLM via
 * /api/chess-move, validated server-side. You play White, the Commander plays Black.
 */

// Use the solid (filled) glyph set for BOTH colours so every piece reads as a
// solid shape; the side is conveyed by fill colour + outline, not a hollow glyph.
const SOLID: Record<string, string> = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" };

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

export function ChessGame() {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState<string>("Your move - you are White.");
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  const game = gameRef.current;

  const legalTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(game.moves({ square: selected, verbose: true }).map((m) => m.to));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, fen]);

  const board = useMemo(() => game.board(), [fen]); // eslint-disable-line react-hooks/exhaustive-deps

  const describeEnd = useCallback(() => {
    if (game.isCheckmate()) return game.turn() === "w" ? "Checkmate - Commander wins." : "Checkmate - you win! 🎉";
    if (game.isStalemate()) return "Stalemate - a draw.";
    if (game.isDraw()) return "Draw.";
    return null;
  }, [game]);

  const commanderMove = useCallback(async () => {
    if (game.isGameOver()) { setStatus(describeEnd() ?? "Game over."); return; }
    setThinking(true);
    setStatus("Commander is thinking…");
    const startedAt = Date.now();
    // Keep the "thinking" state on screen long enough to read, even when the
    // provider replies almost instantly.
    const MIN_THINK_MS = 1400;
    let applied = false;
    try {
      const res = await fetch("/api/chess-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: game.fen() }),
      });
      const data = (await res.json().catch(() => ({}))) as { move?: { from: string; to: string; promotion?: string } };
      if (data.move) {
        const m = game.move({ from: data.move.from, to: data.move.to, promotion: data.move.promotion ?? "q" });
        if (m) { applied = true; setLastMove({ from: m.from as Square, to: m.to as Square }); }
      }
    } catch {
      /* fall through to local fallback */
    }
    // Resilient fallback: if the server move failed, play a random legal move.
    if (!applied && !game.isGameOver()) {
      const moves = game.moves({ verbose: true });
      const pick = moves[Math.floor(Math.random() * moves.length)];
      if (pick) { const m = game.move(pick); setLastMove({ from: m.from as Square, to: m.to as Square }); }
    }
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_THINK_MS) await new Promise((resolve) => setTimeout(resolve, MIN_THINK_MS - elapsed));
    setFen(game.fen());
    setThinking(false);
    setStatus(describeEnd() ?? (game.inCheck() ? "Check! Your move." : "Your move."));
  }, [game, describeEnd]);

  const onSquare = useCallback((square: Square) => {
    if (thinking || game.isGameOver() || game.turn() !== "w") return;
    const piece = game.get(square);
    if (selected) {
      if (square === selected) { setSelected(null); return; }
      if (legalTargets.has(square)) {
        const m = game.move({ from: selected, to: square, promotion: "q" });
        if (m) {
          setSelected(null);
          setLastMove({ from: m.from as Square, to: m.to as Square });
          setFen(game.fen());
          const end = describeEnd();
          if (end) { setStatus(end); return; }
          void commanderMove();
          return;
        }
      }
      // Reselect if clicking another own piece.
      if (piece && piece.color === "w") { setSelected(square); return; }
      setSelected(null);
      return;
    }
    if (piece && piece.color === "w") setSelected(square);
  }, [thinking, game, selected, legalTargets, describeEnd, commanderMove]);

  function reset() {
    gameRef.current = new Chess();
    setFen(gameRef.current.fen());
    setSelected(null);
    setLastMove(null);
    setThinking(false);
    setStatus("New game - your move, you are White.");
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-mid)" }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">♟️</span>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Chess vs Commander Atlas</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors"
          style={{ border: "1px solid var(--border-mid)", color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          ↺ New game
        </button>
      </div>

      <div
        className="mx-auto grid overflow-hidden rounded-lg"
        style={{ gridTemplateColumns: "repeat(8, 1fr)", width: "min(360px, 100%)", aspectRatio: "1", border: "2px solid rgba(0,0,0,0.4)" }}
      >
        {board.map((row, r) =>
          row.map((piece, f) => {
            const square = `${FILES[f]}${RANKS[r]}` as Square;
            const isDark = (r + f) % 2 === 1;
            const isSelected = selected === square;
            const isTarget = legalTargets.has(square);
            const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
            const base = isDark ? "#5a6b47" : "#c3cbb0";
            return (
              <button
                key={square}
                type="button"
                onClick={() => onSquare(square)}
                className="relative grid place-items-center"
                style={{
                  background: isSelected ? "#7fa650" : isLast ? (isDark ? "#6b7f4f" : "#d7dcb8") : base,
                  aspectRatio: "1",
                  cursor: game.turn() === "w" && !thinking ? "pointer" : "default",
                  lineHeight: 1,
                }}
                aria-label={`${square}${piece ? ` ${piece.color}${piece.type}` : ""}`}
              >
                {piece && (
                  <span
                    style={{
                      fontSize: "clamp(21px, 6.6vw, 34px)",
                      lineHeight: 1,
                      color: piece.color === "w" ? "#f7f7f2" : "#191919",
                      WebkitTextStroke: piece.color === "w" ? "1.3px rgba(20,20,20,0.75)" : "1px rgba(240,240,240,0.35)",
                      textShadow: "0 1.5px 2px rgba(0,0,0,0.4)",
                      filter: "drop-shadow(0 1px 0.5px rgba(0,0,0,0.25))",
                    }}
                  >
                    {SOLID[piece.type]}
                  </span>
                )}
                {isTarget && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      width: piece ? "88%" : "30%",
                      height: piece ? "88%" : "30%",
                      borderRadius: "50%",
                      border: piece ? "3px solid rgba(0,229,160,0.75)" : "none",
                      background: piece ? "transparent" : "rgba(0,229,160,0.55)",
                    }}
                  />
                )}
              </button>
            );
          })
        )}
      </div>

      <p
        className="mt-3 text-center text-xs"
        style={{ color: thinking ? "var(--accent)" : "var(--text-secondary)", fontFamily: "var(--font-code)" }}
        role="status"
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
