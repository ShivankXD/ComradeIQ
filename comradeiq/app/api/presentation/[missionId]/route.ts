import { runtimeErrorResponse } from "@/lib/agents/api";
import { getOwnedMission } from "@/lib/agents/missions";
import { requestIdFor } from "@/lib/agents/request";
import { requireAnonymousSession } from "@/lib/agents/session";
import { readPrivateObject } from "@/lib/agents/storage";

export const runtime = "nodejs";

/** Compatibility download URL for the UI; access remains session-owner scoped. */
export async function GET(request: Request, { params }: { params: Promise<{ missionId: string }> }) {
  const requestId = requestIdFor(request);
  try {
    const { missionId } = await params;
    const session = requireAnonymousSession(request);
    const mission = await getOwnedMission(missionId, session.id);
    const artifact = mission.artifacts.find((candidate) => candidate.kind === "presentation");
    if (!artifact) return new Response("Presentation not found.", { status: 404, headers: { "X-Request-Id": requestId } });
    const content = await readPrivateObject(artifact.object);
    if (!content) return new Response("Presentation not found.", { status: 404, headers: { "X-Request-Id": requestId } });
    const body = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Length": String(content.byteLength),
        "Content-Disposition": `attachment; filename="${artifact.filename.replace(/[^A-Za-z0-9._-]/g, "-")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    return runtimeErrorResponse(error, requestId, "presentation.download");
  }
}
