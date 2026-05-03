import type { Element, ElementShape, ElementType } from '../../domain/element.js';
import { polygonBoundingBox, polygonsOverlap } from '../../lib/geometry.js';
import { gridRectsOverlap, rectWithinGarden } from '../../lib/grid-rect.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IAreaRepository } from '../../repositories/interfaces/area.repository.interface.js';
import type { IElementRepository } from '../../repositories/interfaces/element.repository.interface.js';

export interface CreateElementDto {
  name: string;
  type: ElementType;
  color: string;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  shape?: ElementShape;
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

function shapeToPolygon(el: {
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  shape?: ElementShape;
}): Array<{ x: number; y: number }> | null {
  const s = el.shape ?? { kind: 'rectangle' as const };
  if (s.kind === 'rectangle') return rectangleToPolygon(el);
  if (s.kind === 'polygon') return s.vertices;
  return null;
}

function boundingRectForShape(
  shape: ElementShape,
): { gridX: number; gridY: number; gridWidth: number; gridHeight: number } | null {
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

export class ElementService {
  constructor(
    private readonly elementRepo: IElementRepository,
    private readonly areaRepo: IAreaRepository,
  ) {}

  async listByArea(gardenId: string, areaId: string): Promise<Element[]> {
    await this.assertAreaInGarden(gardenId, areaId);
    return this.elementRepo.findByAreaId(areaId);
  }

  private async assertAreaInGarden(gardenId: string, areaId: string) {
    const area = await this.areaRepo.findById(areaId);
    if (!area || area.gardenId !== gardenId) {
      throw new HttpError(404, 'Area not found', 'Not Found');
    }
    return area;
  }

  private async assertNoOverlap(
    areaId: string,
    rectLike: {
      gridX: number;
      gridY: number;
      gridWidth: number;
      gridHeight: number;
      shape?: ElementShape;
    },
    excludeElementId?: string,
  ): Promise<void> {
    const existing = await this.elementRepo.findByAreaId(areaId);
    for (const a of existing) {
      if (excludeElementId && a.id === excludeElementId) continue;
      if (!gridRectsOverlap(rectLike, a)) continue;

      const polyA = shapeToPolygon(rectLike);
      const polyB = shapeToPolygon(a);

      if (!polyA || !polyB) {
        throw new HttpError(409, 'Element overlaps an existing element', 'Conflict');
      }

      if (polygonsOverlap(polyA, polyB)) {
        throw new HttpError(409, 'Element overlaps an existing element', 'Conflict');
      }
    }
  }

  async create(gardenId: string, areaId: string, dto: CreateElementDto): Promise<Element> {
    const area = await this.assertAreaInGarden(gardenId, areaId);
    const inferred = dto.shape ? boundingRectForShape(dto.shape) : null;
    const rect = inferred ?? {
      gridX: dto.gridX,
      gridY: dto.gridY,
      gridWidth: dto.gridWidth,
      gridHeight: dto.gridHeight,
    };
    if (!rectWithinGarden(rect, area.gridWidth, area.gridHeight)) {
      throw new HttpError(400, 'Element is outside the area grid', 'Bad Request');
    }
    await this.assertNoOverlap(areaId, { ...rect, shape: dto.shape });
    return this.elementRepo.create({
      areaId,
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
    elementId: string,
    patch: Partial<
      Pick<
        Element,
        'name' | 'type' | 'color' | 'gridX' | 'gridY' | 'gridWidth' | 'gridHeight' | 'shape'
      >
    >,
  ): Promise<Element> {
    const area = await this.assertAreaInGarden(gardenId, areaId);
    const current = await this.elementRepo.findById(elementId);
    if (!current || current.areaId !== areaId) {
      throw new HttpError(404, 'Element not found', 'Not Found');
    }
    let nextShape: ElementShape | undefined = patch.shape ?? current.shape;
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
    if (!rectWithinGarden(next, area.gridWidth, area.gridHeight)) {
      throw new HttpError(400, 'Element is outside the area grid', 'Bad Request');
    }
    await this.assertNoOverlap(areaId, { ...next, shape: nextShape }, elementId);
    const updatedPatch = inferred
      ? { ...patch, ...next, ...(nextShape !== undefined ? { shape: nextShape } : {}) }
      : patch;
    const updated = await this.elementRepo.update(elementId, updatedPatch);
    if (!updated) {
      throw new HttpError(404, 'Element not found', 'Not Found');
    }
    return updated;
  }

  async delete(gardenId: string, areaId: string, elementId: string): Promise<void> {
    await this.assertAreaInGarden(gardenId, areaId);
    const current = await this.elementRepo.findById(elementId);
    if (!current || current.areaId !== areaId) {
      throw new HttpError(404, 'Element not found', 'Not Found');
    }
    const ok = await this.elementRepo.delete(elementId);
    if (!ok) {
      throw new HttpError(404, 'Element not found', 'Not Found');
    }
  }
}
