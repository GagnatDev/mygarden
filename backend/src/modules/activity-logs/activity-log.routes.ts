import { Router } from 'express';
import type { AppContainer } from '../../config/container.js';
import { toPublicActivityLog } from '../../domain/activity-log.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { paramString } from '../../lib/route-params.js';
import { HttpError } from '../../middleware/problem-details.js';
import { createActivityLogBodySchema, patchActivityLogBodySchema } from './activity-log.validation.js';

export function createActivityLogsRouter(c: AppContainer): Router {
  const r = Router({ mergeParams: true });

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const seasonId = typeof req.query.seasonId === 'string' ? req.query.seasonId : '';
      if (!seasonId) {
        throw new HttpError(400, 'seasonId query parameter is required', 'Bad Request');
      }
      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;
      if (typeof req.query.from === 'string' && req.query.from) {
        dateFrom = new Date(req.query.from);
      }
      if (typeof req.query.to === 'string' && req.query.to) {
        dateTo = new Date(req.query.to);
      }
      const list = await c.activityLogService.list(gardenId, seasonId, { dateFrom, dateTo });
      res.json(list.map(toPublicActivityLog));
    }),
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = createActivityLogBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const log = await c.activityLogService.create(gardenId, req.auth!.id, {
        seasonId: parsed.data.seasonId,
        plantingId: parsed.data.plantingId ?? null,
        areaId: parsed.data.areaId ?? null,
        activity: parsed.data.activity,
        date: parsed.data.date,
        note: parsed.data.note ?? null,
        quantity: parsed.data.quantity ?? null,
        clientTimestamp: parsed.data.clientTimestamp,
      });
      res.status(201).json(toPublicActivityLog(log));
    }),
  );

  r.patch(
    '/:logId',
    asyncHandler(async (req, res) => {
      const parsed = patchActivityLogBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const logId = paramString(req.params.logId, 'log id');
      const log = await c.activityLogService.patchNote(
        gardenId,
        logId,
        parsed.data.note,
        parsed.data.clientTimestamp,
      );
      res.json(toPublicActivityLog(log));
    }),
  );

  return r;
}
