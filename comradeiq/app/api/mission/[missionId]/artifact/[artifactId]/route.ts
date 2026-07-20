import { runtimeErrorResponse } from "@/lib/agents/api";
import { getOwnedMissionArtifact } from "@/lib/agents/missions";
import { requestIdFor } from "@/lib/agents/request";
import { requireAnonymousSession } from "@/lib/agents/session";
import { readPrivateObject } from "@/lib/agents/storage";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ missionId: string; artifactId: string }> }) {
  const requestId = requestIdFor(request);
  try {
    const { missionId, artifactId } = await params;
    const session = requireAnonymousSession(request);
    const artifact = await getOwnedMissionArtifact(missionId, artifactId, session.id);
    const content = await readPrivateObject(artifact.object);
    if (!content) return new Response("Artifact not found.", { status: 404, headers: { "X-Request-Id": requestId } });
    const body = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "Content-Type": artifact.contentType,
        "Content-Length": String(content.byteLength),
        "Content-Disposition": `attachment; filename="${artifact.filename.replace(/[^A-Za-z0-9._-]/g, "-")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    return runtimeErrorResponse(error, requestId, "mission.artifact");
  }
}
