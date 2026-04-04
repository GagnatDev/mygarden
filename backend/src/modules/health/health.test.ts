import { describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { createApp } from '../../app.js';
import type { Env } from '../../config/env.js';

const testEnv: Env = {
  NODE_ENV: 'test',
  PORT: 3000,
  JWT_SECRET: 'a'.repeat(32),
};

const logger = pino({ level: 'silent' });

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = createApp(testEnv, logger);
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
