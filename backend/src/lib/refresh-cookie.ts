import type { Response } from 'express';
import type { Env } from '../config/env.js';

export const REFRESH_COOKIE_NAME = 'refresh_token';

/** Best-effort maxAge from REFRESH_TOKEN_EXPIRES (e.g. 7d, 24h). Defaults to 7 days. */
export function refreshCookieMaxAgeMs(expiresIn: string): number {
  const m = /^(\d+)([smhd])$/i.exec(expiresIn.trim());
  if (!m?.[1] || !m[2]) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const mult =
    u === 's' ? 1000 : u === 'm' ? 60_000 : u === 'h' ? 3_600_000 : 24 * 3_600_000;
  return n * mult;
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
