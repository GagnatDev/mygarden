export const AREA_TYPES = [
  'raised_bed',
  'open_bed',
  'tree_zone',
  'path',
  'lawn',
  'other',
] as const;

export type AreaType = (typeof AREA_TYPES)[number];

export type AreaShape =
  | { kind: 'rectangle' }
  | { kind: 'polygon'; vertices: Array<{ x: number; y: number }> }
  | { kind: 'path'; d: string };

export interface Area {
  id: string;
  gardenId: string;
  name: string;
  type: AreaType;
  color: string;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  /**
   * Optional shape. If missing, treat as `{ kind: 'rectangle' }` for backward compatibility.
   * For non-rectangle shapes, `gridX/Y/Width/Height` is the bounding box in grid-cell units.
   */
  shape?: AreaShape;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicArea(a: Area) {
  return {
    id: a.id,
    gardenId: a.gardenId,
    name: a.name,
    type: a.type,
    color: a.color,
    gridX: a.gridX,
    gridY: a.gridY,
    gridWidth: a.gridWidth,
    gridHeight: a.gridHeight,
    shape: a.shape ?? { kind: 'rectangle' },
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}
