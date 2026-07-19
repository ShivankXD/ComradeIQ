import "server-only";

import { get, list, put } from "@vercel/blob";

import { RuntimeError } from "./errors";
import { hasPrivateBlobStorage } from "./model";

export type ObjectStorageKind = "vercel-blob-private" | "memory";

export interface StoredObject {
  storage: ObjectStorageKind;
  key: string;
  location?: string;
  contentType: string;
  size: number;
}

const memoryObjects = new Map<string, Uint8Array>();

function assertSafeKey(key: string) {
  if (!key || key.length > 512 || key.includes("..") || key.startsWith("/") || !/^[A-Za-z0-9._/-]+$/.test(key)) {
    throw new RuntimeError("bad_request", "Invalid storage path.", { status: 400 });
  }
}

export function objectStorageKind(): ObjectStorageKind {
  return hasPrivateBlobStorage() ? "vercel-blob-private" : "memory";
}

export function objectStorageConfiguration() {
  const kind = objectStorageKind();
  return {
    kind,
    durable: kind === "vercel-blob-private",
    privateAccessRequired: kind === "vercel-blob-private",
    distributedWriteLock: false,
    crossInstanceEventPolling: kind === "vercel-blob-private",
    note: kind === "vercel-blob-private"
      ? "Requires a Vercel Blob store created with private access."
      : "In-memory fallback is development-only and is lost on restart or across serverless instances.",
  };
}

/**
 * All durable content is written as a private Blob and served only through an
 * owner-checked route. A configured public Blob store fails closed here.
 */
export async function putPrivateObject(
  key: string,
  value: Uint8Array | string,
  contentType: string,
  options: { allowOverwrite?: boolean; abortSignal?: AbortSignal } = {},
): Promise<StoredObject> {
  assertSafeKey(key);
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const storage = objectStorageKind();

  if (storage === "memory") {
    memoryObjects.set(key, new Uint8Array(bytes));
    return { storage, key, contentType, size: bytes.byteLength };
  }

  try {
    const result = await put(key, Buffer.from(bytes), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: options.allowOverwrite ?? false,
      contentType,
      cacheControlMaxAge: 60,
      abortSignal: options.abortSignal,
    });
    return { storage, key, location: result.url, contentType: result.contentType, size: bytes.byteLength };
  } catch (error) {
    throw new RuntimeError(
      "storage_unavailable",
      "Private object storage is configured but unavailable. Check the private Blob store and server credentials.",
      { status: 503, retryable: true, cause: error },
    );
  }
}

export async function readPrivateObject(object: StoredObject, options: { fresh?: boolean } = {}): Promise<Uint8Array | undefined> {
  if (object.storage === "memory") {
    const value = memoryObjects.get(object.key);
    return value ? new Uint8Array(value) : undefined;
  }

  try {
    const result = await get(object.location ?? object.key, { access: "private", useCache: !options.fresh });
    if (!result || result.statusCode !== 200 || !result.stream) return undefined;
    return new Uint8Array(await new Response(result.stream).arrayBuffer());
  } catch (error) {
    throw new RuntimeError("storage_unavailable", "Private object storage is temporarily unavailable.", {
      status: 503,
      retryable: true,
      cause: error,
    });
  }
}

/** Lists only keys under a server-chosen prefix. It is never exposed to clients. */
export async function listPrivateObjectKeys(prefix: string): Promise<string[]> {
  assertSafeKey(prefix);
  if (objectStorageKind() === "memory") {
    return [...memoryObjects.keys()].filter((key) => key.startsWith(prefix)).sort();
  }

  try {
    const keys: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 200 });
      keys.push(...page.blobs.map((blob) => blob.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor && keys.length < 500);
    return keys.sort();
  } catch (error) {
    throw new RuntimeError("storage_unavailable", "Private object storage is temporarily unavailable.", {
      status: 503,
      retryable: true,
      cause: error,
    });
  }
}
