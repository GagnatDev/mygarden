import type { Garden } from '../../domain/garden.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IGardenRepository } from '../../repositories/interfaces/garden.repository.interface.js';
import type { IFileStorageService } from '../../services/file-storage/file-storage.interface.js';

export const GARDEN_BACKGROUND_MAX_BYTES = 10 * 1024 * 1024;

const MIME_TO_EXT = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export function gardenBackgroundObjectKey(gardenId: string, ext: string): string {
  return `gardens/${gardenId}/background.${ext}`;
}

export class GardenBackgroundService {
  constructor(
    private readonly gardenRepo: IGardenRepository,
    private readonly storage: IFileStorageService,
  ) {}

  async upload(gardenId: string, buffer: Buffer, mimeType: string): Promise<Garden> {
    const ext = MIME_TO_EXT.get(mimeType);
    if (!ext) {
      throw new HttpError(400, 'Image must be JPEG, PNG, or WebP', 'Bad Request');
    }
    if (buffer.length > GARDEN_BACKGROUND_MAX_BYTES) {
      throw new HttpError(400, 'Image must be at most 10 MB', 'Bad Request');
    }

    const garden = await this.gardenRepo.findById(gardenId);
    if (!garden) {
      throw new HttpError(404, 'Garden not found', 'Not Found');
    }

    const newKey = gardenBackgroundObjectKey(gardenId, ext);
    const previousKey = garden.backgroundImageKey;

    if (previousKey && previousKey !== newKey) {
      await this.storage.deleteObject(previousKey).catch(() => {
        /* best-effort */
      });
    }

    try {
      await this.storage.putObject(newKey, buffer, mimeType);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new HttpError(
        502,
        `Could not store image in object storage: ${msg}`,
        'Bad Gateway',
      );
    }

    const updated = await this.gardenRepo.update(gardenId, { backgroundImageKey: newKey });
    if (!updated) {
      throw new HttpError(404, 'Garden not found', 'Not Found');
    }
    return updated;
  }

  async remove(gardenId: string): Promise<Garden> {
    const garden = await this.gardenRepo.findById(gardenId);
    if (!garden) {
      throw new HttpError(404, 'Garden not found', 'Not Found');
    }
    const key = garden.backgroundImageKey;
    const updated = await this.gardenRepo.update(gardenId, { backgroundImageKey: null });
    if (!updated) {
      throw new HttpError(404, 'Garden not found', 'Not Found');
    }
    if (key) {
      await this.storage.deleteObject(key).catch(() => {
        /* best-effort */
      });
    }
    return updated;
  }

  async getObjectForGarden(
    gardenId: string,
  ): Promise<Awaited<ReturnType<IFileStorageService['getObject']>>> {
    const garden = await this.gardenRepo.findById(gardenId);
    if (!garden) {
      throw new HttpError(404, 'Garden not found', 'Not Found');
    }
    const key = garden.backgroundImageKey;
    if (!key) {
      return null;
    }
    return this.storage.getObject(key);
  }
}
