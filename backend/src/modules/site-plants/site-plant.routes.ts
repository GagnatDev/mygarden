import { Router } from 'express';
import type { AppContainer } from '../../config/container.js';
import { toPublicSitePlant } from '../../domain/site-plant.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { paramString } from '../../lib/route-params.js';
import { HttpError } from '../../middleware/problem-details.js';
import { createSitePlantBodySchema, patchSitePlantBodySchema } from './site-plant.validation.js';
import type { SitePlantService } from './site-plant.service.js';

export function createSitePlantsRouter(c: AppContainer): Router {
  const r = Router({ mergeParams: true });

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const list = await c.sitePlantService.listByGarden(gardenId);
      res.json(list.map(toPublicSitePlant));
    }),
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = createSitePlantBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const sp = await c.sitePlantService.create(gardenId, req.auth!.id, {
        elementId: parsed.data.elementId,
        plantProfileId: parsed.data.plantProfileId,
        plantName: parsed.data.plantName,
        establishedDate: parsed.data.establishedDate ?? null,
        notes: parsed.data.notes ?? null,
      });
      res.status(201).json(toPublicSitePlant(sp));
    }),
  );

  r.patch(
    '/:sitePlantId',
    asyncHandler(async (req, res) => {
      const parsed = patchSitePlantBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const sitePlantId = paramString(req.params.sitePlantId, 'site plant id');
      const d = parsed.data;
      const patch: Parameters<SitePlantService['update']>[3] = {};
      if (d.elementId !== undefined) patch.elementId = d.elementId;
      if (d.plantProfileId !== undefined) patch.plantProfileId = d.plantProfileId ?? null;
      if (d.plantName !== undefined) patch.plantName = d.plantName;
      if (d.establishedDate !== undefined) patch.establishedDate = d.establishedDate;
      if (d.notes !== undefined) patch.notes = d.notes ?? null;
      const sp = await c.sitePlantService.update(gardenId, req.auth!.id, sitePlantId, patch);
      res.json(toPublicSitePlant(sp));
    }),
  );

  r.delete(
    '/:sitePlantId',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const sitePlantId = paramString(req.params.sitePlantId, 'site plant id');
      await c.sitePlantService.delete(gardenId, sitePlantId);
      res.status(204).send();
    }),
  );

  return r;
}
