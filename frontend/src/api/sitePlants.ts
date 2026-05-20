import { apiFetch, readProblemDetails } from './client';

export interface SitePlant {
  id: string;
  gardenId: string;
  elementId: string;
  plantProfileId: string | null;
  plantName: string;
  establishedDate: string | null;
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

export async function listSitePlants(gardenId: string): Promise<SitePlant[]> {
  const res = await apiFetch(`/gardens/${gardenId}/site-plants`);
  await throwUnlessOk(res);
  return (await res.json()) as SitePlant[];
}

export async function createSitePlant(
  gardenId: string,
  body: {
    elementId: string;
    plantProfileId?: string | null;
    plantName?: string;
    establishedDate?: string | null;
    notes?: string | null;
  },
): Promise<SitePlant> {
  const res = await apiFetch(`/gardens/${gardenId}/site-plants`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await throwUnlessOk(res);
  return (await res.json()) as SitePlant;
}

export async function updateSitePlant(
  gardenId: string,
  sitePlantId: string,
  body: {
    elementId?: string;
    plantProfileId?: string | null;
    plantName?: string;
    establishedDate?: string | null;
    notes?: string | null;
  },
): Promise<SitePlant> {
  const res = await apiFetch(`/gardens/${gardenId}/site-plants/${sitePlantId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await throwUnlessOk(res);
  return (await res.json()) as SitePlant;
}

export async function deleteSitePlant(gardenId: string, sitePlantId: string): Promise<void> {
  const res = await apiFetch(`/gardens/${gardenId}/site-plants/${sitePlantId}`, { method: 'DELETE' });
  await throwUnlessOk(res);
}
