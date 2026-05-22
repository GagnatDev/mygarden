import { v4 as uuidv4 } from 'uuid';
import { HttpError } from '../../middleware/problem-details.js';
import {
  IMAGE_FULL_JPEG_QUALITY,
  IMAGE_FULL_MAX_EDGE,
  compressImageToJpeg,
  createThumbnailJpeg,
  fullImageObjectKeyToThumbKey,
  storedObjectToBuffer,
} from '../../lib/image-processing.js';
import type { ImageVariant } from '../../lib/image-variant.js';
import type { IPlantProfileRepository } from '../../repositories/interfaces/plant-profile.repository.interface.js';
import type { IFileStorageService } from '../../services/file-storage/file-storage.interface.js';

const IMAGE_MIME_TYPES = new Set<string>(['image/jpeg', 'image/png', 'image/webp']);

export const PLANT_PROFILE_IMAGE_MAX_COUNT = 5;
export const PLANT_PROFILE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
/** @deprecated Use IMAGE_FULL_MAX_EDGE */
export const PLANT_PROFILE_IMAGE_MAX_EDGE = IMAGE_FULL_MAX_EDGE;
/** @deprecated Use IMAGE_FULL_JPEG_QUALITY */
export const PLANT_PROFILE_IMAGE_JPEG_QUALITY = IMAGE_FULL_JPEG_QUALITY;

function toImageObjectKey(userId: string, profileId: string, imageId: string): string {
  return `users/${userId}/plant-profiles/${profileId}/images/${imageId}.jpg`;
}

function thumbKeyForImage(image: { objectKey: string; thumbObjectKey: string | null }): string {
  return image.thumbObjectKey ?? fullImageObjectKeyToThumbKey(image.objectKey);
}

export class PlantProfileImageService {
  constructor(
    private readonly plantProfileRepo: IPlantProfileRepository,
    private readonly storage: IFileStorageService,
  ) {}

  async uploadForUser(userId: string, profileId: string, buffer: Buffer, mimeType: string) {
    if (!IMAGE_MIME_TYPES.has(mimeType)) {
      throw new HttpError(400, 'Image must be JPEG, PNG, or WebP', 'Bad Request');
    }
    if (buffer.length > PLANT_PROFILE_IMAGE_MAX_BYTES) {
      throw new HttpError(400, 'Image must be at most 10 MB', 'Bad Request');
    }
    const profile = await this.plantProfileRepo.findById(profileId);
    if (!profile || profile.userId !== userId) {
      throw new HttpError(404, 'Plant profile not found', 'Not Found');
    }
    if (profile.images.length >= PLANT_PROFILE_IMAGE_MAX_COUNT) {
      throw new HttpError(400, 'Plant profile can have at most 5 images', 'Bad Request');
    }

    const processed = await compressImageToJpeg(buffer, IMAGE_FULL_MAX_EDGE, IMAGE_FULL_JPEG_QUALITY);
    const thumb = await createThumbnailJpeg(processed);
    const imageId = uuidv4();
    const objectKey = toImageObjectKey(userId, profileId, imageId);
    const thumbObjectKey = fullImageObjectKeyToThumbKey(objectKey);
    const createdAt = new Date();
    const updatedImages = [
      ...profile.images,
      { id: imageId, objectKey, thumbObjectKey, createdAt },
    ];

    try {
      await this.storage.putObject(objectKey, processed, 'image/jpeg');
      await this.storage.putObject(thumbObjectKey, thumb, 'image/jpeg');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.storage.deleteObject(objectKey).catch(() => undefined);
      await this.storage.deleteObject(thumbObjectKey).catch(() => undefined);
      throw new HttpError(502, `Could not store image in object storage: ${msg}`, 'Bad Gateway');
    }

    const updated = await this.plantProfileRepo.replaceImages(profileId, userId, updatedImages);
    if (!updated) {
      await this.storage.deleteObject(objectKey).catch(() => undefined);
      await this.storage.deleteObject(thumbObjectKey).catch(() => undefined);
      throw new HttpError(404, 'Plant profile not found', 'Not Found');
    }
    return updated;
  }

  async deleteImageForUser(userId: string, profileId: string, imageId: string) {
    const profile = await this.plantProfileRepo.findById(profileId);
    if (!profile || profile.userId !== userId) {
      throw new HttpError(404, 'Plant profile not found', 'Not Found');
    }
    const image = profile.images.find((x) => x.id === imageId);
    if (!image) {
      throw new HttpError(404, 'Plant profile image not found', 'Not Found');
    }
    const updated = await this.plantProfileRepo.replaceImages(
      profileId,
      userId,
      profile.images.filter((x) => x.id !== imageId),
    );
    if (!updated) {
      throw new HttpError(404, 'Plant profile not found', 'Not Found');
    }
    await this.storage.deleteObject(image.objectKey).catch(() => undefined);
    await this.storage.deleteObject(thumbKeyForImage(image)).catch(() => undefined);
    return updated;
  }

  async getImageObjectForUser(
    userId: string,
    profileId: string,
    imageId: string,
    variant: ImageVariant = 'full',
  ) {
    const profile = await this.plantProfileRepo.findById(profileId);
    if (!profile || profile.userId !== userId) {
      throw new HttpError(404, 'Plant profile not found', 'Not Found');
    }
    const image = profile.images.find((x) => x.id === imageId);
    if (!image) return null;

    if (variant === 'full') {
      return this.storage.getObject(image.objectKey);
    }

    const thumbKey = thumbKeyForImage(image);
    const obj = await this.storage.getObject(thumbKey);
    if (obj) return obj;

    const full = await this.storage.getObject(image.objectKey);
    if (!full) return null;

    const thumbBuffer = await createThumbnailJpeg(await storedObjectToBuffer(full));
    await this.storage.putObject(thumbKey, thumbBuffer, 'image/jpeg');
    if (!image.thumbObjectKey) {
      const updatedImages = profile.images.map((img) =>
        img.id === imageId ? { ...img, thumbObjectKey: thumbKey } : img,
      );
      await this.plantProfileRepo.replaceImages(profileId, userId, updatedImages);
    }
    return this.storage.getObject(thumbKey);
  }

  async deleteAllImagesForUser(userId: string, profileId: string): Promise<void> {
    const profile = await this.plantProfileRepo.findById(profileId);
    if (!profile || profile.userId !== userId || profile.images.length === 0) {
      return;
    }
    await Promise.all(
      profile.images.flatMap((image) => [
        this.storage.deleteObject(image.objectKey).catch(() => undefined),
        this.storage.deleteObject(thumbKeyForImage(image)).catch(() => undefined),
      ]),
    );
  }
}
