import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';
import { SeasonRepositoryMongo } from './season.repository.mongodb.js';

describe('SeasonRepository (integration)', () => {
  const repo = new SeasonRepositoryMongo();

  beforeAll(startMongo, 120_000);
  afterAll(stopMongo, 30_000);

  it('create, findByGardenId, findActive, archive via isActive, deleteByGardenId', async () => {
    const gardenId = uuidv4();
    const s1 = await repo.create({
      gardenId,
      name: '2025',
      startDate: new Date(2025, 0, 1),
      endDate: new Date(2025, 11, 31),
      isActive: true,
    });
    expect(s1.isActive).toBe(true);
    const active = await repo.findActiveByGardenId(gardenId);
    expect(active?.id).toBe(s1.id);

    await repo.deactivateAllInGarden(gardenId);
    const s2 = await repo.create({
      gardenId,
      name: '2026',
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 11, 31),
      isActive: true,
    });
    const activeAfter = await repo.findActiveByGardenId(gardenId);
    expect(activeAfter?.id).toBe(s2.id);

    const archived = await repo.findById(s1.id);
    expect(archived?.isActive).toBe(false);

    expect(await repo.deleteByGardenId(gardenId)).toBe(2);
  });
});
