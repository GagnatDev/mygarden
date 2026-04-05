import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearQueueForTests, enqueueMutation, listQueuedMutations, removeQueuedMutation } from './offline-queue';

describe('offline queue (IndexedDB)', () => {
  beforeEach(async () => {
    await clearQueueForTests();
  });

  afterEach(async () => {
    await clearQueueForTests();
  });

  it('enqueues and lists mutations in order', async () => {
    await enqueueMutation({ path: '/a', method: 'POST', body: '{"x":1}' });
    await enqueueMutation({ path: '/b', method: 'PATCH', body: null });
    const list = await listQueuedMutations();
    expect(list).toHaveLength(2);
    expect(list[0]!.path).toBe('/a');
    expect(list[1]!.path).toBe('/b');
    await removeQueuedMutation(list[0]!.id);
    expect(await listQueuedMutations()).toHaveLength(1);
  });
});
