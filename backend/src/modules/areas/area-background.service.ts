import type { Area } from '../../domain/area.js';
import { detectImageMimeFromMagicBytes } from '../../lib/image-magic-bytes.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IAreaRepository } from '../../repositories/interfaces/area.repository.interface.js';
import type { IFileStorageService } from '../../services/file-storage/file-storage.interface.js';

export const AREA_BACKGROUND_MAX_BYTES = 10 * 1024 * 1024;

const MIME_TO_EXT = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export function areaBackgroundObjectKey(gardenId: string, areaId: string, ext: string): string {
  return `gardens/${gardenId}/areas/${areaId}/background.${ext}`;
}

export class AreaBackgroundService {
  constructor(
    private readonly areaRepo: IAreaRepository,
    private readonly storage: IFileStorageService,
  ) {}

  private async loadAreaInGarden(gardenId: string, areaId: string): Promise<Area> {
    const area = await this.areaRepo.findById(areaId);
    if (!area || area.gardenId !== gardenId) {
      throw new HttpError(404, 'Area not found', 'Not Found');
    }
    return area;
  }

  async upload(
    gardenId: string,
    areaId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<Area> {
    const ext = MIME_TO_EXT.get(mimeType);
    if (!ext) {
      throw new HttpError(400, 'Image must be JPEG, PNG, or WebP', 'Bad Request');
    }
    if (buffer.length > AREA_BACKGROUND_MAX_BYTES) {
      throw new HttpError(400, 'Image must be at most 10 MB', 'Bad Request');
    }

    const detectedMime = detectImageMimeFromMagicBytes(buffer);
    if (!detectedMime) {
      throw new HttpError(400, 'Invalid or unsupported image file', 'Bad Request');
    }
    if (detectedMime !== mimeType) {
      throw new HttpError(400, 'Image content does not match declared type', 'Bad Request');
    }

    const area = await this.loadAreaInGarden(gardenId, areaId);

    const newKey = areaBackgroundObjectKey(gardenId, areaId, ext);
    const previousKey = area.backgroundImageKey;
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

    const updated = await this.areaRepo.update(areaId, { backgroundImageKey: newKey });
    if (!updated) {
      throw new HttpError(404, 'Area not found', 'Not Found');
    }
    return updated;
  }

  async remove(gardenId: string, areaId: string): Promise<Area> {
    const area = await this.loadAreaInGarden(gardenId, areaId);
    const key = area.backgroundImageKey;
    const updated = await this.areaRepo.update(areaId, { backgroundImageKey: null });
    if (!updated) {
      throw new HttpError(404, 'Area not found', 'Not Found');
    }
    if (key) {
      await this.storage.deleteObject(key).catch(() => {
        /* best-effort */
      });
    }
    return updated;
  }

  async getObjectForArea(
    gardenId: string,
    areaId: string,
  ): Promise<Awaited<ReturnType<IFileStorageService['getObject']>>> {
    const area = await this.loadAreaInGarden(gardenId, areaId);
    const key = area.backgroundImageKey;
    if (!key) {
      return null;
    }
    return this.storage.getObject(key);
  }
}
