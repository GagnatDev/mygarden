import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../app.js';
import { buildContainer } from '../../config/container.js';
import { loadEnv, type Env } from '../../config/env.js';
import { MemoryFileStorageService } from '../../services/file-storage/memory-file-storage.service.js';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function registerWithToken(
  app: ReturnType<typeof createApp>,
  env: Env,
  displayName: string,
): Promise<{ token: string }> {
  const email = `bg-${uuidv4()}@test.com`;
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
): Promise<{ gardenId: string; areaId: string }> {
  const g = await request(app)
    .post('/api/v1/gardens')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'BgGarden' })
    .expect(201);
  const gardenId = g.body.id as string;
  const a = await request(app)
    .post(`/api/v1/gardens/${gardenId}/areas`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'BgArea', gridWidth: 4, gridHeight: 3, cellSizeMeters: 1 })
    .expect(201);
  return { gardenId, areaId: a.body.id as string };
}

describe('Area background image API (integration)', () => {
  let env: Env;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    const uri = await startMongo();
    const fileStorage = new MemoryFileStorageService();
    env = loadEnv({
      MONGODB_URI: uri,
      JWT_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      NODE_ENV: 'test',
      S3_BUCKET: 'test-bucket',
      S3_ACCESS_KEY_ID: 'test',
      S3_SECRET_ACCESS_KEY: 'test',
      S3_REGION: 'us-east-1',
    });
    app = createApp(env, pino({ level: 'silent' }), buildContainer(env, { fileStorage }));
  }, 120_000);

  afterAll(stopMongo, 30_000);

  it('upload sets backgroundImageUrl, GET returns image, DELETE clears', async () => {
    const { token } = await registerWithToken(app, env, 'BgUser');
    const { gardenId, areaId } = await createGardenAndArea(app, token);

    const putRes = await request(app)
      .put(`/api/v1/gardens/${gardenId}/areas/${areaId}/background-image`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', tinyPng, 'tiny.png')
      .expect(200);

    expect(putRes.body.backgroundImageUrl).toBe(
      `/gardens/${gardenId}/areas/${areaId}/background-image`,
    );

    const one = await request(app)
      .get(`/api/v1/gardens/${gardenId}/areas/${areaId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(one.body.backgroundImageUrl).toBe(
      `/gardens/${gardenId}/areas/${areaId}/background-image`,
    );

    const img = await request(app)
      .get(`/api/v1/gardens/${gardenId}/areas/${areaId}/background-image`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(img.headers['content-type']).toMatch(/image\/png/);
    expect(img.body).toEqual(tinyPng);

    const del = await request(app)
      .delete(`/api/v1/gardens/${gardenId}/areas/${areaId}/background-image`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(del.body.backgroundImageUrl).toBeNull();

    await request(app)
      .get(`/api/v1/gardens/${gardenId}/areas/${areaId}/background-image`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('rejects upload when declared type does not match file content', async () => {
    const { token } = await registerWithToken(app, env, 'Spoof');
    const { gardenId, areaId } = await createGardenAndArea(app, token);

    const res = await request(app)
      .put(`/api/v1/gardens/${gardenId}/areas/${areaId}/background-image`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', tinyPng, 'disguised.jpg')
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/);
    expect(res.body.detail).toMatch(/does not match declared type/i);
  });

  it('rejects non-image bytes with allowed image Content-Type', async () => {
    const { token } = await registerWithToken(app, env, 'BadBytes');
    const { gardenId, areaId } = await createGardenAndArea(app, token);

    const res = await request(app)
      .put(`/api/v1/gardens/${gardenId}/areas/${areaId}/background-image`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('plain text not an image'), 'x.png')
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/);
    expect(res.body.detail).toMatch(/invalid or unsupported image file/i);
  });
});
