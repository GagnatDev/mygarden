import type { Area, AreaShape, AreaType } from '../../domain/area.js';
import { polygonBoundingBox, polygonsOverlap } from '../../lib/geometry.js';
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
  shape?: AreaShape;
}

function rectangleToPolygon(rect: {
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
}): Array<{ x: number; y: number }> {
  const x0 = rect.gridX;
  const y0 = rect.gridY;
  const x1 = rect.gridX + rect.gridWidth;
  const y1 = rect.gridY + rect.gridHeight;
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

function shapeToPolygon(area: {
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  shape?: AreaShape;
}): Array<{ x: number; y: number }> | null {
  const s = area.shape ?? { kind: 'rectangle' as const };
  if (s.kind === 'rectangle') return rectangleToPolygon(area);
  if (s.kind === 'polygon') return s.vertices;
  return null; // path not supported for precise overlap yet
}

function boundingRectForShape(shape: AreaShape): { gridX: number; gridY: number; gridWidth: number; gridHeight: number } | null {
  if (shape.kind === 'rectangle') return null;
  if (shape.kind === 'polygon') {
    const bb = polygonBoundingBox(shape.vertices);
    const gridX = Math.floor(bb.minX);
    const gridY = Math.floor(bb.minY);
    const maxX = Math.ceil(bb.maxX);
    const maxY = Math.ceil(bb.maxY);
    return { gridX, gridY, gridWidth: Math.max(1, maxX - gridX), gridHeight: Math.max(1, maxY - gridY) };
  }
  return null;
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
    areaLike: { gridX: number; gridY: number; gridWidth: number; gridHeight: number; shape?: AreaShape },
    excludeAreaId?: string,
  ): Promise<void> {
    const existing = await this.areaRepo.findByGardenId(gardenId);
    for (const a of existing) {
      if (excludeAreaId && a.id === excludeAreaId) continue;
      if (!gridRectsOverlap(areaLike, a)) continue;

      const polyA = shapeToPolygon(areaLike);
      const polyB = shapeToPolygon(a);

      // Conservative fallback: if we can't reason about a shape (path), reject when bounding boxes overlap.
      if (!polyA || !polyB) {
        throw new HttpError(409, 'Area overlaps an existing area', 'Conflict');
      }

      if (polygonsOverlap(polyA, polyB)) {
        throw new HttpError(409, 'Area overlaps an existing area', 'Conflict');
      }
    }
  }

  async create(gardenId: string, dto: CreateAreaDto): Promise<Area> {
    const garden = await this.gardenRepo.findById(gardenId);
    if (!garden) {
      throw new HttpError(404, 'Garden not found', 'Not Found');
    }
    const inferred = dto.shape ? boundingRectForShape(dto.shape) : null;
    const rect = inferred ?? {
      gridX: dto.gridX,
      gridY: dto.gridY,
      gridWidth: dto.gridWidth,
      gridHeight: dto.gridHeight,
    };
    if (!rectWithinGarden(rect, garden.gridWidth, garden.gridHeight)) {
      throw new HttpError(400, 'Area is outside the garden grid', 'Bad Request');
    }
    await this.assertNoOverlap(gardenId, { ...rect, shape: dto.shape });
    return this.areaRepo.create({
      gardenId,
      name: dto.name,
      type: dto.type,
      color: dto.color,
      ...rect,
      shape: dto.shape,
    });
  }

  async update(
    gardenId: string,
    areaId: string,
    patch: Partial<
      Pick<Area, 'name' | 'type' | 'color' | 'gridX' | 'gridY' | 'gridWidth' | 'gridHeight' | 'shape'>
    >,
  ): Promise<Area> {
    const current = await this.areaRepo.findById(areaId);
    if (!current || current.gardenId !== gardenId) {
      throw new HttpError(404, 'Area not found', 'Not Found');
    }
    const garden = await this.gardenRepo.findById(gardenId);
    if (!garden) {
      throw new HttpError(404, 'Garden not found', 'Not Found');
    }
    let nextShape: AreaShape | undefined = patch.shape ?? current.shape;
    // Polygon vertices are stored in grid coordinates; translating gridX/gridY must move vertices too.
    if (
      current.shape?.kind === 'polygon' &&
      patch.shape === undefined &&
      (patch.gridX !== undefined || patch.gridY !== undefined)
    ) {
      const dgx = (patch.gridX ?? current.gridX) - current.gridX;
      const dgy = (patch.gridY ?? current.gridY) - current.gridY;
      if (dgx !== 0 || dgy !== 0) {
        nextShape = {
          kind: 'polygon',
          vertices: current.shape.vertices.map((v) => ({ x: v.x + dgx, y: v.y + dgy })),
        };
      }
    }
    const inferred = nextShape ? boundingRectForShape(nextShape) : null;
    const next = inferred ?? {
      gridX: patch.gridX ?? current.gridX,
      gridY: patch.gridY ?? current.gridY,
      gridWidth: patch.gridWidth ?? current.gridWidth,
      gridHeight: patch.gridHeight ?? current.gridHeight,
    };
    if (!rectWithinGarden(next, garden.gridWidth, garden.gridHeight)) {
      throw new HttpError(400, 'Area is outside the garden grid', 'Bad Request');
    }
    await this.assertNoOverlap(gardenId, { ...next, shape: nextShape }, areaId);
    const updatedPatch = inferred
      ? { ...patch, ...next, ...(nextShape !== undefined ? { shape: nextShape } : {}) }
      : patch;
    const updated = await this.areaRepo.update(areaId, updatedPatch);
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
