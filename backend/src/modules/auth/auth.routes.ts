import { Router } from 'express';
import type { Env } from '../../config/env.js';
import { asyncHandler } from '../../lib/async-handler.js';
import {
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
} from '../../lib/refresh-cookie.js';
import { createAuthRateLimiters } from '../../middleware/auth-rate-limit.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { AppContainer } from '../../config/container.js';
import { loginBodySchema, registerBodySchema } from './auth.validation.js';
import { requireAccessAuth } from './auth.middleware.js';

function parseJsonBody<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    throw new HttpError(400, 'Invalid request body', 'Bad Request', 'about:blank');
  }
  return r.data;
}

export function createAuthRouter(env: Env, c: AppContainer): Router {
  const r = Router();
  const auth = c.authService;
  const rl = createAuthRateLimiters(env);

  r.post(
    '/register',
    rl.register,
    asyncHandler(async (req, res) => {
      const body = parseJsonBody(registerBodySchema, req.body);
      const result = await auth.register(body.email, body.password, body.displayName);
      setRefreshCookie(res, env, result.refreshToken);
      res.status(201).json({
        accessToken: result.accessToken,
        user: result.user,
      });
    }),
  );

  r.post(
    '/login',
    rl.login,
    asyncHandler(async (req, res) => {
      const body = parseJsonBody(loginBodySchema, req.body);
      const result = await auth.login(body.email, body.password);
      setRefreshCookie(res, env, result.refreshToken);
      res.json({
        accessToken: result.accessToken,
        user: result.user,
      });
    }),
  );

  r.post(
    '/refresh',
    rl.refresh,
    asyncHandler(async (req, res) => {
      const raw = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
      const result = await auth.refresh(raw);
      setRefreshCookie(res, env, result.refreshToken);
      res.json({ accessToken: result.accessToken });
    }),
  );

  r.post(
    '/logout',
    rl.logout,
    requireAccessAuth(env, auth),
    asyncHandler(async (req, res) => {
      await auth.logout(req.auth!.id);
      clearRefreshCookie(res, env);
      res.status(204).send();
    }),
  );

  return r;
}
