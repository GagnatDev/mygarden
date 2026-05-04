import { describe, expect, it, vi } from 'vitest';
import { PlantProfileImageService, PLANT_PROFILE_IMAGE_MAX_COUNT } from './plant-profile-image.service.js';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function buildProfile(imageCount = 0) {
  return {
    id: 'p1',
    userId: 'u1',
    name: 'Tomato',
    type: 'vegetable' as const,
    notes: null,
    images: Array.from({ length: imageCount }).map((_, i) => ({
      id: `i${i}`,
      objectKey: `users/u1/plant-profiles/p1/images/i${i}.jpg`,
      createdAt: new Date(),
    })),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('PlantProfileImageService', () => {
  it('compresses and stores image as jpeg', async () => {
    const putObject = vi.fn(async () => undefined);
    const replaceImages = vi.fn(async (_id: string, _userId: string, images: unknown[]) => ({
      ...buildProfile(0),
      images: images as {
        id: string;
        objectKey: string;
        createdAt: Date;
      }[],
    }));
    const repo = {
      findById: vi.fn(async () => buildProfile(0)),
      replaceImages,
    };
    const storage = {
      putObject,
      deleteObject: vi.fn(async () => undefined),
      getObject: vi.fn(async () => null),
    };
    const svc = new PlantProfileImageService(repo as never, storage as never);

    const updated = await svc.uploadForUser('u1', 'p1', tinyPng, 'image/png');
    expect(updated.images).toHaveLength(1);
    expect(putObject).toHaveBeenCalledTimes(1);
    expect(putObject.mock.calls[0]?.[2]).toBe('image/jpeg');
    expect((putObject.mock.calls[0]?.[1] as Buffer).byteLength).toBeGreaterThan(0);
  });

  it('rejects uploads when max image count is reached', async () => {
    const repo = {
      findById: vi.fn(async () => buildProfile(PLANT_PROFILE_IMAGE_MAX_COUNT)),
      replaceImages: vi.fn(),
    };
    const storage = {
      putObject: vi.fn(),
      deleteObject: vi.fn(),
      getObject: vi.fn(),
    };
    const svc = new PlantProfileImageService(repo as never, storage as never);

    await expect(svc.uploadForUser('u1', 'p1', tinyPng, 'image/png')).rejects.toThrow(
      'Plant profile can have at most 5 images',
    );
  });
});
