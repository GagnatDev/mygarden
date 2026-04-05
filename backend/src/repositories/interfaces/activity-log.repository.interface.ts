import type { ActivityLog, ActivityType } from '../../domain/activity-log.js';

export interface CreateActivityLogInput {
  gardenId: string;
  seasonId: string;
  plantingId: string | null;
  areaId: string | null;
  activity: ActivityType;
  date: Date;
  note: string | null;
  quantity: number | null;
  createdBy: string;
  clientTimestamp: Date;
}

export interface IActivityLogRepository {
  create(input: CreateActivityLogInput): Promise<ActivityLog>;
  findById(id: string): Promise<ActivityLog | null>;
  findByGardenSeason(
    gardenId: string,
    seasonId: string,
    filters?: { dateFrom?: Date; dateTo?: Date },
  ): Promise<ActivityLog[]>;
  deleteByGardenId(gardenId: string): Promise<number>;
  update(
    id: string,
    patch: Partial<Pick<ActivityLog, 'note' | 'updatedAt'>>,
  ): Promise<ActivityLog | null>;
}
