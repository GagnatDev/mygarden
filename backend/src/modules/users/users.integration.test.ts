import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt, { type SignOptions } from 'jsonwebtoken';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../app.js';
import { buildContainer } from '../../config/container.js';
import { loadEnv, type Env } from '../../config/env.js';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';

describe('Users API & auth guards (integration)', () => {
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

  it('GET /users/me returns 401 without token', async () => {
    await request(app).get('/api/v1/users/me').expect(401);
  });

  it('GET /users/me returns 401 for expired access token', async () => {
    const email = `exp-${uuidv4()}@test.com`;
    const c = buildContainer(env);
    await c.allowedEmailRepo.create({ email, addedBy: null });
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'password12',
        displayName: 'E',
      })
      .expect(201);
    const userId = reg.body.user.id as string;

    const expired = jwt.sign(
      { sub: userId, email, typ: 'access' },
      env.JWT_SECRET,
      { expiresIn: '-60s' } as SignOptions,
    );

    await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
  });

  it('GET /users/me and PATCH /users/me work with valid token', async () => {
    const email = `me-${uuidv4()}@test.com`;
    const c = buildContainer(env);
    await c.allowedEmailRepo.create({ email, addedBy: null });

    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'password12',
        displayName: 'Me',
      })
      .expect(201);

    const login2 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'password12' })
      .expect(200);
    const token = login2.body.accessToken as string;

    const me = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(me.body.displayName).toBe('Me');
    expect(me.body.language).toBe('nb');

    const patched = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'New', language: 'en' })
      .expect(200);
    expect(patched.body.displayName).toBe('New');
    expect(patched.body.language).toBe('en');
  });
});
