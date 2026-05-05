import { v4 as uuidv4 } from 'uuid';
import type { Garden } from '../../domain/garden.js';
import type { CreateGardenInput, IGardenRepository } from '../interfaces/garden.repository.interface.js';
import type { WithMongoSession } from '../mongo-session.js';
import type { GardenDoc } from './garden.schema.js';
import { GardenModel } from './garden.schema.js';

function toGarden(doc: GardenDoc): Garden {
  return {
    id: doc._id,
    name: doc.name,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class GardenRepositoryMongo implements IGardenRepository {
  async create(input: CreateGardenInput): Promise<Garden> {
    const id = uuidv4();
    const doc = await GardenModel.create({
      _id: id,
      name: input.name,
      createdBy: input.createdBy,
    });
    return toGarden(doc.toObject() as GardenDoc);
  }

  async findById(id: string): Promise<Garden | null> {
    const doc = await GardenModel.findById(id).lean();
    if (!doc) return null;
    return toGarden(doc as GardenDoc);
  }

  async findByIds(ids: string[]): Promise<Garden[]> {
    if (ids.length === 0) return [];
    const docs = await GardenModel.find({ _id: { $in: ids } }).lean();
    return (docs as GardenDoc[]).map(toGarden);
  }

  async update(id: string, patch: Partial<Pick<Garden, 'name'>>): Promise<Garden | null> {
    const doc = await GardenModel.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true, runValidators: true },
    ).lean();
    if (!doc) return null;
    return toGarden(doc as GardenDoc);
  }

  async delete(id: string, options?: WithMongoSession): Promise<boolean> {
    const res = await GardenModel.deleteOne({ _id: id }, { session: options?.session });
    return res.deletedCount === 1;
  }
}
