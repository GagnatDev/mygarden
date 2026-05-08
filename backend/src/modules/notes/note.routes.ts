import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import type { Env } from '../../config/env.js';
import type { AppContainer } from '../../config/container.js';
import { isObjectStorageEnabled } from '../../config/object-storage.js';
import { NOTE_TARGET_TYPES, type NoteTargetType, toPublicNote } from '../../domain/note.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { paramString } from '../../lib/route-params.js';
import { HttpError } from '../../middleware/problem-details.js';
import { NOTE_PHOTO_MAX_BYTES } from './note.service.js';
import { createNoteBodySchema, patchNoteBodySchema } from './note.validation.js';

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: NOTE_PHOTO_MAX_BYTES },
});

function photoUploadMiddleware(req: Request, res: Response, next: NextFunction) {
  photoUpload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      next(new HttpError(400, 'Image must be at most 10 MB', 'Bad Request'));
      return;
    }
    next(err as Error | undefined);
  });
}

export function createNotesRouter(env: Env, c: AppContainer): Router {
  const r = Router({ mergeParams: true });

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const seasonId = typeof req.query.seasonId === 'string' ? req.query.seasonId : '';
      if (!seasonId) {
        throw new HttpError(400, 'seasonId query parameter is required', 'Bad Request');
      }
      const tt = typeof req.query.targetType === 'string' ? req.query.targetType : undefined;
      const targetType: NoteTargetType | undefined =
        tt && NOTE_TARGET_TYPES.includes(tt as NoteTargetType) ? (tt as NoteTargetType) : undefined;
      const targetId = typeof req.query.targetId === 'string' ? req.query.targetId : undefined;
      if (req.query.targetType && !targetType) {
        throw new HttpError(400, 'Invalid targetType', 'Bad Request');
      }
      if (targetId && !targetType) {
        throw new HttpError(400, 'targetId requires targetType', 'Bad Request');
      }
      const list = await c.noteService.list(gardenId, seasonId, { targetType, targetId });
      res.json(list.map(toPublicNote));
    }),
  );

  r.get(
    '/:noteId/photo',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const noteId = paramString(req.params.noteId, 'note id');
      const n = await c.noteService.getByIdInGarden(gardenId, noteId);
      if (!n.photo) {
        throw new HttpError(404, 'No photo', 'Not Found');
      }
      const obj = await c.noteService.getPhotoObject(n.photo.objectKey);
      if (!obj) {
        throw new HttpError(404, 'Photo not found', 'Not Found');
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

  r.post(
    '/:noteId/photo',
    photoUploadMiddleware,
    asyncHandler(async (req, res) => {
      if (!isObjectStorageEnabled(env)) {
        throw new HttpError(503, 'Note photo upload is not configured on this server', 'Service Unavailable');
      }
      const file = req.file;
      if (!file?.buffer) {
        throw new HttpError(400, 'Expected multipart file field "file"', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const noteId = paramString(req.params.noteId, 'note id');
      const updated = await c.noteService.uploadPhoto(gardenId, req.auth!.id, noteId, file.buffer, file.mimetype);
      res.json(toPublicNote(updated));
    }),
  );

  r.delete(
    '/:noteId/photo',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const noteId = paramString(req.params.noteId, 'note id');
      const updated = await c.noteService.removePhoto(gardenId, req.auth!.id, noteId);
      res.json(toPublicNote(updated));
    }),
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = createNoteBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const note = await c.noteService.create(gardenId, req.auth!.id, parsed.data);
      res.status(201).json(toPublicNote(note));
    }),
  );

  r.patch(
    '/:noteId',
    asyncHandler(async (req, res) => {
      const parsed = patchNoteBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Invalid body', 'Bad Request');
      }
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const noteId = paramString(req.params.noteId, 'note id');
      const note = await c.noteService.update(gardenId, req.auth!.id, noteId, parsed.data.body);
      res.json(toPublicNote(note));
    }),
  );

  r.delete(
    '/:noteId',
    asyncHandler(async (req, res) => {
      const gardenId = paramString(req.params.gardenId, 'garden id');
      const noteId = paramString(req.params.noteId, 'note id');
      await c.noteService.delete(gardenId, req.auth!.id, noteId);
      res.status(204).send();
    }),
  );

  return r;
}
