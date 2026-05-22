export const PLANT_PROFILE_TYPES = ['vegetable', 'herb', 'flower', 'berry', 'tree_shrub'] as const;
export type PlantProfileType = (typeof PLANT_PROFILE_TYPES)[number];

export interface PlantProfileImage {
  id: string;
  objectKey: string;
  thumbObjectKey: string | null;
  createdAt: Date;
}

export interface PlantProfile {
  id: string;
  userId: string;
  name: string;
  type: PlantProfileType;
  notes: string | null;
  images: PlantProfileImage[];
  createdAt: Date;
  updatedAt: Date;
}

export function plantProfileImageApiPath(profileId: string, imageId: string): string {
  return `/plant-profiles/${profileId}/images/${imageId}`;
}

export function plantProfileImageThumbApiPath(profileId: string, imageId: string): string {
  return `${plantProfileImageApiPath(profileId, imageId)}?variant=thumb`;
}

export function toPublicPlantProfile(p: PlantProfile) {
  return {
    id: p.id,
    userId: p.userId,
    name: p.name,
    type: p.type,
    notes: p.notes,
    images: p.images.map((image) => ({
      id: image.id,
      url: plantProfileImageApiPath(p.id, image.id),
      thumbUrl: plantProfileImageThumbApiPath(p.id, image.id),
    })),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
