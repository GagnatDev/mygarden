export const ELEMENT_TYPES = [
  'raised_bed',
  'open_bed',
  'tree_zone',
  'path',
  'lawn',
  'other',
] as const;

export type ElementType = (typeof ELEMENT_TYPES)[number];

export type ElementShape =
  | { kind: 'rectangle' }
  | { kind: 'polygon'; vertices: Array<{ x: number; y: number }> }
  | { kind: 'path'; d: string };

export interface Element {
  id: string;
  areaId: string;
  name: string;
  type: ElementType;
  color: string;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  /**
   * Optional shape. If missing, treat as `{ kind: 'rectangle' }`.
   * For non-rectangle shapes, `gridX/Y/Width/Height` is the bounding box in grid-cell units.
   */
  shape?: ElementShape;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicElement(e: Element) {
  return {
    id: e.id,
    areaId: e.areaId,
    name: e.name,
    type: e.type,
    color: e.color,
    gridX: e.gridX,
    gridY: e.gridY,
    gridWidth: e.gridWidth,
    gridHeight: e.gridHeight,
    shape: e.shape ?? { kind: 'rectangle' },
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}
