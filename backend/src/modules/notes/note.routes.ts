import { Router } from 'express';
import type { AppContainer } from '../../config/container.js';
import { NOTE_TARGET_TYPES, type NoteTargetType, toPublicNote } from '../../domain/note.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { paramString } from '../../lib/route-params.js';
import { HttpError } from '../../middleware/problem-details.js';
import { createNoteBodySchema, patchNoteBodySchema } from './note.validation.js';

export function createNotesRouter(c: AppContainer): Router {
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
