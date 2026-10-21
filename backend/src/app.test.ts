import { describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { createApp } from './app.js';
import { buildContainer } from './config/container.js';
import type { Env } from './config/env.js';

const baseEnv: Omit<Env, 'NODE_ENV'> = {
  PORT: 3000,
  MONGODB_URI: 'mongodb://127.0.0.1:27017/unused-app-test',
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  ACCESS_TOKEN_EXPIRES: '15m',
  REFRESH_TOKEN_EXPIRES: '7d',
  BCRYPT_ROUNDS: 12,
  ADMIN_EMAIL: undefined,
  S3_ENDPOINT: undefined,
  S3_REGION: undefined,
  S3_BUCKET: undefined,
  S3_ACCESS_KEY_ID: undefined,
  S3_SECRET_ACCESS_KEY: undefined,
};

const logger = pino({ level: 'silent' });

describe('createApp', () => {
  it('constructs in production without throwing on the SPA fallback route', () => {
    const env: Env = { ...baseEnv, NODE_ENV: 'production' };
    expect(() => createApp(env, logger, buildContainer(env))).not.toThrow();
  });

  it('still serves GET /health in production', async () => {
    const env: Env = { ...baseEnv, NODE_ENV: 'production' };
    const app = createApp(env, logger, buildContainer(env));
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
