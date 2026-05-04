import type {
  PlantProfile,
  PlantProfileImage,
  PlantProfileType,
} from '../../domain/plant-profile.js';

export interface CreatePlantProfileInput {
  userId: string;
  name: string;
  type: PlantProfileType;
  notes: string | null;
}

export interface IPlantProfileRepository {
  create(input: CreatePlantProfileInput): Promise<PlantProfile>;
  findById(id: string): Promise<PlantProfile | null>;
  findByUserId(userId: string): Promise<PlantProfile[]>;
  update(
    id: string,
    userId: string,
    patch: Partial<Pick<PlantProfile, 'name' | 'type' | 'notes'>>,
  ): Promise<PlantProfile | null>;
  replaceImages(id: string, userId: string, images: PlantProfileImage[]): Promise<PlantProfile | null>;
  delete(id: string, userId: string): Promise<boolean>;
}
