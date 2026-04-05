import type { Note, NoteTargetType } from '../../domain/note.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IAreaRepository } from '../../repositories/interfaces/area.repository.interface.js';
import type { INoteRepository } from '../../repositories/interfaces/note.repository.interface.js';
import type { IPlantingRepository } from '../../repositories/interfaces/planting.repository.interface.js';
import type { ISeasonRepository } from '../../repositories/interfaces/season.repository.interface.js';

export class NoteService {
  constructor(
    private readonly noteRepo: INoteRepository,
    private readonly seasonRepo: ISeasonRepository,
    private readonly plantingRepo: IPlantingRepository,
    private readonly areaRepo: IAreaRepository,
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
    const ok = await this.noteRepo.delete(noteId);
    if (!ok) {
      throw new HttpError(404, 'Note not found', 'Not Found');
    }
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
    if (targetType === 'area') {
      const area = await this.areaRepo.findById(targetId);
      if (!area || area.gardenId !== gardenId) {
        throw new HttpError(400, 'Area not found in this garden', 'Bad Request');
      }
      return;
    }
    const planting = await this.plantingRepo.findById(targetId);
    if (!planting || planting.gardenId !== gardenId || planting.seasonId !== seasonId) {
      throw new HttpError(400, 'Planting not found for this season', 'Bad Request');
    }
  }
}
