import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../app.js';
import { buildContainer } from '../../config/container.js';
import { loadEnv, type Env } from '../../config/env.js';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';

async function registerWithToken(
  app: ReturnType<typeof createApp>,
  env: Env,
  displayName: string,
): Promise<{ email: string; token: string; userId: string }> {
  const email = `g-${uuidv4()}@test.com`;
  const c = buildContainer(env);
  await c.allowedEmailRepo.create({ email, addedBy: null });
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email,
      password: 'password12',
      displayName,
    })
    .expect(201);
  return {
    email,
    token: res.body.accessToken as string,
    userId: res.body.user.id as string,
  };
}

describe('Gardens, areas, seasons API (integration)', () => {
  let env: Env;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    const uri = await startMongo();
    env = loadEnv({
      MONGODB_URI: uri,
      JWT_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      NODE_ENV: 'test',
    });
    app = createApp(env, pino({ level: 'silent' }), buildContainer(env));
  }, 120_000);

  afterAll(stopMongo, 30_000);

  it('creates garden with membership and active season, lists gardens', async () => {
    const { token } = await registerWithToken(app, env, 'Gardener');

    const created = await request(app)
      .post('/api/v1/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Hjemmehage',
        gridWidth: 10,
        gridHeight: 12,
        cellSizeMeters: 1,
      })
      .expect(201);
    expect(created.body.name).toBe('Hjemmehage');
    const gardenId = created.body.id as string;

    const list = await request(app)
      .get('/api/v1/gardens')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.some((g: { id: string }) => g.id === gardenId)).toBe(true);

    const one = await request(app)
      .get(`/api/v1/gardens/${gardenId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(one.body.gridWidth).toBe(10);

    const seasons = await request(app)
      .get(`/api/v1/gardens/${gardenId}/seasons`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(seasons.body.length).toBeGreaterThanOrEqual(1);
    const activeCount = seasons.body.filter((s: { isActive: boolean }) => s.isActive).length;
    expect(activeCount).toBe(1);
  });

  it('rejects non-member access to garden routes', async () => {
    const { token: a } = await registerWithToken(app, env, 'A');
    const { token: b } = await registerWithToken(app, env, 'B');

    const created = await request(app)
      .post('/api/v1/gardens')
      .set('Authorization', `Bearer ${a}`)
      .send({ name: 'Private', gridWidth: 5, gridHeight: 5, cellSizeMeters: 1 })
      .expect(201);
    const gardenId = created.body.id as string;

    await request(app)
      .get(`/api/v1/gardens/${gardenId}`)
      .set('Authorization', `Bearer ${b}`)
      .expect(403);
  });

  it('updates garden; only owner may delete', async () => {
    const { token } = await registerWithToken(app, env, 'Owner');
    const c = buildContainer(env);

    const created = await request(app)
      .post('/api/v1/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Plot', gridWidth: 8, gridHeight: 8, cellSizeMeters: 0.5 })
      .expect(201);
    const gardenId = created.body.id as string;

    const patched = await request(app)
      .patch(`/api/v1/gardens/${gardenId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Plot' })
      .expect(200);
    expect(patched.body.name).toBe('Updated Plot');

    const { token: memberToken, userId: memberUserId } = await registerWithToken(app, env, 'Member');
    await c.membershipRepo.create({ gardenId, userId: memberUserId, role: 'member' });

    await request(app)
      .delete(`/api/v1/gardens/${gardenId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);

    await request(app)
      .delete(`/api/v1/gardens/${gardenId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app)
      .get(`/api/v1/gardens/${gardenId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('area CRUD and overlap rejection', async () => {
    const { token } = await registerWithToken(app, env, 'Areas');

    const created = await request(app)
      .post('/api/v1/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Grid', gridWidth: 10, gridHeight: 10, cellSizeMeters: 1 })
      .expect(201);
    const gardenId = created.body.id as string;

    const a1 = await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bed 1',
        type: 'raised_bed',
        color: '#8B4513',
        gridX: 0,
        gridY: 0,
        gridWidth: 3,
        gridHeight: 2,
      })
      .expect(201);
    const areaId = a1.body.id as string;

    const list = await request(app)
      .get(`/api/v1/gardens/${gardenId}/areas`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body).toHaveLength(1);

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Overlap',
        type: 'path',
        color: '#999999',
        gridX: 2,
        gridY: 0,
        gridWidth: 2,
        gridHeight: 2,
      })
      .expect(409);

    const patched = await request(app)
      .patch(`/api/v1/gardens/${gardenId}/areas/${areaId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Raised 1' })
      .expect(200);
    expect(patched.body.name).toBe('Raised 1');

    await request(app)
      .delete(`/api/v1/gardens/${gardenId}/areas/${areaId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const empty = await request(app)
      .get(`/api/v1/gardens/${gardenId}/areas`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(empty.body).toHaveLength(0);
  });

  it('season list, create, and single active season', async () => {
    const { token } = await registerWithToken(app, env, 'Seasons');

    const created = await request(app)
      .post('/api/v1/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'S', gridWidth: 4, gridHeight: 4, cellSizeMeters: 1 })
      .expect(201);
    const gardenId = created.body.id as string;

    const initial = await request(app)
      .get(`/api/v1/gardens/${gardenId}/seasons`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const initialActive = initial.body.filter((s: { isActive: boolean }) => s.isActive);
    expect(initialActive).toHaveLength(1);

    const second = await request(app)
      .post(`/api/v1/gardens/${gardenId}/seasons`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Extra-${uuidv4()}`,
        startDate: '2027-01-01',
        endDate: '2027-12-31',
        isActive: true,
      })
      .expect(201);
    const secondId = second.body.id as string;

    const after = await request(app)
      .get(`/api/v1/gardens/${gardenId}/seasons`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(after.body.filter((s: { isActive: boolean }) => s.isActive)).toHaveLength(1);
    expect(after.body.find((s: { id: string; isActive: boolean }) => s.id === secondId)?.isActive).toBe(
      true,
    );

    await request(app)
      .patch(`/api/v1/gardens/${gardenId}/seasons/${secondId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false })
      .expect(200);

    const noneActive = await request(app)
      .get(`/api/v1/gardens/${gardenId}/seasons`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(noneActive.body.filter((s: { isActive: boolean }) => s.isActive)).toHaveLength(0);
  });
});
