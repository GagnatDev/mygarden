import { z } from 'zod';

const dateOnlyField = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v == null || v === '') return null;
    return new Date(`${v}T12:00:00.000Z`);
  });

export const createSitePlantBodySchema = z
  .object({
    elementId: z.string().uuid(),
    plantProfileId: z.string().uuid().nullish(),
    plantName: z.string().trim().min(1).optional(),
    establishedDate: dateOnlyField,
    notes: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const hasProfile = data.plantProfileId != null && data.plantProfileId !== '';
    if (!hasProfile && (!data.plantName || data.plantName.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'plantName is required when plantProfileId is not set',
        path: ['plantName'],
      });
    }
  });

export const patchSitePlantBodySchema = z.object({
  elementId: z.string().uuid().optional(),
  plantProfileId: z.string().uuid().nullish(),
  plantName: z.string().trim().min(1).optional(),
  establishedDate: dateOnlyField,
  notes: z.string().nullable().optional(),
});
