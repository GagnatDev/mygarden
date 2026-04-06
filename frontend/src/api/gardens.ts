import { apiFetch, readProblemDetails } from './client';

export type AreaType =
  | 'raised_bed'
  | 'open_bed'
  | 'tree_zone'
  | 'path'
  | 'lawn'
  | 'other';

export interface Garden {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  cellSizeMeters: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Path under API base when a tracing image exists; fetch with Bearer auth (e.g. blob URL for SVG). */
  backgroundImageUrl: string | null;
}

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
  shape?: AreaShape;
  createdAt: string;
  updatedAt: string;
}

export type AreaShape =
  | { kind: 'rectangle' }
  | { kind: 'polygon'; vertices: Array<{ x: number; y: number }> }
  | { kind: 'path'; d: string };

export interface Season {
  id: string;
  gardenId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

async function throwUnlessOk(res: Response): Promise<void> {
  if (!res.ok) {
    const detail = await readProblemDetails(res);
    throw new Error(detail ?? res.statusText);
  }
}

export async function listGardens(): Promise<Garden[]> {
  const res = await apiFetch('/gardens');
  await throwUnlessOk(res);
  return (await res.json()) as Garden[];
}

export async function createGarden(body: {
  name: string;
  gridWidth: number;
  gridHeight: number;
  cellSizeMeters: number;
}): Promise<Garden> {
  const res = await apiFetch('/gardens', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await throwUnlessOk(res);
  return (await res.json()) as Garden;
}

export async function getGarden(gardenId: string): Promise<Garden> {
  const res = await apiFetch(`/gardens/${gardenId}`);
  await throwUnlessOk(res);
  return (await res.json()) as Garden;
}

export async function patchGarden(
  gardenId: string,
  patch: Partial<Pick<Garden, 'name' | 'gridWidth' | 'gridHeight' | 'cellSizeMeters'>>,
): Promise<Garden> {
  const res = await apiFetch(`/gardens/${gardenId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  await throwUnlessOk(res);
  return (await res.json()) as Garden;
}

export async function deleteGarden(gardenId: string): Promise<void> {
  const res = await apiFetch(`/gardens/${gardenId}`, { method: 'DELETE' });
  await throwUnlessOk(res);
}

export async function uploadGardenBackgroundImage(gardenId: string, file: File): Promise<Garden> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await apiFetch(`/gardens/${gardenId}/background-image`, {
    method: 'PUT',
    body: fd,
  });
  await throwUnlessOk(res);
  return (await res.json()) as Garden;
}

export async function deleteGardenBackgroundImage(gardenId: string): Promise<Garden> {
  const res = await apiFetch(`/gardens/${gardenId}/background-image`, { method: 'DELETE' });
  await throwUnlessOk(res);
  return (await res.json()) as Garden;
}

export async function listAreas(gardenId: string): Promise<Area[]> {
  const res = await apiFetch(`/gardens/${gardenId}/areas`);
  await throwUnlessOk(res);
  return (await res.json()) as Area[];
}

export async function createArea(
  gardenId: string,
  body: {
    name: string;
    type: AreaType;
    color: string;
    gridX: number;
    gridY: number;
    gridWidth: number;
    gridHeight: number;
    shape?: AreaShape;
  },
): Promise<Area> {
  const res = await apiFetch(`/gardens/${gardenId}/areas`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await throwUnlessOk(res);
  return (await res.json()) as Area;
}

export async function patchArea(
  gardenId: string,
  areaId: string,
  patch: Partial<{
    name: string;
    type: AreaType;
    color: string;
    gridX: number;
    gridY: number;
    gridWidth: number;
    gridHeight: number;
    shape: AreaShape;
  }>,
): Promise<Area> {
  const res = await apiFetch(`/gardens/${gardenId}/areas/${areaId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  await throwUnlessOk(res);
  return (await res.json()) as Area;
}

export async function deleteArea(gardenId: string, areaId: string): Promise<void> {
  const res = await apiFetch(`/gardens/${gardenId}/areas/${areaId}`, { method: 'DELETE' });
  await throwUnlessOk(res);
}

export async function listSeasons(gardenId: string): Promise<Season[]> {
  const res = await apiFetch(`/gardens/${gardenId}/seasons`);
  await throwUnlessOk(res);
  return (await res.json()) as Season[];
}
