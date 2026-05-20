export interface SitePlant {
  id: string;
  gardenId: string;
  elementId: string;
  plantProfileId: string | null;
  plantName: string;
  establishedDate: Date | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicSitePlant(p: SitePlant) {
  return {
    id: p.id,
    gardenId: p.gardenId,
    elementId: p.elementId,
    plantProfileId: p.plantProfileId,
    plantName: p.plantName,
    establishedDate: p.establishedDate?.toISOString().slice(0, 10) ?? null,
    notes: p.notes,
    createdBy: p.createdBy,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
