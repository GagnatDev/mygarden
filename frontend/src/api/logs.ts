import { apiFetch, readProblemDetails } from './client';

export type ActivityType =
  | 'sown_indoors'
  | 'sown_outdoors'
  | 'transplanted'
  | 'watered'
  | 'fertilized'
  | 'pruned'
  | 'harvested'
  | 'problem_noted';

export interface ActivityLog {
  id: string;
  gardenId: string;
  seasonId: string;
  plantingId: string | null;
  areaId: string | null;
  activity: ActivityType;
  date: string;
  note: string | null;
  quantity: number | null;
  createdBy: string;
  clientTimestamp: string;
  createdAt: string;
  updatedAt: string;
}

async function throwUnlessOk(res: Response): Promise<void> {
  if (!res.ok) {
    const detail = await readProblemDetails(res);
    throw new Error(detail ?? res.statusText);
  }
}

export async function listLogs(
  gardenId: string,
  seasonId: string,
  query?: { from?: string; to?: string },
): Promise<ActivityLog[]> {
  const q = new URLSearchParams({ seasonId });
  if (query?.from) q.set('from', query.from);
  if (query?.to) q.set('to', query.to);
  const res = await apiFetch(`/gardens/${gardenId}/logs?${q.toString()}`);
  await throwUnlessOk(res);
  return (await res.json()) as ActivityLog[];
}

export async function createLog(
  gardenId: string,
  body: {
    seasonId: string;
    plantingId?: string | null;
    areaId?: string | null;
    activity: ActivityType;
    date: string;
    note?: string | null;
    quantity?: number | null;
    clientTimestamp: string;
  },
): Promise<ActivityLog> {
  const res = await apiFetch(`/gardens/${gardenId}/logs`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await throwUnlessOk(res);
  return (await res.json()) as ActivityLog;
}
