import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../app.js';
import { buildContainer } from '../../config/container.js';
import { loadEnv, type Env } from '../../config/env.js';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';

describe('Admin allowlist API (integration)', () => {
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

  it('only app owner can list and mutate allowlist', async () => {
    const ownerEmail = `owner-${uuidv4()}@test.com`;
    const memberEmail = `member-${uuidv4()}@test.com`;
    const c = buildContainer(env);
    await c.allowedEmailRepo.create({ email: ownerEmail, addedBy: null });
    await c.allowedEmailRepo.create({ email: memberEmail, addedBy: null });

    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: ownerEmail,
        password: 'password12',
        displayName: 'Owner',
      })
      .expect(201);

    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: memberEmail,
        password: 'password12',
        displayName: 'Member',
      })
      .expect(201);

    const memberLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: memberEmail, password: 'password12' })
      .expect(200);
    const memberToken = memberLogin.body.accessToken as string;

    await request(app)
      .get('/api/v1/admin/allowed-emails')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);

    const ownerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ownerEmail, password: 'password12' })
      .expect(200);
    const ownerToken = ownerLogin.body.accessToken as string;

    const list = await request(app)
      .get('/api/v1/admin/allowed-emails')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(Array.isArray(list.body.data)).toBe(true);

    const newEmail = `new-${uuidv4()}@test.com`;
    const created = await request(app)
      .post('/api/v1/admin/allowed-emails')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: newEmail })
      .expect(201);
    expect(created.body.email).toBe(newEmail.toLowerCase());

    await request(app)
      .post('/api/v1/admin/allowed-emails')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: newEmail })
      .expect(409);

    await request(app)
      .delete(`/api/v1/admin/allowed-emails/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    await request(app)
      .delete(`/api/v1/admin/allowed-emails/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });
});
