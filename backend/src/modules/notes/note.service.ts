import type { Note, NoteTargetType } from '../../domain/note.js';
import type { IFileStorageService, StoredObject } from '../../services/file-storage/file-storage.interface.js';
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
import type { IElementRepository } from '../../repositories/interfaces/element.repository.interface.js';
import type { INoteRepository } from '../../repositories/interfaces/note.repository.interface.js';
import type { IPlantingRepository } from '../../repositories/interfaces/planting.repository.interface.js';
import type { ISeasonRepository } from '../../repositories/interfaces/season.repository.interface.js';
import type { ISitePlantRepository } from '../../repositories/interfaces/site-plant.repository.interface.js';

export const NOTE_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

const MIME_TO_EXT = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export function notePhotoObjectKey(gardenId: string, noteId: string, ext: string): string {
  return `gardens/${gardenId}/notes/${noteId}/photo.${ext}`;
}

export class NoteService {
  constructor(
    private readonly noteRepo: INoteRepository,
    private readonly seasonRepo: ISeasonRepository,
    private readonly plantingRepo: IPlantingRepository,
    private readonly elementRepo: IElementRepository,
    private readonly areaRepo: IAreaRepository,
    private readonly sitePlantRepo: ISitePlantRepository,
    private readonly storage: IFileStorageService,
  ) {}

  async list(
    gardenId: string,
    seasonId: string,
    filters?: { targetType?: NoteTargetType; targetId?: string },
  ): Promise<Note[]> {
    const season = await this.seasonRepo.findById(seasonId);
    if (!season || season.gardenId !== gardenId) {
      throw new HttpError(404, 'Season not found', 'Not Found');
    }
    return this.noteRepo.findByGardenSeason(gardenId, seasonId, filters);
  }

  async create(
    gardenId: string,
    userId: string,
    dto: { seasonId: string; targetType: NoteTargetType; targetId: string; body: string },
  ): Promise<Note> {
    const season = await this.seasonRepo.findById(dto.seasonId);
    if (!season || season.gardenId !== gardenId) {
      throw new HttpError(404, 'Season not found', 'Not Found');
    }
    await this.assertTargetBelongsToGardenSeason(gardenId, dto.seasonId, dto.targetType, dto.targetId);
    return this.noteRepo.create({
      gardenId,
      seasonId: dto.seasonId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      body: dto.body.trim(),
      createdBy: userId,
    });
  }

  async update(gardenId: string, userId: string, noteId: string, body: string): Promise<Note> {
    const n = await this.noteRepo.findById(noteId);
    if (!n || n.gardenId !== gardenId) {
      throw new HttpError(404, 'Note not found', 'Not Found');
    }
    if (n.createdBy !== userId) {
      throw new HttpError(403, 'You can only edit your own notes', 'Forbidden');
    }
    const updated = await this.noteRepo.update(noteId, { body: body.trim() });
    if (!updated) {
      throw new HttpError(404, 'Note not found', 'Not Found');
    }
    return updated;
  }

  async delete(gardenId: string, userId: string, noteId: string): Promise<void> {
    const n = await this.noteRepo.findById(noteId);
    if (!n || n.gardenId !== gardenId) {
      throw new HttpError(404, 'Note not found', 'Not Found');
    }
    if (n.createdBy !== userId) {
      throw new HttpError(403, 'You can only delete your own notes', 'Forbidden');
    }
    const photoKey = n.photo?.objectKey ?? null;
    const ok = await this.noteRepo.delete(noteId);
    if (!ok) {
      throw new HttpError(404, 'Note not found', 'Not Found');
    }
    if (photoKey) {
      await this.storage.deleteObject(photoKey).catch(() => {
        /* best-effort */
      });
    }
  }

  async deleteAllNotesForTarget(
    gardenId: string,
    targetType: NoteTargetType,
    targetId: string,
  ): Promise<void> {
    const notes = await this.noteRepo.findByGardenAndTarget(gardenId, targetType, targetId);
    for (const n of notes) {
      const photoKey = n.photo?.objectKey ?? null;
      if (photoKey) {
        await this.storage.deleteObject(photoKey).catch(() => {
          /* best-effort */
        });
      }
    }
    await this.noteRepo.deleteByGardenAndTarget(gardenId, targetType, targetId);
  }

  async getByIdInGarden(gardenId: string, noteId: string): Promise<Note> {
    const n = await this.noteRepo.findById(noteId);
    if (!n || n.gardenId !== gardenId) {
      throw new HttpError(404, 'Note not found', 'Not Found');
    }
    return n;
  }

  async getPhotoObject(objectKey: string): Promise<StoredObject | null> {
    return this.storage.getObject(objectKey);
  }

  private thumbKeyForPhoto(photo: { objectKey: string; thumbObjectKey: string | null }): string {
    return photo.thumbObjectKey ?? fullImageObjectKeyToThumbKey(photo.objectKey);
  }

  async getPhotoObjectForNote(
    gardenId: string,
    noteId: string,
    variant: ImageVariant = 'full',
  ): Promise<StoredObject | null> {
    const n = await this.noteRepo.findById(noteId);
    if (!n || n.gardenId !== gardenId || !n.photo) return null;

    if (variant === 'full') {
      return this.storage.getObject(n.photo.objectKey);
    }

    const thumbKey = this.thumbKeyForPhoto(n.photo);
    let obj = await this.storage.getObject(thumbKey);
    if (obj) return obj;

    const full = await this.storage.getObject(n.photo.objectKey);
    if (!full) return null;

    const thumbBuffer = await createThumbnailJpeg(await storedObjectToBuffer(full));
    await this.storage.putObject(thumbKey, thumbBuffer, 'image/jpeg');
    if (!n.photo.thumbObjectKey) {
      await this.noteRepo.setPhoto({
        noteId,
        photo: { ...n.photo, thumbObjectKey: thumbKey },
      });
    }
    return this.storage.getObject(thumbKey);
  }

