export interface Area {
  id: string;
  gardenId: string;
  title: string;
  description: string;
  gridWidth: number;
  gridHeight: number;
  cellSizeMeters: number;
  backgroundImageKey: string | null;
  sortIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Path suffix after `/api/v1` for authenticated background image fetch (Bearer token). */
export function areaBackgroundImageApiPath(gardenId: string, areaId: string): string {
  return `/gardens/${gardenId}/areas/${areaId}/background-image`;
}

export function toPublicArea(a: Area) {
  return {
    id: a.id,
    gardenId: a.gardenId,
    title: a.title,
    description: a.description,
    gridWidth: a.gridWidth,
    gridHeight: a.gridHeight,
    cellSizeMeters: a.cellSizeMeters,
    sortIndex: a.sortIndex,
    backgroundImageUrl: a.backgroundImageKey ? areaBackgroundImageApiPath(a.gardenId, a.id) : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}
