import { z } from 'zod';

export const createGardenBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  gridWidth: z.coerce.number().int().min(1).max(200),
  gridHeight: z.coerce.number().int().min(1).max(200),
  cellSizeMeters: z.coerce.number().positive().max(100),
});

export const patchGardenBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    gridWidth: z.coerce.number().int().min(1).max(200).optional(),
    gridHeight: z.coerce.number().int().min(1).max(200).optional(),
    cellSizeMeters: z.coerce.number().positive().max(100).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });
