import type { SitePlant } from '../../domain/site-plant.js';
import type { WithMongoSession } from '../mongo-session.js';

export interface CreateSitePlantInput {
  gardenId: string;
  elementId: string;
  plantProfileId: string | null;
  plantName: string;
  establishedDate: Date | null;
  notes: string | null;
  createdBy: string;
}

export interface ISitePlantRepository {
  create(input: CreateSitePlantInput): Promise<SitePlant>;
  findById(id: string): Promise<SitePlant | null>;
  findByGardenId(gardenId: string): Promise<SitePlant[]>;
  update(
    id: string,
    patch: Partial<
      Pick<SitePlant, 'elementId' | 'plantProfileId' | 'plantName' | 'establishedDate' | 'notes'>
    >,
  ): Promise<SitePlant | null>;
  delete(id: string): Promise<boolean>;
  deleteByGardenId(gardenId: string, options?: WithMongoSession): Promise<number>;
  deleteByElementId(elementId: string, options?: WithMongoSession): Promise<number>;
}
