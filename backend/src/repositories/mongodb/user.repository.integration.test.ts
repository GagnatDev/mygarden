import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { UserRepositoryMongo } from './user.repository.mongodb.js';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';

describe('UserRepository (integration)', () => {
  const repo = new UserRepositoryMongo();

  beforeAll(startMongo, 120_000);
  afterAll(stopMongo, 30_000);

  it('create, findByEmail, findById, update, findOldestUser', async () => {
    const email = `user-${uuidv4()}@test.com`;
    const u1 = await repo.create({
      email,
      passwordHash: 'hash1',
      displayName: 'First',
    });

    const byEmail = await repo.findByEmail(email);
    expect(byEmail?.id).toBe(u1.id);

    const byId = await repo.findById(u1.id);
    expect(byId?.displayName).toBe('First');

    const oldest = await repo.findOldestUser();
    expect(oldest?.id).toBe(u1.id);

    const email2 = `user2-${uuidv4()}@test.com`;
    await repo.create({
      email: email2,
      passwordHash: 'hash2',
      displayName: 'Second',
    });

    const oldestStill = await repo.findOldestUser();
    expect(oldestStill?.id).toBe(u1.id);

    const updated = await repo.update(u1.id, {
      displayName: 'Updated',
      language: 'en',
    });
    expect(updated?.displayName).toBe('Updated');
    expect(updated?.language).toBe('en');
  });
});
