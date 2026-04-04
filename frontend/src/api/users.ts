import { apiFetch, readProblemDetails } from './client';
import type { PublicUser, UserLanguage } from './types';

export async function getMe(): Promise<PublicUser> {
  const res = await apiFetch('/users/me');
  if (!res.ok) {
    const detail = await readProblemDetails(res);
    throw new Error(detail ?? res.statusText);
  }
  return (await res.json()) as PublicUser;
}

export async function patchMe(patch: {
  displayName?: string;
  language?: UserLanguage;
}): Promise<PublicUser> {
  const res = await apiFetch('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const detail = await readProblemDetails(res);
    throw new Error(detail ?? res.statusText);
  }
  return (await res.json()) as PublicUser;
}
