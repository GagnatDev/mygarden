import type { Garden } from '../../domain/garden.js';

export interface CreateGardenInput {
  name: string;
  gridWidth: number;
  gridHeight: number;
  cellSizeMeters: number;
  createdBy: string;
}

export interface IGardenRepository {
  create(input: CreateGardenInput): Promise<Garden>;
  findById(id: string): Promise<Garden | null>;
  findByIds(ids: string[]): Promise<Garden[]>;
  update(
    id: string,
    patch: Partial<Pick<Garden, 'name' | 'gridWidth' | 'gridHeight' | 'cellSizeMeters'>>,
  ): Promise<Garden | null>;
  delete(id: string): Promise<boolean>;
}
