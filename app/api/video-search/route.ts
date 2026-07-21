import { NextResponse } from "next/server";

import { runtimeErrorResponse, withRequestId } from "@/lib/agents/api";
import { RuntimeError } from "@/lib/agents/errors";
import { requestIdFor } from "@/lib/agents/request";
import { assertSameOrigin } from "@/lib/agents/session";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * Best-effort video search. Resolves a query to a single YouTube video that can
 * be embedded in-chat, by reading YouTube's public search results and extracting
 * the top video. No API key required; degrades gracefully if nothing is found.
 */
export async function POST(request: Request) {
  const requestId = requestIdFor(request);
  try {
    assertSameOrigin(request);
    const body = (await request.json().catch(() => ({}))) as { query?: unknown };
    const query = typeof body.query === "string" ? body.query.trim().slice(0, 200) : "";
    if (!query) throw new RuntimeError("bad_request", "A search query is required.", { status: 400 });

    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new RuntimeError("provider_unavailable", "Video search is temporarily unavailable.", { status: 502, retryable: true });
    const html = await response.text();

    // Pull the first result's videoId from the embedded initial data.
    const idMatch = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
    const videoId = idMatch?.[1];
    if (!videoId) throw new RuntimeError("not_found", "No video was found for that search.", { status: 404 });

    // Resolve a reliable title via YouTube's public oEmbed endpoint (no key).
    let title: string | undefined;
    try {
      const oembed = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
        signal: AbortSignal.timeout(6_000),
      });
      if (oembed.ok) title = ((await oembed.json()) as { title?: string }).title;
    } catch {
      /* Title is optional; the client falls back to the query. */
    }

    return withRequestId(NextResponse.json({ videoId, title, query, requestId }), requestId);
  } catch (error) {
    return runtimeErrorResponse(error, requestId, "video.search");
  }
}
