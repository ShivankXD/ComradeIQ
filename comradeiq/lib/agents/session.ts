import "server-only";

import { randomBytes } from "node:crypto";

import type { NextResponse } from "next/server";

import { RuntimeError } from "./errors";

export const SESSION_COOKIE = "comradeiq_session";
const SESSION_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export interface AnonymousSession {
  id: string;
  isNew: boolean;
}

function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

function createSessionId() {
  return randomBytes(32).toString("base64url");
}

export function getAnonymousSession(request: Request, create = false): AnonymousSession | undefined {
  const candidate = parseCookie(request.headers.get("cookie"), SESSION_COOKIE);
  if (candidate && SESSION_PATTERN.test(candidate)) return { id: candidate, isNew: false };
  return create ? { id: createSessionId(), isNew: true } : undefined;
}

export function setAnonymousSessionCookie(response: NextResponse, session: AnonymousSession) {
  if (!session.isNew) return;
  response.cookies.set({
    name: SESSION_COOKIE,
    value: session.id,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Reject cross-site state-changing requests; same-origin browser requests need no CSRF token. */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  try {
    if (new URL(origin).origin !== new URL(request.url).origin) {
      throw new RuntimeError("forbidden", "This request must originate from ComradeIQ.", { status: 403 });
    }
  } catch (error) {
    if (error instanceof RuntimeError) throw error;
    throw new RuntimeError("forbidden", "This request must originate from ComradeIQ.", { status: 403 });
  }
}

export function requireAnonymousSession(request: Request): AnonymousSession {
  const session = getAnonymousSession(request);
  if (!session) throw new RuntimeError("forbidden", "Open ComradeIQ before accessing this mission.", { status: 403 });
  return session;
}
