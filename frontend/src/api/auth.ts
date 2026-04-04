import { apiFetch, getApiBase, readProblemDetails } from './client';
import type { LoginResponse, RefreshResponse } from './types';
import { setAccessToken } from './token';

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<LoginResponse> {
  const res = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  if (!res.ok) {
    const detail = await readProblemDetails(res);
    throw new Error(detail ?? res.statusText);
  }
  const data = (await res.json()) as LoginResponse;
  setAccessToken(data.accessToken);
  return data;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const detail = await readProblemDetails(res);
    throw new Error(detail ?? res.statusText);
  }
  const data = (await res.json()) as LoginResponse;
  setAccessToken(data.accessToken);
  return data;
}

export async function refreshSession(): Promise<RefreshResponse | null> {
  const res = await fetch(`${getApiBase()}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    setAccessToken(null);
    return null;
  }
  const data = (await res.json()) as RefreshResponse;
  setAccessToken(data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  const res = await apiFetch('/auth/logout', { method: 'POST' });
  setAccessToken(null);
  if (!res.ok && res.status !== 204) {
    throw new Error('Logout failed');
  }
}
