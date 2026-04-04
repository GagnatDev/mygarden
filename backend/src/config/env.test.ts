import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

const base = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/env-test',
  JWT_SECRET: 'x'.repeat(32),
  JWT_REFRESH_SECRET: 'y'.repeat(32),
  NODE_ENV: 'test' as const,
};

describe('loadEnv', () => {
  it('accepts valid config with defaults', () => {
    const env = loadEnv(base);
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('test');
    expect(env.JWT_SECRET).toHaveLength(32);
    expect(env.ACCESS_TOKEN_EXPIRES).toBe('15m');
  });

  it('parses PORT as number', () => {
    const env = loadEnv({ ...base, PORT: '8080' });
    expect(env.PORT).toBe(8080);
  });

  it('rejects JWT_SECRET shorter than 32 characters', () => {
    expect(() =>
      loadEnv({
        ...base,
        JWT_SECRET: 'short',
      }),
    ).toThrow(/Invalid environment/);
  });

  it('rejects JWT_REFRESH_SECRET shorter than 32 characters', () => {
    expect(() =>
      loadEnv({
        ...base,
        JWT_REFRESH_SECRET: 'short',
      }),
    ).toThrow(/Invalid environment/);
  });
});
