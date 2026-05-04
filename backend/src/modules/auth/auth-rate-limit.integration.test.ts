import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { createApp } from '../../app.js';
import { buildContainer } from '../../config/container.js';
import { loadEnv, type Env } from '../../config/env.js';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';

describe('Auth rate limits (integration)', () => {
  let env: Env;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    const uri = await startMongo();
    env = loadEnv({
      MONGODB_URI: uri,
      JWT_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      NODE_ENV: 'test',
      AUTH_RATE_LIMIT_LOGIN_MAX: '3',
      AUTH_RATE_LIMIT_WINDOW_MS: '60000',
    });
    app = createApp(env, pino({ level: 'silent' }), buildContainer(env));
  }, 120_000);

  afterAll(stopMongo, 30_000);

  it('returns 429 with application/problem+json after login limit', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({})
        .expect(400)
        .expect('Content-Type', /application\/problem\+json/);
    }
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({})
      .expect(429)
      .expect('Content-Type', /application\/problem\+json/);
    expect(res.body).toMatchObject({
      status: 429,
      title: 'Too Many Requests',
      detail: expect.stringMatching(/try again/i),
    });
  });
});
