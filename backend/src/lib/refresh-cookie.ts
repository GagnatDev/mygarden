import type { Response } from 'express';
import type { Env } from '../config/env.js';
import { compactDurationToMs } from './compact-duration.js';

export const REFRESH_COOKIE_NAME = 'refresh_token';

/** Best-effort maxAge from REFRESH_TOKEN_EXPIRES (e.g. 7d, 24h). Defaults to 7 days. */
export function refreshCookieMaxAgeMs(expiresIn: string): number {
  const ms = compactDurationToMs(expiresIn);
  if (ms === null) return 7 * 24 * 60 * 60 * 1000;
  return ms;
}

export function setRefreshCookie(res: Response, env: Env, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: refreshCookieMaxAgeMs(env.REFRESH_TOKEN_EXPIRES),
  });
}

export function clearRefreshCookie(res: Response, env: Env): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}
