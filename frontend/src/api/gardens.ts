import { apiFetch, readProblemDetails } from './client';

export interface Garden {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

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

export async function createGarden(body: { name: string }): Promise<Garden> {
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

export async function patchGarden(gardenId: string, patch: Partial<Pick<Garden, 'name'>>): Promise<Garden> {
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

export async function listSeasons(gardenId: string): Promise<Season[]> {
  const res = await apiFetch(`/gardens/${gardenId}/seasons`);
  await throwUnlessOk(res);
  return (await res.json()) as Season[];
}
