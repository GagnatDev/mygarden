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
  const email = `p-${uuidv4()}@test.com`;
  const c = buildContainer(env);
  await c.allowedEmailRepo.create({ email, addedBy: null });
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'password12', displayName })
    .expect(201);
  return {
    email,
    token: res.body.accessToken as string,
    userId: res.body.user.id as string,
  };
}

async function createGardenWithSeasonAndElement(
  app: ReturnType<typeof createApp>,
  token: string,
): Promise<{ gardenId: string; seasonId: string; areaId: string; elementId: string }> {
  const g = await request(app)
    .post('/api/v1/gardens')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'G' })
    .expect(201);
  const gardenId = g.body.id as string;
  const seasons = await request(app)
    .get(`/api/v1/gardens/${gardenId}/seasons`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  const active = seasons.body.find((s: { isActive: boolean }) => s.isActive);
  const a = await request(app)
    .post(`/api/v1/gardens/${gardenId}/areas`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Yard', gridWidth: 10, gridHeight: 10, cellSizeMeters: 1 })
    .expect(201);
  const areaId = a.body.id as string;
  const el = await request(app)
    .post(`/api/v1/gardens/${gardenId}/areas/${areaId}/elements`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Bed 1',
      type: 'raised_bed',
      color: '#336633',
      gridX: 0,
      gridY: 0,
      gridWidth: 2,
      gridHeight: 2,
    })
    .expect(201);
  return { gardenId, seasonId: active.id as string, areaId, elementId: el.body.id as string };
}

