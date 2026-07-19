import { describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { createApp } from '../app.js';
import { buildContainer } from '../config/container.js';
import type { Env } from '../config/env.js';
import { resolveRequestId } from './request-logger.js';

const testEnv: Env = {
  NODE_ENV: 'test',
  PORT: 3000,
  MONGODB_URI: 'mongodb://127.0.0.1:27017/unused-request-logger-test',
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  ACCESS_TOKEN_EXPIRES: '15m',
  REFRESH_TOKEN_EXPIRES: '7d',
  BCRYPT_ROUNDS: 12,
};

const logger = pino({ level: 'silent' });

function buildApp() {
  return createApp(testEnv, logger, buildContainer(testEnv));
}

describe('requestLogger correlation ids', () => {
  it('generates an X-Request-Id when none is supplied', async () => {
    const res = await request(buildApp()).get('/health').expect(200);
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('produces distinct ids for two parallel requests', async () => {
    const app = buildApp();
    const [a, b] = await Promise.all([
      request(app).get('/health').expect(200),
      request(app).get('/health').expect(200),
    ]);
    expect(a.headers['x-request-id']).toBeTruthy();
    expect(b.headers['x-request-id']).toBeTruthy();
    expect(a.headers['x-request-id']).not.toBe(b.headers['x-request-id']);
  });

  it('passes a valid client-supplied X-Request-Id through', async () => {
    const clientId = 'client-request-1234';
    const res = await request(buildApp())
      .get('/health')
      .set('X-Request-Id', clientId)
      .expect(200);
    expect(res.headers['x-request-id']).toBe(clientId);
  });

  it('ignores an invalid client-supplied X-Request-Id and generates one', async () => {
    const res = await request(buildApp())
      .get('/health')
      .set('X-Request-Id', 'bad id with spaces!')
      .expect(200);
    expect(res.headers['x-request-id']).toBeTruthy();
    expect(res.headers['x-request-id']).not.toBe('bad id with spaces!');
  });
});

describe('resolveRequestId', () => {
  it('keeps a valid id', () => {
    expect(resolveRequestId('abcd1234')).toBe('abcd1234');
  });

  it('rejects a too-short id', () => {
    expect(resolveRequestId('short')).not.toBe('short');
  });

  it('rejects a too-long id', () => {
    const long = 'a'.repeat(129);
    expect(resolveRequestId(long)).not.toBe(long);
  });

  it('rejects ids with unsafe characters', () => {
    expect(resolveRequestId('has spaces')).not.toBe('has spaces');
  });

  it('uses the first value when the header is an array', () => {
    expect(resolveRequestId(['valid-id-0001', 'other'])).toBe('valid-id-0001');
  });

  it('generates an id when none is provided', () => {
    expect(resolveRequestId(undefined)).toMatch(/^[A-Za-z0-9-]+$/);
  });
});
