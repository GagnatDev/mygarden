import type { Season } from '../../domain/season.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { ISeasonRepository } from '../../repositories/interfaces/season.repository.interface.js';

export interface CreateSeasonDto {
  name: string;
  startDate: Date;
  endDate: Date;
  isActive?: boolean;
}

export class SeasonService {
  constructor(private readonly seasonRepo: ISeasonRepository) {}

  async listByGarden(gardenId: string): Promise<Season[]> {
    return this.seasonRepo.findByGardenId(gardenId);
  }

  async create(gardenId: string, dto: CreateSeasonDto): Promise<Season> {
    if (dto.endDate < dto.startDate) {
      throw new HttpError(400, 'endDate must be on or after startDate', 'Bad Request');
    }
    const isActive = dto.isActive ?? false;
    if (isActive) {
      await this.seasonRepo.deactivateAllInGarden(gardenId);
    }
    try {
      return await this.seasonRepo.create({
        gardenId,
        name: dto.name,
        startDate: dto.startDate,
        endDate: dto.endDate,
        isActive,
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code?: number }).code === 11000) {
        throw new HttpError(409, 'A season with this name already exists', 'Conflict');
      }
      throw e;
    }
  }

  async update(
    gardenId: string,
    seasonId: string,
    patch: Partial<Pick<Season, 'name' | 'startDate' | 'endDate' | 'isActive'>>,
  ): Promise<Season> {
    const current = await this.seasonRepo.findById(seasonId);
    if (!current || current.gardenId !== gardenId) {
      throw new HttpError(404, 'Season not found', 'Not Found');
    }
    const start = patch.startDate ?? current.startDate;
    const end = patch.endDate ?? current.endDate;
    if (end < start) {
      throw new HttpError(400, 'endDate must be on or after startDate', 'Bad Request');
    }
    if (patch.isActive === true) {
      await this.seasonRepo.deactivateAllInGarden(gardenId);
    }
    try {
      const updated = await this.seasonRepo.update(seasonId, patch);
      if (!updated) {
        throw new HttpError(404, 'Season not found', 'Not Found');
      }
      return updated;
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code?: number }).code === 11000) {
        throw new HttpError(409, 'A season with this name already exists', 'Conflict');
      }
      throw e;
    }
  }

  async delete(gardenId: string, seasonId: string): Promise<void> {
    const current = await this.seasonRepo.findById(seasonId);
    if (!current || current.gardenId !== gardenId) {
      throw new HttpError(404, 'Season not found', 'Not Found');
    }
    const ok = await this.seasonRepo.delete(seasonId);
    if (!ok) {
      throw new HttpError(404, 'Season not found', 'Not Found');
    }
  }
}
