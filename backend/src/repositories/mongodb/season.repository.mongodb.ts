import { v4 as uuidv4 } from 'uuid';
import type { Season } from '../../domain/season.js';
import type { CreateSeasonInput, ISeasonRepository } from '../interfaces/season.repository.interface.js';
import type { WithMongoSession } from '../mongo-session.js';
import type { SeasonDoc } from './season.schema.js';
import { SeasonModel } from './season.schema.js';

function toSeason(doc: SeasonDoc): Season {
  return {
    id: doc._id,
    gardenId: doc.gardenId,
    name: doc.name,
    startDate: doc.startDate,
    endDate: doc.endDate,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class SeasonRepositoryMongo implements ISeasonRepository {
  async create(input: CreateSeasonInput): Promise<Season> {
    const id = uuidv4();
    const doc = await SeasonModel.create({
      _id: id,
      gardenId: input.gardenId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      isActive: input.isActive,
    });
    return toSeason(doc.toObject() as SeasonDoc);
  }

  async findById(id: string): Promise<Season | null> {
    const doc = await SeasonModel.findById(id).lean();
    if (!doc) return null;
    return toSeason(doc as SeasonDoc);
  }

  async findByGardenId(gardenId: string): Promise<Season[]> {
    const docs = await SeasonModel.find({ gardenId }).sort({ startDate: 1 }).lean();
    return (docs as SeasonDoc[]).map(toSeason);
  }

  async findActiveByGardenId(gardenId: string): Promise<Season | null> {
    const doc = await SeasonModel.findOne({ gardenId, isActive: true }).lean();
    if (!doc) return null;
    return toSeason(doc as SeasonDoc);
  }

  async update(
    id: string,
    patch: Partial<Pick<Season, 'name' | 'startDate' | 'endDate' | 'isActive'>>,
  ): Promise<Season | null> {
    const doc = await SeasonModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean();
    if (!doc) return null;
    return toSeason(doc as SeasonDoc);
  }

  async delete(id: string): Promise<boolean> {
    const res = await SeasonModel.deleteOne({ _id: id });
    return res.deletedCount === 1;
  }

  async deleteByGardenId(gardenId: string, options?: WithMongoSession): Promise<number> {
    const res = await SeasonModel.deleteMany({ gardenId }, { session: options?.session });
    return res.deletedCount ?? 0;
  }

  async deactivateAllInGarden(gardenId: string): Promise<void> {
    await SeasonModel.updateMany({ gardenId }, { $set: { isActive: false } });
  }
}
