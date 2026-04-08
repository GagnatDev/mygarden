import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import type { Env } from '../../config/env.js';
import type { AppContainer } from '../../config/container.js';
import { isObjectStorageEnabled } from '../../config/object-storage.js';
import { toPublicGarden } from '../../domain/garden.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { paramString } from '../../lib/route-params.js';
import { HttpError } from '../../middleware/problem-details.js';
import { GARDEN_BACKGROUND_MAX_BYTES } from './garden-background.service.js';
import { requireAccessAuth } from '../auth/auth.middleware.js';
import { createActivityLogsRouter } from '../activity-logs/activity-log.routes.js';
import { createAreasRouter } from '../areas/area.routes.js';
import { createNotesRouter } from '../notes/note.routes.js';
import { createPlantingsRouter } from '../plantings/planting.routes.js';
import { createSeasonsRouter } from '../seasons/season.routes.js';
import { createTasksRouter } from '../tasks/task.routes.js';
import { requireGardenMember } from './garden.middleware.js';
import { createGardenBodySchema, patchGardenBodySchema } from './garden.validation.js';

const backgroundUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: GARDEN_BACKGROUND_MAX_BYTES },
});

function backgroundUploadMiddleware(req: Request, res: Response, next: NextFunction) {
  backgroundUpload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      next(new HttpError(400, 'Image must be at most 10 MB', 'Bad Request'));
      return;
    }
    next(err as Error | undefined);
  });
}

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

  scoped.get(
    '/background-image',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const obj = await c.gardenBackgroundService.getObjectForGarden(gardenId);
      if (!obj) {
        throw new HttpError(404, 'No background image', 'Not Found');
      }
      const ifNoneMatch = req.headers['if-none-match'];
      if (obj.etag && ifNoneMatch && ifNoneMatch === obj.etag) {
        res.status(304).end();
        return;
      }
      res.setHeader('Content-Type', obj.contentType);
      res.setHeader('Cache-Control', 'private, max-age=60');
      if (obj.etag) {
        res.setHeader('ETag', obj.etag);
      }
      obj.stream.on('error', () => {
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
      obj.stream.pipe(res);
    }),
  );

  scoped.put(
    '/background-image',
    backgroundUploadMiddleware,
    asyncHandler(async (req, res) => {
      if (!isObjectStorageEnabled(env)) {
        throw new HttpError(
          503,
          'Background image upload is not configured on this server',
          'Service Unavailable',
        );
      }
      const file = req.file;
      if (!file?.buffer) {
        throw new HttpError(400, 'Expected multipart file field "file"', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const garden = await c.gardenBackgroundService.upload(gardenId, file.buffer, file.mimetype);
      res.json(toPublicGarden(garden));
    }),
  );

  scoped.delete(
    '/background-image',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const garden = await c.gardenBackgroundService.remove(gardenId);
      res.json(toPublicGarden(garden));
    }),
  );

  scoped.use('/areas', createAreasRouter(c));
  scoped.use('/seasons', createSeasonsRouter(c));
  scoped.use('/plantings', createPlantingsRouter(c));
  scoped.use('/tasks', createTasksRouter(c));
  scoped.use('/logs', createActivityLogsRouter(c));
  scoped.use('/notes', createNotesRouter(c));

  r.use('/:gardenId', scoped);

  return r;
}
