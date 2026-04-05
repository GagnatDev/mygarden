import { v4 as uuidv4 } from 'uuid';
import type { ActivityLog, ActivityType } from '../../domain/activity-log.js';
import type {
  CreateActivityLogInput,
  IActivityLogRepository,
} from '../interfaces/activity-log.repository.interface.js';
import type { ActivityLogDoc } from './activity-log.schema.js';
import { ActivityLogModel } from './activity-log.schema.js';

function toLog(doc: ActivityLogDoc): ActivityLog {
  return {
    id: doc._id,
    gardenId: doc.gardenId,
    seasonId: doc.seasonId,
    plantingId: doc.plantingId ?? null,
    areaId: doc.areaId ?? null,
    activity: doc.activity as ActivityType,
    date: doc.date,
    note: doc.note ?? null,
    quantity: doc.quantity ?? null,
    createdBy: doc.createdBy,
    clientTimestamp: doc.clientTimestamp,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class ActivityLogRepositoryMongo implements IActivityLogRepository {
  async create(input: CreateActivityLogInput): Promise<ActivityLog> {
    const id = uuidv4();
    const doc = await ActivityLogModel.create({
      _id: id,
      gardenId: input.gardenId,
      seasonId: input.seasonId,
      plantingId: input.plantingId,
      areaId: input.areaId,
      activity: input.activity,
      date: input.date,
      note: input.note,
      quantity: input.quantity,
      createdBy: input.createdBy,
      clientTimestamp: input.clientTimestamp,
    });
    return toLog(doc.toObject() as ActivityLogDoc);
  }

  async findById(id: string): Promise<ActivityLog | null> {
    const doc = await ActivityLogModel.findById(id).lean();
    if (!doc) return null;
    return toLog(doc as ActivityLogDoc);
  }

  async findByGardenSeason(
    gardenId: string,
    seasonId: string,
    filters?: { dateFrom?: Date; dateTo?: Date },
  ): Promise<ActivityLog[]> {
    const q: Record<string, unknown> = { gardenId, seasonId };
    if (filters?.dateFrom || filters?.dateTo) {
      q.date = {};
      if (filters.dateFrom) (q.date as Record<string, Date>).$gte = filters.dateFrom;
      if (filters.dateTo) (q.date as Record<string, Date>).$lte = filters.dateTo;
    }
    const docs = await ActivityLogModel.find(q).sort({ date: -1 }).lean();
    return (docs as ActivityLogDoc[]).map(toLog);
  }

  async deleteByGardenId(gardenId: string): Promise<number> {
    const res = await ActivityLogModel.deleteMany({ gardenId });
    return res.deletedCount ?? 0;
  }

  async update(
    id: string,
    patch: Partial<Pick<ActivityLog, 'note' | 'updatedAt'>>,
  ): Promise<ActivityLog | null> {
    const doc = await ActivityLogModel.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true, runValidators: true, timestamps: false },
    ).lean();
    if (!doc) return null;
    return toLog(doc as ActivityLogDoc);
  }
}
