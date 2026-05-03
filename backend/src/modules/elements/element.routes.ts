import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { paramString } from '../../lib/route-params.js';
import type { AppContainer } from '../../config/container.js';
import { toPublicElement } from '../../domain/element.js';
import { HttpError } from '../../middleware/problem-details.js';
import { createElementBodySchema, patchElementBodySchema } from './element.validation.js';

export function createElementsRouter(c: AppContainer): Router {
  const r = Router({ mergeParams: true });

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const areaId = paramString(req.params.areaId, 'area id');
      const list = await c.elementService.listByArea(gardenId, areaId);
      res.json(list.map(toPublicElement));
    }),
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = createElementBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const areaId = paramString(req.params.areaId, 'area id');
      const element = await c.elementService.create(gardenId, areaId, parsed.data);
      res.status(201).json(toPublicElement(element));
    }),
  );

  r.patch(
    '/:elementId',
    asyncHandler(async (req, res) => {
      const parsed = patchElementBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const areaId = paramString(req.params.areaId, 'area id');
      const elementId = paramString(req.params.elementId, 'element id');
      const element = await c.elementService.update(gardenId, areaId, elementId, parsed.data);
      res.json(toPublicElement(element));
    }),
  );

  r.delete(
    '/:elementId',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const areaId = paramString(req.params.areaId, 'area id');
      const elementId = paramString(req.params.elementId, 'element id');
      await c.elementService.delete(gardenId, areaId, elementId);
      res.status(204).send();
    }),
  );

  return r;
}
