import "server-only";

import { randomUUID } from "node:crypto";

import { attachmentLabels, prepareAttachments, prepareLegacyAttachmentContext } from "./attachments";
import { normalizeConnectedComrades, type ConnectedComrade, type MissionAttachment, type MissionType } from "./contracts";
import { RuntimeError } from "./errors";
import { getRuntimeConfiguration, runtimeLimits } from "./model";

const MAX_MISSION_TEXT = 16_000;
const MAX_JSON_BODY_BYTES = 128 * 1024;

export interface ParsedMissionRequest {
  commanderName: string;
  missionText: string;
  missionType: MissionType;
  connectedComrades: ConnectedComrade[];
  useInternet: boolean;
  attachments: MissionAttachment[];
  clientMissionId?: string;
}

export function requestIdFor(request: Request) {
  const candidate = request.headers.get("x-request-id")?.trim();
  return candidate && /^[A-Za-z0-9_-]{8,128}$/.test(candidate) ? candidate : randomUUID();
}

function limitedContentLength(request: Request, limit: number) {
  const raw = request.headers.get("content-length");
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > limit) {
    throw new RuntimeError("bad_request", "Request body is too large.", { status: 413 });
  }
  return parsed;
}

async function readJsonWithLimit(request: Request) {
  limitedContentLength(request, MAX_JSON_BODY_BYTES);
  if (!request.body) return {};
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_JSON_BODY_BYTES) {
      await reader.cancel();
      throw new RuntimeError("bad_request", "Request body is too large.", { status: 413 });
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))) as Record<string, unknown>;
  } catch {
    throw new RuntimeError("bad_request", "Invalid JSON request body.", { status: 400 });
  }
}

function parseConnections(value: unknown) {
  if (!Array.isArray(value)) throw new RuntimeError("bad_request", "Operational Comrades must be an array.", { status: 400 });
  if (value.length > 5) throw new RuntimeError("bad_request", "At most five Comrades can be connected to Commander.", { status: 400 });
  const normalized = normalizeConnectedComrades(value);
  if (normalized.length !== value.length) {
    throw new RuntimeError("bad_request", "Each connected Comrade must use a unique supported Commander connection.", { status: 400 });
  }
  return normalized;
}

function parseMissionFields(body: Record<string, unknown>) {
  const commanderName = typeof body.commanderName === "string" ? body.commanderName.trim().slice(0, 80) : "";
  const missionText = typeof body.missionText === "string" ? body.missionText.trim() : "";
  const missionType: MissionType | undefined = body.missionType === "presentation" || body.missionType === "general" ? body.missionType : undefined;
  if (!commanderName || !missionText || !missionType) {
    throw new RuntimeError("bad_request", "A Commander name, mission objective, and mission type are required.", { status: 400 });
  }
  if (missionText.length > MAX_MISSION_TEXT) {
    throw new RuntimeError("bad_request", `Mission objective must be ${MAX_MISSION_TEXT.toLocaleString()} characters or fewer.`, { status: 400 });
  }
  const clientMissionId = typeof body.missionId === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(body.missionId) ? body.missionId : undefined;
  return {
    commanderName,
    missionText,
    missionType,
    connectedComrades: parseConnections(body.connectedComrades),
    useInternet: body.useInternet === true,
    clientMissionId,
  };
}

export async function parseMissionRequest(request: Request): Promise<ParsedMissionRequest> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const configuration = getRuntimeConfiguration();
  if (contentType.includes("multipart/form-data")) {
    const { maxAttachmentBytes, maxAttachments } = runtimeLimits();
    // Multipart parsers buffer data, so reject oversized declared bodies before parsing.
    if (limitedContentLength(request, maxAttachmentBytes * maxAttachments + 256 * 1024) === undefined) {
      throw new RuntimeError("bad_request", "Multipart uploads require a Content-Length header.", { status: 411 });
    }
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new RuntimeError("bad_request", "Invalid multipart mission request.", { status: 400 });
    }
    const rawConnections = form.get("connectedComrades");
    let connectedComrades: unknown = [];
    try { connectedComrades = typeof rawConnections === "string" ? JSON.parse(rawConnections) : []; } catch {
      throw new RuntimeError("bad_request", "Connected Comrades must be valid JSON.", { status: 400 });
    }
    const fields = parseMissionFields({
      commanderName: form.get("commanderName"),
      missionText: form.get("missionText"),
      missionType: form.get("missionType"),
      connectedComrades,
      useInternet: form.get("useInternet") === "true",
      missionId: form.get("missionId"),
    });
    return {
      ...fields,
      attachments: await prepareAttachments(form.getAll("attachments"), { visionEnabled: Boolean(configuration.visionModel) }),
    };
  }

  const body = await readJsonWithLimit(request);
  const fields = parseMissionFields(body);
  return {
    ...fields,
    attachments: prepareLegacyAttachmentContext(body.attachmentContext),
  };
}

export function publicAttachmentLabels(attachments: MissionAttachment[]) {
  return attachmentLabels(attachments);
}
