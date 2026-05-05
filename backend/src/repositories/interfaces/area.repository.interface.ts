import type { Area } from '../../domain/area.js';
import type { WithMongoSession } from '../mongo-session.js';

export interface CreateAreaInput {
  gardenId: string;
  title: string;
  description: string;
  gridWidth: number;
  gridHeight: number;
  cellSizeMeters: number;
  sortIndex: number;
  backgroundImageKey?: string | null;
}

export interface IAreaRepository {
  create(input: CreateAreaInput): Promise<Area>;
  findById(id: string): Promise<Area | null>;
  findByGardenId(gardenId: string): Promise<Area[]>;
  update(
    id: string,
    patch: Partial<
      Pick<
        Area,
        | 'title'
        | 'description'
        | 'gridWidth'
        | 'gridHeight'
        | 'cellSizeMeters'
        | 'sortIndex'
        | 'backgroundImageKey'
      >
    >,
  ): Promise<Area | null>;
  delete(id: string): Promise<boolean>;
  deleteByGardenId(gardenId: string, options?: WithMongoSession): Promise<number>;
}
