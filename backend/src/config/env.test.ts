import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

describe('loadEnv', () => {
  it('accepts valid config with defaults', () => {
    const env = loadEnv({
      JWT_SECRET: 'x'.repeat(32),
      NODE_ENV: 'test',
    });
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('test');
    expect(env.JWT_SECRET).toHaveLength(32);
  });

  it('parses PORT as number', () => {
    const env = loadEnv({
      JWT_SECRET: 'x'.repeat(32),
      PORT: '8080',
      NODE_ENV: 'test',
    });
    expect(env.PORT).toBe(8080);
  });

  it('rejects JWT_SECRET shorter than 32 characters', () => {
    expect(() =>
      loadEnv({
        JWT_SECRET: 'short',
        NODE_ENV: 'test',
      }),
    ).toThrow(/Invalid environment/);
  });
});
