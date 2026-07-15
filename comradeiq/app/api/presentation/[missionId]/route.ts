import { readFile } from "node:fs/promises";

import { presentationFilePath } from "@/lib/agents/presentation";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ missionId: string }> }) {
  const { missionId } = await params;
  if (!/^[a-zA-Z0-9-]{1,128}$/.test(missionId)) return new Response("Invalid presentation id.", { status: 400 });

  try {
    const file = await readFile(presentationFilePath(missionId));
    return new Response(file, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="comradeiq-${missionId}.pptx"`,
      },
    });
  } catch {
    return new Response("Presentation not found.", { status: 404 });
  }
}
