import { apiFetch, readProblemDetails } from './client';

export type TaskStatus = 'pending' | 'done' | 'skipped';
export type TaskSource = 'auto' | 'manual';

export interface GardenTask {
  id: string;
  gardenId: string;
  seasonId: string;
  plantingId: string | null;
  areaId: string | null;
  title: string;
  dueDate: string;
  source: TaskSource;
  status: TaskStatus;
  completedAt: string | null;
  completedBy: string | null;
  linkedLogId: string | null;
  autoKind: string | null;
  createdAt: string;
  updatedAt: string;
}

async function throwUnlessOk(res: Response): Promise<void> {
  if (!res.ok) {
    const detail = await readProblemDetails(res);
    throw new Error(detail ?? res.statusText);
  }
}

export async function listTasks(
  gardenId: string,
  seasonId: string,
  query?: { status?: TaskStatus; dueFrom?: string; dueTo?: string },
): Promise<GardenTask[]> {
  const q = new URLSearchParams({ seasonId });
  if (query?.status) q.set('status', query.status);
  if (query?.dueFrom) q.set('dueFrom', query.dueFrom);
  if (query?.dueTo) q.set('dueTo', query.dueTo);
  const res = await apiFetch(`/gardens/${gardenId}/tasks?${q.toString()}`);
  await throwUnlessOk(res);
  return (await res.json()) as GardenTask[];
}

export async function createManualTask(
  gardenId: string,
  body: { seasonId: string; title: string; dueDate: string; areaId?: string | null },
): Promise<GardenTask> {
  const res = await apiFetch(`/gardens/${gardenId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await throwUnlessOk(res);
  return (await res.json()) as GardenTask;
}

export async function patchTask(
  gardenId: string,
  taskId: string,
  patch: {
    status?: TaskStatus;
    title?: string;
    dueDate?: string;
    createLinkedLog?: boolean;
  },
): Promise<GardenTask> {
  const res = await apiFetch(`/gardens/${gardenId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  await throwUnlessOk(res);
  return (await res.json()) as GardenTask;
}
