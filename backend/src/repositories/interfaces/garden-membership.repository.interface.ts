import type { GardenMembership, GardenRole } from '../../domain/garden-membership.js';

export interface CreateGardenMembershipInput {
  gardenId: string;
  userId: string;
  role: GardenRole;
}

export interface IGardenMembershipRepository {
  create(input: CreateGardenMembershipInput): Promise<GardenMembership>;
  findByUserAndGarden(userId: string, gardenId: string): Promise<GardenMembership | null>;
  findByUserId(userId: string): Promise<GardenMembership[]>;
  findByGardenId(gardenId: string): Promise<GardenMembership[]>;
  deleteByGardenId(gardenId: string): Promise<number>;
}
