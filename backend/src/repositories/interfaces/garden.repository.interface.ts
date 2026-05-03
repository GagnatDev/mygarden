import type { Garden } from '../../domain/garden.js';

export interface CreateGardenInput {
  name: string;
  createdBy: string;
}

export interface IGardenRepository {
  create(input: CreateGardenInput): Promise<Garden>;
  findById(id: string): Promise<Garden | null>;
  findByIds(ids: string[]): Promise<Garden[]>;
  update(id: string, patch: Partial<Pick<Garden, 'name'>>): Promise<Garden | null>;
  delete(id: string): Promise<boolean>;
}
