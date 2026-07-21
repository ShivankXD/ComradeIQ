"use client";

/**
 * Browser-local mission history (IndexedDB, no account required).
 *
 * Missions and their event streams are cached per-browser, the way a chat app
 * keeps its history. Nothing is sent to a server and nothing is shared between
 * devices - clearing site data clears the history.
 *
 * Events are keyed by an auto-incrementing `seq` rather than their timestamp:
 * thinking deltas arrive many-per-millisecond, so a clock cannot order them.
 * Reading the `missionId` index returns rows in (missionId, seq) order, which
 * is exactly the order they were recorded in.
 */

export type MissionEventType = "thinking" | "dispatch" | "report" | "bus" | "status";

export interface StoredMission {
  id: string;
  commanderName: string;
  missionText: string;
  status: string;
  createdAt: number;
  completedAt?: number;
  resultUrl?: string;
  /** User-archived chats are hidden from the main history strip. */
  archived?: boolean;
}

export interface StoredEvent {
  seq?: number;
  missionId: string;
  /** Original realtime event name, replayed through the same applier. */
  name: string;
  data: unknown;
  eventType: MissionEventType;
  timestamp: number;
}

const DB_NAME = "comradeiq-history";
const DB_VERSION = 1;
const MISSIONS = "missions";
const EVENTS = "events";

/** Newer missions evict older ones so the cache cannot grow without bound. */
const MAX_MISSIONS = 25;

let dbPromise: Promise<IDBDatabase> | null = null;

function supported() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MISSIONS)) {
        const missions = db.createObjectStore(MISSIONS, { keyPath: "id" });
        missions.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains(EVENTS)) {
        const events = db.createObjectStore(EVENTS, { keyPath: "seq", autoIncrement: true });
        events.createIndex("missionId", "missionId");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const request = run(transaction.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}

export async function saveMission(mission: StoredMission): Promise<void> {
  if (!supported()) return;
  await tx(MISSIONS, "readwrite", (s) => s.put(mission));
  await pruneMissions();
}

/** Merges a patch into an existing mission row; a no-op if it is gone. */
export async function patchMission(id: string, patch: Partial<StoredMission>): Promise<void> {
  if (!supported()) return;
  const existing = await tx<StoredMission | undefined>(MISSIONS, "readonly", (s) => s.get(id));
  if (!existing) return;
  await tx(MISSIONS, "readwrite", (s) => s.put({ ...existing, ...patch }));
}

export async function appendEvents(events: StoredEvent[]): Promise<void> {
  if (!supported() || !events.length) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(EVENTS, "readwrite");
    const store = transaction.objectStore(EVENTS);
    for (const event of events) store.add(event);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/** Most recent first - the order the history strip renders chips in. */
export async function listMissions(limit = MAX_MISSIONS): Promise<StoredMission[]> {
  if (!supported()) return [];
  const all = await tx<StoredMission[]>(MISSIONS, "readonly", (s) => s.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

export async function getMission(id: string): Promise<StoredMission | undefined> {
  if (!supported()) return undefined;
  return tx<StoredMission | undefined>(MISSIONS, "readonly", (s) => s.get(id));
}

/** Returns one mission's events in recorded order (index order is missionId, seq). */
export async function getEvents(missionId: string): Promise<StoredEvent[]> {
  if (!supported()) return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(EVENTS, "readonly").objectStore(EVENTS).index("missionId").getAll(missionId);
    request.onsuccess = () => resolve(request.result as StoredEvent[]);
    request.onerror = () => reject(request.error);
  });
}

/** Toggles a mission's archived flag; a no-op if the mission is gone. */
export async function setMissionArchived(id: string, archived: boolean): Promise<void> {
  await patchMission(id, { archived });
}

export async function deleteMission(id: string): Promise<void> {
  if (!supported()) return;
  await tx(MISSIONS, "readwrite", (s) => s.delete(id));
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(EVENTS, "readwrite");
    const index = transaction.objectStore(EVENTS).index("missionId");
    const cursorRequest = index.openCursor(IDBKeyRange.only(id));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      cursor.delete();
      cursor.continue();
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function pruneMissions(): Promise<void> {
  const all = await tx<StoredMission[]>(MISSIONS, "readonly", (s) => s.getAll());
  if (all.length <= MAX_MISSIONS) return;
  const stale = all.sort((a, b) => b.createdAt - a.createdAt).slice(MAX_MISSIONS);
  for (const mission of stale) await deleteMission(mission.id);
}
