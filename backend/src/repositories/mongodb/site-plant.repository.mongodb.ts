import { v4 as uuidv4 } from 'uuid';
import type { SitePlant } from '../../domain/site-plant.js';
import type {
  CreateSitePlantInput,
  ISitePlantRepository,
} from '../interfaces/site-plant.repository.interface.js';
import type { WithMongoSession } from '../mongo-session.js';
import type { SitePlantDoc } from './site-plant.schema.js';
import { SitePlantModel } from './site-plant.schema.js';

function toSitePlant(doc: SitePlantDoc): SitePlant {
  return {
    id: doc._id,
    gardenId: doc.gardenId,
    elementId: doc.elementId,
    plantProfileId: doc.plantProfileId ?? null,
    plantName: doc.plantName,
    establishedDate: doc.establishedDate ?? null,
    notes: doc.notes ?? null,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class SitePlantRepositoryMongo implements ISitePlantRepository {
  async create(input: CreateSitePlantInput): Promise<SitePlant> {
    const id = uuidv4();
    const doc = await SitePlantModel.create({
      _id: id,
      gardenId: input.gardenId,
      elementId: input.elementId,
      plantProfileId: input.plantProfileId,
      plantName: input.plantName,
      establishedDate: input.establishedDate,
      notes: input.notes,
      createdBy: input.createdBy,
    });
    return toSitePlant(doc.toObject() as SitePlantDoc);
  }

  async findById(id: string): Promise<SitePlant | null> {
    const doc = await SitePlantModel.findById(id).lean();
    if (!doc) return null;
    return toSitePlant(doc as SitePlantDoc);
  }

  async findByGardenId(gardenId: string): Promise<SitePlant[]> {
    const docs = await SitePlantModel.find({ gardenId }).sort({ plantName: 1 }).lean();
    return (docs as SitePlantDoc[]).map(toSitePlant);
  }

  async update(
    id: string,
    patch: Partial<
      Pick<SitePlant, 'elementId' | 'plantProfileId' | 'plantName' | 'establishedDate' | 'notes'>
    >,
  ): Promise<SitePlant | null> {
    const doc = await SitePlantModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean();
    if (!doc) return null;
    return toSitePlant(doc as SitePlantDoc);
  }

  async delete(id: string): Promise<boolean> {
    const res = await SitePlantModel.deleteOne({ _id: id });
    return res.deletedCount === 1;
  }

  async deleteByGardenId(gardenId: string, options?: WithMongoSession): Promise<number> {
    const res = await SitePlantModel.deleteMany({ gardenId }, { session: options?.session });
    return res.deletedCount ?? 0;
  }

  async deleteByElementId(elementId: string, options?: WithMongoSession): Promise<number> {
    const res = await SitePlantModel.deleteMany({ elementId }, { session: options?.session });
    return res.deletedCount ?? 0;
  }
}
