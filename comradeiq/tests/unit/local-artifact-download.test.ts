import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getArtifact } from "../../app/api/mission/[missionId]/artifact/[artifactId]/route";
import { GET as getPresentation } from "../../app/api/presentation/[missionId]/route";
import { attachMissionArtifact, createMission } from "../../lib/agents/missions";
import { SESSION_COOKIE } from "../../lib/agents/session";
import { objectStorageKind, putPrivateObject } from "../../lib/agents/storage";

const presentationMime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const ownerSessionId = "a".repeat(43);

let storageDirectory = "";

function ownerRequest(url: string) {
  return new Request(url, {
    headers: { cookie: `${SESSION_COOKIE}=${ownerSessionId}` },
  });
}

describe("local development artifact downloads", () => {
  beforeEach(async () => {
    storageDirectory = await mkdtemp(join(tmpdir(), "comradeiq-artifact-test-"));
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("COMRADEIQ_LOCAL_STORAGE_DIR", storageDirectory);
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");
    vi.stubEnv("BLOB_STORE_ID", "");
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    if (storageDirectory) await rm(storageDirectory, { recursive: true, force: true });
  });

  it("persists a PPTX to local disk and serves both owner-checked download URLs", async () => {
    expect(objectStorageKind()).toBe("local-filesystem");

    const mission = await createMission(ownerSessionId, "request-local-download", {
      commanderName: "Commander Atlas",
      missionText: "Create a community garden presentation.",
      missionType: "presentation",
      connectedComrades: [],
      useInternet: false,
      attachments: [],
    }, {
      intent: "presentation",
      activeRoles: [],
      producesMarkdown: false,
      producesPresentation: true,
      usesWeb: false,
      needsVision: false,
      notices: [],
    });

    const content = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    const artifactId = "presentation";
    const artifact = await putPrivateObject(`missions/${mission.id}/artifacts/community-garden.pptx`, content, presentationMime);
    const artifactUrl = `/api/mission/${mission.id}/artifact/${artifactId}`;
    await attachMissionArtifact(mission.id, {
      id: artifactId,
      kind: "presentation",
      filename: "community-garden.pptx",
      contentType: presentationMime,
      size: content.byteLength,
      url: artifactUrl,
      object: artifact,
    });

    const artifactResponse = await getArtifact(
      ownerRequest(`http://localhost:3000${artifactUrl}`),
      { params: Promise.resolve({ missionId: mission.id, artifactId }) },
    );
    const presentationResponse = await getPresentation(
      ownerRequest(`http://localhost:3000/api/presentation/${mission.id}`),
      { params: Promise.resolve({ missionId: mission.id }) },
    );

    for (const response of [artifactResponse, presentationResponse]) {
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe(presentationMime);
      expect(response.headers.get("content-length")).toBe(String(content.byteLength));
      expect(response.headers.get("content-disposition")).toContain('attachment; filename="community-garden.pptx"');
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(content);
    }
  });
});
