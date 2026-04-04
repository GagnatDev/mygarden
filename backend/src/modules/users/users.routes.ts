import { Router } from 'express';
import type { Env } from '../../config/env.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { toPublicUser } from '../../domain/user.js';
import type { AppContainer } from '../../config/container.js';
import { HttpError } from '../../middleware/problem-details.js';
import { requireAccessAuth } from '../auth/auth.middleware.js';
import { patchMeBodySchema } from './users.validation.js';

export function createUsersRouter(env: Env, c: AppContainer): Router {
  const r = Router();
  r.use(requireAccessAuth(env, c.authService));

  r.get(
    '/me',
    asyncHandler(async (req, res) => {
      const user = await c.userRepo.findById(req.auth!.id);
      if (!user) {
        throw new HttpError(404, 'User not found', 'Not Found');
      }
      res.json(toPublicUser(user));
    }),
  );

  r.patch(
    '/me',
    asyncHandler(async (req, res) => {
      const parsed = patchMeBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const { displayName, language } = parsed.data;
      const patch: { displayName?: string; language?: 'nb' | 'en' } = {};
      if (displayName !== undefined) patch.displayName = displayName;
      if (language !== undefined) patch.language = language;

      const updated = await c.userRepo.update(req.auth!.id, patch);
      if (!updated) {
        throw new HttpError(404, 'User not found', 'Not Found');
      }
      res.json(toPublicUser(updated));
    }),
  );

  return r;
}
