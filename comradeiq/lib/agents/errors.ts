export type RuntimeErrorCode =
  | "bad_request"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "capacity"
  | "provider_unconfigured"
  | "provider_rejected"
  | "provider_unavailable"
  | "timed_out"
  | "cancelled"
  | "storage_unavailable"
  | "mission_state"
  | "unsafe_request"
  | "internal";

export class RuntimeError extends Error {
  readonly status: number;
  readonly code: RuntimeErrorCode;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;

  constructor(
    code: RuntimeErrorCode,
    message: string,
    options: { status?: number; retryable?: boolean; retryAfterSeconds?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "RuntimeError";
    this.code = code;
    this.status = options.status ?? 500;
    this.retryable = options.retryable ?? false;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function asRuntimeError(error: unknown): RuntimeError {
  if (error instanceof RuntimeError) return error;

  const candidate = error as { name?: string; status?: number; statusCode?: number; code?: string; message?: string } | undefined;
  const status = candidate?.status ?? candidate?.statusCode;
  const name = candidate?.name ?? "";

  if (name === "AbortError" || candidate?.code === "ABORT_ERR") {
    return new RuntimeError("cancelled", "The mission was cancelled.", { status: 409 });
  }
  if (status === 401 || status === 403) {
    return new RuntimeError("provider_rejected", "The AI provider rejected this server configuration.", { status: 502 });
  }
  if (status === 429) {
    return new RuntimeError("provider_unavailable", "The AI provider is temporarily busy. Please retry shortly.", {
      status: 503,
      retryable: true,
      retryAfterSeconds: 20,
    });
  }
  if (typeof status === "number" && status >= 500) {
    return new RuntimeError("provider_unavailable", "The AI provider is temporarily unavailable. Please retry shortly.", {
      status: 503,
      retryable: true,
      retryAfterSeconds: 15,
    });
  }
  if (name === "APIConnectionTimeoutError" || name === "APIConnectionError") {
    return new RuntimeError("provider_unavailable", "The AI provider could not be reached. Please retry shortly.", {
      status: 503,
      retryable: true,
      retryAfterSeconds: 15,
    });
  }
  return new RuntimeError("internal", "The mission could not be completed. Please retry.", { status: 500 });
}

/** Log only non-sensitive diagnostics. Provider response bodies and user input stay private. */
export function logRuntimeError(scope: string, requestId: string, error: unknown) {
  const candidate = error as { name?: string; message?: string; status?: number; code?: string } | undefined;
  console.error("[comradeiq-runtime]", {
    scope,
    requestId,
    name: candidate?.name ?? "UnknownError",
    status: candidate?.status,
    code: candidate?.code,
  });
}
