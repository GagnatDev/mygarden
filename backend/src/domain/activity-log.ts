export const ACTIVITY_TYPES = [
  'sown_indoors',
  'sown_outdoors',
  'transplanted',
  'watered',
  'fertilized',
  'pruned',
  'harvested',
  'problem_noted',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface ActivityLog {
  id: string;
  gardenId: string;
  seasonId: string;
  plantingId: string | null;
  areaId: string | null;
  activity: ActivityType;
  date: Date;
  note: string | null;
  quantity: number | null;
  createdBy: string;
  clientTimestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicActivityLog(l: ActivityLog) {
  return {
    id: l.id,
    gardenId: l.gardenId,
    seasonId: l.seasonId,
    plantingId: l.plantingId,
    areaId: l.areaId,
    activity: l.activity,
    date: l.date.toISOString(),
    note: l.note,
    quantity: l.quantity,
    createdBy: l.createdBy,
    clientTimestamp: l.clientTimestamp.toISOString(),
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}
