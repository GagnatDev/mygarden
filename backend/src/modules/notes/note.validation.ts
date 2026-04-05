import { z } from 'zod';
import { NOTE_TARGET_TYPES } from '../../domain/note.js';

export const createNoteBodySchema = z.object({
  seasonId: z.string().uuid(),
  targetType: z.enum(NOTE_TARGET_TYPES),
  targetId: z.string().uuid(),
  body: z.string().min(1).max(20_000),
});

export const patchNoteBodySchema = z.object({
  body: z.string().min(1).max(20_000),
});
