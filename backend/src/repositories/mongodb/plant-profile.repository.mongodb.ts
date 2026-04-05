import { v4 as uuidv4 } from 'uuid';
import type { PlantProfile, PlantProfileType } from '../../domain/plant-profile.js';
import type {
  CreatePlantProfileInput,
  IPlantProfileRepository,
} from '../interfaces/plant-profile.repository.interface.js';
import type { PlantProfileDoc } from './plant-profile.schema.js';
import { PlantProfileModel } from './plant-profile.schema.js';

function toProfile(doc: PlantProfileDoc): PlantProfile {
  return {
    id: doc._id,
    userId: doc.userId,
    name: doc.name,
    type: doc.type as PlantProfileType,
    notes: doc.notes ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class PlantProfileRepositoryMongo implements IPlantProfileRepository {
  async create(input: CreatePlantProfileInput): Promise<PlantProfile> {
    const id = uuidv4();
    const doc = await PlantProfileModel.create({
      _id: id,
      userId: input.userId,
      name: input.name,
      type: input.type,
      notes: input.notes,
    });
    return toProfile(doc.toObject() as PlantProfileDoc);
  }

  async findById(id: string): Promise<PlantProfile | null> {
    const doc = await PlantProfileModel.findById(id).lean();
    if (!doc) return null;
    return toProfile(doc as PlantProfileDoc);
  }

  async findByUserId(userId: string): Promise<PlantProfile[]> {
    const docs = await PlantProfileModel.find({ userId }).sort({ name: 1 }).lean();
    return (docs as PlantProfileDoc[]).map(toProfile);
  }

  async update(
    id: string,
    userId: string,
    patch: Partial<Pick<PlantProfile, 'name' | 'type' | 'notes'>>,
  ): Promise<PlantProfile | null> {
    const doc = await PlantProfileModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: patch },
      { new: true, runValidators: true },
    ).lean();
    if (!doc) return null;
    return toProfile(doc as PlantProfileDoc);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const res = await PlantProfileModel.deleteOne({ _id: id, userId });
    return res.deletedCount === 1;
  }
}
