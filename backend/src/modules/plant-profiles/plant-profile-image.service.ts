import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { HttpError } from '../../middleware/problem-details.js';
import type { IPlantProfileRepository } from '../../repositories/interfaces/plant-profile.repository.interface.js';
import type { IFileStorageService } from '../../services/file-storage/file-storage.interface.js';

const IMAGE_MIME_TYPES = new Set<string>(['image/jpeg', 'image/png', 'image/webp']);

export const PLANT_PROFILE_IMAGE_MAX_COUNT = 5;
export const PLANT_PROFILE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const PLANT_PROFILE_IMAGE_MAX_EDGE = 2560;
export const PLANT_PROFILE_IMAGE_JPEG_QUALITY = 86;

function toImageObjectKey(userId: string, profileId: string, imageId: string): string {
  return `users/${userId}/plant-profiles/${profileId}/images/${imageId}.jpg`;
}

async function compressPlantProfileImage(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .rotate()
      .resize({
        width: PLANT_PROFILE_IMAGE_MAX_EDGE,
        height: PLANT_PROFILE_IMAGE_MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: PLANT_PROFILE_IMAGE_JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new HttpError(400, 'Image data is invalid or unsupported', 'Bad Request');
  }
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

    const processed = await compressPlantProfileImage(buffer);
    const imageId = uuidv4();
    const objectKey = toImageObjectKey(userId, profileId, imageId);
    const createdAt = new Date();
    const updatedImages = [...profile.images, { id: imageId, objectKey, createdAt }];

    try {
      await this.storage.putObject(objectKey, processed, 'image/jpeg');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new HttpError(502, `Could not store image in object storage: ${msg}`, 'Bad Gateway');
    }

    const updated = await this.plantProfileRepo.replaceImages(profileId, userId, updatedImages);
    if (!updated) {
      await this.storage.deleteObject(objectKey).catch(() => {
        /* best-effort */
      });
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
    await this.storage.deleteObject(image.objectKey).catch(() => {
      /* best-effort */
    });
    return updated;
  }

  async getImageObjectForUser(userId: string, profileId: string, imageId: string) {
    const profile = await this.plantProfileRepo.findById(profileId);
    if (!profile || profile.userId !== userId) {
      throw new HttpError(404, 'Plant profile not found', 'Not Found');
    }
    const image = profile.images.find((x) => x.id === imageId);
    if (!image) return null;
    return this.storage.getObject(image.objectKey);
  }

  async deleteAllImagesForUser(userId: string, profileId: string): Promise<void> {
    const profile = await this.plantProfileRepo.findById(profileId);
    if (!profile || profile.userId !== userId || profile.images.length === 0) {
      return;
    }
    await Promise.all(
      profile.images.map((image) =>
        this.storage.deleteObject(image.objectKey).catch(() => {
          /* best-effort */
        }),
      ),
    );
  }
}
