import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { AllowedEmailRepositoryMongo } from './allowed-email.repository.mongodb.js';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';

describe('AllowedEmailRepository (integration)', () => {
  const repo = new AllowedEmailRepositoryMongo();

  beforeAll(startMongo, 120_000);
  afterAll(stopMongo, 30_000);

  it('create, findByEmail, list, markRegistered, deleteById', async () => {
    const email = `allow-${uuidv4()}@test.com`;
    const created = await repo.create({ email, addedBy: null });
    expect(created.email).toBe(email.toLowerCase());

    const found = await repo.findByEmail(email);
    expect(found?.id).toBe(created.id);

    const list = await repo.list();
    expect(list.some((e) => e.id === created.id)).toBe(true);

    const at = new Date();
    await repo.markRegistered(email, at);
    const after = await repo.findByEmail(email);
    expect(after?.registeredAt?.getTime()).toBe(at.getTime());

    const deleted = await repo.deleteById(created.id);
    expect(deleted).toBe(true);
    expect(await repo.findById(created.id)).toBeNull();
  });
});
