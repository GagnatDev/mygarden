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
  const email = `a-${uuidv4()}@test.com`;
  const c = buildContainer(env);
  await c.allowedEmailRepo.create({ email, addedBy: null });
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'password12', displayName })
    .expect(201);
  return { token: res.body.accessToken as string };
}

async function createGarden(app: ReturnType<typeof createApp>, token: string): Promise<string> {
  const g = await request(app)
    .post('/api/v1/gardens')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'G' })
    .expect(201);
  return g.body.id as string;
}

describe('Areas API (integration)', () => {
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

  it('CRUD: create, list, get, update, delete', async () => {
    const { token } = await registerWithToken(app, env, 'Areas');
    const gardenId = await createGarden(app, token);

    const created = await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Front yard',
        description: 'Sunny patch',
        gridWidth: 10,
        gridHeight: 8,
        cellSizeMeters: 0.5,
      })
      .expect(201);
    expect(created.body.title).toBe('Front yard');
    expect(created.body.description).toBe('Sunny patch');
    expect(created.body.gridWidth).toBe(10);
    const areaId = created.body.id as string;

    const list = await request(app)
      .get(`/api/v1/gardens/${gardenId}/areas`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body).toHaveLength(1);

    const got = await request(app)
      .get(`/api/v1/gardens/${gardenId}/areas/${areaId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(got.body.id).toBe(areaId);

    const patched = await request(app)
      .patch(`/api/v1/gardens/${gardenId}/areas/${areaId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Renamed', description: 'Updated description' })
      .expect(200);
    expect(patched.body.title).toBe('Renamed');
    expect(patched.body.description).toBe('Updated description');

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

  it('rejects invalid cellSizeMeters', async () => {
    const { token } = await registerWithToken(app, env, 'CellSize');
    const gardenId = await createGarden(app, token);

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'A', gridWidth: 5, gridHeight: 5, cellSizeMeters: 0.09 })
      .expect(400);

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'B', gridWidth: 5, gridHeight: 5, cellSizeMeters: 0.123 })
      .expect(400);

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'C', gridWidth: 5, gridHeight: 5, cellSizeMeters: 0.5 })
      .expect(201);
  });

  it('refuses to shrink an area below an existing element', async () => {
    const { token } = await registerWithToken(app, env, 'Shrink');
    const gardenId = await createGarden(app, token);

    const a = await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Yard', gridWidth: 5, gridHeight: 5, cellSizeMeters: 1 })
      .expect(201);
    const areaId = a.body.id as string;

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bed',
        type: 'raised_bed',
        color: '#aabbcc',
        gridX: 3,
        gridY: 3,
        gridWidth: 2,
        gridHeight: 2,
      })
      .expect(201);

    await request(app)
      .patch(`/api/v1/gardens/${gardenId}/areas/${areaId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ gridWidth: 4, gridHeight: 4 })
      .expect(400);

    await request(app)
      .patch(`/api/v1/gardens/${gardenId}/areas/${areaId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ gridWidth: 6, gridHeight: 6 })
      .expect(200);
  });

  it('deleting an area also removes its elements', async () => {
    const { token } = await registerWithToken(app, env, 'Cascade');
    const gardenId = await createGarden(app, token);

    const a = await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Yard', gridWidth: 5, gridHeight: 5, cellSizeMeters: 1 })
      .expect(201);
    const areaId = a.body.id as string;

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'X',
        type: 'open_bed',
        color: '#112233',
        gridX: 0,
        gridY: 0,
        gridWidth: 1,
        gridHeight: 1,
      })
      .expect(201);

    await request(app)
      .delete(`/api/v1/gardens/${gardenId}/areas/${areaId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app)
      .get(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
