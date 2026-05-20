export const NOTE_TARGET_TYPES = ['planting', 'element', 'season', 'site_plant'] as const;
export type NoteTargetType = (typeof NOTE_TARGET_TYPES)[number];

export interface NotePhoto {
  id: string;
  objectKey: string;
  mimeType: string;
  createdAt: Date;
}

export interface Note {
  id: string;
  gardenId: string;
  seasonId: string;
  targetType: NoteTargetType;
  targetId: string;
  body: string;
  photo: NotePhoto | null;
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
    photo: n.photo
      ? {
          id: n.photo.id,
          mimeType: n.photo.mimeType,
          createdAt: n.photo.createdAt.toISOString(),
        }
      : null,
    createdBy: n.createdBy,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}
