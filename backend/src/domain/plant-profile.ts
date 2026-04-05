export const PLANT_PROFILE_TYPES = ['vegetable', 'herb', 'flower', 'berry', 'tree_shrub'] as const;
export type PlantProfileType = (typeof PLANT_PROFILE_TYPES)[number];

export interface PlantProfile {
  id: string;
  userId: string;
  name: string;
  type: PlantProfileType;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicPlantProfile(p: PlantProfile) {
  return {
    id: p.id,
    userId: p.userId,
    name: p.name,
    type: p.type,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
