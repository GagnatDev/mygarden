import type { ActivityLog, ActivityType } from '../api/logs';
import type { Planting } from '../api/plantings';

export type ElementStatus = 'not-started' | 'sown' | 'planted' | 'harvested';
export type PlanActualMatch = 'complete' | 'partial' | 'not-started' | 'unplanned';

const STATUS_RANK: Record<ElementStatus, number> = {
  'not-started': 0,
  sown: 1,
  planted: 2,
  harvested: 3,
};

const PROGRESS_ACTIVITIES: ReadonlySet<ActivityType> = new Set([
  'sown_indoors',
  'sown_outdoors',
  'transplanted',
  'harvested',
]);

function isProgressLog(l: ActivityLog): boolean {
  return PROGRESS_ACTIVITIES.has(l.activity);
}

function logStatus(l: ActivityLog): ElementStatus {
  switch (l.activity) {
    case 'harvested':
      return 'harvested';
    case 'transplanted':
      return 'planted';
    case 'sown_indoors':
    case 'sown_outdoors':
      return 'sown';
    default:
      return 'not-started';
  }
}

function byNewest(a: ActivityLog, b: ActivityLog): number {
  const ad = a.date ?? a.createdAt;
  const bd = b.date ?? b.createdAt;
  if (ad > bd) return -1;
  if (ad < bd) return 1;
  return 0;
}

export function deriveElementStatus(
  elementId: string,
  plantings: readonly Planting[],
  logs: readonly ActivityLog[],
): ElementStatus {
  const planned = plantings.filter((p) => p.elementId === elementId);
  if (planned.length === 0) return 'not-started';

  const logsByPlantingId = new Map<string, ActivityLog[]>();
  for (const l of logs) {
    if (l.elementId !== elementId) continue;
    if (!l.plantingId) continue;
    if (!isProgressLog(l)) continue;
    const arr = logsByPlantingId.get(l.plantingId) ?? [];
    arr.push(l);
    logsByPlantingId.set(l.plantingId, arr);
  }

  let best: ElementStatus = 'not-started';
  for (const p of planned) {
    const plogs = logsByPlantingId.get(p.id);
    if (!plogs || plogs.length === 0) continue;
    const latest = [...plogs].sort(byNewest)[0]!;
    const st = logStatus(latest);
    if (STATUS_RANK[st] > STATUS_RANK[best]) best = st;
  }
  return best;
}

export function derivePlanVsActual(
  elementId: string,
  plantings: readonly Planting[],
  logs: readonly ActivityLog[],
): PlanActualMatch {
  const planned = plantings.filter((p) => p.elementId === elementId);

  const progressLogsInElement = logs.filter((l) => l.elementId === elementId && isProgressLog(l));
  const plannedIds = new Set(planned.map((p) => p.id));

  const hasUnplanned = progressLogsInElement.some(
    (l) => !l.plantingId || !plannedIds.has(l.plantingId),
  );
  if (hasUnplanned) return 'unplanned';

  if (planned.length === 0) return 'not-started';

  const donePlantingIds = new Set(
    progressLogsInElement.map((l) => l.plantingId).filter((id): id is string => typeof id === 'string'),
  );
  const doneCount = planned.filter((p) => donePlantingIds.has(p.id)).length;
  if (doneCount === 0) return 'not-started';
  if (doneCount === planned.length) return 'complete';
  return 'partial';
}
