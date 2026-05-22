import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { apiFetch } from '../api/client';
import { type ImageVariant, imageCacheKey, imageFetchPath } from './image-cache-key';

const DB_NAME = 'mygarden-images';
const STORE = 'blobs';
const DB_VERSION = 1;
const MAX_ENTRIES = 200;

interface ImageCacheDB extends DBSchema {
  [STORE]: {
    key: string;
    value: {
      key: string;
      blob: Blob;
      etag: string | null;
      fetchedAt: number;
    };
  };
}

type MemoryEntry = {
  blobUrl: string;
  blob: Blob;
  etag: string | null;
  refCount: number;
  lastAccess: number;
};

let dbPromise: Promise<IDBPDatabase<ImageCacheDB>> | null = null;
const memory = new Map<string, MemoryEntry>();
const inflight = new Map<string, Promise<string | null>>();

function getDb(): Promise<IDBPDatabase<ImageCacheDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ImageCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

function touchMemory(key: string, entry: MemoryEntry): void {
  entry.lastAccess = Date.now();
  entry.refCount += 1;
  memory.set(key, entry);
}

function releaseMemoryEntry(key: string): void {
  const entry = memory.get(key);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    URL.revokeObjectURL(entry.blobUrl);
    memory.delete(key);
  }
}

async function readIdb(key: string): Promise<{ blob: Blob; etag: string | null } | null> {
  try {
    const db = await getDb();
    const row = await db.get(STORE, key);
    if (!row) return null;
    return { blob: row.blob, etag: row.etag };
  } catch {
    return null;
  }
}

async function writeIdb(key: string, blob: Blob, etag: string | null): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE, { key, blob, etag, fetchedAt: Date.now() });
    const keys = await db.getAllKeys(STORE);
    if (keys.length > MAX_ENTRIES) {
      const all = await db.getAll(STORE);
      all.sort((a, b) => a.fetchedAt - b.fetchedAt);
      const toRemove = all.slice(0, all.length - MAX_ENTRIES);
      const tx = db.transaction(STORE, 'readwrite');
      for (const row of toRemove) {
        await tx.store.delete(row.key);
        const mem = memory.get(row.key);
        if (mem && mem.refCount <= 0) {
          URL.revokeObjectURL(mem.blobUrl);
          memory.delete(row.key);
        }
      }
      await tx.done;
    }
  } catch {
    /* best-effort persistence */
  }
}

async function fetchAndStore(
  path: string,
  variant: ImageVariant,
  knownEtag: string | null,
): Promise<{ blob: Blob; etag: string | null } | null> {
  const fetchPath = imageFetchPath(path, variant);
  const headers = new Headers();
  if (knownEtag) {
    headers.set('If-None-Match', knownEtag);
  }
  const res = await apiFetch(fetchPath, { headers });
  if (res.status === 304) {
    return null;
  }
  if (!res.ok) return null;
  const etag = res.headers.get('ETag');
  const blob = await res.blob();
  return { blob, etag };
}

function promoteToMemory(key: string, blob: Blob, etag: string | null): string {
  const existing = memory.get(key);
  if (existing) {
    touchMemory(key, existing);
    return existing.blobUrl;
  }
  const blobUrl = URL.createObjectURL(blob);
  memory.set(key, {
    blobUrl,
    blob,
    etag,
    refCount: 1,
    lastAccess: Date.now(),
  });
  return blobUrl;
}

export async function getAuthenticatedImageBlobUrl(
  path: string,
  variant: ImageVariant = 'full',
): Promise<string | null> {
  const key = imageCacheKey(path, variant);
  const mem = memory.get(key);
  if (mem) {
    touchMemory(key, mem);
    return mem.blobUrl;
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<string | null> => {
    const idb = await readIdb(key);
    if (idb) {
      const url = promoteToMemory(key, idb.blob, idb.etag);
      const refreshed = await fetchAndStore(path, variant, idb.etag);
      if (!refreshed) {
        return url;
      }
      await writeIdb(key, refreshed.blob, refreshed.etag);
      const entry = memory.get(key);
      if (entry) {
        URL.revokeObjectURL(entry.blobUrl);
        entry.blobUrl = URL.createObjectURL(refreshed.blob);
        entry.blob = refreshed.blob;
        entry.etag = refreshed.etag;
        return entry.blobUrl;
      }
      return promoteToMemory(key, refreshed.blob, refreshed.etag);
    }

    const fetched = await fetchAndStore(path, variant, null);
    if (!fetched) return null;
    await writeIdb(key, fetched.blob, fetched.etag);
    return promoteToMemory(key, fetched.blob, fetched.etag);
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export function releaseAuthenticatedImageBlobUrl(
  path: string,
  variant: ImageVariant = 'full',
): void {
  releaseMemoryEntry(imageCacheKey(path, variant));
}

export async function evictAuthenticatedImage(
  path: string,
  variant?: ImageVariant,
): Promise<void> {
  const variants: ImageVariant[] = variant ? [variant] : ['full', 'thumb'];
  for (const v of variants) {
    const key = imageCacheKey(path, v);
    inflight.delete(key);
    const mem = memory.get(key);
    if (mem) {
      URL.revokeObjectURL(mem.blobUrl);
      memory.delete(key);
    }
    try {
      const db = await getDb();
      await db.delete(STORE, key);
    } catch {
      /* ignore */
    }
  }
}

export async function clearAuthenticatedImageCache(): Promise<void> {
  inflight.clear();
  for (const entry of memory.values()) {
    URL.revokeObjectURL(entry.blobUrl);
  }
  memory.clear();
  try {
    const db = await getDb();
    await db.clear(STORE);
  } catch {
    /* ignore */
  }
}
