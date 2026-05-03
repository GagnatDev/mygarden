import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';
import { ElementRepositoryMongo } from './element.repository.mongodb.js';

describe('ElementRepository (integration)', () => {
  const repo = new ElementRepositoryMongo();

  beforeAll(startMongo, 120_000);
  afterAll(stopMongo, 30_000);

  it('create, findByAreaId, update, delete, deleteByAreaId', async () => {
    const areaId = uuidv4();
    const e = await repo.create({
      areaId,
      name: 'Bed 1',
      type: 'raised_bed',
      color: '#8B4513',
      gridX: 0,
      gridY: 0,
      gridWidth: 2,
      gridHeight: 3,
      shape: { kind: 'polygon', vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 3 }] },
    });
    const list = await repo.findByAreaId(areaId);
    expect(list).toHaveLength(1);
    expect(list[0]?.shape?.kind).toBe('polygon');

    const u = await repo.update(e.id, { name: 'Bed A' });
    expect(u?.name).toBe('Bed A');

    expect(await repo.delete(e.id)).toBe(true);
    expect(await repo.findByAreaId(areaId)).toHaveLength(0);

    await repo.create({
      areaId,
      name: 'B',
      type: 'path',
      color: '#cccccc',
      gridX: 0,
      gridY: 0,
      gridWidth: 1,
      gridHeight: 1,
      shape: { kind: 'rectangle' },
    });
    expect(await repo.deleteByAreaId(areaId)).toBe(1);
  });

  it('findByAreaIds returns elements across multiple areas', async () => {
    const areaA = uuidv4();
    const areaB = uuidv4();
    await repo.create({
      areaId: areaA,
      name: 'A1',
      type: 'raised_bed',
      color: '#aaaaaa',
      gridX: 0,
      gridY: 0,
      gridWidth: 1,
      gridHeight: 1,
    });
    await repo.create({
      areaId: areaB,
      name: 'B1',
      type: 'open_bed',
      color: '#bbbbbb',
      gridX: 0,
      gridY: 0,
      gridWidth: 1,
      gridHeight: 1,
    });
    const all = await repo.findByAreaIds([areaA, areaB]);
    expect(all).toHaveLength(2);
    expect(await repo.findByAreaIds([])).toHaveLength(0);
  });
});
