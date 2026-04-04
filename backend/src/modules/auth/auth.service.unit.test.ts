import { describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { loadEnv } from '../../config/env.js';
import type { IAllowedEmailRepository } from '../../repositories/interfaces/allowed-email.repository.interface.js';
import type { IUserRepository } from '../../repositories/interfaces/user.repository.interface.js';
import { AuthService } from './auth.service.js';

const env = loadEnv({
  MONGODB_URI: 'mongodb://127.0.0.1:27017/unit',
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  NODE_ENV: 'test',
});

function mockRepos(): { users: IUserRepository; allowed: IAllowedEmailRepository } {
  return {
    users: {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findOldestUser: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    allowed: {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      deleteById: vi.fn(),
      list: vi.fn(),
      markRegistered: vi.fn(),
    },
  };
}

describe('AuthService (unit)', () => {
  it('hashPassword produces verifiable bcrypt hashes', async () => {
    const { users, allowed } = mockRepos();
    const auth = new AuthService(env, users, allowed);
    const a = await auth.hashPassword('same-password');
    const b = await auth.hashPassword('same-password');
    expect(a).not.toBe(b);
    expect(await bcrypt.compare('same-password', a)).toBe(true);
    expect(await bcrypt.compare('same-password', b)).toBe(true);
  });

  it('signAccessToken produces a JWT that verifies with expected claims', () => {
    const { users, allowed } = mockRepos();
    const auth = new AuthService(env, users, allowed);
    const token = auth.signAccessToken({ id: 'user-1', email: 'a@b.com' });
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      sub: string;
      email: string;
      typ: string;
    };
    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('a@b.com');
    expect(payload.typ).toBe('access');
  });
});
