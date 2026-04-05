export type GardenRole = 'owner' | 'member';

export interface GardenMembership {
  id: string;
  gardenId: string;
  userId: string;
  role: GardenRole;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicMembership(m: GardenMembership) {
  return {
    id: m.id,
    gardenId: m.gardenId,
    userId: m.userId,
    role: m.role,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}
