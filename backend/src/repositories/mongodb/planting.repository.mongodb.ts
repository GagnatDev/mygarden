import { v4 as uuidv4 } from 'uuid';
import type { Planting, SowingMethod } from '../../domain/planting.js';
import type { CreatePlantingInput, IPlantingRepository } from '../interfaces/planting.repository.interface.js';
import type { PlantingDoc } from './planting.schema.js';
import { PlantingModel } from './planting.schema.js';

function toPlanting(doc: PlantingDoc): Planting {
  return {
    id: doc._id,
    gardenId: doc.gardenId,
    seasonId: doc.seasonId,
    areaId: doc.areaId,
    plantProfileId: doc.plantProfileId ?? null,
    plantName: doc.plantName,
    sowingMethod: doc.sowingMethod as SowingMethod,
    indoorSowDate: doc.indoorSowDate ?? null,
    transplantDate: doc.transplantDate ?? null,
    outdoorSowDate: doc.outdoorSowDate ?? null,
    harvestWindowStart: doc.harvestWindowStart ?? null,
    harvestWindowEnd: doc.harvestWindowEnd ?? null,
    quantity: doc.quantity ?? null,
    notes: doc.notes ?? null,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class PlantingRepositoryMongo implements IPlantingRepository {
  async create(input: CreatePlantingInput): Promise<Planting> {
    const id = uuidv4();
    const doc = await PlantingModel.create({
      _id: id,
      gardenId: input.gardenId,
      seasonId: input.seasonId,
      areaId: input.areaId,
      plantProfileId: input.plantProfileId,
      plantName: input.plantName,
      sowingMethod: input.sowingMethod,
      indoorSowDate: input.indoorSowDate,
      transplantDate: input.transplantDate,
      outdoorSowDate: input.outdoorSowDate,
      harvestWindowStart: input.harvestWindowStart,
      harvestWindowEnd: input.harvestWindowEnd,
      quantity: input.quantity,
      notes: input.notes,
      createdBy: input.createdBy,
    });
    return toPlanting(doc.toObject() as PlantingDoc);
  }

  async findById(id: string): Promise<Planting | null> {
    const doc = await PlantingModel.findById(id).lean();
    if (!doc) return null;
    return toPlanting(doc as PlantingDoc);
  }

  async findByGardenAndSeason(gardenId: string, seasonId: string): Promise<Planting[]> {
    const docs = await PlantingModel.find({ gardenId, seasonId }).sort({ plantName: 1 }).lean();
    return (docs as PlantingDoc[]).map(toPlanting);
  }

  async update(
    id: string,
    patch: Partial<
      Pick<
        Planting,
        | 'areaId'
        | 'plantProfileId'
        | 'plantName'
        | 'sowingMethod'
        | 'indoorSowDate'
        | 'transplantDate'
        | 'outdoorSowDate'
        | 'harvestWindowStart'
        | 'harvestWindowEnd'
        | 'quantity'
        | 'notes'
      >
    >,
  ): Promise<Planting | null> {
    const doc = await PlantingModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean();
    if (!doc) return null;
    return toPlanting(doc as PlantingDoc);
  }

  async delete(id: string): Promise<boolean> {
    const res = await PlantingModel.deleteOne({ _id: id });
    return res.deletedCount === 1;
  }

  async deleteByGardenId(gardenId: string): Promise<number> {
    const res = await PlantingModel.deleteMany({ gardenId });
    return res.deletedCount ?? 0;
  }
}
