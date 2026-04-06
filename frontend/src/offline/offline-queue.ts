import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

const DB = 'mygarden-offline';
const STORE = 'mutations';
const DB_VERSION = 1;

interface OfflineDB extends DBSchema {
  [STORE]: {
    key: string;
    value: {
      id: string;
      path: string;
      method: string;
      body: string | null;
      createdAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

function getDb(): Promise<IDBPDatabase<OfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export interface QueuedMutation {
  id: string;
  path: string;
  method: string;
  body: string | null;
}

export async function enqueueMutation(entry: Omit<QueuedMutation, 'id'> & { id?: string }): Promise<string> {
  const id = entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const db = await getDb();
  await db.put(STORE, {
    id,
    path: entry.path,
    method: entry.method,
    body: entry.body,
    createdAt: Date.now(),
  });
  return id;
}

export async function listQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await getDb();
  const all = await db.getAll(STORE);
  // Ensure FIFO replay regardless of IndexedDB key ordering.
  all.sort((a, b) => a.createdAt - b.createdAt);
  return all.map((r) => ({ id: r.id, path: r.path, method: r.method, body: r.body }));
}

export async function removeQueuedMutation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function clearQueueForTests(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE);
}
