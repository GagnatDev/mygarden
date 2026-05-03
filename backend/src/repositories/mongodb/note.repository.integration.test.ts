import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';
import { NoteRepositoryMongo } from './note.repository.mongodb.js';

describe('NoteRepository (integration)', () => {
  const repo = new NoteRepositoryMongo();

  beforeAll(startMongo, 120_000);
  afterAll(stopMongo, 30_000);

  it('create, findByGardenSeason with filters, update, delete, deleteByGardenId', async () => {
    const gardenId = uuidv4();
    const seasonId = uuidv4();
    const userId = uuidv4();
    const elementId = uuidv4();

    const n1 = await repo.create({
      gardenId,
      seasonId,
      targetType: 'element',
      targetId: elementId,
      body: 'Element note',
      createdBy: userId,
    });
    const n2 = await repo.create({
      gardenId,
      seasonId,
      targetType: 'season',
      targetId: seasonId,
      body: 'Season note',
      createdBy: userId,
    });

    const all = await repo.findByGardenSeason(gardenId, seasonId);
    expect(all).toHaveLength(2);

    const elementsOnly = await repo.findByGardenSeason(gardenId, seasonId, {
      targetType: 'element',
      targetId: elementId,
    });
    expect(elementsOnly).toHaveLength(1);
    expect(elementsOnly[0]!.id).toBe(n1.id);

    const u = await repo.update(n1.id, { body: 'Updated' });
    expect(u?.body).toBe('Updated');

    expect(await repo.delete(n2.id)).toBe(true);
    expect(await repo.findByGardenSeason(gardenId, seasonId)).toHaveLength(1);

    expect(await repo.deleteByGardenId(gardenId)).toBe(1);
    expect(await repo.findByGardenSeason(gardenId, seasonId)).toHaveLength(0);
  });
});
