import "server-only";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import { get, list, put } from "@vercel/blob";

import { RuntimeError } from "./errors";
import { hasPrivateBlobStorage, usesLocalFilesystemStorage } from "./model";

export type ObjectStorageKind = "vercel-blob-private" | "local-filesystem" | "memory";

export interface StoredObject {
  storage: ObjectStorageKind;
  key: string;
  location?: string;
  contentType: string;
  size: number;
}

const memoryObjects = new Map<string, Uint8Array>();

function localStorageRoot() {
  return resolve(process.env.COMRADEIQ_LOCAL_STORAGE_DIR?.trim() || join(tmpdir(), "comradeiq-local-storage"));
}

function localObjectPath(key: string) {
  const root = localStorageRoot();
  const target = resolve(root, key);
  const pathFromRoot = relative(root, target);
  if (!pathFromRoot || pathFromRoot.startsWith("..") || isAbsolute(pathFromRoot)) {
    throw new RuntimeError("bad_request", "Invalid local storage path.", { status: 400 });
  }
  return target;
}

function assertSafeKey(key: string) {
  if (!key || key.length > 512 || key.includes("..") || key.startsWith("/") || !/^[A-Za-z0-9._/-]+$/.test(key)) {
    throw new RuntimeError("bad_request", "Invalid storage path.", { status: 400 });
  }
}

export function objectStorageKind(): ObjectStorageKind {
  if (hasPrivateBlobStorage()) return "vercel-blob-private";
  return usesLocalFilesystemStorage() ? "local-filesystem" : "memory";
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
      : kind === "local-filesystem"
        ? "Local development storage persists across dev-server restarts on this machine, but is not deployment-safe."
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

  if (storage === "local-filesystem") {
    try {
      const target = localObjectPath(key);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, bytes, { flag: options.allowOverwrite ? "w" : "wx" });
      return { storage, key, contentType, size: bytes.byteLength };
    } catch (error) {
      throw new RuntimeError(
        "storage_unavailable",
        "Local artifact storage is unavailable. Check COMRADEIQ_LOCAL_STORAGE_DIR and retry.",
        { status: 503, retryable: true, cause: error },
      );
    }
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

  if (object.storage === "local-filesystem") {
    try {
      return new Uint8Array(await readFile(localObjectPath(object.key)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new RuntimeError("storage_unavailable", "Local artifact storage is temporarily unavailable.", {
        status: 503,
        retryable: true,
        cause: error,
      });
    }
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

  if (objectStorageKind() === "local-filesystem") {
    const root = localStorageRoot();
    const prefixDirectory = localObjectPath(prefix);
    const keys: string[] = [];
    const visit = async (directory: string): Promise<void> => {
      let entries;
      try {
        entries = await readdir(directory, { withFileTypes: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
        throw error;
      }
      await Promise.all(entries.map(async (entry) => {
        const target = join(directory, entry.name);
        if (entry.isDirectory()) {
          await visit(target);
          return;
        }
        if (!entry.isFile()) return;
        keys.push(relative(root, target).replace(/\\/g, "/"));
      }));
    };
    try {
      await visit(prefixDirectory);
      return keys.filter((key) => key.startsWith(prefix)).sort();
    } catch (error) {
      throw new RuntimeError("storage_unavailable", "Local artifact storage is temporarily unavailable.", {
        status: 503,
        retryable: true,
        cause: error,
      });
    }
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
