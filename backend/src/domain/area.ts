export const AREA_TYPES = [
  'raised_bed',
  'open_bed',
  'tree_zone',
  'path',
  'lawn',
  'other',
] as const;

export type AreaType = (typeof AREA_TYPES)[number];

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
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}
