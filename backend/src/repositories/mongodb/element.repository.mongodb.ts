import { v4 as uuidv4 } from 'uuid';
import type { Element, ElementShape, ElementType } from '../../domain/element.js';
import type {
  CreateElementInput,
  IElementRepository,
} from '../interfaces/element.repository.interface.js';
import type { WithMongoSession } from '../mongo-session.js';
import type { ElementDoc } from './element.schema.js';
import { ElementModel } from './element.schema.js';

function docShapeToElementShape(raw: ElementDoc['shape']): ElementShape | undefined {
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

function toElement(doc: ElementDoc): Element {
  return {
    id: doc._id,
    areaId: doc.areaId,
    name: doc.name,
    type: doc.type as ElementType,
    color: doc.color,
    gridX: doc.gridX,
    gridY: doc.gridY,
    gridWidth: doc.gridWidth,
    gridHeight: doc.gridHeight,
    shape: docShapeToElementShape(doc.shape),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class ElementRepositoryMongo implements IElementRepository {
  async create(input: CreateElementInput): Promise<Element> {
    const id = uuidv4();
    const doc = await ElementModel.create({
      _id: id,
      areaId: input.areaId,
      name: input.name,
      type: input.type,
      color: input.color,
      gridX: input.gridX,
      gridY: input.gridY,
      gridWidth: input.gridWidth,
      gridHeight: input.gridHeight,
      shape: input.shape,
    });
    return toElement(doc.toObject() as ElementDoc);
  }

  async findById(id: string): Promise<Element | null> {
    const doc = await ElementModel.findById(id).lean();
    if (!doc) return null;
    return toElement(doc as ElementDoc);
  }

  async findByAreaId(areaId: string): Promise<Element[]> {
    const docs = await ElementModel.find({ areaId }).lean();
    return (docs as ElementDoc[]).map(toElement);
  }

  async findByAreaIds(areaIds: string[]): Promise<Element[]> {
    if (areaIds.length === 0) return [];
    const docs = await ElementModel.find({ areaId: { $in: areaIds } }).lean();
    return (docs as ElementDoc[]).map(toElement);
  }

  async update(
    id: string,
    patch: Partial<
      Pick<
        Element,
        'name' | 'type' | 'color' | 'gridX' | 'gridY' | 'gridWidth' | 'gridHeight' | 'shape'
      >
    >,
  ): Promise<Element | null> {
    const doc = await ElementModel.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true, runValidators: true },
    ).lean();
    if (!doc) return null;
    return toElement(doc as ElementDoc);
  }

  async delete(id: string): Promise<boolean> {
    const res = await ElementModel.deleteOne({ _id: id });
    return res.deletedCount === 1;
  }

  async deleteByAreaId(areaId: string, options?: WithMongoSession): Promise<number> {
    const res = await ElementModel.deleteMany({ areaId }, { session: options?.session });
    return res.deletedCount ?? 0;
  }
}
