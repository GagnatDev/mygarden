import { z } from 'zod';

export const createSeasonBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().optional(),
});

export const patchSeasonBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

export const archiveSeasonBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
