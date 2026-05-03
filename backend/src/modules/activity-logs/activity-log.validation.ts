import { z } from 'zod';
import { ACTIVITY_TYPES } from '../../domain/activity-log.js';

const dateField = z.union([z.coerce.date(), z.string().datetime()]).transform((v) => new Date(v));

export const createActivityLogBodySchema = z
  .object({
    seasonId: z.string().uuid(),
    plantingId: z.string().uuid().nullish(),
    elementId: z.string().uuid().nullish(),
    activity: z.enum(ACTIVITY_TYPES),
    date: dateField,
    note: z.string().nullable().optional(),
    quantity: z.number().optional().nullable(),
    clientTimestamp: dateField,
  })
  .superRefine((data, ctx) => {
    const hasPlanting = data.plantingId != null && data.plantingId !== '';
    const hasElement = data.elementId != null && data.elementId !== '';
    if (!hasPlanting && !hasElement) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either plantingId or elementId must be set',
        path: ['plantingId'],
      });
    }
  });

export const patchActivityLogBodySchema = z.object({
  note: z.string().nullable(),
  clientTimestamp: dateField,
});
