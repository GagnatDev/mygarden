import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { paramString } from '../../lib/route-params.js';
import type { AppContainer } from '../../config/container.js';
import { toPublicSeason } from '../../domain/season.js';
import { HttpError } from '../../middleware/problem-details.js';
import { createSeasonBodySchema, patchSeasonBodySchema } from './season.validation.js';

export function createSeasonsRouter(c: AppContainer): Router {
  const r = Router({ mergeParams: true });

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const seasons = await c.seasonService.listByGarden(gardenId);
      res.json(seasons.map(toPublicSeason));
    }),
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = createSeasonBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const { name, startDate, endDate, isActive } = parsed.data;
      const season = await c.seasonService.create(gardenId, {
        name,
        startDate,
        endDate,
        isActive,
      });
      res.status(201).json(toPublicSeason(season));
    }),
  );

  r.patch(
    '/:seasonId',
    asyncHandler(async (req, res) => {
      const parsed = patchSeasonBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const seasonId = paramString(req.params.seasonId, 'season id');
      const season = await c.seasonService.update(gardenId, seasonId, parsed.data);
      res.json(toPublicSeason(season));
    }),
  );

  r.delete(
    '/:seasonId',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const seasonId = paramString(req.params.seasonId, 'season id');
      await c.seasonService.delete(gardenId, seasonId);
      res.status(204).send();
    }),
  );

  return r;
}
