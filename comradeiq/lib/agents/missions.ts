import "server-only";

import { randomUUID } from "node:crypto";

import type {
  ConnectedComrade,
  MissionArtifactSummary,
  MissionAttachment,
  MissionEvent,
  MissionSource,
  MissionStatus,
  MissionType,
} from "./contracts";
import { canTransitionMission } from "./contracts";
import type { MissionRoute } from "./intent";
import { RuntimeError } from "./errors";
import { runtimeLimits } from "./model";
import {
  listPrivateObjectKeys,
  objectStorageKind,
  putPrivateObject,
  readPrivateObject,
  type StoredObject,
} from "./storage";

export interface MissionInput {
  commanderName: string;
  missionText: string;
  missionType: MissionType;
  connectedComrades: ConnectedComrade[];
  useInternet: boolean;
  attachments: MissionAttachment[];
  clientMissionId?: string;
}

export interface StoredMissionArtifact extends MissionArtifactSummary {
  object: StoredObject;
}

export interface MissionRecord {
  version: 1;
  id: string;
  ownerSessionId: string;
  requestId: string;
  input: MissionInput;
  route: MissionRoute;
  status: MissionStatus;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  attempts: number;
  nextEventSeq: number;
  finalResult?: string;
  finalJson?: unknown;
  sources: MissionSource[];
  artifacts: StoredMissionArtifact[];
  lastError?: { code: string; message: string; retryable: boolean };
}

export interface PublicMissionSnapshot {
  id: string;
  requestId: string;
  status: MissionStatus;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  attempts: number;
  route: Pick<MissionRoute, "intent" | "producesMarkdown" | "producesPresentation" | "usesWeb" | "notices">;
  finalResult?: string;
  finalJson?: unknown;
  sources: MissionSource[];
  artifacts: MissionArtifactSummary[];
  lastError?: { code: string; message: string; retryable: boolean };
}

const records = new Map<string, MissionRecord>();
const events = new Map<string, MissionEvent[]>();
const eventListeners = new Map<string, Set<(event: MissionEvent) => void>>();
const controllers = new Map<string, AbortController>();
const queues = new Map<string, Promise<unknown>>();

function metadataKey(id: string) {
  return `missions/${id}/mission.json`;
}

function eventsPrefix(id: string) {
  return `missions/${id}/events/`;
}

