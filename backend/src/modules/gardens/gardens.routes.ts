import { Router } from 'express';
import type { Env } from '../../config/env.js';
import type { AppContainer } from '../../config/container.js';
import { toPublicGarden } from '../../domain/garden.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { paramString } from '../../lib/route-params.js';
import { HttpError } from '../../middleware/problem-details.js';
import { requireAccessAuth } from '../auth/auth.middleware.js';
import { createActivityLogsRouter } from '../activity-logs/activity-log.routes.js';
import { createAreasRouter } from '../areas/area.routes.js';
import { createNotesRouter } from '../notes/note.routes.js';
import { createPlantingsRouter } from '../plantings/planting.routes.js';
import { createSeasonsRouter } from '../seasons/season.routes.js';
import { createTasksRouter } from '../tasks/task.routes.js';
import { requireGardenMember } from './garden.middleware.js';
import { createGardenBodySchema, patchGardenBodySchema } from './garden.validation.js';

export function createGardensRouter(env: Env, c: AppContainer): Router {
  const r = Router();
  r.use(requireAccessAuth(env, c.authService));

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const gardens = await c.gardenService.listForUser(req.auth!.id);
      res.json(gardens.map(toPublicGarden));
    }),
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = createGardenBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const garden = await c.gardenService.createForUser(req.auth!.id, parsed.data);
      res.status(201).json(toPublicGarden(garden));
    }),
  );

  const scoped = Router({ mergeParams: true });
  scoped.use(requireGardenMember(c));

  scoped.get(
    '/',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const garden = await c.gardenService.getForMember(gardenId, req.auth!.id);
      res.json(toPublicGarden(garden));
    }),
  );

  scoped.patch(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = patchGardenBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const garden = await c.gardenService.updateForMember(gardenId, req.auth!.id, parsed.data);
      res.json(toPublicGarden(garden));
    }),
  );

  scoped.delete(
    '/',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      await c.gardenService.deleteAsOwner(gardenId, req.auth!.id);
      res.status(204).send();
    }),
  );

  scoped.use('/areas', createAreasRouter(env, c));
  scoped.use('/seasons', createSeasonsRouter(c));
  scoped.use('/plantings', createPlantingsRouter(c));
  scoped.use('/tasks', createTasksRouter(c));
  scoped.use('/logs', createActivityLogsRouter(c));
  scoped.use('/notes', createNotesRouter(c));

  r.use('/:gardenId', scoped);

  return r;
}
