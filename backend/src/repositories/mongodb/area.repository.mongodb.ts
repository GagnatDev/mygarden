import { v4 as uuidv4 } from 'uuid';
import type { Area } from '../../domain/area.js';
import type { CreateAreaInput, IAreaRepository } from '../interfaces/area.repository.interface.js';
import type { WithMongoSession } from '../mongo-session.js';
import type { AreaDoc } from './area.schema.js';
import { AreaModel } from './area.schema.js';

function toArea(doc: AreaDoc): Area {
  return {
    id: doc._id,
    gardenId: doc.gardenId,
    title: doc.title,
    description: doc.description ?? '',
    gridWidth: doc.gridWidth,
    gridHeight: doc.gridHeight,
    cellSizeMeters: doc.cellSizeMeters,
    sortIndex: doc.sortIndex ?? 0,
    backgroundImageKey: doc.backgroundImageKey ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class AreaRepositoryMongo implements IAreaRepository {
  async create(input: CreateAreaInput): Promise<Area> {
    const id = uuidv4();
    const doc = await AreaModel.create({
      _id: id,
      gardenId: input.gardenId,
      title: input.title,
      description: input.description,
      gridWidth: input.gridWidth,
      gridHeight: input.gridHeight,
      cellSizeMeters: input.cellSizeMeters,
      sortIndex: input.sortIndex,
      backgroundImageKey: input.backgroundImageKey ?? undefined,
    });
    return toArea(doc.toObject() as AreaDoc);
  }

  async findById(id: string): Promise<Area | null> {
    const doc = await AreaModel.findById(id).lean();
    if (!doc) return null;
    return toArea(doc as AreaDoc);
  }

  async findByGardenId(gardenId: string): Promise<Area[]> {
    const docs = await AreaModel.find({ gardenId }).sort({ sortIndex: 1, createdAt: 1 }).lean();
    return (docs as AreaDoc[]).map(toArea);
  }

  async update(
    id: string,
    patch: Partial<
      Pick<
        Area,
        | 'title'
        | 'description'
        | 'gridWidth'
        | 'gridHeight'
        | 'cellSizeMeters'
        | 'sortIndex'
        | 'backgroundImageKey'
      >
    >,
  ): Promise<Area | null> {
    const doc = await AreaModel.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true, runValidators: true },
    ).lean();
    if (!doc) return null;
    return toArea(doc as AreaDoc);
  }

  async delete(id: string): Promise<boolean> {
    const res = await AreaModel.deleteOne({ _id: id });
    return res.deletedCount === 1;
  }

  async deleteByGardenId(gardenId: string, options?: WithMongoSession): Promise<number> {
    const res = await AreaModel.deleteMany({ gardenId }, { session: options?.session });
    return res.deletedCount ?? 0;
  }
}
