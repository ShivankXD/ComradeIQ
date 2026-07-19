/**
 * Shared, serialisable mission contracts.  Keep this module free of server-only
 * imports so routing and DAG behaviour can be unit tested without a Next.js
 * runtime.
 */

export const COMRADE_ROLES = ["researcher", "writer", "formatter", "critic", "assembler"] as const;

export type ComradeRole = (typeof COMRADE_ROLES)[number];
export type MissionType = "general" | "presentation";
export type MissionStatus =
  | "queued"
  | "thinking"
  | "dispatching"
  | "delegating"
  | "synthesizing"
  | "complete"
  | "error"
  | "cancelled"
  | "timed_out"
  | "interrupted";

export interface ConnectedComrade {
  comrade_id: ComradeRole;
  role: ComradeRole;
}

export interface MissionSource {
  title: string;
  url: string;
}

export type AttachmentKind = "text" | "pdf" | "image" | "unsupported";

/** Extracted server-side. `imageDataUrl` is kept private and is never returned to the browser. */
export interface MissionAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: AttachmentKind;
  status: "ready" | "truncated" | "unsupported";
  summary: string;
  text?: string;
  imageDataUrl?: string;
}

export interface MissionArtifactSummary {
  id: string;
  kind: "markdown" | "presentation";
  filename: string;
  contentType: string;
  size: number;
  url: string;
}

export interface MissionEvent {
  seq: number;
  name: string;
  data: unknown;
  timestamp: number;
  requestId: string;
}

export function isComradeRole(value: unknown): value is ComradeRole {
  return typeof value === "string" && (COMRADE_ROLES as readonly string[]).includes(value);
}

/** The topology is intentionally a Commander-only star, never peer-to-peer. */
export function normalizeConnectedComrades(value: unknown): ConnectedComrade[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<ComradeRole>();
  const normalized: ConnectedComrade[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    if (!isComradeRole(item.comrade_id) || !isComradeRole(item.role)) continue;
    if (item.comrade_id !== item.role || seen.has(item.comrade_id)) continue;
    seen.add(item.comrade_id);
    normalized.push({ comrade_id: item.comrade_id, role: item.role });
  }
  return normalized;
}

const TRANSITIONS: Record<MissionStatus, readonly MissionStatus[]> = {
  queued: ["thinking", "cancelled", "error", "timed_out", "interrupted"],
  thinking: ["dispatching", "delegating", "synthesizing", "complete", "cancelled", "error", "timed_out", "interrupted"],
  dispatching: ["delegating", "synthesizing", "complete", "cancelled", "error", "timed_out", "interrupted"],
  delegating: ["synthesizing", "complete", "cancelled", "error", "timed_out", "interrupted"],
  synthesizing: ["complete", "cancelled", "error", "timed_out", "interrupted"],
  complete: ["queued"],
  error: ["queued"],
  cancelled: ["queued"],
  timed_out: ["queued"],
  interrupted: ["queued"],
};

export function canTransitionMission(from: MissionStatus, to: MissionStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}
