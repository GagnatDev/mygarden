import { apiFetch, readProblemDetails } from './client';

export interface Area {
  id: string;
  gardenId: string;
  title: string;
  description: string;
  gridWidth: number;
  gridHeight: number;
  cellSizeMeters: number;
  sortIndex: number;
  /** Path under API base when a tracing image exists; fetch with Bearer auth (e.g. blob URL for SVG). */
  backgroundImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

async function throwUnlessOk(res: Response): Promise<void> {
  if (!res.ok) {
    const detail = await readProblemDetails(res);
    throw new Error(detail ?? res.statusText);
  }
}

export async function listAreas(gardenId: string): Promise<Area[]> {
  const res = await apiFetch(`/gardens/${gardenId}/areas`);
  await throwUnlessOk(res);
  return (await res.json()) as Area[];
}

export async function getArea(gardenId: string, areaId: string): Promise<Area> {
  const res = await apiFetch(`/gardens/${gardenId}/areas/${areaId}`);
  await throwUnlessOk(res);
  return (await res.json()) as Area;
}

export async function createArea(
  gardenId: string,
  body: {
    title: string;
    description?: string;
    gridWidth: number;
    gridHeight: number;
    cellSizeMeters: number;
    sortIndex?: number;
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
    title: string;
    description: string;
    gridWidth: number;
    gridHeight: number;
    cellSizeMeters: number;
    sortIndex: number;
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

export async function uploadAreaBackgroundImage(gardenId: string, areaId: string, file: File): Promise<Area> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await apiFetch(`/gardens/${gardenId}/areas/${areaId}/background-image`, {
    method: 'PUT',
    body: fd,
  });
  await throwUnlessOk(res);
  return (await res.json()) as Area;
}

export async function deleteAreaBackgroundImage(gardenId: string, areaId: string): Promise<Area> {
  const res = await apiFetch(`/gardens/${gardenId}/areas/${areaId}/background-image`, {
    method: 'DELETE',
  });
  await throwUnlessOk(res);
  return (await res.json()) as Area;
}
