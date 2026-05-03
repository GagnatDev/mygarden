import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../app.js';
import { buildContainer } from '../../config/container.js';
import { loadEnv, type Env } from '../../config/env.js';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';

async function registerWithToken(
  app: ReturnType<typeof createApp>,
  env: Env,
  displayName: string,
): Promise<{ email: string; token: string; userId: string }> {
  const email = `g-${uuidv4()}@test.com`;
  const c = buildContainer(env);
  await c.allowedEmailRepo.create({ email, addedBy: null });
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email,
      password: 'password12',
      displayName,
    })
    .expect(201);
  return {
    email,
    token: res.body.accessToken as string,
    userId: res.body.user.id as string,
  };
}

describe('Gardens API (integration)', () => {
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

  it('creates garden with membership and active season, lists gardens', async () => {
    const { token } = await registerWithToken(app, env, 'Gardener');

    const created = await request(app)
      .post('/api/v1/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hjemmehage' })
      .expect(201);
    expect(created.body.name).toBe('Hjemmehage');
    const gardenId = created.body.id as string;

    const list = await request(app)
      .get('/api/v1/gardens')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.some((g: { id: string }) => g.id === gardenId)).toBe(true);

    const one = await request(app)
      .get(`/api/v1/gardens/${gardenId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(one.body.name).toBe('Hjemmehage');

    const seasons = await request(app)
      .get(`/api/v1/gardens/${gardenId}/seasons`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(seasons.body.length).toBeGreaterThanOrEqual(1);
    const activeCount = seasons.body.filter((s: { isActive: boolean }) => s.isActive).length;
    expect(activeCount).toBe(1);
  });

  it('rejects create garden when name is empty', async () => {
    const { token } = await registerWithToken(app, env, 'NameVal');

    await request(app)
      .post('/api/v1/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' })
      .expect(400);
  });

  it('rejects non-member access to garden routes', async () => {
    const { token: a } = await registerWithToken(app, env, 'A');
    const { token: b } = await registerWithToken(app, env, 'B');

    const created = await request(app)
      .post('/api/v1/gardens')
      .set('Authorization', `Bearer ${a}`)
      .send({ name: 'Private' })
      .expect(201);
    const gardenId = created.body.id as string;

    await request(app)
      .get(`/api/v1/gardens/${gardenId}`)
      .set('Authorization', `Bearer ${b}`)
      .expect(403);
  });

  it('updates garden; only owner may delete', async () => {
    const { token } = await registerWithToken(app, env, 'Owner');
    const c = buildContainer(env);

    const created = await request(app)
      .post('/api/v1/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Plot' })
      .expect(201);
    const gardenId = created.body.id as string;

    const patched = await request(app)
      .patch(`/api/v1/gardens/${gardenId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Plot' })
      .expect(200);
    expect(patched.body.name).toBe('Updated Plot');

    const { token: memberToken, userId: memberUserId } = await registerWithToken(app, env, 'Member');
    await c.membershipRepo.create({ gardenId, userId: memberUserId, role: 'member' });

    await request(app)
      .delete(`/api/v1/gardens/${gardenId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);

    await request(app)
      .delete(`/api/v1/gardens/${gardenId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app)
      .get(`/api/v1/gardens/${gardenId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('season list, create, and single active season', async () => {
    const { token } = await registerWithToken(app, env, 'Seasons');

    const created = await request(app)
      .post('/api/v1/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'S' })
      .expect(201);
    const gardenId = created.body.id as string;

    const initial = await request(app)
      .get(`/api/v1/gardens/${gardenId}/seasons`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const initialActive = initial.body.filter((s: { isActive: boolean }) => s.isActive);
    expect(initialActive).toHaveLength(1);

    const second = await request(app)
      .post(`/api/v1/gardens/${gardenId}/seasons`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Extra-${uuidv4()}`,
        startDate: '2027-01-01',
        endDate: '2027-12-31',
        isActive: true,
      })
      .expect(201);
    const secondId = second.body.id as string;

    const after = await request(app)
      .get(`/api/v1/gardens/${gardenId}/seasons`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(after.body.filter((s: { isActive: boolean }) => s.isActive)).toHaveLength(1);
    expect(after.body.find((s: { id: string; isActive: boolean }) => s.id === secondId)?.isActive).toBe(
      true,
    );

    await request(app)
      .patch(`/api/v1/gardens/${gardenId}/seasons/${secondId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false })
      .expect(200);

    const noneActive = await request(app)
      .get(`/api/v1/gardens/${gardenId}/seasons`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(noneActive.body.filter((s: { isActive: boolean }) => s.isActive)).toHaveLength(0);
  });

  it('archives active season and returns full history snapshot', async () => {
    const { token } = await registerWithToken(app, env, 'Archive');
    const created = await request(app)
      .post('/api/v1/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'H' })
      .expect(201);
    const gardenId = created.body.id as string;
    const seasons = await request(app)
      .get(`/api/v1/gardens/${gardenId}/seasons`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const activeId = seasons.body.find((s: { isActive: boolean }) => s.isActive).id as string;

    const area = await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Front yard', gridWidth: 4, gridHeight: 4, cellSizeMeters: 1 })
      .expect(201);
    const areaId = area.body.id as string;

    const element = await request(app)
      .post(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'B',
        type: 'raised_bed',
        color: '#444444',
        gridX: 0,
        gridY: 0,
        gridWidth: 1,
        gridHeight: 1,
      })
      .expect(201);
    const elementId = element.body.id as string;

    const profile = await request(app)
      .post('/api/v1/plant-profiles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Kale', type: 'vegetable' })
      .expect(201);

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/plantings`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        seasonId: activeId,
        elementId,
        plantProfileId: profile.body.id,
        sowingMethod: 'direct_outdoor',
        outdoorSowDate: '2026-05-01T12:00:00.000Z',
      })
      .expect(201);

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/logs`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        seasonId: activeId,
        plantingId: null,
        elementId,
        activity: 'watered',
        date: '2026-04-01',
        clientTimestamp: new Date().toISOString(),
      })
      .expect(201);

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        seasonId: activeId,
        targetType: 'season',
        targetId: activeId,
        body: 'Archive me',
      })
      .expect(201);

    const snapBefore = await request(app)
      .get(`/api/v1/gardens/${gardenId}/seasons/${activeId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(snapBefore.body.plantings).toHaveLength(1);
    expect(snapBefore.body.logs.length).toBeGreaterThanOrEqual(1);
    expect(snapBefore.body.notes).toHaveLength(1);
    expect(snapBefore.body.areas).toHaveLength(1);
    expect(snapBefore.body.elements).toHaveLength(1);

    const archived = await request(app)
      .post(`/api/v1/gardens/${gardenId}/seasons/${activeId}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200);
    expect(archived.body.archived.isActive).toBe(false);
    expect(archived.body.newActiveSeason.isActive).toBe(true);

    const snapAfter = await request(app)
      .get(`/api/v1/gardens/${gardenId}/seasons/${activeId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(snapAfter.body.season.isActive).toBe(false);
    expect(snapAfter.body.plantings).toHaveLength(1);

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/seasons/${activeId}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });
});
