import { Chess } from "chess.js";
import { NextResponse } from "next/server";

import { runtimeErrorResponse, withRequestId } from "@/lib/agents/api";
import { RuntimeError } from "@/lib/agents/errors";
import { getOpenAIModel } from "@/lib/agents/model";
import { createOpenAIClient } from "@/lib/agents/openai";
import { requestIdFor } from "@/lib/agents/request";
import { assertSameOrigin } from "@/lib/agents/session";

export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * Commander Atlas's chess move. The board is authoritative (chess.js): we send
 * the LLM the position and the list of legal moves, then verify its choice is
 * legal before returning it. Any failure falls back to a legal move, so the
 * game never stalls or accepts an illegal move.
 */
export async function POST(request: Request) {
  const requestId = requestIdFor(request);
  try {
    assertSameOrigin(request);
    const body = (await request.json().catch(() => ({}))) as { fen?: unknown };
    if (typeof body.fen !== "string") throw new RuntimeError("bad_request", "A board position (fen) is required.", { status: 400 });

    let chess: Chess;
    try {
      chess = new Chess(body.fen);
    } catch {
      throw new RuntimeError("bad_request", "The board position is invalid.", { status: 400 });
    }

    const legal = chess.moves({ verbose: true });
    if (chess.isGameOver() || legal.length === 0) {
      return withRequestId(NextResponse.json({ move: null, gameOver: true, requestId }), requestId);
    }

    const legalUci = legal.map((m) => `${m.from}${m.to}${m.promotion ?? ""}`);
    let chosen: string | undefined;

    try {
      const client = createOpenAIClient();
      const completion = await client.sdk.chat.completions.create(
        {
          model: getOpenAIModel(),
          messages: [
            {
              role: "system",
              content: "You are Commander Atlas, playing a game of chess as Black. Choose the strongest legal move. Reply with ONLY the move in UCI notation (e.g. e7e5 or g8f6), nothing else.",
            },
            {
              role: "user",
              content: `Position (FEN): ${chess.fen()}\nYour legal moves (UCI): ${legalUci.join(" ")}\nRespond with exactly one move from that list.`,
            },
          ],
          max_tokens: 8,
          temperature: 0.3,
        },
        { maxRetries: 0, timeout: 12_000 },
      );
      const raw = completion.choices[0]?.message?.content?.trim().toLowerCase().replace(/[^a-h1-8nbrq]/g, "") ?? "";
      chosen = legalUci.find((m) => m === raw) ?? legalUci.find((m) => raw.startsWith(m.slice(0, 4)));
    } catch {
      // Provider unavailable — fall back to a legal move below.
    }

    const pick = chosen ?? legalUci[Math.floor(Math.random() * legalUci.length)];
    const from = pick.slice(0, 2);
    const to = pick.slice(2, 4);
    const promotion = pick.slice(4) || undefined;

    return withRequestId(NextResponse.json({ move: { from, to, promotion }, requestId }), requestId);
  } catch (error) {
    return runtimeErrorResponse(error, requestId, "chess.move");
  }
}
