import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../app.js';
import { buildContainer } from '../../config/container.js';
import { loadEnv, type Env } from '../../config/env.js';
import { MemoryFileStorageService } from '../../services/file-storage/memory-file-storage.service.js';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function registerWithToken(
  app: ReturnType<typeof createApp>,
  env: Env,
  displayName: string,
): Promise<{ token: string }> {
  const email = `note-photo-${uuidv4()}@test.com`;
  const c = buildContainer(env);
  await c.allowedEmailRepo.create({ email, addedBy: null });
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'password12', displayName })
    .expect(201);
  return { token: res.body.accessToken as string };
}

async function createGarden(
  app: ReturnType<typeof createApp>,
  token: string,
): Promise<{ gardenId: string; seasonId: string }> {
  const g = await request(app)
    .post('/api/v1/gardens')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'NotePhotoGarden' })
    .expect(201);
  const gardenId = g.body.id as string;

  const seasons = await request(app)
    .get(`/api/v1/gardens/${gardenId}/seasons`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  const active = (seasons.body as Array<{ id: string; isActive: boolean }>).find((s) => s.isActive);
  expect(active?.id).toBeTruthy();
  return { gardenId, seasonId: active!.id };
}

describe('Note photo API (integration)', () => {
  let env: Env;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    const uri = await startMongo();
    env = loadEnv({
      MONGODB_URI: uri,
      JWT_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      NODE_ENV: 'test',
      S3_BUCKET: 'test-bucket',
      S3_ACCESS_KEY_ID: 'test',
      S3_SECRET_ACCESS_KEY: 'test',
      S3_REGION: 'us-east-1',
    });
    app = createApp(env, pino({ level: 'silent' }), buildContainer(env, { fileStorage: new MemoryFileStorageService() }));
  }, 120_000);

  afterAll(stopMongo, 30_000);

  it('uploads, fetches, and deletes a note photo (season note target)', async () => {
    const { token } = await registerWithToken(app, env, 'NotePhotoUser');
    const { gardenId, seasonId } = await createGarden(app, token);

    const created = await request(app)
      .post(`/api/v1/gardens/${gardenId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ seasonId, targetType: 'season', targetId: seasonId, body: 'hello' })
      .expect(201);
    const noteId = created.body.id as string;

    const up = await request(app)
      .post(`/api/v1/gardens/${gardenId}/notes/${noteId}/photo`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', tinyPng, 'tiny.png')
      .expect(200);
    expect(up.body.photo).toBeTruthy();

    const list = await request(app)
      .get(`/api/v1/gardens/${gardenId}/notes?seasonId=${seasonId}&targetType=season&targetId=${seasonId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body[0].photo).toBeTruthy();

    const img = await request(app)
      .get(`/api/v1/gardens/${gardenId}/notes/${noteId}/photo`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(img.headers['content-type']).toMatch(/image\/png/);
    expect(img.body).toEqual(tinyPng);

    const del = await request(app)
      .delete(`/api/v1/gardens/${gardenId}/notes/${noteId}/photo`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(del.body.photo).toBeNull();

    await request(app)
      .get(`/api/v1/gardens/${gardenId}/notes/${noteId}/photo`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('forbids uploading a note photo as a different user', async () => {
    const { token: t1 } = await registerWithToken(app, env, 'Owner');
    const { token: t2 } = await registerWithToken(app, env, 'Other');
    const { gardenId, seasonId } = await createGarden(app, t1);

    const created = await request(app)
      .post(`/api/v1/gardens/${gardenId}/notes`)
      .set('Authorization', `Bearer ${t1}`)
      .send({ seasonId, targetType: 'season', targetId: seasonId, body: 'hello' })
      .expect(201);
    const noteId = created.body.id as string;

    await request(app)
      .post(`/api/v1/gardens/${gardenId}/notes/${noteId}/photo`)
      .set('Authorization', `Bearer ${t2}`)
      .attach('file', tinyPng, 'tiny.png')
      .expect(403);
  });

  it('returns 503 for note photo upload when object storage is disabled', async () => {
    const localEnv = loadEnv({
      MONGODB_URI: env.MONGODB_URI,
      JWT_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      NODE_ENV: 'test',
    });
    const localApp = createApp(localEnv, pino({ level: 'silent' }), buildContainer(localEnv));
    const { token } = await registerWithToken(localApp, localEnv, 'NoS3User');
    const { gardenId, seasonId } = await createGarden(localApp, token);

    const created = await request(localApp)
      .post(`/api/v1/gardens/${gardenId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ seasonId, targetType: 'season', targetId: seasonId, body: 'hello' })
      .expect(201);
    const noteId = created.body.id as string;

    await request(localApp)
      .post(`/api/v1/gardens/${gardenId}/notes/${noteId}/photo`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', tinyPng, 'tiny.png')
      .expect(503);
  });

  it('rejects non-image bytes with allowed image Content-Type', async () => {
    const { token } = await registerWithToken(app, env, 'BadBytes');
    const { gardenId, seasonId } = await createGarden(app, token);

    const created = await request(app)
      .post(`/api/v1/gardens/${gardenId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ seasonId, targetType: 'season', targetId: seasonId, body: 'hello' })
      .expect(201);
    const noteId = created.body.id as string;

    const res = await request(app)
      .post(`/api/v1/gardens/${gardenId}/notes/${noteId}/photo`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('plain text not an image'), 'x.png')
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/);
    expect(res.body.detail).toMatch(/invalid or unsupported image file/i);
  });
});

