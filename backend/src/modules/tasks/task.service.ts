import type { ActivityType } from '../../domain/activity-log.js';
import type { Task, TaskAutoKind } from '../../domain/task.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IActivityLogRepository } from '../../repositories/interfaces/activity-log.repository.interface.js';
import type { ISeasonRepository } from '../../repositories/interfaces/season.repository.interface.js';
import type { ITaskRepository } from '../../repositories/interfaces/task.repository.interface.js';

function activityForAutoKind(kind: TaskAutoKind): ActivityType {
  switch (kind) {
    case 'sow_indoor':
      return 'sown_indoors';
    case 'sow_outdoor':
      return 'sown_outdoors';
    case 'transplant':
      return 'transplanted';
    case 'harvest_start':
      return 'harvested';
    default:
      return 'problem_noted';
  }
}

export class TaskService {
  constructor(
    private readonly taskRepo: ITaskRepository,
    private readonly seasonRepo: ISeasonRepository,
    private readonly activityLogRepo: IActivityLogRepository,
  ) {}

  async list(
    gardenId: string,
    seasonId: string,
    filters?: { status?: Task['status']; dueFrom?: Date; dueTo?: Date },
  ): Promise<Task[]> {
    const season = await this.seasonRepo.findById(seasonId);
    if (!season || season.gardenId !== gardenId) {
      throw new HttpError(404, 'Season not found', 'Not Found');
    }
    return this.taskRepo.findByGardenSeason(gardenId, seasonId, filters);
  }

  async createManual(
    gardenId: string,
    input: { seasonId: string; title: string; dueDate: Date; elementId: string | null },
  ): Promise<Task> {
    const season = await this.seasonRepo.findById(input.seasonId);
    if (!season || season.gardenId !== gardenId) {
      throw new HttpError(404, 'Season not found', 'Not Found');
    }
    return this.taskRepo.create({
      gardenId,
      seasonId: input.seasonId,
      plantingId: null,
      elementId: input.elementId,
      title: input.title,
      dueDate: input.dueDate,
      source: 'manual',
      status: 'pending',
      autoKind: null,
    });
  }

  async updateTask(
    gardenId: string,
    userId: string,
    taskId: string,
    patch: { status?: Task['status']; title?: string; dueDate?: Date; createLinkedLog?: boolean },
  ): Promise<Task> {
    const task = await this.taskRepo.findById(taskId);
    if (!task || task.gardenId !== gardenId) {
      throw new HttpError(404, 'Task not found', 'Not Found');
    }

    let linkedLogId = task.linkedLogId;

    if (patch.status === 'done' && task.status !== 'done') {
      const createLog = patch.createLinkedLog !== false;
      if (createLog && !linkedLogId) {
        const now = new Date();
        const activity: ActivityType =
          task.source === 'auto' && task.autoKind ? activityForAutoKind(task.autoKind) : 'problem_noted';
        const log = await this.activityLogRepo.create({
          gardenId,
          seasonId: task.seasonId,
          plantingId: task.plantingId,
          elementId: task.elementId,
          activity,
          date: now,
          note: task.title,
          quantity: null,
          createdBy: userId,
          clientTimestamp: now,
        });
        linkedLogId = log.id;
      }
      const updated = await this.taskRepo.update(taskId, {
        status: 'done',
        completedAt: new Date(),
        completedBy: userId,
        linkedLogId,
        title: patch.title,
        dueDate: patch.dueDate,
      });
      if (!updated) {
        throw new HttpError(404, 'Task not found', 'Not Found');
      }
      return updated;
    }

    if (patch.status === 'pending' && task.status === 'done') {
      const updated = await this.taskRepo.update(taskId, {
        status: 'pending',
        completedAt: null,
        completedBy: null,
        linkedLogId: null,
        title: patch.title,
        dueDate: patch.dueDate,
      });
      if (!updated) {
        throw new HttpError(404, 'Task not found', 'Not Found');
      }
      return updated;
    }

    const updated = await this.taskRepo.update(taskId, {
      status: patch.status,
      title: patch.title,
      dueDate: patch.dueDate,
    });
    if (!updated) {
      throw new HttpError(404, 'Task not found', 'Not Found');
    }
    return updated;
  }
}
