import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAuthenticatedImageCache,
  evictAuthenticatedImage,
  getAuthenticatedImageBlobUrl,
} from './authenticated-image-cache';

const tinyPngBytes = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
);

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../api/client';

describe('authenticated-image-cache', () => {
  beforeEach(async () => {
    await clearAuthenticatedImageCache();
    vi.mocked(apiFetch).mockReset();
  });

  afterEach(async () => {
    await clearAuthenticatedImageCache();
  });

  it('dedupes concurrent fetches for the same path', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(new Blob([tinyPngBytes]), { status: 200, headers: { ETag: '"a"' } }),
    );

    const [u1, u2] = await Promise.all([
      getAuthenticatedImageBlobUrl('/plant-profiles/p1/images/i1'),
      getAuthenticatedImageBlobUrl('/plant-profiles/p1/images/i1'),
    ]);

    expect(u1).toBeTruthy();
    expect(u1).toBe(u2);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('reuses memory cache without refetching', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(new Blob([tinyPngBytes]), { status: 200, headers: { ETag: '"b"' } }),
    );

    const first = await getAuthenticatedImageBlobUrl('/gardens/g1/notes/n1/photo');
    const second = await getAuthenticatedImageBlobUrl('/gardens/g1/notes/n1/photo');
    expect(first).toBe(second);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('evicts a path from memory and idb', async () => {
    vi.mocked(apiFetch).mockImplementation(async () =>
      new Response(new Blob([tinyPngBytes]), { status: 200 }),
    );

    await getAuthenticatedImageBlobUrl('/plant-profiles/p1/images/i2');
    await evictAuthenticatedImage('/plant-profiles/p1/images/i2');
    await getAuthenticatedImageBlobUrl('/plant-profiles/p1/images/i2');

    expect(apiFetch).toHaveBeenCalledTimes(2);
  });
});
