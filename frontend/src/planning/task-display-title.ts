import type { GardenTask } from '../api/tasks';

/** Same shape as i18next `t` for our keys (avoids branded `TFunction` in unit tests). */
export type TaskTitleTranslate = (key: string, options?: Record<string, string>) => string;

const AUTO_TASK_KINDS = ['sow_indoor', 'transplant', 'sow_outdoor', 'harvest_start'] as const;
type AutoTaskKind = (typeof AUTO_TASK_KINDS)[number];

function isAutoTaskKind(v: string | null): v is AutoTaskKind {
  return v !== null && (AUTO_TASK_KINDS as readonly string[]).includes(v);
}

/** Localized label for calendar and lists; falls back to stored title for manual or legacy tasks. */
export function getTaskDisplayTitle(task: GardenTask, t: TaskTitleTranslate): string {
  if (task.source === 'auto' && task.plantName && isAutoTaskKind(task.autoKind)) {
    return t(`planning.autoTaskTitle.${task.autoKind}`, { plant: task.plantName });
  }
  return task.title;
}
