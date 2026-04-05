import { Router } from 'express';
import type { AppContainer } from '../../config/container.js';
import { toPublicPlanting } from '../../domain/planting.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { paramString } from '../../lib/route-params.js';
import { HttpError } from '../../middleware/problem-details.js';
import { createPlantingBodySchema, patchPlantingBodySchema } from './planting.validation.js';

export function createPlantingsRouter(c: AppContainer): Router {
  const r = Router({ mergeParams: true });

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const seasonId = typeof req.query.seasonId === 'string' ? req.query.seasonId : '';
      if (!seasonId) {
        throw new HttpError(400, 'seasonId query parameter is required', 'Bad Request');
      }
      const list = await c.plantingService.list(gardenId, seasonId);
      res.json(list.map(toPublicPlanting));
    }),
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = createPlantingBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const planting = await c.plantingService.create(gardenId, req.auth!.id, {
        seasonId: parsed.data.seasonId,
        areaId: parsed.data.areaId,
        plantProfileId: parsed.data.plantProfileId,
        plantName: parsed.data.plantName,
        sowingMethod: parsed.data.sowingMethod,
        indoorSowDate: parsed.data.indoorSowDate ?? null,
        transplantDate: parsed.data.transplantDate ?? null,
        outdoorSowDate: parsed.data.outdoorSowDate ?? null,
        harvestWindowStart: parsed.data.harvestWindowStart ?? null,
        harvestWindowEnd: parsed.data.harvestWindowEnd ?? null,
        quantity: parsed.data.quantity ?? null,
        notes: parsed.data.notes ?? null,
      });
      res.status(201).json(toPublicPlanting(planting));
    }),
  );

  r.patch(
    '/:plantingId',
    asyncHandler(async (req, res) => {
      const parsed = patchPlantingBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const plantingId = paramString(req.params.plantingId, 'planting id');
      const planting = await c.plantingService.update(gardenId, req.auth!.id, plantingId, parsed.data);
      res.json(toPublicPlanting(planting));
    }),
  );

  r.delete(
    '/:plantingId',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const plantingId = paramString(req.params.plantingId, 'planting id');
      await c.plantingService.delete(gardenId, plantingId);
      res.status(204).send();
    }),
  );

  return r;
}
