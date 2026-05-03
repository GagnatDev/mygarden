import { apiFetch, readProblemDetails } from './client';

export type NoteTargetType = 'planting' | 'element' | 'season';

export interface Note {
  id: string;
  gardenId: string;
  seasonId: string;
  targetType: NoteTargetType;
  targetId: string;
  body: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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

export async function listNotes(
  gardenId: string,
  seasonId: string,
  filters?: { targetType?: NoteTargetType; targetId?: string },
): Promise<Note[]> {
  const q = new URLSearchParams({ seasonId });
  if (filters?.targetType) q.set('targetType', filters.targetType);
  if (filters?.targetId) q.set('targetId', filters.targetId);
  const res = await apiFetch(`/gardens/${gardenId}/notes?${q.toString()}`);
  await throwUnlessOk(res);
  return (await res.json()) as Note[];
}

export async function createNote(
  gardenId: string,
  body: { seasonId: string; targetType: NoteTargetType; targetId: string; body: string },
): Promise<Note | { queued: true }> {
  const res = await apiFetch(`/gardens/${gardenId}/notes`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await throwUnlessOk(res);
  if (res.status === 202) return { queued: true };
  return (await res.json()) as Note;
}

export async function patchNote(gardenId: string, noteId: string, body: string): Promise<Note | { queued: true }> {
  const res = await apiFetch(`/gardens/${gardenId}/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  });
  await throwUnlessOk(res);
  if (res.status === 202) return { queued: true };
  return (await res.json()) as Note;
}

export async function deleteNote(gardenId: string, noteId: string): Promise<void | { queued: true }> {
  const res = await apiFetch(`/gardens/${gardenId}/notes/${noteId}`, { method: 'DELETE' });
  await throwUnlessOk(res);
  if (res.status === 202) return { queued: true };
}
