"use client";

import { appendEvents, type StoredEvent } from "./db";

/**
 * Buffers streamed events and flushes them to IndexedDB.
 *
 * Thinking deltas arrive per-token, so writing a transaction each time would
 * thrash the disk. Events are batched on a short interval instead, and flushed
 * eagerly when the page is hidden or unloaded - so closing the tab mid-mission
 * still leaves everything that happened so far replayable.
 */

const FLUSH_INTERVAL_MS = 250;

let buffer: StoredEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;

export function recordEvent(event: StoredEvent) {
  buffer.push(event);
  bindFlushListeners();
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flushEvents();
  }, FLUSH_INTERVAL_MS);
}

export async function flushEvents(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!buffer.length) return;
  const pending = buffer;
  buffer = [];
  try {
    await appendEvents(pending);
  } catch (error) {
    // Put them back so the next flush can retry rather than losing the stream.
    buffer = pending.concat(buffer);
    console.error("Failed to persist mission events", error);
  }
}

function bindFlushListeners() {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  // `pagehide` is the reliable one on mobile Safari; `visibilitychange` covers
  // tab switches and most desktop close paths.
  window.addEventListener("pagehide", () => void flushEvents());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushEvents();
  });
}
