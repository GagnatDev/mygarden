export const SOWING_METHODS = ['indoor', 'direct_outdoor'] as const;
export type SowingMethod = (typeof SOWING_METHODS)[number];

export interface Planting {
  id: string;
  gardenId: string;
  seasonId: string;
  elementId: string;
  plantProfileId: string | null;
  plantName: string;
  sowingMethod: SowingMethod;
  indoorSowDate: Date | null;
  transplantDate: Date | null;
  outdoorSowDate: Date | null;
  harvestWindowStart: Date | null;
  harvestWindowEnd: Date | null;
  quantity: number | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicPlanting(p: Planting) {
  return {
    id: p.id,
    gardenId: p.gardenId,
    seasonId: p.seasonId,
    elementId: p.elementId,
    plantProfileId: p.plantProfileId,
    plantName: p.plantName,
    sowingMethod: p.sowingMethod,
    indoorSowDate: p.indoorSowDate?.toISOString() ?? null,
    transplantDate: p.transplantDate?.toISOString() ?? null,
    outdoorSowDate: p.outdoorSowDate?.toISOString() ?? null,
    harvestWindowStart: p.harvestWindowStart?.toISOString() ?? null,
    harvestWindowEnd: p.harvestWindowEnd?.toISOString() ?? null,
    quantity: p.quantity,
    notes: p.notes,
    createdBy: p.createdBy,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
