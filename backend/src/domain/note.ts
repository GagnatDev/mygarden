export const NOTE_TARGET_TYPES = ['planting', 'element', 'season'] as const;
export type NoteTargetType = (typeof NOTE_TARGET_TYPES)[number];

export interface Note {
  id: string;
  gardenId: string;
  seasonId: string;
  targetType: NoteTargetType;
  targetId: string;
  body: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicNote(n: Note) {
  return {
    id: n.id,
    gardenId: n.gardenId,
    seasonId: n.seasonId,
    targetType: n.targetType,
    targetId: n.targetId,
    body: n.body,
    createdBy: n.createdBy,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}
