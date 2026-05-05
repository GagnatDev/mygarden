import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { buildContainer } from '../../config/container.js';
import { loadEnv, type Env } from '../../config/env.js';
import type { IFileStorageService } from '../../services/file-storage/file-storage.interface.js';
import { startMongo, stopMongo } from '../../test/mongo-harness.js';

describe('GardenService.deleteAsOwnerForMembership (integration)', () => {
  let env: Env;

  beforeAll(async () => {
    const uri = await startMongo();
    env = loadEnv({
      MONGODB_URI: uri,
      JWT_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      NODE_ENV: 'test',
    });
  }, 120_000);

  afterAll(stopMongo, 30_000);

  it('rolls back all Mongo deletes when a step fails inside the transaction', async () => {
    const userId = uuidv4();
    const fileStorage: IFileStorageService = {
      putObject: vi.fn(),
      deleteObject: vi.fn().mockResolvedValue(undefined),
      getObject: vi.fn(),
    };
    const c = buildContainer(env, { fileStorage });

    const garden = await c.gardenRepo.create({ name: 'Tx Garden', createdBy: userId });
    const membership = await c.membershipRepo.create({
      gardenId: garden.id,
      userId,
      role: 'owner',
    });
    const area = await c.areaRepo.create({
      gardenId: garden.id,
      title: 'Plot',
      description: '',
      gridWidth: 2,
      gridHeight: 2,
      cellSizeMeters: 1,
      sortIndex: 0,
    });
    await c.elementRepo.create({
      areaId: area.id,
      name: 'Bed',
      type: 'raised_bed',
      color: '#111111',
      gridX: 0,
      gridY: 0,
      gridWidth: 1,
      gridHeight: 1,
    });

    vi.spyOn(c.activityLogRepo, 'deleteByGardenId').mockRejectedValueOnce(new Error('injected fault'));

    await expect(c.gardenService.deleteAsOwnerForMembership(garden.id, membership)).rejects.toThrow(
      'injected fault',
    );

    expect(await c.gardenRepo.findById(garden.id)).not.toBeNull();
    expect(await c.elementRepo.findByAreaId(area.id)).toHaveLength(1);
    expect(fileStorage.deleteObject).not.toHaveBeenCalled();
  });

  it('commits full cascade then deletes area background images from object storage', async () => {
    const userId = uuidv4();
    const fileStorage: IFileStorageService = {
      putObject: vi.fn(),
      deleteObject: vi.fn().mockResolvedValue(undefined),
      getObject: vi.fn(),
    };
    const c = buildContainer(env, { fileStorage });

    const garden = await c.gardenRepo.create({ name: 'S3 Garden', createdBy: userId });
    const membership = await c.membershipRepo.create({
      gardenId: garden.id,
      userId,
      role: 'owner',
    });
    const area = await c.areaRepo.create({
      gardenId: garden.id,
      title: 'With bg',
      description: '',
      gridWidth: 1,
      gridHeight: 1,
      cellSizeMeters: 1,
      sortIndex: 0,
    });
    const imageKey = `gardens/${garden.id}/areas/${area.id}/bg.webp`;
    await c.areaRepo.update(area.id, { backgroundImageKey: imageKey });

    await c.gardenService.deleteAsOwnerForMembership(garden.id, membership);

    expect(await c.gardenRepo.findById(garden.id)).toBeNull();
    expect(fileStorage.deleteObject).toHaveBeenCalledWith(imageKey);
  });
});
