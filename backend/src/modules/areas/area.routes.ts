import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { paramString } from '../../lib/route-params.js';
import type { AppContainer } from '../../config/container.js';
import { toPublicArea } from '../../domain/area.js';
import { HttpError } from '../../middleware/problem-details.js';
import { createAreaBodySchema, patchAreaBodySchema } from './area.validation.js';

export function createAreasRouter(c: AppContainer): Router {
  const r = Router({ mergeParams: true });

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const areas = await c.areaService.listByGarden(gardenId);
      res.json(areas.map(toPublicArea));
    }),
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = createAreaBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const area = await c.areaService.create(gardenId, parsed.data);
      res.status(201).json(toPublicArea(area));
    }),
  );

  r.patch(
    '/:areaId',
    asyncHandler(async (req, res) => {
      const parsed = patchAreaBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const areaId = paramString(req.params.areaId, 'area id');
      const area = await c.areaService.update(gardenId, areaId, parsed.data);
      res.json(toPublicArea(area));
    }),
  );

  r.delete(
    '/:areaId',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const areaId = paramString(req.params.areaId, 'area id');
      await c.areaService.delete(gardenId, areaId);
      res.status(204).send();
    }),
  );

  return r;
}
