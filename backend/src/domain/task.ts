export const TASK_SOURCES = ['auto', 'manual'] as const;
export type TaskSource = (typeof TASK_SOURCES)[number];

export const TASK_STATUSES = ['pending', 'done', 'skipped'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Set on auto-generated tasks for linked log mapping when marking done. */
export const TASK_AUTO_KINDS = ['sow_indoor', 'transplant', 'sow_outdoor', 'harvest_start'] as const;
export type TaskAutoKind = (typeof TASK_AUTO_KINDS)[number];

export interface Task {
  id: string;
  gardenId: string;
  seasonId: string;
  plantingId: string | null;
  elementId: string | null;
  title: string;
  dueDate: Date;
  source: TaskSource;
  status: TaskStatus;
  completedAt: Date | null;
  completedBy: string | null;
  linkedLogId: string | null;
  autoKind: TaskAutoKind | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicTask(t: Task) {
  return {
    id: t.id,
    gardenId: t.gardenId,
    seasonId: t.seasonId,
    plantingId: t.plantingId,
    elementId: t.elementId,
    title: t.title,
    dueDate: t.dueDate.toISOString(),
    source: t.source,
    status: t.status,
    completedAt: t.completedAt?.toISOString() ?? null,
    completedBy: t.completedBy,
    linkedLogId: t.linkedLogId,
    autoKind: t.autoKind,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
