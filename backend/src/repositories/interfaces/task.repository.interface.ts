import type { Task, TaskAutoKind, TaskSource, TaskStatus } from '../../domain/task.js';

export interface CreateTaskInput {
  gardenId: string;
  seasonId: string;
  plantingId: string | null;
  elementId: string | null;
  title: string;
  dueDate: Date;
  source: TaskSource;
  status: TaskStatus;
  autoKind: TaskAutoKind | null;
}

export interface ITaskRepository {
  create(input: CreateTaskInput): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  findByGardenSeason(
    gardenId: string,
    seasonId: string,
    filters?: { status?: TaskStatus; dueFrom?: Date; dueTo?: Date },
  ): Promise<Task[]>;
  /** Removes auto-generated tasks for a planting (before regenerating). */
  deleteAutoTasksByPlantingId(plantingId: string): Promise<number>;
  /** Removes all tasks linked to a planting (when planting is deleted). */
  deleteAllTasksByPlantingId(plantingId: string): Promise<number>;
  deleteByGardenId(gardenId: string): Promise<number>;
  update(
    id: string,
    patch: Partial<
      Pick<Task, 'title' | 'dueDate' | 'status' | 'completedAt' | 'completedBy' | 'linkedLogId'>
    >,
  ): Promise<Task | null>;
}
