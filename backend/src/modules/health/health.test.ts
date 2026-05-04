import { describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { createApp } from '../../app.js';
import { buildContainer } from '../../config/container.js';
import type { Env } from '../../config/env.js';

const testEnv: Env = {
  NODE_ENV: 'test',
  PORT: 3000,
  MONGODB_URI: 'mongodb://127.0.0.1:27017/unused-health-test',
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  ACCESS_TOKEN_EXPIRES: '15m',
  REFRESH_TOKEN_EXPIRES: '7d',
  BCRYPT_ROUNDS: 12,
};

const logger = pino({ level: 'silent' });

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = createApp(testEnv, logger, buildContainer(testEnv));
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