function eventKey(id: string, seq: number) {
  return `${eventsPrefix(id)}${String(seq).padStart(8, "0")}.json`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertMissionId(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new RuntimeError("bad_request", "Invalid mission id.", { status: 400 });
}

async function serial<T>(id: string, operation: () => Promise<T>): Promise<T> {
  const previous = queues.get(id) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  queues.set(id, next);
  try {
    return await next;
  } finally {
    if (queues.get(id) === next) queues.delete(id);
  }
}

async function persistRecord(record: MissionRecord) {
  records.set(record.id, clone(record));
  if (objectStorageKind() === "memory") return;
  await putPrivateObject(metadataKey(record.id), JSON.stringify(record), "application/json", { allowOverwrite: true });
}

async function loadRecord(id: string, fresh = false): Promise<MissionRecord | undefined> {
  const cached = records.get(id);
  if (cached && !fresh) return clone(cached);
  if (objectStorageKind() === "memory") return undefined;

  const bytes = await readPrivateObject({
    storage: "vercel-blob-private",
    key: metadataKey(id),
    contentType: "application/json",
    size: 0,
  }, { fresh: true });
  if (!bytes) return undefined;
  try {
    const record = JSON.parse(new TextDecoder().decode(bytes)) as MissionRecord;
    if (record.version !== 1 || record.id !== id) return undefined;
    records.set(id, clone(record));
    return record;
  } catch {
    return undefined;
  }
}

function asPublicSnapshot(record: MissionRecord): PublicMissionSnapshot {
  return {
    id: record.id,
    requestId: record.requestId,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    attempts: record.attempts,
    route: {
      intent: record.route.intent,
      producesMarkdown: record.route.producesMarkdown,
      producesPresentation: record.route.producesPresentation,
      usesWeb: record.route.usesWeb,
      notices: record.route.notices,
    },
    finalResult: record.finalResult,
    finalJson: record.finalJson,
    sources: record.sources,
    artifacts: record.artifacts.map((artifact) => ({
      id: artifact.id,
      kind: artifact.kind,
      filename: artifact.filename,
      contentType: artifact.contentType,
      size: artifact.size,
      url: artifact.url,
    })),
    lastError: record.lastError,
  };
}

export async function createMission(
  ownerSessionId: string,
  requestId: string,
  input: MissionInput,
  route: MissionRoute,
): Promise<MissionRecord> {
  const now = Date.now();
  const record: MissionRecord = {
    version: 1,
    id: randomUUID(),
    ownerSessionId,
    requestId,
    input,
    route,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    attempts: 1,
    nextEventSeq: 1,
    sources: [],
    artifacts: [],
  };
  await persistRecord(record);
  return clone(record);
}

export async function getMission(id: string): Promise<MissionRecord | undefined> {
  assertMissionId(id);
  return loadRecord(id, objectStorageKind() !== "memory");
}

export async function getOwnedMission(id: string, ownerSessionId: string): Promise<MissionRecord> {
  const record = await getMission(id);
  if (!record) throw new RuntimeError("not_found", "Mission not found.", { status: 404 });
  if (record.ownerSessionId !== ownerSessionId) throw new RuntimeError("forbidden", "You do not have access to this mission.", { status: 403 });
  return record;
}

export async function getOwnedMissionSnapshot(id: string, ownerSessionId: string): Promise<PublicMissionSnapshot> {
  const record = await getOwnedMission(id, ownerSessionId);
  return asPublicSnapshot(record);
}

export async function updateMission(
  id: string,
  mutate: (record: MissionRecord) => void | Promise<void>,
): Promise<MissionRecord> {
  return serial(id, async () => {
    const existing = await loadRecord(id, objectStorageKind() !== "memory");
    if (!existing) throw new RuntimeError("not_found", "Mission not found.", { status: 404 });
    const record = clone(existing);
    await mutate(record);
    record.updatedAt = Date.now();
    await persistRecord(record);
    return clone(record);
  });
}

export async function transitionMission(id: string, status: MissionStatus): Promise<MissionRecord> {
  return updateMission(id, (record) => {
    if (!canTransitionMission(record.status, status)) {
      throw new RuntimeError("mission_state", "This mission cannot transition to that state.", { status: 409 });
    }
    record.status = status;
    if (status === "thinking" && !record.startedAt) record.startedAt = Date.now();
    if (["complete", "error", "cancelled", "timed_out", "interrupted"].includes(status)) record.completedAt = Date.now();
  });
}

export async function appendMissionEvent(
  id: string,
  name: string,
  data: unknown,
  requestId: string,
): Promise<MissionEvent> {
  const encoded = JSON.stringify(data);
  if (encoded.length > 24_000) {
    throw new RuntimeError("bad_request", "Mission event exceeded the display-safe size limit.", { status: 400 });
  }

  const event = await serial(id, async () => {
    const record = await loadRecord(id, objectStorageKind() !== "memory");
    if (!record) throw new RuntimeError("not_found", "Mission not found.", { status: 404 });
    const next: MissionEvent = { seq: record.nextEventSeq, name, data, timestamp: Date.now(), requestId };
    record.nextEventSeq += 1;
    record.updatedAt = next.timestamp;
    const local = events.get(id) ?? [];
    local.push(next);
    events.set(id, local.slice(-300));
    if (objectStorageKind() !== "memory") {
      await putPrivateObject(eventKey(id, next.seq), JSON.stringify(next), "application/json", { allowOverwrite: false });
    }
    await persistRecord(record);
    return next;
  });

  for (const listener of eventListeners.get(id) ?? []) listener(event);
  return event;
}

export async function listMissionEvents(id: string, after = 0): Promise<MissionEvent[]> {
  assertMissionId(id);
  const local = events.get(id);
  if (objectStorageKind() === "memory") return (local ?? []).filter((event) => event.seq > after).map(clone);

  const keys = await listPrivateObjectKeys(eventsPrefix(id));
  const result: MissionEvent[] = [];
  for (const key of keys) {
    const seq = Number.parseInt(key.slice(key.lastIndexOf("/") + 1, -5), 10);
    if (!Number.isFinite(seq) || seq <= after) continue;
    const bytes = await readPrivateObject({ storage: "vercel-blob-private", key, contentType: "application/json", size: 0 });
    if (!bytes) continue;
    try {
      const event = JSON.parse(new TextDecoder().decode(bytes)) as MissionEvent;
      if (event.seq > after) result.push(event);
    } catch {
      // A malformed object must not terminate a user's event stream.
    }
  }
  result.sort((a, b) => a.seq - b.seq);
  events.set(id, result.slice(-300));
  return result;
}

export function subscribeToMissionEvents(id: string, listener: (event: MissionEvent) => void) {
  const listeners = eventListeners.get(id) ?? new Set<(event: MissionEvent) => void>();
  listeners.add(listener);
  eventListeners.set(id, listeners);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) eventListeners.delete(id);
  };
}

