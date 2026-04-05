import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';
import { GardenMembershipRepositoryMongo } from './garden-membership.repository.mongodb.js';

describe('GardenMembershipRepository (integration)', () => {
  const repo = new GardenMembershipRepositoryMongo();

  beforeAll(startMongo, 120_000);
  afterAll(stopMongo, 30_000);

  it('create, findByUserAndGarden, findByUserId, findByGardenId, verify role, deleteByGardenId', async () => {
    const gardenId = uuidv4();
    const userId = uuidv4();
    const m = await repo.create({ gardenId, userId, role: 'owner' });
    expect(m.role).toBe('owner');

    const found = await repo.findByUserAndGarden(userId, gardenId);
    expect(found?.id).toBe(m.id);

    const byUser = await repo.findByUserId(userId);
    expect(byUser.some((x) => x.id === m.id)).toBe(true);

    const byGarden = await repo.findByGardenId(gardenId);
    expect(byGarden).toHaveLength(1);

    const n = await repo.deleteByGardenId(gardenId);
    expect(n).toBe(1);
    expect(await repo.findByUserAndGarden(userId, gardenId)).toBeNull();
  });
});