describe('Planning: plant profiles, plantings, tasks, logs, notes (integration)', () => {
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

  it('plant profiles are user-scoped CRUD; other user cannot access', async () => {
    const { token: a, userId: userA } = await registerWithToken(app, env, 'A');
    const { token: b } = await registerWithToken(app, env, 'B');

    const created = await request(app)
      .post('/api/v1/plant-profiles')
      .set('Authorization', `Bearer ${a}`)
      .send({ name: 'Tomato', type: 'vegetable', notes: 'Cherry' })
      .expect(201);
    expect(created.body.name).toBe('Tomato');
    expect(created.body.userId).toBe(userA);
    const profileId = created.body.id as string;

    const list = await request(app)
      .get('/api/v1/plant-profiles')
      .set('Authorization', `Bearer ${a}`)
      .expect(200);
    expect(list.body.some((p: { id: string }) => p.id === profileId)).toBe(true);

    await request(app)
      .get('/api/v1/plant-profiles')
      .set('Authorization', `Bearer ${b}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.some((p: { id: string }) => p.id === profileId)).toBe(false);
      });

    const patched = await request(app)
      .patch(`/api/v1/plant-profiles/${profileId}`)
      .set('Authorization', `Bearer ${a}`)
      .send({ notes: 'Updated' })
      .expect(200);
    expect(patched.body.notes).toBe('Updated');

    await request(app)
      .patch(`/api/v1/plant-profiles/${profileId}`)
      .set('Authorization', `Bearer ${b}`)
      .expect(404);

    await request(app)
      .delete(`/api/v1/plant-profiles/${profileId}`)
      .set('Authorization', `Bearer ${b}`)
      .expect(404);

    await request(app)
      .delete(`/api/v1/plant-profiles/${profileId}`)
      .set('Authorization', `Bearer ${a}`)
      .expect(204);
  });

  it('creates planting with indoor dates, denormalizes plantName, lists by season', async () => {
    const { token } = await registerWithToken(app, env, 'Grower');
    const { gardenId, seasonId, elementId } = await createGardenWithSeasonAndElement(app, token);

    const profile = await request(app)
      .post('/api/v1/plant-profiles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Basil', type: 'herb' })
      .expect(201);
    const profileId = profile.body.id as string;

    const indoorSow = new Date('2026-03-01T12:00:00.000Z');
    const transplant = new Date('2026-04-15T12:00:00.000Z');

    const planting = await request(app)
      .post(`/api/v1/gardens/${gardenId}/plantings`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        seasonId,
        elementId,
        plantProfileId: profileId,
        sowingMethod: 'indoor',
        indoorSowDate: indoorSow.toISOString(),
        transplantDate: transplant.toISOString(),
        harvestWindowStart: new Date('2026-06-01').toISOString(),
      })
      .expect(201);
    expect(planting.body.plantName).toBe('Basil');

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/plantings`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        seasonId,
        elementId,
        sowingMethod: 'indoor',
        plantName: 'Ad hoc',
        indoorSowDate: indoorSow.toISOString(),
        transplantDate: transplant.toISOString(),
      })
      .expect(201);

    const list = await request(app)
      .get(`/api/v1/gardens/${gardenId}/plantings?seasonId=${seasonId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects outdoor planting without outdoorSowDate', async () => {
    const { token } = await registerWithToken(app, env, 'X');
    const { gardenId, seasonId, elementId } = await createGardenWithSeasonAndElement(app, token);

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/plantings`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        seasonId,
        elementId,
        plantName: 'Carrot',
        sowingMethod: 'direct_outdoor',
      })
      .expect(400);
  });

  it('auto-generates tasks on planting create/update and removes on delete', async () => {
    const { token } = await registerWithToken(app, env, 'Planner');
    const { gardenId, seasonId, elementId } = await createGardenWithSeasonAndElement(app, token);

    const sow = new Date('2026-05-01T12:00:00.000Z');
    const plantingRes = await request(app)
      .post(`/api/v1/gardens/${gardenId}/plantings`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        seasonId,
        elementId,
        plantName: 'Pea',
        sowingMethod: 'direct_outdoor',
        outdoorSowDate: sow.toISOString(),
        harvestWindowStart: new Date('2026-07-01').toISOString(),
      })
      .expect(201);
    const plantingId = plantingRes.body.id as string;

    let tasks = await request(app)
      .get(`/api/v1/gardens/${gardenId}/tasks?seasonId=${seasonId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const autoForPlanting = tasks.body.filter(
      (t: { plantingId: string | null; source: string }) =>
        t.plantingId === plantingId && t.source === 'auto',
    );
    expect(autoForPlanting.length).toBe(2);

    const newSow = new Date('2026-05-10T12:00:00.000Z');
    await request(app)
      .patch(`/api/v1/gardens/${gardenId}/plantings/${plantingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ outdoorSowDate: newSow.toISOString() })
      .expect(200);

    tasks = await request(app)
      .get(`/api/v1/gardens/${gardenId}/tasks?seasonId=${seasonId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const sowTask = tasks.body.find(
      (t: { plantingId: string; autoKind: string }) =>
        t.plantingId === plantingId && t.autoKind === 'sow_outdoor',
    );
    expect(new Date(sowTask.dueDate).toISOString()).toBe(newSow.toISOString());

    await request(app)
      .delete(`/api/v1/gardens/${gardenId}/plantings/${plantingId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    tasks = await request(app)
      .get(`/api/v1/gardens/${gardenId}/tasks?seasonId=${seasonId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(tasks.body.every((t: { plantingId: string | null }) => t.plantingId !== plantingId)).toBe(
      true,
    );
  });

  it('task API: filters, mark done with linked log, manual task', async () => {
    const { token, userId } = await registerWithToken(app, env, 'Tasker');
    const { gardenId, seasonId } = await createGardenWithSeasonAndElement(app, token);

    const due = new Date('2026-08-01T12:00:00.000Z');
    const manual = await request(app)
      .post(`/api/v1/gardens/${gardenId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        seasonId,
        title: 'Water greenhouse',
        dueDate: due.toISOString(),
      })
      .expect(201);
    expect(manual.body.source).toBe('manual');

    const pending = await request(app)
      .get(`/api/v1/gardens/${gardenId}/tasks?seasonId=${seasonId}&status=pending`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(pending.body.length).toBeGreaterThanOrEqual(1);

    const taskId = manual.body.id as string;
    const done = await request(app)
      .patch(`/api/v1/gardens/${gardenId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'done' })
      .expect(200);
    expect(done.body.status).toBe('done');
    expect(done.body.linkedLogId).toBeTruthy();
    expect(done.body.completedBy).toBe(userId);

    const logs = await request(app)
      .get(`/api/v1/gardens/${gardenId}/logs?seasonId=${seasonId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(logs.body.some((l: { id: string }) => l.id === done.body.linkedLogId)).toBe(true);

    const undone = await request(app)
      .patch(`/api/v1/gardens/${gardenId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'pending' })
      .expect(200);
    expect(undone.body.status).toBe('pending');
    expect(undone.body.completedAt).toBeNull();
    expect(undone.body.linkedLogId).toBeNull();
  });

  it('activity logs: create, list with date range, PATCH LWW rejects stale clientTimestamp', async () => {
    const { token } = await registerWithToken(app, env, 'Logger');
    const { gardenId, seasonId, elementId } = await createGardenWithSeasonAndElement(app, token);

    const day = new Date('2026-06-10T10:00:00.000Z');
    const clientTs = new Date('2026-06-10T11:00:00.000Z');

    const log = await request(app)
      .post(`/api/v1/gardens/${gardenId}/logs`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        seasonId,
        elementId,
        activity: 'watered',
        date: day.toISOString(),
        clientTimestamp: clientTs.toISOString(),
      })
      .expect(201);
    const logId = log.body.id as string;

    const filtered = await request(app)
      .get(
        `/api/v1/gardens/${gardenId}/logs?seasonId=${seasonId}&from=${encodeURIComponent('2026-06-01T00:00:00.000Z')}&to=${encodeURIComponent('2026-06-30T23:59:59.999Z')}`,
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(filtered.body.some((l: { id: string }) => l.id === logId)).toBe(true);

    const newer = new Date('2026-06-11T12:00:00.000Z');
    await request(app)
      .patch(`/api/v1/gardens/${gardenId}/logs/${logId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ note: 'OK', clientTimestamp: newer.toISOString() })
      .expect(200);

    const older = new Date('2026-06-10T12:00:00.000Z');
    await request(app)
      .patch(`/api/v1/gardens/${gardenId}/logs/${logId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ note: 'Stale', clientTimestamp: older.toISOString() })
      .expect(409);
  });

  it('notes CRUD: element, planting, season targets', async () => {
    const { token } = await registerWithToken(app, env, 'Notes');
    const { gardenId, seasonId, elementId } = await createGardenWithSeasonAndElement(app, token);

    const profile = await request(app)
      .post('/api/v1/plant-profiles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'P', type: 'vegetable' })
      .expect(201);

    const planting = await request(app)
      .post(`/api/v1/gardens/${gardenId}/plantings`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        seasonId,
        elementId,
        plantProfileId: profile.body.id,
        sowingMethod: 'indoor',
        indoorSowDate: '2026-03-01T12:00:00.000Z',
        transplantDate: '2026-04-01T12:00:00.000Z',
      })
      .expect(201);
    const plantingId = planting.body.id as string;

    const seasonNote = await request(app)
      .post(`/api/v1/gardens/${gardenId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        seasonId,
        targetType: 'season',
        targetId: seasonId,
        body: 'Hello season',
      })
      .expect(201);
    expect(seasonNote.body.body).toBe('Hello season');

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        seasonId,
        targetType: 'season',
        targetId: uuidv4(),
        body: 'Wrong id',
      })
      .expect(400);

    const elementN = await request(app)
      .post(`/api/v1/gardens/${gardenId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        seasonId,
        targetType: 'element',
        targetId: elementId,
        body: 'On bed',
      })
      .expect(201);

    await request(app)
      .get(
        `/api/v1/gardens/${gardenId}/notes?seasonId=${seasonId}&targetType=element&targetId=${elementId}`,
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(1);
      });

    const plantN = await request(app)
      .post(`/api/v1/gardens/${gardenId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        seasonId,
        targetType: 'planting',
        targetId: plantingId,
        body: 'Plant note',
      })
      .expect(201);

    const patched = await request(app)
      .patch(`/api/v1/gardens/${gardenId}/notes/${plantN.body.id as string}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Edited' })
      .expect(200);
    expect(patched.body.body).toBe('Edited');

    const { token: other } = await registerWithToken(app, env, 'Other');
    await request(app)
      .patch(`/api/v1/gardens/${gardenId}/notes/${elementN.body.id as string}`)
      .set('Authorization', `Bearer ${other}`)
      .send({ body: 'Nope' })
      .expect(403);

    await request(app)
      .delete(`/api/v1/gardens/${gardenId}/notes/${seasonNote.body.id as string}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });
});
