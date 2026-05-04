import { Router } from 'express';
import multer from 'multer';
import { isObjectStorageEnabled } from '../../config/object-storage.js';
import type { Env } from '../../config/env.js';
import type { AppContainer } from '../../config/container.js';
import { toPublicPlantProfile } from '../../domain/plant-profile.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { paramString } from '../../lib/route-params.js';
import { HttpError } from '../../middleware/problem-details.js';
import { requireAccessAuth } from '../auth/auth.middleware.js';
import { PLANT_PROFILE_IMAGE_MAX_BYTES } from './plant-profile-image.service.js';
import { createPlantProfileBodySchema, patchPlantProfileBodySchema } from './plant-profile.validation.js';

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PLANT_PROFILE_IMAGE_MAX_BYTES },
});

export function createPlantProfilesRouter(env: Env, c: AppContainer): Router {
  const r = Router();
  r.use(requireAccessAuth(env, c.authService));

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const list = await c.plantProfileService.listForUser(req.auth!.id);
      res.json(list.map(toPublicPlantProfile));
    }),
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = createPlantProfileBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const p = await c.plantProfileService.createForUser(req.auth!.id, {
        name: parsed.data.name,
        type: parsed.data.type,
        notes: parsed.data.notes ?? null,
      });
      res.status(201).json(toPublicPlantProfile(p));
    }),
  );

  r.patch(
    '/:profileId',
    asyncHandler(async (req, res) => {
      const parsed = patchPlantProfileBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const profileId = paramString(req.params.profileId, 'profile id');
      const p = await c.plantProfileService.updateForUser(req.auth!.id, profileId, parsed.data);
      res.json(toPublicPlantProfile(p));
    }),
  );

  r.delete(
    '/:profileId',
    asyncHandler(async (req, res) => {
      const profileId = paramString(req.params.profileId, 'profile id');
      await c.plantProfileService.deleteForUser(req.auth!.id, profileId);
      res.status(204).send();
    }),
  );

  r.post(
    '/:profileId/images',
    (req, res, next) => {
      imageUpload.single('file')(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          next(new HttpError(400, 'Image must be at most 10 MB', 'Bad Request'));
          return;
        }
        next(err as Error | undefined);
      });
    },
    asyncHandler(async (req, res) => {
      if (!isObjectStorageEnabled(env)) {
        throw new HttpError(
          503,
          'Plant profile image upload is not configured on this server',
          'Service Unavailable',
        );
      }
      const file = req.file;
      if (!file?.buffer) {
        throw new HttpError(400, 'Expected multipart file field "file"', 'Bad Request');
      }
      const profileId = paramString(req.params.profileId, 'profile id');
      const updated = await c.plantProfileImageService.uploadForUser(
        req.auth!.id,
        profileId,
        file.buffer,
        file.mimetype,
      );
      res.json(toPublicPlantProfile(updated));
    }),
  );

  r.delete(
    '/:profileId/images/:imageId',
    asyncHandler(async (req, res) => {
      const profileId = paramString(req.params.profileId, 'profile id');
      const imageId = paramString(req.params.imageId, 'image id');
      const updated = await c.plantProfileImageService.deleteImageForUser(req.auth!.id, profileId, imageId);
      res.json(toPublicPlantProfile(updated));
    }),
  );

  r.get(
    '/:profileId/images/:imageId',
    asyncHandler(async (req, res) => {
      const profileId = paramString(req.params.profileId, 'profile id');
      const imageId = paramString(req.params.imageId, 'image id');
      const obj = await c.plantProfileImageService.getImageObjectForUser(req.auth!.id, profileId, imageId);
      if (!obj) {
        throw new HttpError(404, 'Plant profile image not found', 'Not Found');
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

  return r;
}
