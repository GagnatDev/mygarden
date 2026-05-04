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
  const email = `ppi-${uuidv4()}@test.com`;
  const c = buildContainer(env);
  await c.allowedEmailRepo.create({ email, addedBy: null });
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'password12', displayName })
    .expect(201);
  return { token: res.body.accessToken as string };
}

describe('Plant profile images API (integration)', () => {
  let env: Env;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    const uri = await startMongo();
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
    app = createApp(env, pino({ level: 'silent' }), buildContainer(env, { fileStorage: new MemoryFileStorageService() }));
  }, 120_000);

  afterAll(stopMongo, 30_000);

  it('uploads, fetches, and deletes a plant profile image', async () => {
    const { token } = await registerWithToken(app, env, 'ProfileImageUser');
    const profile = await request(app)
      .post('/api/v1/plant-profiles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tomato', type: 'vegetable' })
      .expect(201);
    const profileId = profile.body.id as string;

    const upload = await request(app)
      .post(`/api/v1/plant-profiles/${profileId}/images`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', tinyPng, 'tiny.png')
      .expect(200);
    expect(upload.body.images).toHaveLength(1);
    const imageId = upload.body.images[0].id as string;

    const image = await request(app)
      .get(`/api/v1/plant-profiles/${profileId}/images/${imageId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(image.headers['content-type']).toMatch(/image\/jpeg/);
    expect(image.body.byteLength).toBeGreaterThan(0);

    const removed = await request(app)
      .delete(`/api/v1/plant-profiles/${profileId}/images/${imageId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(removed.body.images).toHaveLength(0);
  });

  it('returns 503 for image upload when object storage is disabled', async () => {
    const localEnv = loadEnv({
      MONGODB_URI: env.MONGODB_URI,
      JWT_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      NODE_ENV: 'test',
    });
    const localApp = createApp(localEnv, pino({ level: 'silent' }), buildContainer(localEnv));
    const { token } = await registerWithToken(localApp, localEnv, 'NoS3User');
    const profile = await request(localApp)
      .post('/api/v1/plant-profiles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Basil', type: 'herb' })
      .expect(201);
    await request(localApp)
      .post(`/api/v1/plant-profiles/${profile.body.id as string}/images`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', tinyPng, 'tiny.png')
      .expect(503);
  });
});
