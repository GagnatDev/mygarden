import { enqueueMutation, listQueuedMutations, removeQueuedMutation } from '../offline/offline-queue';
import { getAccessToken, setAccessToken } from './token';

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1';

let refreshInFlight: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    setAccessToken(null);
    return false;
  }
  const data = (await res.json()) as { accessToken: string };
  setAccessToken(data.accessToken);
  return true;
}

function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export function getApiBase(): string {
  return API_BASE;
}

function isMutationMethod(method: string): boolean {
  return ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method.toUpperCase());
}

async function tryEnqueueOfflineMutation(path: string, init: RequestInit): Promise<Response | null> {
  if (typeof navigator === 'undefined' || navigator.onLine) return null;
  const method = (init.method ?? 'GET').toUpperCase();
  if (!isMutationMethod(method)) return null;
  if (path.startsWith('/auth') || path.includes('/auth/')) return null;
  const body = typeof init.body === 'string' ? init.body : init.body != null ? String(init.body) : null;
  await enqueueMutation({ path, method, body });
  return new Response(JSON.stringify({ queued: true }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Replays mutations stored while offline (FIFO). Stops on first hard failure.
 */
export async function flushOfflineQueue(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const items = await listQueuedMutations();
  for (const item of items) {
    const res = await apiFetch(
      item.path,
      { method: item.method, body: item.body ?? undefined },
      { skipOfflineQueue: true },
    );
    if (res.ok || res.status === 204) {
      await removeQueuedMutation(item.id);
      continue;
    }
    if (res.status === 401) {
      const ok = await refreshAccessToken();
      if (ok) {
        const retry = await apiFetch(
          item.path,
          { method: item.method, body: item.body ?? undefined },
          { skipOfflineQueue: true },
        );
        if (retry.ok || retry.status === 204) {
          await removeQueuedMutation(item.id);
          continue;
        }
      }
    }
    break;
  }
}

export function registerOfflineSync(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    void flushOfflineQueue();
  });
  if (navigator.onLine) {
    void flushOfflineQueue();
  }
}

export interface ApiFetchOptions {
  skipOfflineQueue?: boolean;
}

/**
 * Low-level fetch to the API with Bearer injection, credentials, and one refresh+retry on 401.
 * When offline, mutating requests are stored in IndexedDB and return 202 `{ queued: true }`.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  options?: ApiFetchOptions,
): Promise<Response> {
  if (!options?.skipOfflineQueue) {
    const offlineRes = await tryEnqueueOfflineMutation(path, init);
    if (offlineRes) return offlineRes;
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const skipRefresh = path.includes('/auth/refresh');

  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const body = init.body;
  if (body !== undefined && body !== null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res = await fetch(url, { ...init, headers, credentials: 'include' });

  const skip401Refresh =
    skipRefresh ||
    path === '/auth/login' ||
    path === '/auth/register' ||
    path.endsWith('/auth/login') ||
    path.endsWith('/auth/register');

  if (res.status === 401 && !skip401Refresh) {
    const ok = await refreshAccessToken();
    if (ok) {
      const retryHeaders = new Headers(init.headers);
      const t = getAccessToken();
      if (t) {
        retryHeaders.set('Authorization', `Bearer ${t}`);
      }
      if (body !== undefined && body !== null && !retryHeaders.has('Content-Type')) {
        retryHeaders.set('Content-Type', 'application/json');
      }
      res = await fetch(url, { ...init, headers: retryHeaders, credentials: 'include' });
    }
  }

  return res;
}

export async function readProblemDetails(res: Response): Promise<string | null> {
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/problem')) {
    return null;
  }
  try {
    const j = (await res.json()) as { detail?: string };
    return typeof j.detail === 'string' ? j.detail : null;
  } catch {
    return null;
  }
}
