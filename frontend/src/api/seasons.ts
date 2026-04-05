import { apiFetch, readProblemDetails } from './client';
import type { Area, Season } from './gardens';
import type { ActivityLog } from './logs';
import type { Note } from './notes';
import type { Planting } from './plantings';

export type { Season };

export interface SeasonSnapshot {
  season: Season;
  areas: Area[];
  plantings: Planting[];
  logs: ActivityLog[];
  notes: Note[];
}

async function throwUnlessOk(res: Response): Promise<void> {
  if (res.status === 202) {
    const j = (await res.json().catch(() => null)) as { queued?: boolean } | null;
    if (j?.queued) return;
  }
  if (!res.ok) {
    const detail = await readProblemDetails(res);
    throw new Error(detail ?? res.statusText);
  }
}

export async function getSeasonSnapshot(gardenId: string, seasonId: string): Promise<SeasonSnapshot> {
  const res = await apiFetch(`/gardens/${gardenId}/seasons/${seasonId}`);
  await throwUnlessOk(res);
  return (await res.json()) as SeasonSnapshot;
}

export async function archiveSeason(
  gardenId: string,
  seasonId: string,
  body?: { name?: string; startDate?: string; endDate?: string },
): Promise<{ archived: Season; newActiveSeason: Season } | { queued: true }> {
  const res = await apiFetch(`/gardens/${gardenId}/seasons/${seasonId}/archive`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
  await throwUnlessOk(res);
  if (res.status === 202) return { queued: true };
  return (await res.json()) as { archived: Season; newActiveSeason: Season };
}
