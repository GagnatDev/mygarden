export interface Garden {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  cellSizeMeters: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicGarden(g: Garden) {
  return {
    id: g.id,
    name: g.name,
    gridWidth: g.gridWidth,
    gridHeight: g.gridHeight,
    cellSizeMeters: g.cellSizeMeters,
    createdBy: g.createdBy,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}