export async function attachMissionArtifact(id: string, artifact: StoredMissionArtifact, expectedAttempt?: number) {
  return updateMission(id, (record) => {
    if (expectedAttempt !== undefined && (record.attempts !== expectedAttempt || ["cancelled", "complete", "error", "timed_out", "interrupted"].includes(record.status))) {
      throw new RuntimeError("cancelled", "This mission run is no longer active.", { status: 409 });
    }
    record.artifacts = [...record.artifacts.filter((item) => item.id !== artifact.id), artifact];
  });
}

export async function getOwnedMissionArtifact(id: string, artifactId: string, ownerSessionId: string): Promise<StoredMissionArtifact> {
  const record = await getOwnedMission(id, ownerSessionId);
  const artifact = record.artifacts.find((item) => item.id === artifactId);
  if (!artifact) throw new RuntimeError("not_found", "Artifact not found.", { status: 404 });
  return artifact;
}

export async function resetMissionForRetry(id: string, ownerSessionId: string, requestId: string): Promise<MissionRecord> {
  const current = await getOwnedMission(id, ownerSessionId);
  if (!["error", "cancelled", "timed_out", "interrupted"].includes(current.status)) {
    throw new RuntimeError("mission_state", "Only a stopped mission can be retried.", { status: 409 });
  }
  return updateMission(id, (record) => {
    record.status = "queued";
    record.requestId = requestId;
    record.attempts += 1;
    record.startedAt = undefined;
    record.completedAt = undefined;
    record.finalResult = undefined;
    record.finalJson = undefined;
    record.sources = [];
    record.lastError = undefined;
  });
}

export function registerMissionController(id: string, controller: AbortController) {
  controllers.set(id, controller);
  return () => {
    if (controllers.get(id) === controller) controllers.delete(id);
  };
}

export function abortMissionRun(id: string) {
  const controller = controllers.get(id);
  if (!controller || controller.signal.aborted) return false;
  controller.abort();
  return true;
}

export function hasActiveMissionRun(id: string) {
  return controllers.has(id);
}

/** A stale durable record cannot magically continue after an instance stops; make retry possible instead. */
export async function reconcileMissionLiveness(id: string, ownerSessionId: string): Promise<MissionRecord> {
  const record = await getOwnedMission(id, ownerSessionId);
  const active = ["thinking", "dispatching", "delegating", "synthesizing"].includes(record.status);
  const staleAfter = runtimeLimits().maxMissionSeconds * 2_000;
  if (active && !hasActiveMissionRun(id) && Date.now() - record.updatedAt > staleAfter) {
    return transitionMission(id, "interrupted");
  }
  return record;
}
