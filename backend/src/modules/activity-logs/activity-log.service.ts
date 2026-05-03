import type { ActivityLog } from '../../domain/activity-log.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IActivityLogRepository } from '../../repositories/interfaces/activity-log.repository.interface.js';
import type { IAreaRepository } from '../../repositories/interfaces/area.repository.interface.js';
import type { IElementRepository } from '../../repositories/interfaces/element.repository.interface.js';
import type { IPlantingRepository } from '../../repositories/interfaces/planting.repository.interface.js';
import type { ISeasonRepository } from '../../repositories/interfaces/season.repository.interface.js';

export class ActivityLogService {
  constructor(
    private readonly logRepo: IActivityLogRepository,
    private readonly seasonRepo: ISeasonRepository,
    private readonly plantingRepo: IPlantingRepository,
    private readonly elementRepo: IElementRepository,
    private readonly areaRepo: IAreaRepository,
  ) {}

  async list(
    gardenId: string,
    seasonId: string,
    filters?: { dateFrom?: Date; dateTo?: Date },
  ): Promise<ActivityLog[]> {
    const season = await this.seasonRepo.findById(seasonId);
    if (!season || season.gardenId !== gardenId) {
      throw new HttpError(404, 'Season not found', 'Not Found');
    }
    return this.logRepo.findByGardenSeason(gardenId, seasonId, filters);
  }

  async create(
    gardenId: string,
    userId: string,
    body: {
      seasonId: string;
      plantingId: string | null;
      elementId: string | null;
      activity: ActivityLog['activity'];
      date: Date;
      note: string | null;
      quantity: number | null;
      clientTimestamp: Date;
    },
  ): Promise<ActivityLog> {
    const season = await this.seasonRepo.findById(body.seasonId);
    if (!season || season.gardenId !== gardenId) {
      throw new HttpError(404, 'Season not found', 'Not Found');
    }
    if (body.plantingId) {
      const p = await this.plantingRepo.findById(body.plantingId);
      if (!p || p.gardenId !== gardenId || p.seasonId !== body.seasonId) {
        throw new HttpError(404, 'Planting not found', 'Not Found');
      }
    }
    if (body.elementId) {
      const el = await this.elementRepo.findById(body.elementId);
      if (!el) {
        throw new HttpError(404, 'Element not found', 'Not Found');
      }
      const area = await this.areaRepo.findById(el.areaId);
      if (!area || area.gardenId !== gardenId) {
        throw new HttpError(404, 'Element not found', 'Not Found');
      }
    }
    return this.logRepo.create({
      gardenId,
      seasonId: body.seasonId,
      plantingId: body.plantingId,
      elementId: body.elementId,
      activity: body.activity,
      date: body.date,
      note: body.note,
      quantity: body.quantity,
      createdBy: userId,
      clientTimestamp: body.clientTimestamp,
    });
  }

  async patchNote(
    gardenId: string,
    logId: string,
    note: string | null,
    clientTimestamp: Date,
  ): Promise<ActivityLog> {
    const log = await this.logRepo.findById(logId);
    if (!log || log.gardenId !== gardenId) {
      throw new HttpError(404, 'Activity log not found', 'Not Found');
    }
    if (clientTimestamp.getTime() <= log.updatedAt.getTime()) {
      throw new HttpError(409, 'Stale clientTimestamp: a newer version exists', 'Conflict');
    }
    const updated = await this.logRepo.update(logId, { note, updatedAt: clientTimestamp });
    if (!updated) {
      throw new HttpError(404, 'Activity log not found', 'Not Found');
    }
    return updated;
  }
}
