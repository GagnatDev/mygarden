import { toPublicActivityLog } from '../../domain/activity-log.js';
import { toPublicArea } from '../../domain/area.js';
import { toPublicNote } from '../../domain/note.js';
import { toPublicPlanting } from '../../domain/planting.js';
import type { Season } from '../../domain/season.js';
import { toPublicSeason } from '../../domain/season.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IActivityLogRepository } from '../../repositories/interfaces/activity-log.repository.interface.js';
import type { IAreaRepository } from '../../repositories/interfaces/area.repository.interface.js';
import type { INoteRepository } from '../../repositories/interfaces/note.repository.interface.js';
import type { IPlantingRepository } from '../../repositories/interfaces/planting.repository.interface.js';
import type { ISeasonRepository } from '../../repositories/interfaces/season.repository.interface.js';

export interface CreateSeasonDto {
  name: string;
  startDate: Date;
  endDate: Date;
  isActive?: boolean;
}

export class SeasonService {
  constructor(
    private readonly seasonRepo: ISeasonRepository,
    private readonly plantingRepo: IPlantingRepository,
    private readonly activityLogRepo: IActivityLogRepository,
    private readonly noteRepo: INoteRepository,
    private readonly areaRepo: IAreaRepository,
  ) {}

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

  /**
   * Deactivates the current active season and creates a new active season (planning rollover).
   */
  async archiveActiveAndCreateNext(
    gardenId: string,
    activeSeasonId: string,
    next?: Partial<Pick<CreateSeasonDto, 'name' | 'startDate' | 'endDate'>>,
  ): Promise<{ archived: Season; created: Season }> {
    const toArchive = await this.seasonRepo.findById(activeSeasonId);
    if (!toArchive || toArchive.gardenId !== gardenId) {
      throw new HttpError(404, 'Season not found', 'Not Found');
    }
    if (!toArchive.isActive) {
      throw new HttpError(400, 'Only the active season can be archived', 'Bad Request');
    }
    const active = await this.seasonRepo.findActiveByGardenId(gardenId);
    if (!active || active.id !== activeSeasonId) {
      throw new HttpError(400, 'Only the active season can be archived', 'Bad Request');
    }

    const y = new Date().getUTCFullYear() + 1;
    const name = next?.name ?? String(y);
    const startDate = next?.startDate ?? new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
    const endDate = next?.endDate ?? new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));

    const created = await this.create(gardenId, { name, startDate, endDate, isActive: true });
    const archived = (await this.seasonRepo.findById(activeSeasonId))!;
    return { archived, created };
  }

  async getSeasonSnapshot(gardenId: string, seasonId: string) {
    const season = await this.seasonRepo.findById(seasonId);
    if (!season || season.gardenId !== gardenId) {
      throw new HttpError(404, 'Season not found', 'Not Found');
    }
    const [areas, plantings, logs, notes] = await Promise.all([
      this.areaRepo.findByGardenId(gardenId),
      this.plantingRepo.findByGardenAndSeason(gardenId, seasonId),
      this.activityLogRepo.findByGardenSeason(gardenId, seasonId),
      this.noteRepo.findByGardenSeason(gardenId, seasonId),
    ]);
    return {
      season: toPublicSeason(season),
      areas: areas.map(toPublicArea),
      plantings: plantings.map(toPublicPlanting),
      logs: logs.map(toPublicActivityLog),
      notes: notes.map(toPublicNote),
    };
  }
}
