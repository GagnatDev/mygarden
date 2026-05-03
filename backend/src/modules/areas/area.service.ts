import type { Area } from '../../domain/area.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IAreaRepository } from '../../repositories/interfaces/area.repository.interface.js';
import type { IElementRepository } from '../../repositories/interfaces/element.repository.interface.js';
import type { IGardenRepository } from '../../repositories/interfaces/garden.repository.interface.js';
import type { IFileStorageService } from '../../services/file-storage/file-storage.interface.js';

export interface CreateAreaDto {
  title: string;
  description?: string;
  gridWidth: number;
  gridHeight: number;
  cellSizeMeters: number;
  sortIndex?: number;
}

export type PatchAreaDto = Partial<
  Pick<Area, 'title' | 'description' | 'gridWidth' | 'gridHeight' | 'cellSizeMeters' | 'sortIndex'>
>;

export class AreaService {
  constructor(
    private readonly areaRepo: IAreaRepository,
    private readonly gardenRepo: IGardenRepository,
    private readonly elementRepo: IElementRepository,
    private readonly fileStorage: IFileStorageService,
  ) {}

  async listByGarden(gardenId: string): Promise<Area[]> {
    return this.areaRepo.findByGardenId(gardenId);
  }

  async getInGarden(gardenId: string, areaId: string): Promise<Area> {
    const area = await this.areaRepo.findById(areaId);
    if (!area || area.gardenId !== gardenId) {
      throw new HttpError(404, 'Area not found', 'Not Found');
    }
    return area;
  }

  async create(gardenId: string, dto: CreateAreaDto): Promise<Area> {
    const garden = await this.gardenRepo.findById(gardenId);
    if (!garden) {
      throw new HttpError(404, 'Garden not found', 'Not Found');
    }
    const existing = await this.areaRepo.findByGardenId(gardenId);
    const nextSortIndex =
      dto.sortIndex ??
      (existing.length === 0 ? 0 : Math.max(...existing.map((a) => a.sortIndex)) + 1);
    return this.areaRepo.create({
      gardenId,
      title: dto.title,
      description: dto.description ?? '',
      gridWidth: dto.gridWidth,
      gridHeight: dto.gridHeight,
      cellSizeMeters: dto.cellSizeMeters,
      sortIndex: nextSortIndex,
    });
  }

  async update(gardenId: string, areaId: string, patch: PatchAreaDto): Promise<Area> {
    const current = await this.getInGarden(gardenId, areaId);
    if (patch.gridWidth !== undefined || patch.gridHeight !== undefined) {
      const nextWidth = patch.gridWidth ?? current.gridWidth;
      const nextHeight = patch.gridHeight ?? current.gridHeight;
      if (nextWidth < current.gridWidth || nextHeight < current.gridHeight) {
        const elements = await this.elementRepo.findByAreaId(areaId);
        for (const e of elements) {
          if (e.gridX + e.gridWidth > nextWidth || e.gridY + e.gridHeight > nextHeight) {
            throw new HttpError(
              400,
              'Cannot shrink area: existing elements would fall outside the grid',
              'Bad Request',
            );
          }
        }
      }
    }
    const updated = await this.areaRepo.update(areaId, patch);
    if (!updated) {
      throw new HttpError(404, 'Area not found', 'Not Found');
    }
    return updated;
  }

  async delete(gardenId: string, areaId: string): Promise<void> {
    const current = await this.getInGarden(gardenId, areaId);
    if (current.backgroundImageKey) {
      await this.fileStorage.deleteObject(current.backgroundImageKey).catch(() => {
        /* best-effort */
      });
    }
    await this.elementRepo.deleteByAreaId(areaId);
    const ok = await this.areaRepo.delete(areaId);
    if (!ok) {
      throw new HttpError(404, 'Area not found', 'Not Found');
    }
  }
}
