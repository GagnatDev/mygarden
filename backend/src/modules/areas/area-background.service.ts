import type { Area } from '../../domain/area.js';
import { detectImageMimeFromMagicBytes } from '../../lib/image-magic-bytes.js';
import {
  IMAGE_FULL_JPEG_QUALITY,
  IMAGE_FULL_MAX_EDGE,
  compressImageToJpeg,
  createThumbnailJpeg,
  fullImageObjectKeyToThumbKey,
  storedObjectToBuffer,
} from '../../lib/image-processing.js';
import type { ImageVariant } from '../../lib/image-variant.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IAreaRepository } from '../../repositories/interfaces/area.repository.interface.js';
import type { IFileStorageService } from '../../services/file-storage/file-storage.interface.js';
import type pino from 'pino';

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
    private readonly log: pino.Logger,
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

    const newKey = areaBackgroundObjectKey(gardenId, areaId, 'jpg');
    const thumbKey = fullImageObjectKeyToThumbKey(newKey);
    const previousKey = area.backgroundImageKey;
    if (previousKey && previousKey !== newKey) {
      await this.storage.deleteObject(previousKey).catch(() => undefined);
      await this.storage.deleteObject(fullImageObjectKeyToThumbKey(previousKey)).catch(() => undefined);
    }

    const processed = await compressImageToJpeg(buffer, IMAGE_FULL_MAX_EDGE, IMAGE_FULL_JPEG_QUALITY);
    const thumb = await createThumbnailJpeg(processed);

    try {
      await this.storage.putObject(newKey, processed, 'image/jpeg');
      await this.storage.putObject(thumbKey, thumb, 'image/jpeg');
    } catch (e: unknown) {
      this.log.warn({ err: e }, 'area background object storage putObject failed');
      await this.storage.deleteObject(newKey).catch(() => undefined);
      await this.storage.deleteObject(thumbKey).catch(() => undefined);
      throw new HttpError(
        502,
        'Could not store the image. Please try again later.',
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
      await this.storage.deleteObject(key).catch(() => undefined);
      await this.storage.deleteObject(fullImageObjectKeyToThumbKey(key)).catch(() => undefined);
    }
    return updated;
  }

  async getObjectForArea(
    gardenId: string,
    areaId: string,
    variant: ImageVariant = 'full',
  ): Promise<Awaited<ReturnType<IFileStorageService['getObject']>>> {
    const area = await this.loadAreaInGarden(gardenId, areaId);
    const key = area.backgroundImageKey;
    if (!key) {
      return null;
    }

    if (variant === 'full') {
      return this.storage.getObject(key);
    }

    const thumbKey = fullImageObjectKeyToThumbKey(key);
    const obj = await this.storage.getObject(thumbKey);
    if (obj) return obj;

    const full = await this.storage.getObject(key);
    if (!full) return null;

    const thumbBuffer = await createThumbnailJpeg(await storedObjectToBuffer(full));
    await this.storage.putObject(thumbKey, thumbBuffer, 'image/jpeg');
    return this.storage.getObject(thumbKey);
  }
}
