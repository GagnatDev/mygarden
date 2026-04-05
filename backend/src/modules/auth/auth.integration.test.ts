import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../app.js';
import { buildContainer } from '../../config/container.js';
import { loadEnv, type Env } from '../../config/env.js';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';

describe('Auth API (integration)', () => {
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

  it('register succeeds for ADMIN_EMAIL without allowlist entry', async () => {
    const adminEmail = `owner-${uuidv4()}@test.com`;
    const adminEnv = loadEnv({
      MONGODB_URI: env.MONGODB_URI,
      JWT_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      NODE_ENV: 'test',
      ADMIN_EMAIL: adminEmail,
    });
    const adminApp = createApp(adminEnv, pino({ level: 'silent' }), buildContainer(adminEnv));

    const reg = await request(adminApp)
      .post('/api/v1/auth/register')
      .send({
        email: adminEmail,
        password: 'password12',
        displayName: 'Owner',
      })
      .expect(201);
    expect(reg.body.user.email).toBe(adminEmail);
    expect(reg.body.accessToken).toBeTruthy();
  });

  it('register returns 403 when email is not on allowlist', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `nope-${uuidv4()}@test.com`,
        password: 'password12',
        displayName: 'X',
      })
      .expect(403)
      .expect('Content-Type', /application\/problem\+json/);
    expect(res.body.status).toBe(403);
    expect(res.body.detail).toMatch(/not approved/i);
  });

  it('register succeeds on allowlist and rejects duplicate user', async () => {
    const email = `ok-${uuidv4()}@test.com`;
    const c = buildContainer(env);
    await c.allowedEmailRepo.create({ email, addedBy: null });

    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'password12',
        displayName: 'Alice',
      })
      .expect(201);
    expect(reg.body.user.email).toBe(email);
    expect(reg.body.accessToken).toBeTruthy();

    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'otherpass12',
        displayName: 'Bob',
      })
      .expect(409);
  });

  it('register returns 403 when allowlist entry is already marked used', async () => {
    const email = `used-${uuidv4()}@test.com`;
    const c = buildContainer(env);
    await c.allowedEmailRepo.create({ email, addedBy: null });
    await c.allowedEmailRepo.markRegistered(email, new Date());

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'password12',
        displayName: 'Ghost',
      })
      .expect(403)
      .expect('Content-Type', /application\/problem\+json/);
    expect(res.body.detail).toMatch(/invitation/i);
  });

  it('login rejects wrong password and returns tokens on success', async () => {
    const email = `login-${uuidv4()}@test.com`;
    const c = buildContainer(env);
    await c.allowedEmailRepo.create({ email, addedBy: null });
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'correctpass12',
        displayName: 'L',
      })
      .expect(201);

    await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrongpassword' })
      .expect(401);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'correctpass12' })
      .expect(200);
    expect(res.body.accessToken).toBeTruthy();
    const rawCookies = res.headers['set-cookie'];
    const cookieList = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
    expect(cookieList.some((c) => c.includes('refresh_token='))).toBe(true);
  });

  it('refresh issues new access token with cookie and rejects without cookie', async () => {
    const email = `ref-${uuidv4()}@test.com`;
    const c = buildContainer(env);
    await c.allowedEmailRepo.create({ email, addedBy: null });

    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/register')
      .send({ email, password: 'password12', displayName: 'Ref' })
      .expect(201);
    await agent
      .post('/api/v1/auth/login')
      .send({ email, password: 'password12' })
      .expect(200);

    const ref = await agent.post('/api/v1/auth/refresh').expect(200);
    expect(ref.body.accessToken).toBeTruthy();

    await request(app).post('/api/v1/auth/refresh').expect(401);
  });

  it('logout clears refresh session', async () => {
    const email = `out-${uuidv4()}@test.com`;
    const c = buildContainer(env);
    await c.allowedEmailRepo.create({ email, addedBy: null });

    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/register')
      .send({ email, password: 'password12', displayName: 'Out' })
      .expect(201);
    const login = await agent
      .post('/api/v1/auth/login')
      .send({ email, password: 'password12' })
      .expect(200);
    const access = login.body.accessToken as string;

    await agent
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${access}`)
      .expect(204);

    await agent.post('/api/v1/auth/refresh').expect(401);
  });
});