  async uploadPhoto(
    gardenId: string,
    userId: string,
    noteId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<Note> {
    const ext = MIME_TO_EXT.get(mimeType);
    if (!ext) {
      throw new HttpError(400, 'Image must be JPEG, PNG, or WebP', 'Bad Request');
    }
    if (buffer.length > NOTE_PHOTO_MAX_BYTES) {
      throw new HttpError(400, 'Image must be at most 10 MB', 'Bad Request');
    }
    const detected = detectImageMimeFromMagicBytes(buffer);
    if (!detected) {
      throw new HttpError(400, 'Invalid or unsupported image file', 'Bad Request');
    }
    if (detected !== mimeType) {
      throw new HttpError(400, 'Image content does not match declared type', 'Bad Request');
    }

    const n = await this.noteRepo.findById(noteId);
    if (!n || n.gardenId !== gardenId) {
      throw new HttpError(404, 'Note not found', 'Not Found');
    }
    if (n.createdBy !== userId) {
      throw new HttpError(403, 'You can only edit your own notes', 'Forbidden');
    }

    const newKey = notePhotoObjectKey(gardenId, noteId, 'jpg');
    const thumbObjectKey = fullImageObjectKeyToThumbKey(newKey);
    const previousKey = n.photo?.objectKey ?? null;
    const previousThumb = n.photo ? this.thumbKeyForPhoto(n.photo) : null;
    if (previousKey && previousKey !== newKey) {
      await this.storage.deleteObject(previousKey).catch(() => undefined);
    }
    if (previousThumb && previousThumb !== thumbObjectKey) {
      await this.storage.deleteObject(previousThumb).catch(() => undefined);
    }

    const processed = await compressImageToJpeg(buffer, IMAGE_FULL_MAX_EDGE, IMAGE_FULL_JPEG_QUALITY);
    const thumb = await createThumbnailJpeg(processed);

    try {
      await this.storage.putObject(newKey, processed, 'image/jpeg');
      await this.storage.putObject(thumbObjectKey, thumb, 'image/jpeg');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.storage.deleteObject(newKey).catch(() => undefined);
      await this.storage.deleteObject(thumbObjectKey).catch(() => undefined);
      throw new HttpError(502, `Could not store image in object storage: ${msg}`, 'Bad Gateway');
    }

    const updated = await this.noteRepo.setPhoto({
      noteId,
      photo: {
        id: noteId,
        objectKey: newKey,
        thumbObjectKey,
        mimeType: 'image/jpeg',
        createdAt: new Date(),
      },
    });
    if (!updated) {
      await this.storage.deleteObject(newKey).catch(() => undefined);
      await this.storage.deleteObject(thumbObjectKey).catch(() => undefined);
      throw new HttpError(404, 'Note not found', 'Not Found');
    }
    return updated;
  }

  async removePhoto(gardenId: string, userId: string, noteId: string): Promise<Note> {
    const n = await this.noteRepo.findById(noteId);
    if (!n || n.gardenId !== gardenId) {
      throw new HttpError(404, 'Note not found', 'Not Found');
    }
    if (n.createdBy !== userId) {
      throw new HttpError(403, 'You can only edit your own notes', 'Forbidden');
    }
    const key = n.photo?.objectKey ?? null;
    const thumbKey = n.photo ? this.thumbKeyForPhoto(n.photo) : null;
    const updated = await this.noteRepo.setPhoto({ noteId, photo: null });
    if (!updated) {
      throw new HttpError(404, 'Note not found', 'Not Found');
    }
    if (key) {
      await this.storage.deleteObject(key).catch(() => undefined);
    }
    if (thumbKey) {
      await this.storage.deleteObject(thumbKey).catch(() => undefined);
    }
    return updated;
  }

  private async assertTargetBelongsToGardenSeason(
    gardenId: string,
    seasonId: string,
    targetType: NoteTargetType,
    targetId: string,
  ): Promise<void> {
    if (targetType === 'season') {
      if (targetId !== seasonId) {
        throw new HttpError(400, 'Season note targetId must match seasonId', 'Bad Request');
      }
      return;
    }
    if (targetType === 'element') {
      const element = await this.elementRepo.findById(targetId);
      if (!element) {
        throw new HttpError(400, 'Element not found in this garden', 'Bad Request');
      }
      const area = await this.areaRepo.findById(element.areaId);
      if (!area || area.gardenId !== gardenId) {
        throw new HttpError(400, 'Element not found in this garden', 'Bad Request');
      }
      return;
    }
    if (targetType === 'site_plant') {
      const sp = await this.sitePlantRepo.findById(targetId);
      if (!sp || sp.gardenId !== gardenId) {
        throw new HttpError(400, 'Site plant not found in this garden', 'Bad Request');
      }
      return;
    }
    const planting = await this.plantingRepo.findById(targetId);
    if (!planting || planting.gardenId !== gardenId || planting.seasonId !== seasonId) {
      throw new HttpError(400, 'Planting not found for this season', 'Bad Request');
    }
  }
}
