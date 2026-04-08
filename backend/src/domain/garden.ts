export interface Garden {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  cellSizeMeters: number;
  createdBy: string;
  backgroundImageKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Path suffix after `/api/v1` for authenticated image fetch (Bearer token). */
export function gardenBackgroundImageApiPath(gardenId: string): string {
  return `/gardens/${gardenId}/background-image`;
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
    backgroundImageUrl: g.backgroundImageKey ? gardenBackgroundImageApiPath(g.id) : null,
  };
}
