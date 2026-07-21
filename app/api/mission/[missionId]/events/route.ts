import { runtimeErrorResponse } from "@/lib/agents/api";
import { listMissionEvents, getOwnedMissionSnapshot } from "@/lib/agents/missions";
import { requestIdFor } from "@/lib/agents/request";
import { requireAnonymousSession } from "@/lib/agents/session";

export const runtime = "nodejs";
export const maxDuration = 60;

const encoder = new TextEncoder();

function eventFrame(id: number, name: string, data: unknown) {
  return encoder.encode(`id: ${id}\nevent: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

function commentFrame(comment: string) {
  return encoder.encode(`: ${comment}\n\n`);
}

function parseLastEventId(request: Request) {
  const raw = request.headers.get("last-event-id") ?? new URL(request.url).searchParams.get("after") ?? "0";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done, { once: true });
  });
}

/** Durable SSE catch-up followed by polling, so it also works when a Blob-backed mission runs on another instance. */
export async function GET(request: Request, { params }: { params: Promise<{ missionId: string }> }) {
  const requestId = requestIdFor(request);
  try {
    const { missionId } = await params;
    const session = requireAnonymousSession(request);
    const snapshot = await getOwnedMissionSnapshot(missionId, session.id);
    const initialAfter = parseLastEventId(request);
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let after = initialAfter;
        let closed = false;
        const started = Date.now();
        const close = () => {
          if (closed) return;
          closed = true;
          try { controller.close(); } catch { /* Client disconnected. */ }
        };
        request.signal.addEventListener("abort", close, { once: true });
        controller.enqueue(eventFrame(after, "mission.state", { mission: snapshot, status: snapshot.status, requestId }));

        try {
          let lastHeartbeat = Date.now();
          while (!closed && Date.now() - started < 55_000) {
            const pending = await listMissionEvents(missionId, after);
            for (const event of pending) {
              if (closed) break;
              after = Math.max(after, event.seq);
              controller.enqueue(eventFrame(event.seq, event.name, event.data));
            }
            if (Date.now() - lastHeartbeat >= 15_000) {
              controller.enqueue(commentFrame("keepalive"));
              lastHeartbeat = Date.now();
            }
            await wait(700, request.signal);
          }
        } catch {
          // EventSource reconnects; the persisted Last-Event-ID will catch up.
        } finally {
          close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    return runtimeErrorResponse(error, requestId, "mission.events");
  }
}
