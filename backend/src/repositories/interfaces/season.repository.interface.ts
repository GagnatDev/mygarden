import type { Season } from '../../domain/season.js';
import type { WithMongoSession } from '../mongo-session.js';

export interface CreateSeasonInput {
  gardenId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export interface ISeasonRepository {
  create(input: CreateSeasonInput): Promise<Season>;
  findById(id: string): Promise<Season | null>;
  findByGardenId(gardenId: string): Promise<Season[]>;
  findActiveByGardenId(gardenId: string): Promise<Season | null>;
  update(
    id: string,
    patch: Partial<Pick<Season, 'name' | 'startDate' | 'endDate' | 'isActive'>>,
  ): Promise<Season | null>;
  delete(id: string): Promise<boolean>;
  deleteByGardenId(gardenId: string, options?: WithMongoSession): Promise<number>;
  deactivateAllInGarden(gardenId: string): Promise<void>;
}
