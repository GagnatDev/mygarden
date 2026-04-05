import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';
import { AreaRepositoryMongo } from './area.repository.mongodb.js';

describe('AreaRepository (integration)', () => {
  const repo = new AreaRepositoryMongo();

  beforeAll(startMongo, 120_000);
  afterAll(stopMongo, 30_000);

  it('create, findByGardenId, update, delete, deleteByGardenId', async () => {
    const gardenId = uuidv4();
    const a = await repo.create({
      gardenId,
      name: 'Bed 1',
      type: 'raised_bed',
      color: '#8B4513',
      gridX: 0,
      gridY: 0,
      gridWidth: 2,
      gridHeight: 3,
    });
    const list = await repo.findByGardenId(gardenId);
    expect(list).toHaveLength(1);

    const u = await repo.update(a.id, { name: 'Bed A' });
    expect(u?.name).toBe('Bed A');

    expect(await repo.delete(a.id)).toBe(true);
    expect(await repo.findByGardenId(gardenId)).toHaveLength(0);

    await repo.create({
      gardenId,
      name: 'B',
      type: 'path',
      color: '#ccc',
      gridX: 0,
      gridY: 0,
      gridWidth: 1,
      gridHeight: 1,
    });
    expect(await repo.deleteByGardenId(gardenId)).toBe(1);
  });
});
