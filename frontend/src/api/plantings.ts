import { apiFetch, readProblemDetails } from './client';

export type SowingMethod = 'indoor' | 'direct_outdoor';

export interface Planting {
  id: string;
  gardenId: string;
  seasonId: string;
  areaId: string;
  plantProfileId: string | null;
  plantName: string;
  sowingMethod: SowingMethod;
  indoorSowDate: string | null;
  transplantDate: string | null;
  outdoorSowDate: string | null;
  harvestWindowStart: string | null;
  harvestWindowEnd: string | null;
  quantity: number | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

async function throwUnlessOk(res: Response): Promise<void> {
  if (!res.ok) {
    const detail = await readProblemDetails(res);
    throw new Error(detail ?? res.statusText);
  }
}

export async function listPlantings(gardenId: string, seasonId: string): Promise<Planting[]> {
  const res = await apiFetch(`/gardens/${gardenId}/plantings?seasonId=${encodeURIComponent(seasonId)}`);
  await throwUnlessOk(res);
  return (await res.json()) as Planting[];
}

export async function createPlanting(
  gardenId: string,
  body: {
    seasonId: string;
    areaId: string;
    plantProfileId?: string | null;
    plantName?: string;
    sowingMethod: SowingMethod;
    indoorSowDate?: string | null;
    transplantDate?: string | null;
    outdoorSowDate?: string | null;
    harvestWindowStart?: string | null;
    harvestWindowEnd?: string | null;
    quantity?: number | null;
    notes?: string | null;
  },
): Promise<Planting> {
  const res = await apiFetch(`/gardens/${gardenId}/plantings`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await throwUnlessOk(res);
  return (await res.json()) as Planting;
}

export async function patchPlanting(
  gardenId: string,
  plantingId: string,
  patch: Partial<{
    areaId: string;
    plantProfileId: string | null;
    plantName: string;
    sowingMethod: SowingMethod;
    indoorSowDate: string | null;
    transplantDate: string | null;
    outdoorSowDate: string | null;
    harvestWindowStart: string | null;
    harvestWindowEnd: string | null;
    quantity: number | null;
    notes: string | null;
  }>,
): Promise<Planting> {
  const res = await apiFetch(`/gardens/${gardenId}/plantings/${plantingId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  await throwUnlessOk(res);
  return (await res.json()) as Planting;
}

export async function deletePlanting(gardenId: string, plantingId: string): Promise<void> {
  const res = await apiFetch(`/gardens/${gardenId}/plantings/${plantingId}`, { method: 'DELETE' });
  await throwUnlessOk(res);
}
