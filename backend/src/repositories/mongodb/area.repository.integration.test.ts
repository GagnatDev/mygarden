import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';
import { AreaRepositoryMongo } from './area.repository.mongodb.js';

describe('AreaRepository (integration)', () => {
  const repo = new AreaRepositoryMongo();

  beforeAll(startMongo, 120_000);
  afterAll(stopMongo, 30_000);

  it('create, findByGardenId sorts by sortIndex, update, delete, deleteByGardenId', async () => {
    const gardenId = uuidv4();
    const a = await repo.create({
      gardenId,
      title: 'Front yard',
      description: 'Sunny south-facing patch',
      gridWidth: 10,
      gridHeight: 8,
      cellSizeMeters: 0.5,
      sortIndex: 1,
    });
    const b = await repo.create({
      gardenId,
      title: 'Back yard',
      description: '',
      gridWidth: 6,
      gridHeight: 6,
      cellSizeMeters: 1,
      sortIndex: 0,
    });

    const list = await repo.findByGardenId(gardenId);
    expect(list).toHaveLength(2);
    expect(list[0]!.id).toBe(b.id);
    expect(list[1]!.id).toBe(a.id);

    const updated = await repo.update(a.id, { title: 'Front bed', description: 'updated' });
    expect(updated?.title).toBe('Front bed');
    expect(updated?.description).toBe('updated');

    expect(await repo.delete(a.id)).toBe(true);
    expect(await repo.findByGardenId(gardenId)).toHaveLength(1);

    expect(await repo.deleteByGardenId(gardenId)).toBe(1);
    expect(await repo.findByGardenId(gardenId)).toHaveLength(0);
  });
});
