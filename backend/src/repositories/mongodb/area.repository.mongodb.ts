import { v4 as uuidv4 } from 'uuid';
import type { Area, AreaShape, AreaType } from '../../domain/area.js';
import type { CreateAreaInput, IAreaRepository } from '../interfaces/area.repository.interface.js';
import type { AreaDoc } from './area.schema.js';
import { AreaModel } from './area.schema.js';

function docShapeToAreaShape(raw: AreaDoc['shape']): AreaShape | undefined {
  if (raw == null) return undefined;
  if (raw.kind === 'rectangle') return { kind: 'rectangle' };
  if (raw.kind === 'polygon') {
    const verts = raw.vertices;
    if (!verts?.length) return undefined;
    return { kind: 'polygon', vertices: verts.map((v) => ({ x: v.x, y: v.y })) };
  }
  if (raw.kind === 'path') {
    if (typeof raw.d !== 'string' || raw.d.length === 0) return undefined;
    return { kind: 'path', d: raw.d };
  }
  return undefined;
}

function toArea(doc: AreaDoc): Area {
  return {
    id: doc._id,
    gardenId: doc.gardenId,
    name: doc.name,
    type: doc.type as AreaType,
    color: doc.color,
    gridX: doc.gridX,
    gridY: doc.gridY,
    gridWidth: doc.gridWidth,
    gridHeight: doc.gridHeight,
    shape: docShapeToAreaShape(doc.shape),
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
      name: input.name,
      type: input.type,
      color: input.color,
      gridX: input.gridX,
      gridY: input.gridY,
      gridWidth: input.gridWidth,
      gridHeight: input.gridHeight,
      shape: input.shape,
    });
    return toArea(doc.toObject() as AreaDoc);
  }

  async findById(id: string): Promise<Area | null> {
    const doc = await AreaModel.findById(id).lean();
    if (!doc) return null;
    return toArea(doc as AreaDoc);
  }

  async findByGardenId(gardenId: string): Promise<Area[]> {
    const docs = await AreaModel.find({ gardenId }).lean();
    return (docs as AreaDoc[]).map(toArea);
  }

  async update(
    id: string,
    patch: Partial<
      Pick<Area, 'name' | 'type' | 'color' | 'gridX' | 'gridY' | 'gridWidth' | 'gridHeight' | 'shape'>
    >,
  ): Promise<Area | null> {
    const doc = await AreaModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean();
    if (!doc) return null;
    return toArea(doc as AreaDoc);
  }

  async delete(id: string): Promise<boolean> {
    const res = await AreaModel.deleteOne({ _id: id });
    return res.deletedCount === 1;
  }

  async deleteByGardenId(gardenId: string): Promise<number> {
    const res = await AreaModel.deleteMany({ gardenId });
    return res.deletedCount ?? 0;
  }
}
