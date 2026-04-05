import { v4 as uuidv4 } from 'uuid';
import type { Task, TaskAutoKind, TaskSource, TaskStatus } from '../../domain/task.js';
import type { CreateTaskInput, ITaskRepository } from '../interfaces/task.repository.interface.js';
import type { TaskDoc } from './task.schema.js';
import { TaskModel } from './task.schema.js';

function toTask(doc: TaskDoc): Task {
  return {
    id: doc._id,
    gardenId: doc.gardenId,
    seasonId: doc.seasonId,
    plantingId: doc.plantingId ?? null,
    areaId: doc.areaId ?? null,
    title: doc.title,
    dueDate: doc.dueDate,
    source: doc.source as TaskSource,
    status: doc.status as TaskStatus,
    completedAt: doc.completedAt ?? null,
    completedBy: doc.completedBy ?? null,
    linkedLogId: doc.linkedLogId ?? null,
    autoKind: (doc.autoKind as TaskAutoKind | null) ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class TaskRepositoryMongo implements ITaskRepository {
  async create(input: CreateTaskInput): Promise<Task> {
    const id = uuidv4();
    const doc = await TaskModel.create({
      _id: id,
      gardenId: input.gardenId,
      seasonId: input.seasonId,
      plantingId: input.plantingId,
      areaId: input.areaId,
      title: input.title,
      dueDate: input.dueDate,
      source: input.source,
      status: input.status,
      autoKind: input.autoKind,
    });
    return toTask(doc.toObject() as TaskDoc);
  }

  async findById(id: string): Promise<Task | null> {
    const doc = await TaskModel.findById(id).lean();
    if (!doc) return null;
    return toTask(doc as TaskDoc);
  }

  async findByGardenSeason(
    gardenId: string,
    seasonId: string,
    filters?: { status?: TaskStatus; dueFrom?: Date; dueTo?: Date },
  ): Promise<Task[]> {
    const q: Record<string, unknown> = { gardenId, seasonId };
    if (filters?.status) q.status = filters.status;
    if (filters?.dueFrom || filters?.dueTo) {
      q.dueDate = {};
      if (filters.dueFrom) (q.dueDate as Record<string, Date>).$gte = filters.dueFrom;
      if (filters.dueTo) (q.dueDate as Record<string, Date>).$lte = filters.dueTo;
    }
    const docs = await TaskModel.find(q).sort({ dueDate: 1 }).lean();
    return (docs as TaskDoc[]).map(toTask);
  }

  async deleteAutoTasksByPlantingId(plantingId: string): Promise<number> {
    const res = await TaskModel.deleteMany({ plantingId, source: 'auto' });
    return res.deletedCount ?? 0;
  }

  async deleteAllTasksByPlantingId(plantingId: string): Promise<number> {
    const res = await TaskModel.deleteMany({ plantingId });
    return res.deletedCount ?? 0;
  }

  async deleteByGardenId(gardenId: string): Promise<number> {
    const res = await TaskModel.deleteMany({ gardenId });
    return res.deletedCount ?? 0;
  }

  async update(
    id: string,
    patch: Partial<
      Pick<Task, 'title' | 'dueDate' | 'status' | 'completedAt' | 'completedBy' | 'linkedLogId'>
    >,
  ): Promise<Task | null> {
    const doc = await TaskModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean();
    if (!doc) return null;
    return toTask(doc as TaskDoc);
  }
}
