import { describe, expect, it, vi } from 'vitest';
import type pino from 'pino';
import type { Area } from '../../domain/area.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IAreaRepository } from '../../repositories/interfaces/area.repository.interface.js';
import type { IFileStorageService } from '../../services/file-storage/file-storage.interface.js';
import { AreaBackgroundService } from './area-background.service.js';

function sampleArea(gardenId: string, areaId: string): Area {
  const now = new Date();
  return {
    id: areaId,
    gardenId,
    title: 'A',
    description: '',
    gridWidth: 4,
    gridHeight: 3,
    cellSizeMeters: 1,
    backgroundImageKey: null,
    sortIndex: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/** Minimal buffer that passes JPEG magic-byte detection in upload(). */
const jpegMagicPrefix = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);

describe('AreaBackgroundService (unit)', () => {
  it('does not leak object storage errors to the client', async () => {
    const gardenId = 'g1';
    const areaId = 'a1';
    const area = sampleArea(gardenId, areaId);
    const areaRepo: Pick<IAreaRepository, 'findById' | 'update'> = {
      findById: vi.fn().mockResolvedValue(area),
      update: vi.fn().mockImplementation((_id, patch) => ({
        ...area,
        ...patch,
        backgroundImageKey:
          patch.backgroundImageKey !== undefined ? patch.backgroundImageKey : area.backgroundImageKey,
      })),
    };
    const storage: Pick<IFileStorageService, 'putObject' | 'deleteObject'> = {
      putObject: vi.fn().mockRejectedValue(new Error('MinIO internal 0xSECRET_ACCESS_DENIED')),
      deleteObject: vi.fn().mockResolvedValue(undefined),
    };
    const warn = vi.fn();
    const log = { warn, child: () => log } as unknown as pino.Logger;

    const svc = new AreaBackgroundService(
      areaRepo as IAreaRepository,
      storage as IFileStorageService,
      log,
    );

    let thrown: unknown;
    try {
      await svc.upload(gardenId, areaId, jpegMagicPrefix, 'image/jpeg');
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(HttpError);
    expect((thrown as HttpError).status).toBe(502);
    expect((thrown as HttpError).message).not.toMatch(/SECRET/);
    expect((thrown as HttpError).message).not.toMatch(/MinIO/);

    expect(warn).toHaveBeenCalledTimes(1);
    const payload = warn.mock.calls[0]?.[0] as { err?: unknown };
    expect(payload?.err).toBeInstanceOf(Error);
    expect((payload.err as Error).message).toContain('SECRET');
  });
});
