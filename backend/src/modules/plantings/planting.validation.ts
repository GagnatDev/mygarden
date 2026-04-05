import { z } from 'zod';
import { SOWING_METHODS } from '../../domain/planting.js';

const dateField = z.union([z.coerce.date(), z.string().datetime()]).transform((v) => new Date(v));

export const createPlantingBodySchema = z
  .object({
    seasonId: z.string().uuid(),
    areaId: z.string().uuid(),
    plantProfileId: z.string().uuid().nullish(),
    plantName: z.string().trim().min(1).optional(),
    sowingMethod: z.enum(SOWING_METHODS),
    indoorSowDate: dateField.optional().nullable(),
    transplantDate: dateField.optional().nullable(),
    outdoorSowDate: dateField.optional().nullable(),
    harvestWindowStart: dateField.optional().nullable(),
    harvestWindowEnd: dateField.optional().nullable(),
    quantity: z.number().optional().nullable(),
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
    if (data.sowingMethod === 'indoor') {
      if (!data.indoorSowDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'indoorSowDate is required for indoor sowing',
          path: ['indoorSowDate'],
        });
      }
      if (!data.transplantDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'transplantDate is required for indoor sowing',
          path: ['transplantDate'],
        });
      }
    }
    if (data.sowingMethod === 'direct_outdoor') {
      if (!data.outdoorSowDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'outdoorSowDate is required for direct outdoor sowing',
          path: ['outdoorSowDate'],
        });
      }
    }
  });

export const patchPlantingBodySchema = z.object({
  areaId: z.string().uuid().optional(),
  plantProfileId: z.string().uuid().nullish(),
  plantName: z.string().trim().min(1).optional(),
  sowingMethod: z.enum(SOWING_METHODS).optional(),
  indoorSowDate: dateField.optional().nullable(),
  transplantDate: dateField.optional().nullable(),
  outdoorSowDate: dateField.optional().nullable(),
  harvestWindowStart: dateField.optional().nullable(),
  harvestWindowEnd: dateField.optional().nullable(),
  quantity: z.number().optional().nullable(),
  notes: z.string().nullable().optional(),
});
