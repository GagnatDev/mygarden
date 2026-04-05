import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';
import { GardenRepositoryMongo } from './garden.repository.mongodb.js';

describe('GardenRepository (integration)', () => {
  const repo = new GardenRepositoryMongo();

  beforeAll(startMongo, 120_000);
  afterAll(stopMongo, 30_000);

  it('create, findById, findByIds, update, delete', async () => {
    const userId = uuidv4();
    const g = await repo.create({
      name: 'Test Garden',
      gridWidth: 10,
      gridHeight: 12,
      cellSizeMeters: 1,
      createdBy: userId,
    });
    expect(g.gridWidth).toBe(10);

    const byId = await repo.findById(g.id);
    expect(byId?.name).toBe('Test Garden');

    const many = await repo.findByIds([g.id, uuidv4()]);
    expect(many).toHaveLength(1);
    expect(many[0]!.id).toBe(g.id);

    const updated = await repo.update(g.id, { name: 'Renamed' });
    expect(updated?.name).toBe('Renamed');

    expect(await repo.delete(g.id)).toBe(true);
    expect(await repo.findById(g.id)).toBeNull();
  });
});
