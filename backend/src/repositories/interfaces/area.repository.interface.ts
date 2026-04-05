import type { Area, AreaType } from '../../domain/area.js';

export interface CreateAreaInput {
  gardenId: string;
  name: string;
  type: AreaType;
  color: string;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
}

export interface IAreaRepository {
  create(input: CreateAreaInput): Promise<Area>;
  findById(id: string): Promise<Area | null>;
  findByGardenId(gardenId: string): Promise<Area[]>;
  update(
    id: string,
    patch: Partial<
      Pick<Area, 'name' | 'type' | 'color' | 'gridX' | 'gridY' | 'gridWidth' | 'gridHeight'>
    >,
  ): Promise<Area | null>;
  delete(id: string): Promise<boolean>;
  deleteByGardenId(gardenId: string): Promise<number>;
}
