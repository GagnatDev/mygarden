import { apiFetch, readProblemDetails } from './client';

export type PlantProfileType = 'vegetable' | 'herb' | 'flower' | 'berry' | 'tree_shrub';

export interface PlantProfile {
  id: string;
  userId: string;
  name: string;
  type: PlantProfileType;
  notes: string | null;
  images?: Array<{ id: string; url: string }>;
  createdAt: string;
  updatedAt: string;
}

async function throwUnlessOk(res: Response): Promise<void> {
  if (!res.ok) {
    const detail = await readProblemDetails(res);
    throw new Error(detail ?? res.statusText);
  }
}

export async function listPlantProfiles(): Promise<PlantProfile[]> {
  const res = await apiFetch('/plant-profiles');
  await throwUnlessOk(res);
  return (await res.json()) as PlantProfile[];
}

export async function createPlantProfile(body: {
  name: string;
  type: PlantProfileType;
  notes?: string | null;
}): Promise<PlantProfile> {
  const res = await apiFetch('/plant-profiles', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await throwUnlessOk(res);
  return (await res.json()) as PlantProfile;
}

export async function patchPlantProfile(
  profileId: string,
  patch: Partial<{ name: string; type: PlantProfileType; notes: string | null }>,
): Promise<PlantProfile> {
  const res = await apiFetch(`/plant-profiles/${profileId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  await throwUnlessOk(res);
  return (await res.json()) as PlantProfile;
}

export async function deletePlantProfile(profileId: string): Promise<void> {
  const res = await apiFetch(`/plant-profiles/${profileId}`, { method: 'DELETE' });
  await throwUnlessOk(res);
}

export async function uploadPlantProfileImage(profileId: string, file: File): Promise<PlantProfile> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await apiFetch(`/plant-profiles/${profileId}/images`, {
    method: 'POST',
    body: fd,
  });
  await throwUnlessOk(res);
  return (await res.json()) as PlantProfile;
}

export async function deletePlantProfileImage(profileId: string, imageId: string): Promise<PlantProfile> {
  const res = await apiFetch(`/plant-profiles/${profileId}/images/${imageId}`, {
    method: 'DELETE',
  });
  await throwUnlessOk(res);
  return (await res.json()) as PlantProfile;
}
