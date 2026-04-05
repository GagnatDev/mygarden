import type { Area, AreaType } from '../../domain/area.js';
import { gridRectsOverlap, rectWithinGarden } from '../../lib/grid-rect.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IAreaRepository } from '../../repositories/interfaces/area.repository.interface.js';
import type { IGardenRepository } from '../../repositories/interfaces/garden.repository.interface.js';

export interface CreateAreaDto {
  name: string;
  type: AreaType;
  color: string;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
}

export class AreaService {
  constructor(
    private readonly areaRepo: IAreaRepository,
    private readonly gardenRepo: IGardenRepository,
  ) {}

  async listByGarden(gardenId: string): Promise<Area[]> {
    return this.areaRepo.findByGardenId(gardenId);
  }

  private async assertNoOverlap(
    gardenId: string,
    rect: { gridX: number; gridY: number; gridWidth: number; gridHeight: number },
    excludeAreaId?: string,
  ): Promise<void> {
    const existing = await this.areaRepo.findByGardenId(gardenId);
    for (const a of existing) {
      if (excludeAreaId && a.id === excludeAreaId) continue;
      if (gridRectsOverlap(rect, a)) {
        throw new HttpError(409, 'Area overlaps an existing area', 'Conflict');
      }
    }
  }

  async create(gardenId: string, dto: CreateAreaDto): Promise<Area> {
    const garden = await this.gardenRepo.findById(gardenId);
    if (!garden) {
      throw new HttpError(404, 'Garden not found', 'Not Found');
    }
    const rect = {
      gridX: dto.gridX,
      gridY: dto.gridY,
      gridWidth: dto.gridWidth,
      gridHeight: dto.gridHeight,
    };
    if (!rectWithinGarden(rect, garden.gridWidth, garden.gridHeight)) {
      throw new HttpError(400, 'Area is outside the garden grid', 'Bad Request');
    }
    await this.assertNoOverlap(gardenId, rect);
    return this.areaRepo.create({
      gardenId,
      name: dto.name,
      type: dto.type,
      color: dto.color,
      ...rect,
    });
  }

  async update(
    gardenId: string,
    areaId: string,
    patch: Partial<Pick<Area, 'name' | 'type' | 'color' | 'gridX' | 'gridY' | 'gridWidth' | 'gridHeight'>>,
  ): Promise<Area> {
    const current = await this.areaRepo.findById(areaId);
    if (!current || current.gardenId !== gardenId) {
      throw new HttpError(404, 'Area not found', 'Not Found');
    }
    const garden = await this.gardenRepo.findById(gardenId);
    if (!garden) {
      throw new HttpError(404, 'Garden not found', 'Not Found');
    }
    const next = {
      gridX: patch.gridX ?? current.gridX,
      gridY: patch.gridY ?? current.gridY,
      gridWidth: patch.gridWidth ?? current.gridWidth,
      gridHeight: patch.gridHeight ?? current.gridHeight,
    };
    if (!rectWithinGarden(next, garden.gridWidth, garden.gridHeight)) {
      throw new HttpError(400, 'Area is outside the garden grid', 'Bad Request');
    }
    await this.assertNoOverlap(gardenId, next, areaId);
    const updated = await this.areaRepo.update(areaId, patch);
    if (!updated) {
      throw new HttpError(404, 'Area not found', 'Not Found');
    }
    return updated;
  }

  async delete(gardenId: string, areaId: string): Promise<void> {
    const current = await this.areaRepo.findById(areaId);
    if (!current || current.gardenId !== gardenId) {
      throw new HttpError(404, 'Area not found', 'Not Found');
    }
    const ok = await this.areaRepo.delete(areaId);
    if (!ok) {
      throw new HttpError(404, 'Area not found', 'Not Found');
    }
  }
}
