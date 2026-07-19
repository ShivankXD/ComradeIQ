import "server-only";

import { RuntimeError } from "./errors";
import { runtimeLimits } from "./model";

const rateWindows = new Map<string, number[]>();
const activeBySession = new Map<string, number>();
let activeGlobal = 0;

/** Instance-local guardrail. Deployments needing global quotas should enforce them at an edge/WAF too. */
export function consumeMissionRateLimit(sessionId: string, now = Date.now()) {
  const { maxMissionsPerMinute } = runtimeLimits();
  const key = `mission:${sessionId}`;
  const cutoff = now - 60_000;
  const recent = (rateWindows.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
  if (recent.length >= maxMissionsPerMinute) {
    rateWindows.set(key, recent);
    throw new RuntimeError("rate_limited", "Too many missions were started. Please wait a minute and try again.", {
      status: 429,
      retryable: true,
      retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + 60_000 - now) / 1_000)),
    });
  }
  recent.push(now);
  rateWindows.set(key, recent);
}

export interface MissionSlot {
  release: () => void;
}

export function acquireMissionSlot(sessionId: string): MissionSlot {
  const { maxConcurrentMissions } = runtimeLimits();
  if (activeGlobal >= maxConcurrentMissions || (activeBySession.get(sessionId) ?? 0) >= 1) {
    throw new RuntimeError("capacity", "ComradeIQ is already working on a mission for this session. Please wait or cancel it first.", {
      status: 429,
      retryable: true,
      retryAfterSeconds: 10,
    });
  }
  activeGlobal += 1;
  activeBySession.set(sessionId, (activeBySession.get(sessionId) ?? 0) + 1);
  let released = false;
  return {
    release: () => {
      if (released) return;
      released = true;
      activeGlobal = Math.max(0, activeGlobal - 1);
      const next = Math.max(0, (activeBySession.get(sessionId) ?? 1) - 1);
      if (next) activeBySession.set(sessionId, next);
      else activeBySession.delete(sessionId);
    },
  };
}
