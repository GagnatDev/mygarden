import { Router } from 'express';
import type { Env } from '../../config/env.js';
import type { AppContainer } from '../../config/container.js';
import { toPublicPlantProfile } from '../../domain/plant-profile.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { paramString } from '../../lib/route-params.js';
import { HttpError } from '../../middleware/problem-details.js';
import { requireAccessAuth } from '../auth/auth.middleware.js';
import { createPlantProfileBodySchema, patchPlantProfileBodySchema } from './plant-profile.validation.js';

export function createPlantProfilesRouter(env: Env, c: AppContainer): Router {
  const r = Router();
  r.use(requireAccessAuth(env, c.authService));

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const list = await c.plantProfileService.listForUser(req.auth!.id);
      res.json(list.map(toPublicPlantProfile));
    }),
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = createPlantProfileBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const p = await c.plantProfileService.createForUser(req.auth!.id, {
        name: parsed.data.name,
        type: parsed.data.type,
        notes: parsed.data.notes ?? null,
      });
      res.status(201).json(toPublicPlantProfile(p));
    }),
  );

  r.patch(
    '/:profileId',
    asyncHandler(async (req, res) => {
      const parsed = patchPlantProfileBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const profileId = paramString(req.params.profileId, 'profile id');
      const p = await c.plantProfileService.updateForUser(req.auth!.id, profileId, parsed.data);
      res.json(toPublicPlantProfile(p));
    }),
  );

  r.delete(
    '/:profileId',
    asyncHandler(async (req, res) => {
      const profileId = paramString(req.params.profileId, 'profile id');
      await c.plantProfileService.deleteForUser(req.auth!.id, profileId);
      res.status(204).send();
    }),
  );

  return r;
}
