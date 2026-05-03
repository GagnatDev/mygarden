import { Router } from 'express';
import type { AppContainer } from '../../config/container.js';
import { TASK_STATUSES, toPublicTask } from '../../domain/task.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { paramString } from '../../lib/route-params.js';
import { HttpError } from '../../middleware/problem-details.js';
import { createManualTaskBodySchema, patchTaskBodySchema } from './task.validation.js';

export function createTasksRouter(c: AppContainer): Router {
  const r = Router({ mergeParams: true });

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const seasonId = typeof req.query.seasonId === 'string' ? req.query.seasonId : '';
      if (!seasonId) {
        throw new HttpError(400, 'seasonId query parameter is required', 'Bad Request');
      }
      const statusParam = typeof req.query.status === 'string' ? req.query.status : undefined;
      const status =
        statusParam && (TASK_STATUSES as readonly string[]).includes(statusParam)
          ? (statusParam as (typeof TASK_STATUSES)[number])
          : undefined;
      let dueFrom: Date | undefined;
      let dueTo: Date | undefined;
      if (typeof req.query.dueFrom === 'string' && req.query.dueFrom) {
        dueFrom = new Date(req.query.dueFrom);
      }
      if (typeof req.query.dueTo === 'string' && req.query.dueTo) {
        dueTo = new Date(req.query.dueTo);
      }
      const list = await c.taskService.list(gardenId, seasonId, { status, dueFrom, dueTo });
      res.json(list.map(toPublicTask));
    }),
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = createManualTaskBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const task = await c.taskService.createManual(gardenId, {
        seasonId: parsed.data.seasonId,
        title: parsed.data.title,
        dueDate: parsed.data.dueDate,
        elementId: parsed.data.elementId ?? null,
      });
      res.status(201).json(toPublicTask(task));
    }),
  );

  r.patch(
    '/:taskId',
    asyncHandler(async (req, res) => {
      const parsed = patchTaskBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const taskId = paramString(req.params.taskId, 'task id');
      const task = await c.taskService.updateTask(gardenId, req.auth!.id, taskId, parsed.data);
      res.json(toPublicTask(task));
    }),
  );

  return r;
}
