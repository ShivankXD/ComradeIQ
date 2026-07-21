import "server-only";

import { createHash } from "node:crypto";

import * as Ably from "ably";

import { logRuntimeError } from "./errors";
import type { MissionEvent } from "./contracts";
import { appendMissionEvent } from "./missions";
import { hasRealtimeTransport } from "./model";

export function missionChannelName(missionId: string) {
  return `mission:${missionId}`;
}

function getAblyRest() {
  const key = process.env.ABLY_API_KEY?.trim();
  if (!key) throw new Error("ABLY_API_KEY is not configured.");
  return new Ably.Rest({ key });
}

/**
 * Mission events are persisted before Ably is attempted. SSE remains complete if
 * Ably is absent or transiently fails, so the optional transport can never abort work.
 */
export async function emitMissionEvent(missionId: string, eventName: string, data: unknown, requestId: string): Promise<MissionEvent> {
  const event = await appendMissionEvent(missionId, eventName, data, requestId);
  if (!hasRealtimeTransport()) return event;
  try {
    await getAblyRest().channels.get(missionChannelName(missionId)).publish(eventName, data);
  } catch (error) {
    logRuntimeError("ably.publish", requestId, error);
  }
  return event;
}

/** A short-lived, read-only token bound to the server-owned mission and anonymous session. */
export async function createMissionSubscriptionToken(missionId: string, ownerSessionId: string) {
  const capability = JSON.stringify({ [missionChannelName(missionId)]: ["subscribe"] });
  const sessionFingerprint = createHash("sha256").update(ownerSessionId).digest("base64url").slice(0, 18);
  return getAblyRest().auth.createTokenRequest({
    capability,
    clientId: `mission-${missionId}-${sessionFingerprint}`.slice(0, 256),
    ttl: 10 * 60 * 1_000,
  });
}
