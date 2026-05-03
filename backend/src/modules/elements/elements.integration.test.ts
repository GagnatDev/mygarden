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
): Promise<{ token: string }> {
  const email = `e-${uuidv4()}@test.com`;
  const c = buildContainer(env);
  await c.allowedEmailRepo.create({ email, addedBy: null });
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'password12', displayName })
    .expect(201);
  return { token: res.body.accessToken as string };
}

async function createGardenAndArea(
  app: ReturnType<typeof createApp>,
  token: string,
  gridWidth = 10,
  gridHeight = 10,
): Promise<{ gardenId: string; areaId: string }> {
  const g = await request(app)
    .post('/api/v1/gardens')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'G' })
    .expect(201);
  const gardenId = g.body.id as string;
  const a = await request(app)
    .post(`/api/v1/gardens/${gardenId}/areas`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Yard', gridWidth, gridHeight, cellSizeMeters: 1 })
    .expect(201);
  return { gardenId, areaId: a.body.id as string };
}

describe('Elements API (integration)', () => {
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

  it('CRUD with overlap rejection and out-of-grid rejection', async () => {
    const { token } = await registerWithToken(app, env, 'Elements');
    const { gardenId, areaId } = await createGardenAndArea(app, token);

    const e1 = await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements`)
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
    const elementId = e1.body.id as string;

    const list = await request(app)
      .get(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body).toHaveLength(1);

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements`)
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

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Outside',
        type: 'path',
        color: '#999999',
        gridX: 9,
        gridY: 9,
        gridWidth: 5,
        gridHeight: 5,
      })
      .expect(400);

    const patched = await request(app)
      .patch(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements/${elementId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed' })
      .expect(200);
    expect(patched.body.name).toBe('Renamed');

    const e2 = await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bed 2',
        type: 'raised_bed',
        color: '#228B22',
        gridX: 5,
        gridY: 0,
        gridWidth: 2,
        gridHeight: 2,
      })
      .expect(201);
    const e2Id = e2.body.id as string;

    await request(app)
      .patch(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements/${elementId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ gridX: 4, gridY: 0 })
      .expect(409);

    const moved = await request(app)
      .patch(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements/${elementId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ gridX: 7, gridY: 7 })
      .expect(200);
    expect(moved.body.gridX).toBe(7);

    await request(app)
      .delete(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements/${elementId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app)
      .delete(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements/${e2Id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const empty = await request(app)
      .get(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(empty.body).toHaveLength(0);
  });
});
