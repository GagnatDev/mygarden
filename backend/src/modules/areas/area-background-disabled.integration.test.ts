import { afterAll, beforeAll, describe, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../app.js';
import { buildContainer } from '../../config/container.js';
import { loadEnv, type Env } from '../../config/env.js';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('Area background upload when S3 env is absent (integration)', () => {
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

  it('PUT /background-image returns 503', async () => {
    const email = `bg-off-${uuidv4()}@test.com`;
    const c = buildContainer(env);
    await c.allowedEmailRepo.create({ email, addedBy: null });
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'password12', displayName: 'U' })
      .expect(201);
    const token = reg.body.accessToken as string;

    const g = await request(app)
      .post('/api/v1/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'G' })
      .expect(201);
    const gardenId = g.body.id as string;

    const a = await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'A', gridWidth: 2, gridHeight: 2, cellSizeMeters: 1 })
      .expect(201);
    const areaId = a.body.id as string;

    await request(app)
      .put(`/api/v1/gardens/${gardenId}/areas/${areaId}/background-image`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', tinyPng, 'tiny.png')
      .expect(503);
  });
});
