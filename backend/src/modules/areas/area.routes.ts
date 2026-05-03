import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import type { Env } from '../../config/env.js';
import type { AppContainer } from '../../config/container.js';
import { isObjectStorageEnabled } from '../../config/object-storage.js';
import { toPublicArea } from '../../domain/area.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { paramString } from '../../lib/route-params.js';
import { HttpError } from '../../middleware/problem-details.js';
import { createElementsRouter } from '../elements/element.routes.js';
import { AREA_BACKGROUND_MAX_BYTES } from './area-background.service.js';
import { createAreaBodySchema, patchAreaBodySchema } from './area.validation.js';

const backgroundUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AREA_BACKGROUND_MAX_BYTES },
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

export function createAreasRouter(env: Env, c: AppContainer): Router {
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

  r.get(
    '/:areaId',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const areaId = paramString(req.params.areaId, 'area id');
      const area = await c.areaService.getInGarden(gardenId, areaId);
      res.json(toPublicArea(area));
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

  r.get(
    '/:areaId/background-image',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const areaId = paramString(req.params.areaId, 'area id');
      const obj = await c.areaBackgroundService.getObjectForArea(gardenId, areaId);
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

  r.put(
    '/:areaId/background-image',
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
      const areaId = paramString(req.params.areaId, 'area id');
      const area = await c.areaBackgroundService.upload(gardenId, areaId, file.buffer, file.mimetype);
      res.json(toPublicArea(area));
    }),
  );

  r.delete(
    '/:areaId/background-image',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const areaId = paramString(req.params.areaId, 'area id');
      const area = await c.areaBackgroundService.remove(gardenId, areaId);
      res.json(toPublicArea(area));
    }),
  );

  r.use('/:areaId/elements', createElementsRouter(c));

  return r;
}
