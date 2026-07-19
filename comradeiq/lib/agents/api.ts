import "server-only";

import { NextResponse } from "next/server";

import { asRuntimeError, logRuntimeError } from "./errors";

export function runtimeErrorResponse(error: unknown, requestId: string, scope: string) {
  const safe = asRuntimeError(error);
  logRuntimeError(scope, requestId, error);
  const response = NextResponse.json({
    error: safe.message,
    code: safe.code,
    requestId,
    retryable: safe.retryable,
  }, { status: safe.status });
  response.headers.set("X-Request-Id", requestId);
  if (safe.retryAfterSeconds) response.headers.set("Retry-After", String(safe.retryAfterSeconds));
  return response;
}

export function withRequestId(response: NextResponse, requestId: string) {
  response.headers.set("X-Request-Id", requestId);
  return response;
}
